"""实验助手智能体：确定性安全审查 + 本地实验知识库检索 + 流式回答。

能力迁移自 chem-agent（实验安全白名单、教学知识库、三态安全审查），
运行时只依赖本目录下 lab_data/ 的两个数据文件，不引入 langgraph / chromadb
等额外依赖，模型调用复用 aigent_service 的多模型降级链路。
"""

from __future__ import annotations

import functools
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

from aigent_service import ModelUnavailable, _normalize_history, _request_completion, _sse

DATA_DIR = Path(__file__).resolve().parent / "lab_data"
EXPERIMENTS_PATH = DATA_DIR / "experiments.json"
KNOWLEDGE_PATH = DATA_DIR / "knowledge.md"

TOP_K = 3
MAX_HISTORY = 8
MAX_ANSWER_CHARS = 1200


@dataclass(frozen=True)
class ExperimentRecord:
    """单个实验的白名单记录。"""

    experiment_id: str
    experiment_name: str
    thresholds: dict[str, str] = field(default_factory=dict)
    forbidden_reagents: tuple[str, ...] = ()
    abnormal_triggers: tuple[str, ...] = ()
    emergency_steps: tuple[str, ...] = ()


@dataclass(frozen=True)
class KnowledgeChunk:
    """知识库分块。"""

    chunk_id: str
    experiment_id: str
    title: str
    text: str


@dataclass(frozen=True)
class SafetyReview:
    """一次安全审查的结果。"""

    decision: str
    flags: list[dict]
    refusal: str | None = None


def _normalize(text: str) -> str:
    return "".join(str(text or "").split()).lower()


def _bigrams(text: str) -> set[str]:
    normalized = _normalize(text)
    return {normalized[i : i + 2] for i in range(len(normalized) - 1)}


@functools.lru_cache(maxsize=1)
def load_config() -> tuple[dict[str, ExperimentRecord], str]:
    """加载实验白名单，返回（实验表，安全声明）。"""
    raw = json.loads(EXPERIMENTS_PATH.read_text(encoding="utf-8-sig"))
    records: dict[str, ExperimentRecord] = {}
    for item in raw.get("experiments") or []:
        thresholds = item.get("safety_thresholds") or {}
        if not isinstance(thresholds, dict):
            thresholds = {}
        forbidden = thresholds.get("forbidden_reagents") or []
        if isinstance(forbidden, str):
            forbidden = [forbidden]
        record = ExperimentRecord(
            experiment_id=str(item.get("experiment_id", "")),
            experiment_name=str(item.get("experiment_name", "")),
            thresholds={
                str(key): str(value)
                for key, value in thresholds.items()
                if key != "forbidden_reagents"
            },
            forbidden_reagents=tuple(str(text) for text in forbidden),
            abnormal_triggers=tuple(str(text) for text in item.get("abnormal_triggers") or []),
            emergency_steps=tuple(str(text) for text in item.get("emergency_steps") or []),
        )
        if record.experiment_id:
            records[record.experiment_id] = record
    return records, str(raw.get("safety_notice", ""))


def list_experiments() -> list[dict]:
    """实验列表：只暴露 id 与名称。"""
    records, _ = load_config()
    return [
        {"experiment_id": record.experiment_id, "experiment_name": record.experiment_name}
        for record in records.values()
    ]


def get_experiment(experiment_id: str | None) -> ExperimentRecord | None:
    if not experiment_id:
        return None
    records, _ = load_config()
    return records.get(experiment_id)


def _flag(code: str, severity: str, message: str) -> dict:
    return {"code": code, "severity": severity, "message": message}


def _contains_any(haystack: str, needles) -> bool:
    target = _normalize(haystack)
    for needle in needles:
        needle_n = _normalize(needle)
        if needle_n and needle_n in target:
            return True
    return False


def _triggers_match(observed: str, triggers) -> bool:
    observed_n = _normalize(observed)
    if not observed_n:
        return False
    observed_bigrams = _bigrams(observed_n)
    for trigger in triggers:
        trigger_n = _normalize(trigger)
        if not trigger_n:
            continue
        if observed_n in trigger_n or trigger_n in observed_n:
            return True
        if len(observed_bigrams & _bigrams(trigger_n)) >= 2:
            return True
    return False


def review(experiment_id: str | None, added_reagents=None, observed: str | None = None) -> SafetyReview:
    """确定性安全审查：白名单/禁用试剂 block，异常现象只记 warning。"""
    records, _ = load_config()
    flags: list[dict] = []

    if experiment_id:
        if experiment_id not in records:
            flags.append(_flag("experiment_not_whitelisted", "block", "该实验不在安全白名单内，已停止生成。"))
        elif _contains_any(" ".join(added_reagents or []), records[experiment_id].forbidden_reagents):
            flags.append(_flag("forbidden_reagent", "block", "检测到该实验禁用或不需要的试剂，已停止生成。"))
        elif _triggers_match(observed or "", records[experiment_id].abnormal_triggers):
            flags.append(
                _flag("abnormal_phenomenon", "warning", "观察到疑似异常现象，已附加安全警告与应急处置建议。")
            )

    if any(flag["severity"] == "block" for flag in flags):
        return SafetyReview(
            decision="block",
            flags=flags,
            refusal="根据安全规则，当前请求已被拦截，请停止相关实验操作并联系教师。",
        )
    return SafetyReview(decision="pass", flags=flags)


@functools.lru_cache(maxsize=1)
def load_chunks() -> tuple[KnowledgeChunk, ...]:
    """按二级/三级标题切分知识库，父级上下文必须带在片段里。"""
    text = KNOWLEDGE_PATH.read_text(encoding="utf-8-sig")
    chunks: list[KnowledgeChunk] = []
    parent = ""
    experiment_id = ""
    section = ""
    lines: list[str] = []

    def flush() -> None:
        nonlocal section, lines
        if parent and section:
            body = "\n".join(lines[1:]).strip()
            if body:
                chunks.append(
                    KnowledgeChunk(
                        chunk_id=f"{experiment_id or parent}::{section}",
                        experiment_id=experiment_id or "",
                        title=section.lstrip("#").strip(),
                        text=f"{parent}\n{section}\n{body}",
                    )
                )
        section = ""
        lines = []

    for raw in text.splitlines():
        stripped = raw.strip()
        if stripped.startswith("## "):
            flush()
            parent = raw
            experiment_id = ""
            continue
        if stripped.startswith("### "):
            flush()
            section = raw
            lines = [raw]
            continue
        if not parent:
            continue
        if section:
            lines.append(raw)
            continue
        match = re.search(r"\*\*experiment_id:\*\*\s*`([^`]+)`", raw)
        if match:
            experiment_id = match.group(1).strip()

    flush()
    return tuple(chunks)


def retrieve(query: str, experiment_id: str | None, k: int = TOP_K) -> list[dict]:
    """关键词加权的本地检索：只命中当前实验的片段。"""
    query_n = _normalize(query)
    if not query_n or not experiment_id:
        return []
    query_grams = _bigrams(query_n)
    if not query_grams:
        return []

    scored: list[tuple[float, KnowledgeChunk]] = []
    for chunk in load_chunks():
        if chunk.experiment_id != experiment_id:
            continue
        chunk_grams = _bigrams(chunk.text)
        overlap = query_grams & chunk_grams
        if not overlap:
            continue
        score = len(overlap) / math.sqrt(len(query_grams) * len(chunk_grams))
        if _normalize(chunk.title) in query_n:
            score += 0.2
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored:
        # 关键词未命中时回退到该实验的概览片段，保证回答仍有实验依据
        return [
            {
                "source_id": chunk.chunk_id,
                "title": chunk.title,
                "snippet": chunk.text,
                "score": 0.0,
            }
            for chunk in [c for c in load_chunks() if c.experiment_id == experiment_id][:k]
        ]
    return [
        {
            "source_id": chunk.chunk_id,
            "title": chunk.title,
            "snippet": chunk.text,
            "score": round(score, 4),
        }
        for score, chunk in scored[:k]
    ]


SYSTEM_PROMPT = (
    "你是 3D 化学实验室里的实验助手“小幻语”。你只做讲解、步骤引导与安全提醒，"
    "不会也不允许代替学生执行混合、倾倒、加热、点燃等操作。"
    "回答必须优先依据给定的实验安全配置与知识库片段，不得编造浓度、温度、步骤或事故数据。"
    "如果问题超出当前实验范围，可以给出通用化学解释，但要在开头标注【通用知识，非本实验专属解答】。"
    "信息不足或涉及危险操作时，明确说明并建议咨询教师。"
    "请用自然、口语化的中文短句回答，不要输出 JSON、Markdown 表格或代码块。"
)


def _safety_text(record: ExperimentRecord | None) -> str:
    if record is None:
        return "（未选择具体实验，按通用化学问答处理）"
    lines = [f"实验：{record.experiment_name}"]
    if record.thresholds:
        lines.append("阈值要求：")
        lines.extend(f"- {key}：{value}" for key, value in record.thresholds.items())
    if record.forbidden_reagents:
        lines.append("禁用或不需要的试剂：")
        lines.extend(f"- {item}" for item in record.forbidden_reagents)
    if record.abnormal_triggers:
        lines.append("异常触发条件：")
        lines.extend(f"- {item}" for item in record.abnormal_triggers)
    if record.emergency_steps:
        lines.append("应急处置：")
        lines.extend(f"- {item}" for item in record.emergency_steps)
    return "\n".join(lines)


def build_messages(
    message: str,
    experiment_id: str | None,
    observed: str | None,
    sources: list[dict],
    history=None,
) -> list[dict]:
    record = get_experiment(experiment_id)
    source_text = "\n\n".join(
        f"[{index}] {item['title']}\n{item['snippet']}"
        for index, item in enumerate(sources, start=1)
    ) or "（本实验暂无检索片段，可结合通用化学知识回答）"
    observed_text = f"\n【学生观察到的现象】{observed}\n若属于异常，请优先给出应急处置，并以【安全警告】开头。" if observed else ""
    human = (
        f"学生提问：{message}\n\n"
        f"【实验安全配置】\n{_safety_text(record)}\n\n"
        f"【知识库片段】\n{source_text}\n"
        f"{observed_text}\n\n"
        "请直接回答，必要时分条说明，但不要过度罗列。"
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in _normalize_history(history or [])[-MAX_HISTORY:]:
        messages.append({"role": item["role"], "content": item["content"]})
    messages.append({"role": "user", "content": human})
    return messages


def _extract_delta(chunk: dict) -> str:
    try:
        choice = (chunk.get("choices") or [])[0]
    except (IndexError, AttributeError):
        return ""
    delta = choice.get("delta") or {}
    return delta.get("content") or ""


def stream_lab_agent(
    message: str,
    experiment_id: str | None = None,
    observed: str | None = None,
    added_reagents=None,
    history=None,
):
    """SSE 生成器：safety → sources → delta → done / error。

    第一个事件固定为 safety，前端可先渲染安全状态再接收正文。
    """
    message = (message or "").strip()
    if not message:
        yield _sse("error", {"message": "问题不能为空"})
        return

    try:
        result = review(experiment_id, added_reagents, observed)
        yield _sse(
            "safety",
            {
                "mode": "blocked" if result.decision == "block" else "answer",
                "safety_flags": result.flags,
                "refusal": result.refusal,
                "experiment_id": experiment_id or "",
            },
        )
        if result.decision == "block":
            yield _sse(
                "done",
                {
                    "ok": False,
                    "mode": "blocked",
                    "refusal": result.refusal,
                    "safety_flags": result.flags,
                    "sources": [],
                },
            )
            return

        sources = retrieve(message, experiment_id)
        yield _sse("sources", {"items": sources})

        messages = build_messages(message, experiment_id, observed, sources, history)
        response, info = _request_completion(messages, stream=True)

        has_warning = any(flag["code"] == "abnormal_phenomenon" for flag in result.flags)
        prefixes: list[str] = []
        if has_warning:
            prefixes.append("【安全警告】")
        if not sources and experiment_id:
            prefixes.append("【通用知识，非本实验专属解答】")
        answer_parts: list[str] = []
        prefix_checked = not prefixes
        pending = ""

        def flush_prefix(head_text: str) -> list[str]:
            """返回仍未出现在模型输出开头的前缀列表。"""
            heads = head_text.lstrip()
            for prefix in list(prefixes):
                if heads.startswith(prefix):
                    prefixes.remove(prefix)
            return list(prefixes)

        emitted: list[str] = []
        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            payload = line[6:].strip()
            if payload == "[DONE]":
                break
            try:
                text = _extract_delta(json.loads(payload))
            except json.JSONDecodeError:
                continue
            if not text:
                continue
            if not prefix_checked:
                pending += text
                if len(pending) < 20:
                    continue
                prefix_checked = True
                for prefix in flush_prefix(pending):
                    if prefix and prefix not in emitted:
                        emitted.append(prefix)
                        answer_parts.append(prefix)
                        yield _sse("delta", {"text": prefix})
                answer_parts.append(pending)
                yield _sse("delta", {"text": pending})
                pending = ""
                continue
            answer_parts.append(text)
            yield _sse("delta", {"text": text})
            if sum(len(part) for part in answer_parts) > MAX_ANSWER_CHARS:
                break

        if pending:
            if not prefix_checked:
                for prefix in flush_prefix(pending):
                    if prefix and prefix not in emitted:
                        emitted.append(prefix)
                        answer_parts.append(prefix)
                        yield _sse("delta", {"text": prefix})
            answer_parts.append(pending)
            yield _sse("delta", {"text": pending})

        answer = "".join(answer_parts).strip()
        if not answer:
            raise ValueError("模型返回了空回答")
        yield _sse(
            "done",
            {
                "ok": True,
                "mode": "answer",
                "answer": answer,
                "model": info.get("model", ""),
                "safety_flags": result.flags,
                "sources": sources,
            },
        )
    except ModelUnavailable as exc:
        yield _sse(
            "done",
            {"ok": False, "mode": "degraded", "answer": "", "error": f"模型服务暂不可用：{exc}"},
        )
    except Exception as exc:  # noqa: BLE001 - 流式端点必须兜底，避免连接悬挂
        yield _sse("error", {"message": f"实验助手暂时不可用：{exc}"})
