"""双场景动作白名单、SSE 顺序与缓存重放测试。"""

import json

import aigent_service as ai
import scene_actions as scene


class TestActionValidation:
    def test_highlight_and_id(self):
        result = scene.execute_control_scene("periodic", {
            "action": "highlight_elements", "params": {"symbols": ["O", "O", "H"]},
        })
        assert result["ok"] is True
        assert result["action"]["params"]["symbols"] == ["O", "H"]
        assert result["action"]["id"].startswith("scene-")
        assert result["action"]["target"] == "periodic"

    def test_focus_temperature_clear_and_reset(self):
        cases = [
            ("focus_element", {"symbol": "Fe"}),
            ("set_temperature", {"kelvin": 298.15}),
            ("clear_highlight", {}),
            ("reset_view", {}),
        ]
        for action, params in cases:
            result = scene.execute_control_scene("periodic", {"action": action, "params": params})
            assert result["ok"] is True, result
            assert result["action"]["action"] == action

    def test_temperature_bounds(self):
        for value in (-1, 6001, "300", True):
            result = scene.execute_control_scene("periodic", {
                "action": "set_temperature", "params": {"kelvin": value},
            })
            assert result["ok"] is False

    def test_focus_equipment(self):
        result = scene.execute_control_scene("lab", {
            "action": "focus_equipment", "params": {"equipment": "beaker"},
        })
        assert result["ok"] is True
        assert result["action"]["params"] == {"equipment": "beaker"}

    def test_focus_reagent_requires_matching_type(self):
        valid = scene.execute_control_scene("lab", {
            "action": "focus_equipment", "params": {"equipment": "reagent-liquid", "reagent": "HCl"},
        })
        invalid = scene.execute_control_scene("lab", {
            "action": "focus_equipment", "params": {"equipment": "beaker", "reagent": "HCl"},
        })
        assert valid["ok"] is True
        assert invalid["ok"] is False

    def test_load_reaction_returns_separate_items(self):
        result = scene.execute_control_scene("lab", {
            "action": "load_reaction", "params": {"reaction": "AgNO3+NaCl"},
        })
        assert result["ok"] is True
        params = result["action"]["params"]
        assert params["loaded_only"] is True
        assert params["items"][0] == {"type": "beaker"}
        assert {item["reagent"] for item in params["items"][1:]} == {"AgNO3", "NaCl"}
        assert "mix" not in params and "heat" not in params

    def test_unsafe_or_unknown_reaction_rejected(self):
        for reaction in ("H2SO4+H2O", "Ethanol+KMnO4", "unknown"):
            result = scene.execute_control_scene("lab", {
                "action": "load_reaction", "params": {"reaction": reaction},
            })
            assert result["ok"] is False

    def test_cross_surface_action_rejected(self):
        result = scene.execute_control_scene("lab", {
            "action": "set_temperature", "params": {"kelvin": 300},
        })
        assert result["ok"] is False

    def test_script_selector_coordinates_and_unknown_fields_rejected(self):
        cases = [
            {"action": "focus_element", "params": {"symbol": "O", "selector": "#app"}},
            {"action": "focus_element", "params": {"symbol": "O", "x": 10}},
            {"action": "focus_element", "params": {"symbol": "<script>"}},
            {"action": "highlight_elements", "params": {"symbols": ["O"]}, "code": "alert(1)"},
        ]
        for arguments in cases:
            assert scene.execute_control_scene("periodic", arguments)["ok"] is False

    def test_home_has_no_control(self):
        assert scene.execute_control_scene("home", {
            "action": "reset_view", "params": {},
        })["ok"] is False


class TestDerivedActions:
    def test_query_element_derives_highlight(self):
        actions = scene.derive_actions("periodic", "query_element", {
            "ok": True, "element": {"元素符号": "O"},
        })
        assert actions[0]["params"]["symbols"] == ["O"]

    def test_search_results_derive_unique_symbols(self):
        actions = scene.derive_actions("periodic", "search_knowledge", {
            "ok": True,
            "results": [{"来源": "元素图鉴·氧"}, {"来源": "元素图鉴·氧"}, {"来源": "元素图鉴·碳"}],
        })
        assert actions[0]["params"]["symbols"] == ["O", "C"]

    def test_failed_tool_does_not_derive(self):
        assert scene.derive_actions("periodic", "query_element", {"ok": False}) == []

    def test_role_and_document_do_not_get_control_schema(self):
        assert scene.tools_for_surface("periodic", "居里夫人") is None
        assert scene.tools_for_surface("periodic", is_doc=True) is None
        assert scene.tools_for_surface("home") is None
        assert scene.tools_for_surface("lab")["function"]["name"] == "control_scene"


class TestSceneSse:
    def install_rounds(self, monkeypatch):
        rounds = [
            {"content": "", "calls": [{
                "id": "scene-call", "type": "function", "function": {
                    "name": "control_scene",
                    "arguments": json.dumps({"action": "highlight_elements", "params": {"symbols": ["O"]}}),
                },
            }]},
            {"content": "已高亮氧元素。", "calls": []},
        ]
        calls = []
        round_index = 0

        def fake_round(messages, tools):
            nonlocal round_index
            calls.append(tools)
            item = rounds[min(round_index, 1)]
            round_index += 1
            yield "meta", {"model": "fake", "fallback": False}
            if item["content"]:
                yield "delta", item["content"]
            yield "result", (item["content"], item["calls"])
            if item["content"]:
                round_index = 0

        monkeypatch.setattr(ai, "_stream_round", fake_round)
        return calls

    def test_action_after_tool_result_and_cached_replay(self, monkeypatch, sse_events):
        calls = self.install_rounds(monkeypatch)
        history = [{"role": "user", "content": "请高亮氧元素"}]
        events = sse_events(ai.stream_agent(history, surface="periodic"))
        names = [name for name, _ in events]
        assert names.index("tool_result") < names.index("scene_action") < names.index("done")
        action = next(data for name, data in events if name == "scene_action")
        assert action["params"]["symbols"] == ["O"]
        assert events[-1][1]["actions"] == [action]
        assert any(schema["function"]["name"] == "control_scene" for schema in calls[0])

        replay = sse_events(ai.stream_agent(history, surface="periodic"))
        assert len(calls) == 2
        assert replay[-1][1]["cached"] is True
        assert next(data for name, data in replay if name == "scene_action") == action

    def test_non_home_cache_is_exact_only(self, monkeypatch, sse_events):
        calls = self.install_rounds(monkeypatch)
        history = [{"role": "user", "content": "请高亮氧元素"}]
        list(ai.stream_agent(history, surface="periodic"))
        list(ai.stream_agent([{"role": "user", "content": "请高亮氧元素吗"}], surface="periodic"))
        assert len(calls) == 4

    def test_role_interview_generates_no_action(self, monkeypatch, sse_events):
        calls = self.install_rounds(monkeypatch)
        events = sse_events(ai.stream_agent(
            [{"role": "user", "content": "请高亮氧元素"}], "居里夫人", "periodic"
        ))
        assert not any(name == "scene_action" for name, _ in events)
        assert all(not any(schema["function"]["name"] == "control_scene" for schema in (tools or [])) for tools in calls)
