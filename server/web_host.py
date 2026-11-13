"""Thin web host for the 0410 site.

Responsibilities:
- serve `主页.html` and the existing static assets/pages from the repo root
- expose the public site on 4100
- proxy a small allowlist of dynamic API routes to the internal backend on 4101
- control cache policy so HTML/API responses are not stuck behind stale browser cache
"""

#导入与全局配置
import os
from pathlib import Path

import requests
from flask import Flask, Response, abort, jsonify, request, send_from_directory

ROOT_DIR = Path(__file__).resolve().parent.parent #站点根目录（本文件位于 server/ 内，取上一级），后续所有静态文件都相对于此目录提供
BACKEND_ORIGIN = os.getenv("INTERNAL_BACKEND_ORIGIN", "http://127.0.0.1:4101") #从环境变量读取内部后端地址。这允许通过环境变量灵活指向不同的后端服务（例如测试环境或容器内的服务名）
BACKEND_VERIFY_SSL = os.getenv("INTERNAL_BACKEND_VERIFY_SSL", "1").lower() in {"1", "true", "yes"} #转发请求时是否验证后端 SSL 证书，默认开启。当后端使用自签名证书时可关闭

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0 #转发请求时是否验证后端 SSL 证书，默认开启。当后端使用自签名证书时可关闭

#首页路由
@app.get("/") #当访问根路径 / 时，直接返回根目录下的 主页.html 文件
def index():
    return send_from_directory(ROOT_DIR, "主页.html")

#反向代理函数 项目核心 调用所有API路由
def proxy_backend(path, timeout=30):
    upstream_url = f"{BACKEND_ORIGIN}{path}" #构造上游 URL：将环境变量中的 BACKEND_ORIGIN 与传入的 path 拼接
    try:
        upstream = requests.request( #使用 requests.request 方法将原始请求的方法（GET、POST 等）、数据体、查询参数几乎原样发送到后端
            method=request.method,
            url=upstream_url,
            headers={"Content-Type": request.headers.get("Content-Type", "application/json")},
            data=request.get_data() if request.method != "GET" else None, #data 仅在非 GET 请求时携带原始请求体
            params=request.args if request.method == "GET" else None, #params 仅在 GET 请求时携带查询字符串
            timeout=timeout, #超时时间，视觉识别等慢接口可单独放宽
            verify=BACKEND_VERIFY_SSL,
        )
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": f"backend unavailable: {exc}"}), 502 #错误处理 若后端连接失败，返回 HTTP 502（Bad Gateway）及友好的 JSON 错误信息

#排除不匹配的头 返回一个 Flask Response 对象，包含后端返回的原始内容体、状态码以及清理后的响应头
    excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
    headers = [(key, value) for key, value in upstream.headers.items() if key.lower() not in excluded_headers]
    return Response(upstream.content, upstream.status_code, headers)



#具体的 API 代理路由（允许列表）
@app.get("/api/health")
def proxy_health():
    return proxy_backend("/api/health")


@app.get("/api/wiki/summary")
def proxy_wiki_summary():
    return proxy_backend("/api/wiki/summary", timeout=20)


@app.get("/api/wiki/image")
def proxy_wiki_image():
    return proxy_backend("/api/wiki/image", timeout=20)


@app.get("/api/aigent/bootstrap")
def proxy_aigent_bootstrap():
    return proxy_backend("/api/aigent/bootstrap")


@app.post("/api/aigent/chat")
def proxy_aigent_chat():
    return proxy_backend("/api/aigent/chat")


@app.post("/api/aigent/vision")
def proxy_aigent_vision():
    return proxy_backend("/api/aigent/vision", timeout=90)


@app.post("/api/aigent/chat/stream")
def proxy_aigent_chat_stream():
    """流式转发 AI 对话：SSE 必须逐块透传，不能先缓冲完整响应。"""
    upstream_url = f"{BACKEND_ORIGIN}/api/aigent/chat/stream"
    try:
        upstream = requests.request(
            method="POST",
            url=upstream_url,
            headers={"Content-Type": request.headers.get("Content-Type", "application/json")},
            data=request.get_data(),
            stream=True,
            timeout=(10, 120),   # (连接超时, 读取超时)
            verify=BACKEND_VERIFY_SSL,
        )
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": f"backend unavailable: {exc}"}), 502

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=None):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/speech/synthesize")
def proxy_speech_synthesize():
    return proxy_backend("/speech/synthesize")



#静态文件兜底路由（Catch-All） 处理除上述已定义路由之外的所有 GET 请求
@app.get("/<path:filename>")
def serve_file(filename):   #将 URL 路径映射为文件系统路径，检查文件是否存在。若存在则返回该文件（JS、CSS、图片、其他 HTML 页面）；若不存在则返回 404
    target = ROOT_DIR / filename
    if target.is_file():
        return send_from_directory(ROOT_DIR, filename)
    abort(404)

#响应后处理：缓存策略控制 after_request
@app.after_request
def disable_cache(response):
    request_path = request.path.lower()
    is_html = response.mimetype == "text/html" or request_path.endswith(".html") or request_path == "/"
    is_api = request_path.startswith("/api/")

    if is_html or is_api:
        # 强制不缓存 确保html 和 api 实时更新
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    else:
        # 静态资源：缓存一天
        response.headers["Cache-Control"] = "public, max-age=86400"
        response.headers.pop("Pragma", None)
        response.headers.pop("Expires", None)
    return response


#应用启动入口
if __name__ == "__main__":
    host = os.getenv("WEB_HOST", "0.0.0.0") #监听地址，默认为所有接口（用于容器内访问）
    port = int(os.getenv("WEB_PORT", "4100")) #监听端口，默认 4100
    debug = os.getenv("WEB_DEBUG", "").lower() in {"1", "true", "yes"} #是否开启 Flask Debug 模式（代码热重载、详细错误页）
    cert_file = os.getenv("WEB_SSL_CERT_FILE", "").strip()
    key_file = os.getenv("WEB_SSL_KEY_FILE", "").strip()
    ssl_context = (cert_file, key_file) if cert_file and key_file else None #若提供，则直接开启 HTTPS 服务（无需前置 Nginx 处理 SSL）
    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context) #启动服务

"""
基于 Flask 的薄层 Web 主机（Thin Web Host）。它不处理复杂的业务逻辑，而是扮演两个核心角色：

    静态文件服务器：直接向外提供 主页.html 及仓库根目录下的所有静态资源（JS、CSS、图片等）。

    反向代理（API 网关）：将少数预先允许的 API 请求透明地转发到内部真正的后端服务（运行在 4101 端口）。

设计目标：

    前端静态内容与后端 API 在浏览器中访问同一个域名/端口（4100），避免跨域问题。

    对 HTML 和 API 响应强制禁用缓存，确保用户总是拿到最新内容，避免开发或部署时因浏览器缓存导致的问题。

    对静态资源设置长缓存，优化加载速度。

"""
