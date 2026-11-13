"""Launch the 0410 B/S stack.

This file is the orchestration entrypoint for the current single-machine
deployment model:
1. start the unified backend service on 4101
2. start the web host / static container on 4100
3. inject port and TLS settings through environment variables
4. terminate the sibling process if either child exits unexpectedly
"""

import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent #当前脚本所在的目录（绝对路径），作为启动子进程的工作目录
SYSTEM_CERT_FILE = Path("/etc/ssl/dongdongkc.top.pem") #证书路径常量
SYSTEM_KEY_FILE = Path("/etc/ssl/dongdongkc.top.key")
FALLBACK_WEB_CERT_FILE = ROOT_DIR / "certs" / "0410-web.crt"
FALLBACK_WEB_KEY_FILE = ROOT_DIR / "certs" / "0410-web.key"

#证书解析函数 检查系统证书文件是否存在，若存在则优先使用系统证书；否则使用项目内回退证书 以保证服务依然能启用 HTTPS
def resolve_tls_pair():
    cert_file = SYSTEM_CERT_FILE if SYSTEM_CERT_FILE.is_file() else FALLBACK_WEB_CERT_FILE #路径.is_file 判断文件是否真实存在且为普通文件
    key_file = SYSTEM_KEY_FILE if SYSTEM_KEY_FILE.is_file() else FALLBACK_WEB_KEY_FILE
    return cert_file, key_file #返回一个元组 (cert_file, key_file)，供后续启动子进程时注入环境变量

#启动子进程函数
def start_process(label, command, extra_env):
    env = os.environ.copy() #复制当前系统环境变量（保留 PATH、PYTHONPATH 等必要变量）
    env.update(extra_env) #用 extra_env 覆盖或添加特定环境变量（如端口、TLS 路径）
    process = subprocess.Popen(command, cwd=ROOT_DIR, env=env) #调用 subprocess.Popen 启动子进程，设置工作目录为 ROOT_DIR（确保相对路径正确）
    print(f"[{label}] started pid={process.pid}")
    return process #打印启动信息并返回 Popen 对象，供父进程后续管理

#主函数 核心逻辑:获取证书并构建子进程列表
def main():
    cert_file, key_file = resolve_tls_pair() #调用以确定本次启动使用的证书和私钥路径
    processes = [

        start_process( #启动 后端服务（backend_server.py）
            "backend",
            [sys.executable, str(ROOT_DIR / "backend_server.py")],
            {
                "BACKEND_HOST": "0.0.0.0",
                "BACKEND_PORT": "4101", #监听 0.0.0.0:4101（所有网络接口）
                "BACKEND_SSL_CERT_FILE": str(cert_file), #通过环境变量 BACKEND_SSL_CERT_FILE 和 BACKEND_SSL_KEY_FILE 启用 HTTPS
                "BACKEND_SSL_KEY_FILE": str(key_file),
            },
        ),


        start_process( #启动 Web 前端服务（web_host.py）
            "web",
            [sys.executable, str(ROOT_DIR / "web_host.py")],
            {
                "WEB_HOST": "0.0.0.0",
                "WEB_PORT": "4100",
                "WEB_SSL_CERT_FILE": str(cert_file), #同样注入 TLS 证书使其支持 HTTPS
                "WEB_SSL_KEY_FILE": str(key_file),
                #额外注入两个内部变量
                "INTERNAL_BACKEND_ORIGIN": "https://127.0.0.1:4101",#指向后端服务的 HTTPS 地址（本机 127.0.0.1:4101），前端将 API 请求代理或转发至此
                "INTERNAL_BACKEND_VERIFY_SSL": "0",#设为 "0" 表示前端访问后端时不验证 SSL 证书（因为使用自签名证书或内部通信，无需校验）
            },
        ),
    ]

    #信号处理函数
    def shutdown(signum, frame): #当父进程收到 SIGINT（Ctrl+C）或 SIGTERM（终止信号）时，执行优雅关闭流程
        print("\n[0410] stopping services...")
        for process in processes: #遍历所有子进程，向仍在运行的进程发送 terminate()（发送 SIGTERM 信号，允许子进程自行清理）
            if process.poll() is None:
                process.terminate()
        for process in processes: #再次遍历，调用 wait(timeout=5) 等待每个子进程结束，最多等待 5 秒
            if process.poll() is None:
                process.wait(timeout=5)
        raise SystemExit(0)#最后通过 raise SystemExit(0) 退出父进程（返回码 0）

    #注册信号处理器 将 SIGINT 和 SIGTERM 绑定到 shutdown 函数，确保用户中断或系统停止服务时能清理子进程
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    #主监控循环 任意子进程异常退出，整个服务栈都应终止。 统一生命周期：通过父进程统一管理两个子进程的启动与终止，简化运维操作（只需启动一次、终止一次）
    try:
        while True:
            for process in processes:
                return_code = process.poll()
                if return_code is not None:
                    print(f"[0410] service exited early pid={process.pid} code={return_code}")
                    shutdown(None, None)
            signal.pause()
    except AttributeError:
        # Windows fallback.
        import time

        while True:
            for process in processes:
                return_code = process.poll()
                if return_code is not None:
                    print(f"[0410] service exited early pid={process.pid} code={return_code}")
                    shutdown(None, None)
            time.sleep(1)

#入口检查
if __name__ == "__main__":
    main()
"""
启动 launch.py
    │
    ├─ 解析 TLS 证书（优先系统证书，否则回退）
    │
    ├─ 启动 backend_server.py (子进程1)
    │      └─ 环境变量注入：端口4101、TLS证书路径
    │
    ├─ 启动 web_host.py (子进程2)
    │      └─ 环境变量注入：端口4100、TLS证书路径、后端内网地址
    │
    ├─ 注册 SIGINT/SIGTERM 信号处理器 (shutdown)
    │
    └─ 主监控循环
           ├─ 轮询子进程状态
           ├─ 任一子进程退出 → 执行 shutdown，终止所有并退出
           └─ 等待信号或休眠（Unix） / 主动休眠1秒（Windows）
"""
"""
为 0410 项目的前后端一体化部署设计。它通过：

统一证书管理降低配置复杂度

环境变量注入实现配置与代码分离

进程生命周期监控确保服务整体一致性

跨平台信号处理兼容 Unix 和 Windows

提供了简洁、可靠的单机启动方案，适合开发环境和中小规模生产部署。
"""
