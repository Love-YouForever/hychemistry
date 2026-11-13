"""AI assistant service adapters used by `backend_server.py`.

This module isolates upstream integrations so route handlers can stay thin:
- normalize chat history and call the DeepSeek chat completion API
- synthesize assistant speech through DashScope TTS WebSocket API
- expose pure function style helpers for the Flask layer
"""

import json
import os
import sys
import time
import uuid
import zlib
from dataclasses import dataclass
from pathlib import Path

import requests
from websockets.sync.client import connect

# 保证同目录下的工具模块可被导入（无论从项目根还是 server/ 目录启动）
sys.path.insert(0, str(Path(__file__).resolve().parent))

from chem_tools import TOOL_SCHEMAS, check_dangerous_request, execute_tool


def _load_dotenv() -> None:
    """从项目根目录的 .env 载入配置。

    只补充尚未存在的环境变量，不覆盖外部已注入的值，
    从而保证密钥不会写死在代码或公开仓库中。
    """
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()

#配置常量 包括API接口、地址（密钥统一由环境变量注入，模板见 .env.example）
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
TTS_API_KEY = os.getenv("TTS_API_KEY", "")

# 角色设定与场景提示词统一放在 prompt_templates.json 中维护，便于按场景调优
INTRO_MESSAGE = "锵锵~你的专属化学小助手“小幻语”已经在网页里待命啦！无论你想聊元素、实验，还是这个元素世界里的小问题，我都会陪你一起探索。"

#数据类与客户端类
@dataclass
class TTSSettings: #TTSSetings数据类  封装了语音合成所需的所有配置参数
    api_key: str
    ws_url: str = os.getenv("TTS_WS_URL", "wss://dashscope.aliyuncs.com/api-ws/v1/inference")
    model: str = os.getenv("TTS_MODEL", "cosyvoice-v3-flash")   #模型：cosyvoice-v3-flash（阿里 DashScope 的快速合成模型）
    voice: str = os.getenv("TTS_VOICE", "longhua_v3")  #音色：longhua_v3（龙桦，知性女声）
    fmt: str = os.getenv("TTS_FORMAT", "mp3")   #输出格式
    sample_rate: int = int(os.getenv("TTS_SAMPLE_RATE", "22050"))


class TTSClient:
    def __init__(self, settings: TTSSettings): #初始化：接收一个 TTSSettings 实例
        self.settings = settings

    def synthesize(self, text: str, language: str = "zh-CN") -> tuple[bytes, dict]: #核心方法：将文本转为语音，返回 (音频字节数据, 元信息字典)
        if not self.settings.api_key:
            raise ValueError("TTS_API_KEY missing")
        if not text or len(text) > 20000:
            raise ValueError("text invalid")

#（基于 WebSocket 双工流）
        task_id = str(uuid.uuid4()) #生成任务 ID：用 uuid.uuid4() 保证每次请求唯一
        audio_chunks = []

        run_payload = {
            "header": {
                "action": "run-task",
                "task_id": task_id,
                "streaming": "duplex",
            },
            "payload": {
                "task_group": "audio",
                "task": "tts",
                "function": "SpeechSynthesizer",
                "model": self.settings.model,
                "parameters": {
                    "text_type": "PlainText",
                    "voice": self.settings.voice,
                    "format": self.settings.fmt,
                    "sample_rate": self.settings.sample_rate,
                    "language_hints": ["zh"] if language.startswith("zh") else ["en"],
                },
                "input": {},
            },
        }

        continue_payload = {
            "header": {
                "action": "continue-task",
                "task_id": task_id,
                "streaming": "duplex",
            },
            "payload": {
                "input": {
                    "text": text,
                }
            },
        }

        finish_payload = {
            "header": {
                "action": "finish-task",
                "task_id": task_id,
                "streaming": "duplex",
            },
            "payload": {
                "input": {},
            },
        }

        with connect(
            self.settings.ws_url,
            additional_headers={"Authorization": f"bearer {self.settings.api_key}"},
            open_timeout=15,
            close_timeout=5,
            max_size=None,
        ) as ws:
            ws.send(json.dumps(run_payload, ensure_ascii=False))        #发送 run-task 消息：告诉服务器要创建一个 TTS 任务，参数包括模型、音色、输出格式等。

            while True:                 #等待 task-started 事件：循环接收 WebSocket 消息，直到收到 task-started，表示服务端已就绪。
                msg = ws.recv()
                if isinstance(msg, bytes):
                    continue
                event = json.loads(msg)
                event_name = event.get("header", {}).get("event")
                if event_name == "task-started":
                    break
                if event_name == "task-failed":
                    raise RuntimeError(str(event))

            ws.send(json.dumps(continue_payload, ensure_ascii=False))   #发送 continue-task 与 finish-task：
            ws.send(json.dumps(finish_payload, ensure_ascii=False))         #continue-task 的 payload 中包含要合成的文本内容。
                                                                            #紧接着发送 finish-task 表示输入结束，服务器可以开始合成。
            while True:                         #再次循环接收消息：
                msg = ws.recv()                     #如果是 bytes 类型，就是音频块，存入 audio_chunks 列表
                if isinstance(msg, bytes):          #如果是 JSON 事件，检查是否是 task-finished（正常结束）或 task-failed（错误）
                    audio_chunks.append(msg)    #合并音频块：拼接所有字节得到完整的音频文件内容
                    continue
                event = json.loads(msg)
                event_name = event.get("header", {}).get("event")
                if event_name == "task-finished":
                    break
                if event_name == "task-failed":
                    raise RuntimeError(str(event))

        audio = b"".join(audio_chunks)
        if not audio:
            raise RuntimeError("empty audio")      #异常处理:API Key 缺失、文本超长、任务失败、收到空音频都会抛出相应异常

        media_type = "audio/mpeg" if self.settings.fmt == "mp3" else "audio/wav"
        return audio, {                 #返回结果：音频字节流 + 元信息（MIME 类型、模型名等）
            "media_type": media_type,
            "model": self.settings.model,
            "language": language,
        }


tts_client = TTSClient(TTSSettings(api_key=TTS_API_KEY))    #在模块加载时即创建一个 TTSClient 实例，方便多个路由复用，避免重复初始化


#工具函数
def _normalize_history(history):    #清洗和规范化前端传来的对话历史 防止前端传入脏数据（如空消息、无效角色）导致 API 调用失败
    normalized = []
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"}:
            continue
        if not isinstance(content, str):
            continue
        text = content.strip()
        if not text:
            continue
        normalized.append({"role": role, "content": text})
    return normalized


# ========== Agent 能力层 ==========

PROMPT_CONFIG_PATH = Path(__file__).resolve().parent / "prompt_templates.json"

# 模板文件缺失时的最小兜底，保证服务仍可对话
_FALLBACK_PROMPT_CONFIG = {
    "default_route": "default",
    "base": {
        "persona": "你是小幻语，一位温柔、活泼又严谨的化学精灵。",
        "tool_guide": "涉及化学事实时先调用工具查证，不要凭记忆编造数据。",
    },
    "routes": {
        "default": {"label": "综合问答", "keywords": [], "guidance": "", "allow_tools": True}
    },
}


def _load_prompt_config():
    """从 JSON 加载场景化 Prompt 模板。"""
    try:
        return json.loads(PROMPT_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return _FALLBACK_PROMPT_CONFIG


PROMPT_CONFIG = _load_prompt_config()
ROUTES = PROMPT_CONFIG.get("routes") or {}


def select_scene(text):
    """按关键词命中数选择场景，使不同问题走不同的提示词与工具策略。"""
    text = text or ""
    best_name = PROMPT_CONFIG.get("default_route", "default")
    best_score = 0
    for name, route in ROUTES.items():
        score = sum(1 for keyword in route.get("keywords", []) if keyword in text)
        if score > best_score:
            best_name, best_score = name, score
    return best_name


def _role_persona(role_name):
    """历史人物访谈模式：覆盖默认人格，避免模型拒绝扮演。"""
    role = (role_name or "").strip()
    if not role:
        return ""
    return (
        f"【历史人物访谈模式】本轮你要以化学家{role}的第一人称身份回答。"
        f"请始终用「我」指代{role}本人，以亲历者视角讲述科研经历、时代背景与研究方法，"
        "并可以用当时的语气评价现代化学发现。"
        "这是本站为学习者安排的人物访谈演示，请不要拒绝这个设定，"
        "不要自称小幻语或 AI，也不要提醒用户你在角色扮演。"
        "涉及具体年代、奖项或数据而不确定时，可以说明「这一点我记得不够确切」，不要编造。"
    )


def build_system_prompt(scene, role_name=""):
    """拼接「人格 + 场景指引 + 工具规则 + 可选角色」系统提示词。"""
    base = PROMPT_CONFIG.get("base") or {}
    route = ROUTES.get(scene) or {}
    parts = [
        base.get("persona", ""),
        route.get("guidance", ""),
        base.get("tool_guide", ""),
        _role_persona(role_name),
    ]
    return "\n\n".join(part.strip() for part in parts if part and part.strip())


MAX_TOOL_ROUNDS = 4

# 工具的中文展示名，用于前端「思考过程」可视化
TOOL_LABELS = {
    "query_element": "查询元素性质",
    "molar_mass": "计算摩尔质量",
    "balance_equation": "配平化学方程式",
    "lookup_reaction": "检索反应现象",
    "get_safety_info": "查询危化品安全信息",
    "search_knowledge": "检索元素知识库",
}


def _build_messages(history, scene="default", role_name=""):
    """构建带场景提示词的消息列表。"""
    return [
        {"role": "system", "content": build_system_prompt(scene, role_name)},
        *_normalize_history(history),
    ]


class ModelUnavailable(RuntimeError):
    """主备模型全部不可用时抛出，交给上层做优雅降级。"""


MODEL_ATTEMPTS_PER_TARGET = 2


def _model_targets():
    """返回「主模型 → 备用模型」的调用链，备用模型可用环境变量关闭。"""
    targets = [
        {
            "label": DEEPSEEK_MODEL,
            "url": DEEPSEEK_API_URL,
            "key": DEEPSEEK_API_KEY,
            "model": DEEPSEEK_MODEL,
            "fallback": False,
        }
    ]

    fallback_key = os.getenv("FALLBACK_API_KEY") or os.getenv("VISION_API_KEY") or ""
    fallback_url = os.getenv(
        "FALLBACK_MODEL_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    )
    fallback_model = os.getenv("FALLBACK_MODEL", "qwen-plus")
    if fallback_key and fallback_url and fallback_model:
        targets.append(
            {
                "label": f"{fallback_model}(备用)",
                "url": fallback_url,
                "key": fallback_key,
                "model": fallback_model,
                "fallback": True,
            }
        )
    return targets


def _request_completion(messages, tools=None, stream=False):
    """统一的模型请求入口：超时重试 → 主模型失败切备用模型。

    返回 (response, info)，info 中标注实际使用的模型与是否为降级。
    全部目标失败时抛出 ModelUnavailable，由调用方转为友好提示。
    """
    last_error = None

    for target in _model_targets():
        if not target["key"]:
            continue

        headers = {
            "Authorization": f"Bearer {target['key']}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": target["model"],
            "messages": messages,
            "stream": stream,
            "temperature": 0.4,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        for attempt in range(MODEL_ATTEMPTS_PER_TARGET):
            try:
                response = requests.post(
                    target["url"],
                    headers=headers,
                    json=payload,
                    timeout=(10, 120) if stream else 60,
                    stream=stream,
                )
            except requests.RequestException as exc:
                last_error = exc
                time.sleep(0.6 * (attempt + 1))
                continue

            if response.status_code == 200:
                return response, {"model": target["model"], "fallback": target["fallback"]}

            last_error = RuntimeError(f"{target['model']} 返回 {response.status_code}")
            if response.status_code in {400, 401, 403, 404}:
                break  # 配置类错误，重试无意义，直接切换下一个模型
            time.sleep(0.6 * (attempt + 1))

    raise ModelUnavailable(str(last_error) if last_error else "没有可用的模型服务")


def _last_user_text(history):
    """取最后一条用户消息，用于安全护栏与意图判断。"""
    for item in reversed(_normalize_history(history)):
        if item["role"] == "user":
            return item["content"]
    return ""


def _parse_tool_arguments(call):
    """解析工具调用参数，容错非法 JSON。"""
    try:
        return json.loads(call["function"].get("arguments") or "{}")
    except json.JSONDecodeError:
        return {}


CITATION_PREFIX = "📎 参考来源："


def _make_source_ref(ref):
    """为来源生成稳定编号，方便界面弹窗、文档与回答正文互相对照。"""
    name = (ref or "").split("·")[-1].strip()
    if (ref or "").startswith("元素图鉴") and name:
        return f"kb://element/{name}"
    code = zlib.crc32((ref or "knowledge").encode("utf-8")) & 0xFFFF
    return f"kb://doc/{code:04x}"


def _collect_citations(result):
    """从知识检索结果中抽取可核对的来源条目（含原文，供「查看依据」弹窗展示）。"""
    items = []
    for row in (result or {}).get("results") or []:
        ref = row.get("来源") or "元素图鉴"
        text = (row.get("内容") or "").strip()
        items.append(
            {
                "ref": ref,
                "source_ref": _make_source_ref(ref),
                "snippet": text[:110],
                "quote": text,
                "score": row.get("匹配度"),
                "match": row.get("命中方式") or "混合检索",
            }
        )
    return items


def _dedupe_citations(items):
    """按来源去重，最多保留 4 条，避免来源列表过长。"""
    seen = set()
    unique = []
    for item in items:
        if item["ref"] in seen:
            continue
        seen.add(item["ref"])
        unique.append(item)
    return unique[:4]


def _ensure_citation(answer, citations):
    """模型忘记写来源时补一行溯源，保证回答“有据可查”。"""
    if not citations:
        return answer
    if any(item["ref"] in answer for item in citations):
        return answer
    refs = "、".join(item["ref"] for item in citations)
    return answer.rstrip() + "\n\n" + CITATION_PREFIX + refs


def run_agent(history, role_name=""):
    """非流式 Agent：场景路由 + 多轮工具调用 + 强制溯源 + 降级兜底。

    返回字段：
    - reply: 最终文本回复
    - blocked: 是否被安全护栏拦截
    - tool_calls: 本轮实际发生的工具调用轨迹
    - scene: 命中的场景模板
    - citations: 知识库溯源列表
    - degraded: 是否使用了备用模型
    """
    text = _last_user_text(history)
    scene = select_scene(text)
    allow_tools = (ROUTES.get(scene) or {}).get("allow_tools", True)

    guard = check_dangerous_request(text)
    if guard["blocked"]:
        return {
            "reply": guard["message"],
            "blocked": True,
            "tool_calls": [],
            "scene": scene,
            "citations": [],
            "degraded": False,
        }

    messages = _build_messages(history, scene, role_name)
    tool_trace = []
    citations = []
    degraded = False

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            response, info = _request_completion(
                messages, tools=TOOL_SCHEMAS if allow_tools else None
            )
            degraded = degraded or info["fallback"]
            message = response.json()["choices"][0]["message"]
            calls = message.get("tool_calls") or []

            if not calls:
                answer = message.get("content", "") or ""
                merged = _dedupe_citations(citations)
                return {
                    "reply": _ensure_citation(answer, merged),
                    "blocked": False,
                    "tool_calls": tool_trace,
                    "scene": scene,
                    "citations": merged,
                    "degraded": degraded,
                }

            messages.append(message)
            for call in calls:
                name = call["function"]["name"]
                arguments = _parse_tool_arguments(call)
                result = execute_tool(name, arguments)

                tool_trace.append({"name": name, "arguments": arguments, "result": result})
                if name == "search_knowledge":
                    citations.extend(_collect_citations(result))

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
    except ModelUnavailable:
        return {
            "reply": "唔…我的模型服务好像打了个盹儿，稍等几秒再问我一次好吗？刚才的问题我还记着。",
            "blocked": False,
            "tool_calls": tool_trace,
            "scene": scene,
            "citations": _dedupe_citations(citations),
            "degraded": True,
        }

    return {
        "reply": "唔…这个问题我查了好几轮资料还是没理清，可以换个问法吗？",
        "blocked": False,
        "tool_calls": tool_trace,
        "scene": scene,
        "citations": _dedupe_citations(citations),
        "degraded": degraded,
    }


def chat_with_aigent(history):  #主聊天函数（兼容旧接口，返回纯文本）
    return run_agent(history)["reply"]


# ---------- 流式输出 ----------

def _sse(event, data):
    """封装 Server-Sent Events 帧。"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _chunk_text(text, size=3):
    """把整段文本切成小块，模拟打字机输出。"""
    for index in range(0, len(text), size):
        yield text[index : index + size]


def _stream_round(messages, tools):
    """执行一轮真实的流式请求。

    边收 token 边产出 ("delta", 文本)，同时聚合流式返回中的工具调用参数；
    本轮结束时产出 ("meta", info) 与 ("result", (content, calls))。
    """
    response, info = _request_completion(messages, tools=tools, stream=True)
    yield "meta", info

    content_parts = []
    pending_calls = {}

    for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        chunk = line[6:].strip()
        if chunk == "[DONE]":
            break
        try:
            choice = json.loads(chunk)["choices"][0]
        except (KeyError, IndexError, json.JSONDecodeError):
            continue

        delta = choice.get("delta") or {}
        text = delta.get("content")
        if text:
            content_parts.append(text)
            yield "delta", text

        for call in delta.get("tool_calls") or []:
            index = call.get("index", 0)
            slot = pending_calls.setdefault(index, {"id": "", "name": "", "arguments": ""})
            if call.get("id"):
                slot["id"] = call["id"]
            function = call.get("function") or {}
            if function.get("name"):
                slot["name"] = function["name"]
            if function.get("arguments"):
                slot["arguments"] += function["arguments"]

    calls = [
        {
            "id": slot["id"] or f"call_{index}",
            "type": "function",
            "function": {"name": slot["name"], "arguments": slot["arguments"] or "{}"},
        }
        for index, slot in sorted(pending_calls.items())
        if slot["name"]
    ]
    yield "result", ("".join(content_parts), calls)


def stream_agent(history, role_name=""):
    """流式 Agent：场景路由 → 多轮工具调用 → 强制溯源 → 逐帧输出。

    事件类型：
    - status:      阶段状态（thinking / degraded / blocked / failed）
    - tool:        工具开始执行
    - tool_result: 工具执行结果
    - sources:     本次回答引用的知识来源
    - delta:       回答文本增量（来自模型真实流式输出）
    - done:        结束，附带工具轨迹、来源与降级标记
    """
    text = _last_user_text(history)
    scene = select_scene(text)
    route = ROUTES.get(scene) or {}
    scene_label = route.get("label", "综合问答")
    allow_tools = route.get("allow_tools", True)

    guard = check_dangerous_request(text)
    if guard["blocked"]:
        yield _sse("status", {"stage": "blocked", "text": "检测到危险请求，已启动安全拦截", "scene": scene})
        for piece in _chunk_text(guard["message"]):
            yield _sse("delta", {"text": piece})
        yield _sse(
            "done",
            {"blocked": True, "tool_calls": [], "scene": scene, "citations": [], "degraded": False},
        )
        return

    messages = _build_messages(history, scene, role_name)
    tool_trace = []
    citations = []
    degraded = False
    used_model = ""
    answer = ""
    degrade_chain = ""

    yield _sse(
        "status",
        {"stage": "thinking", "text": f"{scene_label} · 正在理解你的问题…", "scene": scene},
    )

    def stream_round(round_messages, round_tools):
        """包装一轮流式请求，统一处理降级提示与增量下发。"""
        nonlocal answer, degraded, used_model, degrade_chain
        calls = []
        content = ""
        for kind, payload in _stream_round(round_messages, round_tools):
            if kind == "meta":
                used_model = payload["model"]
                if payload["fallback"] and not degraded:
                    degraded = True
                    primary = (_model_targets() or [{"model": "主模型"}])[0]["model"]
                    degrade_chain = f"文本模型：{primary} 不可用 → 已切换 {payload['model']}（备用）"
                    yield _sse(
                        "status",
                        {
                            "stage": "degraded",
                            "text": "主模型暂时不可用，已自动切换备用模型…",
                            "scene": scene,
                            "chain": degrade_chain,
                        },
                    )
            elif kind == "delta":
                answer += payload
                yield _sse("delta", {"text": payload})
            else:
                content, calls = payload
        return content, calls

    try:
        # 多轮工具调用：每轮都是真实流式请求，模型边思考边输出
        for round_index in range(MAX_TOOL_ROUNDS):
            content, calls = yield from stream_round(
                messages, TOOL_SCHEMAS if allow_tools else None
            )

            if not calls:
                break

            assistant_message = {
                "role": "assistant",
                "content": content or "",
                "tool_calls": calls,
            }
            messages.append(assistant_message)

            for call in calls:
                name = call["function"]["name"]
                arguments = _parse_tool_arguments(call)

                yield _sse(
                    "tool",
                    {"name": name, "label": TOOL_LABELS.get(name, name), "arguments": arguments},
                )

                result = execute_tool(name, arguments)
                tool_trace.append({"name": name, "arguments": arguments, "result": result})
                if name == "search_knowledge":
                    citations.extend(_collect_citations(result))

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
                yield _sse("tool_result", {"name": name, "result": result})

            if round_index + 1 < MAX_TOOL_ROUNDS:
                yield _sse(
                    "status",
                    {
                        "stage": "thinking",
                        "text": f"第 {round_index + 2} 轮 · 继续核对资料…",
                        "scene": scene,
                    },
                )
        else:
            # 轮次用尽：让模型基于已收集的资料收口
            yield _sse(
                "status",
                {"stage": "answering", "text": "正在汇总已查到的资料…", "scene": scene},
            )
            yield from stream_round(messages, None)

        merged = _dedupe_citations(citations)
        if merged:
            yield _sse("sources", {"items": merged})

        if merged and not any(item["ref"] in answer for item in merged):
            for piece in _chunk_text(
                "\n\n" + CITATION_PREFIX + "、".join(item["ref"] for item in merged)
            ):
                yield _sse("delta", {"text": piece})

        yield _sse(
            "done",
            {
                "blocked": False,
                "tool_calls": tool_trace,
                "scene": scene,
                "citations": merged,
                "degraded": degraded,
                "model": used_model,
                "chain": degrade_chain,
            },
        )

    except ModelUnavailable:
        yield _sse("status", {"stage": "failed", "text": "模型服务暂时不可用", "scene": scene})
        for piece in _chunk_text(
            "唔…我的模型服务好像打了个盹儿，稍等几秒再问我一次好吗？刚才的问题我还记着。"
        ):
            yield _sse("delta", {"text": piece})
        yield _sse(
            "done",
            {
                "blocked": False,
                "tool_calls": tool_trace,
                "scene": scene,
                "citations": _dedupe_citations(citations),
                "degraded": True,
                "model": used_model,
                "chain": "文本模型：主模型与备用模型均不可用 → 已切换到本地兜底话术",
            },
        )


def synthesize_aigent_speech(text, language="zh-CN"):   #对外暴露的语音合成封装
    return tts_client.synthesize(text, language)

"""
这段代码是一个 AI 助手后端服务适配器模块，专门为一个叫“小幻语”的化学精灵助手设计。它负责处理与两个上游 AI 服务的交互：
    1.DeepSeek 大语言模型 —— 用于生成文本对话回复。
    2.阿里云 DashScope 语音合成（TTS） —— 用于将文本转为语音。
整个模块设计为 纯函数和类，让 Flask 路由层（backend_server.py）可以保持简洁，只需调用这些适配器即可。
"""
"""
前端请求 → Flask 路由 (backend_server.py)
            │
            ├─ 对话请求 ──→ chat_with_aigent(history)
            │                    │
            │                    ├─ 规范化历史
            │                    ├─ 添加 system prompt
            │                    └─ POST DeepSeek API → 返回文本回复
            │
            └─ TTS 请求 ──→ synthesize_aigent_speech(text)
                                 │
                                 └─ TTSClient.synthesize()
                                        │
                                        └─ WebSocket DashScope → 返回音频字节
"""
