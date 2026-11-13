"""评测模块与视觉服务的工具函数测试（不触发真实模型调用）。"""

import json

import eval_agent
import vision_service


# ---------------------------------------------------------------- 评测：文本归一化
class TestNormalize:
    def test_subscript_conversion(self):
        assert eval_agent.normalize("2H₂O") == "2h2o"

    def test_space_removal(self):
        assert eval_agent.normalize("4 Fe + 3 O2") == "4fe+3o2"

    def test_case_insensitive(self):
        assert eval_agent.normalize("Fe2O3") == eval_agent.normalize("fe2o3")

    def test_none_safe(self):
        assert eval_agent.normalize(None) == ""


class TestKeywordHit:
    def test_empty_keys_always_pass(self):
        assert eval_agent.keyword_hit("任意回答", []) is True

    def test_hit_with_subscript(self):
        # 模型可能输出 2H₂O，关键词写成 2h2o 也应命中
        assert eval_agent.keyword_hit("得到 2H₂O", ["2h2o"]) is True

    def test_miss(self):
        assert eval_agent.keyword_hit("完全无关的内容", ["2h2o"]) is False

    def test_any_key_matches(self):
        assert eval_agent.keyword_hit("答案是 1.008", ["9.99", "1.008"]) is True


# ---------------------------------------------------------------- 评测：用例集完整性
class TestCaseSet:
    def test_case_count(self):
        assert len(eval_agent.CASES) >= 20

    def test_required_fields(self):
        for case in eval_agent.CASES:
            assert "cat" in case
            assert "q" in case
            assert "tool" in case
            assert "keys" in case

    def test_categories_covered(self):
        categories = {case["cat"] for case in eval_agent.CASES}
        assert {
            "元素查询",
            "摩尔质量",
            "方程式配平",
            "反应查询",
            "安全信息",
            "知识检索",
            "安全拦截",
        }.issubset(categories)

    def test_blocked_cases_marked(self):
        blocked = [c for c in eval_agent.CASES if c.get("blocked")]
        assert len(blocked) >= 2
        for case in blocked:
            assert case["tool"] == ""


# ---------------------------------------------------------------- 视觉：工具函数
class TestVisionHelpers:
    def test_strip_data_url(self):
        mime, payload = vision_service._strip_data_url("data:image/png;base64,AAAA")
        assert mime == "image/png"
        assert payload == "AAAA"

    def test_strip_plain_base64(self):
        mime, payload = vision_service._strip_data_url("AAAA")
        assert mime == "image/jpeg"
        assert payload == "AAAA"

    def test_extract_plain_json(self):
        data = vision_service._extract_json('{"type": "equation", "content": "H2 + O2 = H2O"}')
        assert data["type"] == "equation"

    def test_extract_fenced_json(self):
        text = '```json\n{"type": "reagent", "content": "盐酸"}\n```'
        data = vision_service._extract_json(text)
        assert data["type"] == "reagent"

    def test_extract_json_with_noise(self):
        text = '识别结果如下：{"type": "apparatus", "content": "蒸馏装置"} 以上。'
        data = vision_service._extract_json(text)
        assert data["type"] == "apparatus"

    def test_extract_invalid_falls_back(self):
        data = vision_service._extract_json("完全不是 JSON")
        assert data["type"] == "other"
        assert data["confidence"] == "low"

    def test_analyze_without_key_returns_error(self, monkeypatch):
        monkeypatch.setattr(vision_service, "VISION_API_KEY", "")
        result = vision_service.analyze_image("data:image/png;base64,AAAA")
        assert result["ok"] is False
        assert "VISION_API_KEY" in result["error"]


# ---------------------------------------------------------------- MCP：工具注册
class TestMcpServer:
    def test_server_exposes_all_tools(self):
        import mcp_server

        # MCPServer 内部以字典保存工具，键即工具名
        names = set(mcp_server.mcp._tool_manager._tools.keys()) if hasattr(
            mcp_server.mcp, "_tool_manager"
        ) else set()

        if not names:
            import pytest

            pytest.skip("当前 MCP 版本内部结构不同，跳过结构断言")

        assert {
            "query_element",
            "molar_mass",
            "balance_equation",
            "lookup_reaction",
            "get_safety_info",
            "search_knowledge",
        }.issubset(names)

    def test_tool_returns_json_string(self):
        import mcp_server

        raw = mcp_server.balance_equation("Fe + O2 = Fe2O3")
        data = json.loads(raw)
        assert data["ok"] is True
        assert data["配平结果"] == "4 Fe + 3 O2 = 2 Fe2O3"

    def test_resource_returns_catalog(self):
        import mcp_server

        data = json.loads(mcp_server.element_catalog())
        assert data["ok"] is True
        assert data["count"] >= 118
