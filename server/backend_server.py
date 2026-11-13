"""Unified backend service mounted on top of `Periodic_Table.app`.

This module reuses the Flask app object from `Periodic_Table/app.py` and extends
it with project-level capability routes, including:
- health checks
- AI assistant bootstrap/chat
- TTS speech synthesis
"""
"""
这段代码实现了一个统一的后端服务，它复用了已有的“元素周期表” Flask 应用（Periodic_Table.app），
并在此基础上扩展了AI 助手（小幻语）和语音合成（TTS）的能力。
"""
#复用现有应用：从 Periodic_Table.app 导入已经创建好的 Flask 实例 app，这样新功能可以直接挂载到同一个 Web 服务上，无需另起进程
#引入外部能力：aigent_service：提供 AI 对话核心逻辑（chat_with_aigent）、欢迎语（INTRO_MESSAGE）以及语音合成（synthesize_aigent_speech）
#跨域支持：通过 flask_cors.CORS 为 /api/* 路径的所有资源开启跨域访问（允许任意源），方便前端独立调用
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote, urlparse

import requests
from flask import Response, jsonify, request
from flask_cors import CORS

# 将站点 pages/ 目录加入模块搜索路径，使 Periodic_Table 包可被导入
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pages"))

from aigent_service import (
    INTRO_MESSAGE,
    run_agent,
    stream_agent,
    synthesize_aigent_speech,
)
from chem_tools import balance_equation, get_safety_info
from Periodic_Table.app import app
from vision_service import analyze_image

CORS(app, resources={r"/api/*": {"origins": "*"}})


# 健康检查接口 提供 AI 助手的初始化信息，前端可在加载对话界面时调用
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "0410-backend"})


# 维基百科代理：服务器在境外可直连维基，客户端不必访问 wikipedia.org
# UA 必须带联系方式，否则维基会按机器人流量返回 403 Too Many Reqs
WIKI_USER_AGENT = "ElementWhisper/1.0 (https://www.hychemistry.cn; contact@hychemistry.cn)"
WIKI_CACHE_TTL = 600
_wiki_cache = {}


@app.get("/api/wiki/summary")
def wiki_summary():
    lang = (request.args.get("lang") or "zh").lower()
    title = (request.args.get("title") or "").strip()
    if lang not in {"zh", "en"} or not title:
        return jsonify({"ok": False, "error": "invalid params"}), 400

    cache_key = f"{lang}:{title}"
    cached = _wiki_cache.get(cache_key)
    if cached and time.time() - cached[0] < WIKI_CACHE_TTL:
        return jsonify(cached[1])

    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title)}"
    try:
        upstream = requests.get(url, timeout=15, headers={"User-Agent": WIKI_USER_AGENT})
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": f"upstream unavailable: {exc}"}), 502
    if upstream.status_code != 200:
        return jsonify({"ok": False, "error": f"upstream {upstream.status_code}"}), 502

    data = upstream.json()
    payload = {
        "ok": True,
        "title": data.get("title"),
        "extract": data.get("extract"),
        "thumbnail": data.get("thumbnail"),
    }
    _wiki_cache[cache_key] = (time.time(), payload)
    return jsonify(payload)


@app.get("/api/wiki/image")
def wiki_image():
    """代理维基缩略图，避免客户端直连 upload.wikimedia.org 失败。"""
    image_url = (request.args.get("url") or "").strip()
    parsed = urlparse(image_url)
    # 维基缩略图域名可能是 upload.wikimedia.org 或 thumb.wikimedia.org
    if parsed.scheme != "https" or parsed.hostname not in {"upload.wikimedia.org", "thumb.wikimedia.org"}:
        return jsonify({"ok": False, "error": "invalid url"}), 400

    try:
        upstream = requests.get(image_url, timeout=15, headers={"User-Agent": WIKI_USER_AGENT})
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": f"upstream unavailable: {exc}"}), 502
    if upstream.status_code != 200:
        return jsonify({"ok": False, "error": f"upstream {upstream.status_code}"}), 502

    return Response(
        upstream.content,
        mimetype=upstream.headers.get("Content-Type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )

#AI 助手引导接口 提供 AI 助手的初始化信息，前端可在加载对话界面时调用
@app.get("/api/aigent/bootstrap")
def aigent_bootstrap():
    return jsonify(
        {
            "ok": True,
            "assistant_name": "小幻语",
            "intro": INTRO_MESSAGE,
        }
    )

#AI 对话接口 请求体：JSON，包含 history 字段（对话历史列表，可为空）
@app.post("/api/aigent/chat")
def aigent_chat():
    payload = request.get_json(silent=True) or {} #解析请求 JSON，若解析失败则用空字典
    history = payload.get("history") or [] #提取 history，若没有则默认为空列表。
    role_name = payload.get("role") or ""
    try:
        result = run_agent(history, role_name) #Agent 模式：支持工具调用与安全拦截
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502 #若发生异常，返回 502 状态码及错误信息
    return jsonify(
        {
            "ok": True,
            "reply": result["reply"],
            "blocked": result["blocked"],
            "tool_calls": result["tool_calls"],
        }
    )


#多模态视觉识别接口：上传图片，由视觉模型识别化学内容，并自动调用化学工具校验
@app.post("/api/aigent/vision")
def aigent_vision():
    payload = request.get_json(silent=True) or {}
    image = payload.get("image") or ""
    question = (payload.get("question") or "").strip()

    if not image:
        return jsonify({"ok": False, "error": "缺少图片数据"}), 400

    result = analyze_image(image, question)
    if not result.get("ok"):
        return jsonify(result), 502

    parsed = result["result"]

    # 视觉与工具链联动：识别到方程式后，自动调用配平工具做确定性校验
    if parsed.get("type") == "equation":
        content = _normalize_equation_text(parsed.get("content", ""))
        if content and content != "无法识别":
            parsed["content"] = content
            parsed["balance"] = balance_equation(content)

    # 装置或试剂类图片，自动补充安全信息
    if parsed.get("type") in {"apparatus", "reagent"} and not parsed.get("safety"):
        safety = get_safety_info(parsed.get("content", ""))
        if safety.get("found"):
            parsed["safety"] = safety.get("防护要求", "")

    return jsonify({
        "ok": True,
        "result": parsed,
        "model": result.get("model"),
        "degraded": bool(result.get("degraded")),
        "chain": result.get("chain", ""),
    })


def _normalize_equation_text(text):
    """把视觉模型输出的方程式整理成配平工具可解析的形式。

    - Unicode 下标（Fe₂O₃）转普通数字
    - 箭头统一为等号
    - 去掉各物质前的前导系数，避免工具把系数当作化学式的一部分
    """
    subscript = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
    normalized = (text or "").translate(subscript)
    normalized = normalized.replace("——>", "=").replace("->", "=").replace("→", "=").strip()

    def strip_coefficient(term):
        return re.sub(r"^\d+(?=[A-Z(])", "", term.strip())

    sides = normalized.split("=")
    if len(sides) == 2:
        left = " + ".join(strip_coefficient(t) for t in sides[0].split("+") if t.strip())
        right = " + ".join(strip_coefficient(t) for t in sides[1].split("+") if t.strip())
        if left and right:
            return f"{left} = {right}"

    return normalized


#AI 流式对话接口：以 Server-Sent Events 逐步推送思考过程与回答
@app.post("/api/aigent/chat/stream")
def aigent_chat_stream():
    payload = request.get_json(silent=True) or {}
    history = payload.get("history") or []
    role_name = payload.get("role") or ""

    def generate():
        try:
            for frame in stream_agent(history, role_name):
                yield frame
        except Exception as exc:  # 流式场景下用事件上报错误，保证前端能优雅收尾
            yield "event: error\ndata: " + json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # 关闭 Nginx 缓冲，保证逐字输出
        },
    )


#语音合成接口（TTS）请求体：JSON，包含 text（要合成的文本，最长1000字符）和可选的 language（默认 zh-CN）。
@app.post("/speech/synthesize")
def synthesize_speech():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    language = (payload.get("language") or "zh-CN").strip() or "zh-CN"
    if not text or len(text) > 1000:
        return jsonify({"ok": False, "error": "text invalid"}), 400   #校验 text 非空且长度 ≤ 1000，否则返回 400

    try:
        audio, meta = synthesize_aigent_speech(text, language)  #调用 synthesize_aigent_speech(text, language)，返回音频数据（bytes）和元数据字典 meta（包含 media_type、language、model）
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502 #若调用异常，返回 502

    return Response(                    #构造 Flask Response 对象 将 AI 助手的回复文本转换为语音，供前端播放
        response=audio,                 #主体为音频二进制数据
        mimetype=meta["media_type"],    #mimetype 使用 meta["media_type"]（例如 audio/mpeg 或 audio/wav）
        headers={
            "X-Speech-Language": meta["language"],  #额外添加响应头：X-Speech-Language（实际使用的语言）、X-Speech-Model（使用的 TTS 模型名）
            "X-Speech-Model": meta["model"],
        },
    )


#服务启动配置
if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "0.0.0.0")     #监听地址，默认为0.0.0.0
    port = int(os.getenv("BACKEND_PORT", "4101"))   #端口，默认为4101
    debug = os.getenv("BACKEND_DEBUG", "").lower() in {"1", "true", "yes"} #是否开启 Flask 调试模式（1/true/yes 视为开启）
    cert_file = os.getenv("BACKEND_SSL_CERT_FILE", "").strip()
    key_file = os.getenv("BACKEND_SSL_KEY_FILE", "").strip()
    ssl_context = (cert_file, key_file) if cert_file and key_file else None    #如果两者都提供，则启用 HTTPS（ssl_context 参数）
    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context) #启动服务

"""
该代码将一个已有的元素周期表应用无缝扩展为具备 AI 对话和语音合成能力的全能后端。它提供了三个核心 API：

健康检查

AI 助手引导与对话

文本转语音

所有接口遵循 REST 风格，支持跨域，并可通过环境变量灵活配置启动方式。这种设计使得原有周期性表服务可以独立运行，
而 AI 能力作为附加模块被“挂载”上去，避免了代码侵入
"""
