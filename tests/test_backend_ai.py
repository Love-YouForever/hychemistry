"""Flask AI 接口的离线契约测试，不启动真实服务。"""

import json

import aigent_service as ai
import backend_server as backend
import pytest


@pytest.fixture()
def client():
    backend.app.config.update(TESTING=True)
    return backend.app.test_client()


class TestStreamRoute:
    def test_success_and_surface_forwarded(self, client, monkeypatch):
        seen = {}

        def fake_stream(history, role_name="", surface="home"):
            seen["history"] = history
            seen["role"] = role_name
            seen["surface"] = surface
            yield ai._sse("delta", {"text": "你好"})
            yield ai._sse("done", {"blocked": False})

        monkeypatch.setattr(backend, "stream_agent", fake_stream)
        response = client.post("/api/aigent/chat/stream", json={
            "history": [{"role": "user", "content": "你好"}],
            "role": "",
            "surface": "periodic",
        })
        assert response.status_code == 200
        assert response.mimetype == "text/event-stream"
        assert "event: delta" in response.text
        assert "event: done" in response.text
        assert seen["history"][0]["content"] == "你好"
        assert seen["surface"] == "periodic"

    def test_stream_exception_becomes_error_event(self, client, monkeypatch):
        def failed_stream(history, role_name="", surface="home"):
            raise RuntimeError("离线故障")
            yield

        monkeypatch.setattr(backend, "stream_agent", failed_stream)
        response = client.post("/api/aigent/chat/stream", json={"history": []})
        assert response.status_code == 200
        assert "event: error" in response.text
        payload = json.loads(response.text.split("data: ", 1)[1].strip())
        assert payload["error"] == "离线故障"


class TestJsonRoutes:
    def test_chat_success(self, client, monkeypatch):
        monkeypatch.setattr(backend, "run_agent", lambda history, role, surface: {
            "reply": "答案", "blocked": False, "tool_calls": [],
        })
        response = client.post("/api/aigent/chat", json={"history": []})
        assert response.status_code == 200
        assert response.get_json()["reply"] == "答案"

    def test_chat_upstream_error(self, client, monkeypatch):
        def failed(*args):
            raise RuntimeError("模型离线")

        monkeypatch.setattr(backend, "run_agent", failed)
        response = client.post("/api/aigent/chat", json={"history": []})
        assert response.status_code == 502
        assert response.get_json()["ok"] is False

    def test_quiz_success(self, client, monkeypatch):
        monkeypatch.setattr(backend, "generate_quiz", lambda topic, history: {
            "ok": True, "quiz": {"topic": topic, "questions": []}, "degraded": False,
        })
        response = client.post("/api/aigent/quiz", json={"topic": "氧气"})
        assert response.status_code == 200
        assert response.get_json()["quiz"]["topic"] == "氧气"

    def test_quiz_validation_error(self, client, monkeypatch):
        monkeypatch.setattr(backend, "generate_quiz", lambda topic, history: {
            "ok": False, "error": "主题为空",
        })
        response = client.post("/api/aigent/quiz", json={})
        assert response.status_code == 400
        assert response.get_json()["error"] == "主题为空"

    def test_metrics(self, client):
        ai.record_request(cached=True, first_token_ms=12, total_ms=30)
        response = client.get("/api/metrics")
        payload = response.get_json()
        assert response.status_code == 200
        assert payload["ok"] is True
        assert payload["requests"] == 1
        assert payload["cache_hit_rate"] == 100.0
        assert payload["avg_first_token_ms"] == 12
