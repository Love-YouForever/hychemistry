"""实验助手：安全审查、知识库检索与流式事件顺序的离线测试。"""

import json

import lab_agent
from conftest import parse_sse


def test_loads_whitelisted_experiments():
    items = lab_agent.list_experiments()
    assert len(items) >= 5
    ids = {item["experiment_id"] for item in items}
    assert "exp-chloride-ion-test" in ids
    names = {item["experiment_name"] for item in items}
    assert all(names)


def test_unknown_experiment_is_blocked():
    result = lab_agent.review("explode_everything", [], "")
    assert result.decision == "block"
    assert result.flags[0]["code"] == "experiment_not_whitelisted"
    assert result.refusal


def test_forbidden_reagent_is_blocked():
    record = lab_agent.get_experiment("exp-chloride-ion-test")
    assert record and record.forbidden_reagents
    result = lab_agent.review("exp-chloride-ion-test", [record.forbidden_reagents[0]], "")
    assert result.decision == "block"
    assert any(flag["code"] == "forbidden_reagent" for flag in result.flags)


def test_abnormal_phenomenon_only_warns():
    record = lab_agent.get_experiment("exp-chloride-ion-test")
    assert record and record.abnormal_triggers
    result = lab_agent.review("exp-chloride-ion-test", [], record.abnormal_triggers[0])
    assert result.decision == "pass"
    assert any(flag["code"] == "abnormal_phenomenon" for flag in result.flags)


def test_retrieval_is_scoped_to_experiment():
    results = lab_agent.retrieve("氯离子检验的浓度要求", "exp-chloride-ion-test")
    assert results
    assert all(item["source_id"].startswith("exp-chloride-ion-test") for item in results)
    assert results[0]["snippet"]
    assert 0 < results[0]["score"] <= 1.2


def test_retrieval_requires_experiment():
    assert lab_agent.retrieve("浓度", None) == []
    assert lab_agent.retrieve("浓度", "not_exists") == []


def test_retrieval_falls_back_to_experiment_overview():
    results = lab_agent.retrieve("现在该怎么办？", "exp-chloride-ion-test")
    assert results
    assert all(item["source_id"].startswith("exp-chloride-ion-test") for item in results)


def test_warning_prefix_not_duplicated(monkeypatch, fake_response):
    def fake_completion(messages, stream=False):
        return fake_response(
            lines=['data: {"choices":[{"delta":{"content":"【安全警告】先停手"}}]}', "data: [DONE]"]
        ), {"model": "test-model"}

    monkeypatch.setattr(lab_agent, "_request_completion", fake_completion)
    events = parse_sse(
        list(lab_agent.stream_lab_agent("怎么办？", "exp-chloride-ion-test", observed="蒸馏水空白也出现白色沉淀"))
    )
    answer = events[-1][1]["answer"]
    assert answer.count("【安全警告】") == 1


def test_prompt_contains_safety_config_and_sources():
    record = lab_agent.get_experiment("exp-chloride-ion-test")
    sources = lab_agent.retrieve("浓度", "exp-chloride-ion-test")
    messages = lab_agent.build_messages("浓度是多少？", "exp-chloride-ion-test", "", sources)
    assert messages[0]["role"] == "system"
    human = messages[-1]["content"]
    assert record.experiment_name in human
    assert "[1]" in human
    assert "学生提问" in human


def test_stream_emits_safety_first_then_done(monkeypatch, fake_response):
    captured = {}

    def fake_completion(messages, stream=False):
        captured["messages"] = messages
        return fake_response(
            lines=[
                'data: {"choices":[{"delta":{"content":"先加氯化钠"}}]}',
                'data: {"choices":[{"delta":{"content":"，再观察沉淀。"}}]}',
                "data: [DONE]",
            ]
        ), {"model": "test-model"}

    monkeypatch.setattr(lab_agent, "_request_completion", fake_completion)
    events = parse_sse(list(lab_agent.stream_lab_agent("怎么加试剂？", "exp-chloride-ion-test")))
    names = [event for event, _ in events]
    assert names[0] == "safety"
    assert "sources" in names
    assert names[-1] == "done"
    done = events[-1][1]
    assert done["ok"] is True
    assert done["answer"] == "先加氯化钠，再观察沉淀。"
    assert done["model"] == "test-model"
    assert captured["messages"][-1]["role"] == "user"


def test_stream_blocks_before_calling_model(monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("被拦截时不应调用模型")

    monkeypatch.setattr(lab_agent, "_request_completion", boom)
    events = parse_sse(list(lab_agent.stream_lab_agent("随便问", "explode_everything")))
    names = [event for event, _ in events]
    assert names[0] == "safety"
    assert names[-1] == "done"
    assert events[0][1]["mode"] == "blocked"
    assert events[-1][1]["ok"] is False


def test_stream_reports_model_failure(monkeypatch):
    def fail(*args, **kwargs):
        raise lab_agent.ModelUnavailable("all models down")

    monkeypatch.setattr(lab_agent, "_request_completion", fail)
    events = parse_sse(list(lab_agent.stream_lab_agent("怎么加？", "exp-chloride-ion-test")))
    done = events[-1][1]
    assert done["ok"] is False
    assert done["mode"] == "degraded"


def test_data_files_are_valid():
    raw = json.loads(lab_agent.EXPERIMENTS_PATH.read_text(encoding="utf-8-sig"))
    assert raw["experiments"]
    assert lab_agent.KNOWLEDGE_PATH.exists()
    assert lab_agent.load_chunks()


