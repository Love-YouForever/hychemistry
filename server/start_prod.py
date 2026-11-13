"""生产环境单端口启动脚本。

与开发用的 start_bs.py 区别：
- 不启用本地 TLS（由云平台或反向代理终止 TLS）
- 站点宿主监听平台注入的 PORT，后端固定在内部端口
- 前后端共用同一进程组，任一子进程退出即整体退出

用法::

    PORT=4100 python server/start_prod.py
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = os.getenv("PORT", "4100")
BACKEND_PORT = os.getenv("BACKEND_PORT", "4101")

env = os.environ.copy()
env.update(
    {
        "BACKEND_HOST": "0.0.0.0",
        "BACKEND_PORT": BACKEND_PORT,
        "WEB_HOST": "0.0.0.0",
        "WEB_PORT": PORT,
        "INTERNAL_BACKEND_ORIGIN": f"http://127.0.0.1:{BACKEND_PORT}",
        "INTERNAL_BACKEND_VERIFY_SSL": "0",
    }
)
for key in ("WEB_SSL_CERT_FILE", "WEB_SSL_KEY_FILE", "BACKEND_SSL_CERT_FILE", "BACKEND_SSL_KEY_FILE"):
    env.pop(key, None)

processes = [
    subprocess.Popen([sys.executable, str(ROOT / "backend_server.py")], cwd=ROOT, env=env),
    subprocess.Popen([sys.executable, str(ROOT / "web_host.py")], cwd=ROOT, env=env),
]


def shutdown(*_args) -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        if process.poll() is None:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
    raise SystemExit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

try:
    while True:
        for process in processes:
            if process.poll() is not None:
                shutdown()
        time.sleep(1)
except KeyboardInterrupt:
    shutdown()
