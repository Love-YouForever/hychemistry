"""化学工具集的单元测试。

全部为纯函数测试，不依赖网络与 API 密钥，可在 CI 中离线运行。
"""

import chem_tools as chem
import pytest


# ---------------------------------------------------------------- 数据加载
class TestDataLoading:
    def test_elements_loaded(self):
        assert len(chem.ELEMENTS) >= 118, "元素数据应至少包含 118 条"

    def test_elements_sorted_by_number(self):
        numbers = [item["number"] for item in chem.ELEMENTS]
        assert numbers == sorted(numbers)

    def test_known_element_fields(self):
        hydrogen = next(item for item in chem.ELEMENTS if item["symbol"] == "H")
        assert hydrogen["number"] == 1
        assert hydrogen["name_zh"] == "氢"
        assert hydrogen["atomic_mass"] == pytest.approx(1.008, abs=1e-3)

    def test_knowledge_chunks_loaded(self):
        assert len(chem.KNOWLEDGE_CHUNKS) > 500, "元素图鉴应切分出足够多的知识块"


# ---------------------------------------------------------------- 元素查询
class TestQueryElement:
    def test_by_symbol(self):
        result = chem.query_element("Fe")
        assert result["ok"] is True
        assert result["element"]["中文名"] == "铁"
        assert result["element"]["原子序数"] == 26

    def test_by_chinese_name(self):
        result = chem.query_element("钠")
        assert result["ok"] is True
        assert result["element"]["元素符号"] == "Na"
        assert result["element"]["原子序数"] == 11

    def test_by_english_name(self):
        result = chem.query_element("Gold")
        assert result["ok"] is True
        assert result["element"]["中文名"] == "金"

    def test_fuzzy_chinese(self):
        result = chem.query_element("氢元素")
        assert result["ok"] is True
        assert result["element"]["元素符号"] == "H"

    def test_not_found(self):
        result = chem.query_element("不存在的元素XYZ")
        assert result["ok"] is False
        assert "未找到" in result["error"]

    def test_empty_query(self):
        assert chem.query_element("")["ok"] is False


# ---------------------------------------------------------------- 摩尔质量
class TestMolarMass:
    @pytest.mark.parametrize(
        "formula,expected",
        [
            ("H2O", 18.015),
            ("CO2", 44.009),
            ("Ca(OH)2", 74.092),
            ("H2SO4", 98.079),
            ("NaCl", 58.44),
        ],
    )
    def test_simple_formulas(self, formula, expected):
        result = chem.molar_mass(formula)
        assert result["ok"] is True
        assert result["摩尔质量"] == pytest.approx(expected, abs=0.05)

    def test_hydrate(self):
        # 胆矾 CuSO4·5H2O
        result = chem.molar_mass("CuSO4·5H2O")
        assert result["ok"] is True
        assert result["摩尔质量"] == pytest.approx(249.677, abs=0.1)

    def test_nested_parentheses(self):
        # 碳酸氢铵 NH4HCO3 用括号形式验证分组解析
        result = chem.molar_mass("(NH4)2CO3")
        assert result["ok"] is True
        assert result["摩尔质量"] == pytest.approx(96.09, abs=0.1)

    def test_composition_detail(self):
        result = chem.molar_mass("H2O")
        symbols = {item["元素"] for item in result["组成"]}
        assert symbols == {"H", "O"}

    def test_invalid_formula(self):
        result = chem.molar_mass("H2O@#$")
        assert result["ok"] is False

    def test_unknown_symbol(self):
        result = chem.molar_mass("Xx2O")
        assert result["ok"] is False
        assert "未知元素" in result["error"]

    def test_empty(self):
        assert chem.molar_mass("")["ok"] is False


# ---------------------------------------------------------------- 方程式配平
class TestBalanceEquation:
    @pytest.mark.parametrize(
        "equation,expected",
        [
            ("Fe + O2 = Fe2O3", "4 Fe + 3 O2 = 2 Fe2O3"),
            ("H2 + O2 = H2O", "2 H2 + O2 = 2 H2O"),
            ("CH4 + O2 = CO2 + H2O", "CH4 + 2 O2 = CO2 + 2 H2O"),
            ("KClO3 = KCl + O2", "2 KClO3 = 2 KCl + 3 O2"),
            ("Al + HCl = AlCl3 + H2", "2 Al + 6 HCl = 2 AlCl3 + 3 H2"),
            ("NaOH + HCl = NaCl + H2O", "NaOH + HCl = NaCl + H2O"),
        ],
    )
    def test_balance(self, equation, expected):
        result = chem.balance_equation(equation)
        assert result["ok"] is True
        assert result["配平结果"] == expected

    def test_arrow_supported(self):
        result = chem.balance_equation("H2 + O2 → H2O")
        assert result["ok"] is True
        assert result["配平结果"] == "2 H2 + O2 = 2 H2O"

    def test_coefficients_are_integers(self):
        result = chem.balance_equation("Fe + O2 = Fe2O3")
        assert result["系数"] == [4, 3, 2]

    def test_missing_equals(self):
        result = chem.balance_equation("Fe + O2 Fe2O3")
        assert result["ok"] is False
        assert "等号" in result["error"]

    def test_invalid_formula(self):
        assert chem.balance_equation("Fe + Xx2 = FeXx")["ok"] is False

    def test_empty(self):
        assert chem.balance_equation("")["ok"] is False


# ---------------------------------------------------------------- 反应查询
class TestLookupReaction:
    def test_known_reaction(self):
        result = chem.lookup_reaction(["盐酸", "锌"])
        assert result["ok"] is True
        assert result["found"] is True
        assert "置换" in result["反应类型"]
        assert "H₂" in result["化学方程式"] or "H2" in result["化学方程式"]

    def test_order_independent(self):
        a = chem.lookup_reaction(["盐酸", "锌"])
        b = chem.lookup_reaction(["锌", "盐酸"])
        assert a["化学方程式"] == b["化学方程式"]

    def test_precipitate_reaction(self):
        result = chem.lookup_reaction(["硝酸银", "氯化钠"])
        assert result["found"] is True
        assert "白色沉淀" in result["实验现象"]

    def test_unknown_reaction(self):
        result = chem.lookup_reaction(["水", "沙子"])
        assert result["ok"] is True
        assert result["found"] is False
        assert "暂无" in result["提示"]

    def test_insufficient_reactants(self):
        assert chem.lookup_reaction(["盐酸"])["ok"] is False


# ---------------------------------------------------------------- 安全查询
class TestSafetyInfo:
    def test_known_chemical(self):
        result = chem.get_safety_info("浓硫酸")
        assert result["ok"] is True
        assert result["found"] is True
        assert "腐蚀" in result["危险性"]
        assert "水" in result["防护要求"]

    def test_fuzzy_match(self):
        result = chem.get_safety_info("氢氧化钠溶液")
        assert result["found"] is True
        assert result["化学品"] == "氢氧化钠"

    def test_unknown_chemical(self):
        result = chem.get_safety_info("葡萄糖")
        assert result["ok"] is True
        assert result["found"] is False

    def test_empty(self):
        assert chem.get_safety_info("")["ok"] is False


# ---------------------------------------------------------------- 知识检索
class TestKnowledgeSearch:
    def test_returns_results(self):
        result = chem.search_knowledge("氢的用途")
        assert result["ok"] is True
        assert result["found"] is True
        assert len(result["results"]) <= 3

    def test_result_has_source(self):
        result = chem.search_knowledge("氧元素")
        assert result["found"] is True
        assert result["results"][0]["来源"].startswith("元素图鉴·")

    def test_empty_query(self):
        assert chem.search_knowledge("")["ok"] is False


# ---------------------------------------------------------------- 工具分发
class TestExecuteTool:
    def test_dispatch_query_element(self):
        result = chem.execute_tool("query_element", {"query": "H"})
        assert result["ok"] is True

    def test_dispatch_balance(self):
        result = chem.execute_tool("balance_equation", {"equation": "H2 + O2 = H2O"})
        assert result["ok"] is True

    def test_unknown_tool(self):
        result = chem.execute_tool("not_exist", {})
        assert result["ok"] is False
        assert "未知工具" in result["error"]

    def test_bad_arguments_does_not_raise(self):
        # 参数类型错误时应返回结构化错误而非抛异常
        result = chem.execute_tool("lookup_reaction", {"reactants": "字符串而非列表"})
        assert isinstance(result, dict)

    def test_tool_schemas_complete(self):
        names = {item["function"]["name"] for item in chem.TOOL_SCHEMAS}
        assert names == {
            "query_element",
            "molar_mass",
            "balance_equation",
            "lookup_reaction",
            "get_safety_info",
            "search_knowledge",
        }
        for schema in chem.TOOL_SCHEMAS:
            assert schema["type"] == "function"
            assert "description" in schema["function"]
            assert "parameters" in schema["function"]
