"""pytest 公共配置：离线状态隔离、假模型响应与 SSE 帧解析。"""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import aigent_service as ai  # noqa: E402
import chem_tools as chem  # noqa: E402


@pytest.fixture(autouse=True)
def reset_ai_state(monkeypatch):
    """每个用例独立运行，避免缓存、指标、模型配置和检索单例串扰。"""
    with ai._cache_lock:
        ai._answer_cache.clear()
    with ai._metrics_lock:
        ai._metrics = {
            "requests": 0,
            "cache_hits": 0,
            "degraded": 0,
            "verify_flags": 0,
            "first_token_ms": [],
            "total_ms": [],
        }
    chem._RETRIEVER = None
    monkeypatch.setattr(ai, "DEEPSEEK_API_KEY", "")
    for name in ("FALLBACK_API_KEY", "VISION_API_KEY", "FALLBACK_MODEL_URL", "FALLBACK_MODEL"):
        monkeypatch.delenv(name, raising=False)
    yield
    with ai._cache_lock:
        ai._answer_cache.clear()
    chem._RETRIEVER = None


class FakeResponse:
    """同时支持非流式 JSON 与流式 SSE 的requests响应替身。"""

    def __init__(self, payload=None, status_code=200, lines=None):
        self.payload = payload or {}
        self.status_code = status_code
        self.lines = lines or []

    def json(self):
        return self.payload

    def iter_lines(self, decode_unicode=True):
        yield from self.lines


@pytest.fixture()
def fake_response():
    return FakeResponse


def parse_sse(frames):
    """把服务端 SSE 帧解析为 ``[(event, data), ...]``，忽略心跳与空帧。"""
    events = []
    for frame in frames:
        for block in frame.split("\n\n"):
            event = "message"
            data = None
            for line in block.splitlines():
                if line.startswith("event: "):
                    event = line[7:]
                elif line.startswith("data: "):
                    data = json.loads(line[6:])
            if data is not None:
                events.append((event, data))
    return events


@pytest.fixture()
def sse_events():
    return parse_sse
