"""化学工具集：为 AI 助教「小幻语」提供确定、可验证的化学计算与查询能力。

设计原则
--------
大模型擅长表达但不擅长精确计算，因此把「元素性质、摩尔质量、方程式配平、
反应查询、危化品安全、知识检索」这些确定性能力做成独立工具，
由模型通过 Function Calling 主动调用，避免幻觉并让推理过程可追溯。

数据来源
--------
- pages/Periodic_Table/PeriodicTableJSON.json     元素周期表结构化数据
- pages/Periodic_Table/交互式元素周期表/description/*.txt  118 个元素的科普文本（RAG 语料）
"""

from __future__ import annotations

import json
import os
import re
from fractions import Fraction
from pathlib import Path
from typing import Any

from rag_engine import HybridRetriever, load_chunks

BASE_DIR = Path(__file__).resolve().parent.parent
PERIODIC_DIR = BASE_DIR / "pages" / "Periodic_Table"
ELEMENTS_JSON = PERIODIC_DIR / "PeriodicTableJSON.json"
DESCRIPTION_DIR = PERIODIC_DIR / "交互式元素周期表" / "description"

# 元素中文名（按原子序数 1–118 排列）
ELEMENT_NAMES_ZH = [
    "氢", "氦", "锂", "铍", "硼", "碳", "氮", "氧", "氟", "氖",
    "钠", "镁", "铝", "硅", "磷", "硫", "氯", "氩", "钾", "钙",
    "钪", "钛", "钒", "铬", "锰", "铁", "钴", "镍", "铜", "锌",
    "镓", "锗", "砷", "硒", "溴", "氪", "铷", "锶", "钇", "锆",
    "铌", "钼", "锝", "钌", "铑", "钯", "银", "镉", "铟", "锡",
    "锑", "碲", "碘", "氙", "铯", "钡", "镧", "铈", "镨", "钕",
    "钷", "钐", "铕", "钆", "铽", "镝", "钬", "铒", "铥", "镱",
    "镥", "铪", "钽", "钨", "铼", "锇", "铱", "铂", "金", "汞",
    "铊", "铅", "铋", "钋", "砹", "氡", "钫", "镭", "锕", "钍",
    "镤", "铀", "镎", "钚", "镅", "锔", "锫", "锎", "锿", "镄",
    "钔", "锘", "铹", "𬬻", "𬭊", "𬭳", "𬭛", "𬭶", "鿏", "𫟼",
    "𬬭", "鿔", "鿭", "𫓧", "镆", "𫟷", "鿬", "鿫",
]

# 常见危化品安全信息（用于安全查询与危险请求判定）
SAFETY_DB: dict[str, dict[str, str]] = {
    "浓硫酸": {
        "hazard": "强腐蚀性、强脱水性，稀释时剧烈放热",
        "protect": "必须把酸沿器壁缓缓注入水中并不断搅拌，严禁将水倒入酸中",
        "firstaid": "皮肤接触立即用大量流动清水冲洗 15 分钟，再涂 3% 碳酸氢钠溶液",
    },
    "盐酸": {
        "hazard": "强酸性、挥发出的氯化氢刺激呼吸道",
        "protect": "通风橱内取用，佩戴护目镜与手套",
        "firstaid": "皮肤接触用大量清水冲洗后涂碳酸氢钠溶液",
    },
    "硝酸": {
        "hazard": "强氧化性、强腐蚀性，见光分解产生二氧化氮",
        "protect": "避光保存，远离还原性物质，通风橱内操作",
        "firstaid": "皮肤接触立即大量清水冲洗并就医",
    },
    "氢氧化钠": {
        "hazard": "强碱性，腐蚀皮肤与眼睛，潮解时放热",
        "protect": "用药匙取用，佩戴手套与护目镜，切勿用手直接接触",
        "firstaid": "皮肤接触大量清水冲洗后涂 2% 硼酸溶液",
    },
    "氨水": {
        "hazard": "挥发出氨气，强烈刺激呼吸道和眼睛",
        "protect": "必须在通风橱内取用，避免直接吸入",
        "firstaid": "吸入后迅速转移至通风处，保持呼吸道通畅并就医",
    },
    "硝酸银": {
        "hazard": "腐蚀皮肤、见光分解，沾染后皮肤留下黑斑",
        "protect": "避光保存，避免直接接触皮肤",
        "firstaid": "皮肤接触用大量清水冲洗",
    },
    "氯化钡": {
        "hazard": "可溶性钡盐有毒，误食可致中毒",
        "protect": "严禁入口，操作后洗手",
        "firstaid": "误食立即就医，切勿催吐",
    },
    "高锰酸钾": {
        "hazard": "强氧化剂，与有机物或还原剂混合研磨可燃烧爆炸",
        "protect": "严禁与还原性物质混合研磨，避免受热",
        "firstaid": "皮肤接触用大量清水冲洗",
    },
    "过氧化氢": {
        "hazard": "受热或遇催化剂剧烈分解释放氧气，助燃",
        "protect": "远离火源，避免与有机物混放，避光保存",
        "firstaid": "溅入眼睛立即用大量清水冲洗并就医",
    },
    "乙醇": {
        "hazard": "易燃，闪点约 13 ℃，蒸气与空气可形成爆炸性混合物",
        "protect": "远离明火，密封存放于防火柜",
        "firstaid": "起火用干粉或二氧化碳灭火器，禁止用水",
    },
    "镁": {
        "hazard": "易燃，燃烧发出强光并放热，不能用水扑灭",
        "protect": "远离火源，着火用干砂覆盖",
        "firstaid": "灼伤后冷水冲洗并就医",
    },
    "硫": {
        "hazard": "易燃固体，燃烧生成刺激性二氧化硫",
        "protect": "远离火源，通风处少量取用",
        "firstaid": "吸入二氧化硫后转移至通风处并就医",
    },
}

# 常见反应库（与前端实验室保持一致）
REACTION_DB: dict[str, dict[str, str]] = {
    "HCl+NaOH": {"type": "中和反应", "equation": "HCl + NaOH → NaCl + H₂O", "phenomenon": "放热，溶液温度升高"},
    "HCl+Zn": {"type": "置换反应", "equation": "Zn + 2HCl → ZnCl₂ + H₂↑", "phenomenon": "产生大量气泡（氢气）"},
    "H2SO4+Zn": {"type": "置换反应", "equation": "Zn + H₂SO₄ → ZnSO₄ + H₂↑", "phenomenon": "产生气泡"},
    "HCl+Fe": {"type": "置换反应", "equation": "Fe + 2HCl → FeCl₂ + H₂↑", "phenomenon": "冒气泡，溶液变浅绿色"},
    "HCl+Mg": {"type": "置换反应", "equation": "Mg + 2HCl → MgCl₂ + H₂↑", "phenomenon": "剧烈反应，大量气泡"},
    "AgNO3+NaCl": {"type": "复分解反应", "equation": "AgNO₃ + NaCl → AgCl↓ + NaNO₃", "phenomenon": "生成白色沉淀"},
    "BaCl2+Na2CO3": {"type": "复分解反应", "equation": "BaCl₂ + Na₂CO₃ → BaCO₃↓ + 2NaCl", "phenomenon": "生成白色沉淀"},
    "CuSO4+NaOH": {"type": "复分解反应", "equation": "CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄", "phenomenon": "生成蓝色沉淀"},
    "FeCl3+NaOH": {"type": "复分解反应", "equation": "FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl", "phenomenon": "生成红褐色沉淀"},
    "HCl+CaCO3": {"type": "复分解反应", "equation": "CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑", "phenomenon": "产生气泡，石灰石溶解"},
    "NaOH+Phenolphthalein": {"type": "指示剂变色", "equation": "NaOH + 酚酞 → 溶液变红", "phenomenon": "无色变红色"},
    "FeCl3+KSCN": {"type": "配合反应", "equation": "FeCl₃ + 3KSCN → Fe(SCN)₃", "phenomenon": "溶液变血红色"},
    "CuSO4+Fe": {"type": "置换反应", "equation": "Fe + CuSO₄ → FeSO₄ + Cu", "phenomenon": "铁表面析出红色铜"},
    "H2O2+MnO2": {"type": "催化分解", "equation": "2H₂O₂ --MnO₂--> 2H₂O + O₂↑", "phenomenon": "剧烈冒泡"},
}

# 试剂别名 → 反应库使用的简写
_REAGENT_ALIASES = {
    "盐酸": "HCl", "硫酸": "H2SO4", "硝酸": "HNO3", "氢氧化钠": "NaOH",
    "硝酸银": "AgNO3", "氯化钠": "NaCl", "硫酸铜": "CuSO4", "氯化铁": "FeCl3",
    "氯化钡": "BaCl2", "碳酸钠": "Na2CO3", "酚酞": "Phenolphthalein",
    "硫氰化钾": "KSCN", "双氧水": "H2O2", "过氧化氢": "H2O2",
    "锌": "Zn", "铁": "Fe", "镁": "Mg", "铜": "Cu", "碳酸钙": "CaCO3",
    "二氧化锰": "MnO2",
}

# 危险请求关键词：命中即拒绝并转入安全教育
# 注意：这里只放「明确的非法操作短语」，不要放孤立的名词。
# 原因：学生可能正常提问「冰毒的危害有哪些」「TNT 的分子结构」，
# 孤立的危险品名词交给下面的正则按「名词 + 操作动词」组合判定。
DANGEROUS_PATTERNS = [
    "制毒", "毒品合成", "吗啡合成",
    "炸药配方", "制作炸弹", "爆炸物配方", "硝化甘油制作",
    "自制枪", "投毒", "毒杀", "麻醉剂配方",
    "在家合成", "如何提炼", "提纯毒品",
]

# 组合式危险意图：应对「制作炸药的配方」这类中间插词的表达
DANGEROUS_REGEX = [
    r"(炸药|炸弹|爆炸物|雷管|tnt|硝化甘油).{0,8}(配方|制作|合成|做法|方法|怎么|教程)",
    r"(制作|制造|合成|自制|提炼|配制|合成).{0,6}(炸药|炸弹|爆炸物|毒品|冰毒|海洛因|迷药|毒气)",
    r"(毒品|冰毒|海洛因|摇头丸|吗啡|致幻剂).{0,8}(合成|制作|提纯|配方|工艺|步骤)",
    r"(神经毒剂|沙林|芥子气|化学武器|毒气弹).{0,8}(合成|制作|配方|方法|步骤)",
    r"(如何|怎么).{0,4}(自杀|自残)",
]


# ---------------------------------------------------------------- 数据加载
def _load_elements() -> list[dict[str, Any]]:
    """加载元素周期表数据，并按原子序数排序。"""
    if not ELEMENTS_JSON.is_file():
        return []

    raw = json.loads(ELEMENTS_JSON.read_text(encoding="utf-8"))
    items = raw.get("elements", [])

    elements = []
    for item in items:
        number = item.get("number")
        if not isinstance(number, int) or number < 1:
            continue
        mass = item.get("atomic_mass")
        elements.append(
            {
                "number": number,
                "symbol": item.get("symbol", ""),
                "name_en": item.get("name", ""),
                "name_zh": ELEMENT_NAMES_ZH[number - 1] if number <= len(ELEMENT_NAMES_ZH) else "",
                "atomic_mass": mass,
                "category": item.get("category", ""),
                "phase": item.get("phase", ""),
                "density": item.get("density"),
                "melt": item.get("melt"),
                "boil": item.get("boil"),
                "discovered_by": item.get("discovered_by", ""),
                "summary": item.get("summary", ""),
            }
        )

    elements.sort(key=lambda e: e["number"])
    return elements


ELEMENTS = _load_elements()
_ELEMENT_BY_SYMBOL = {e["symbol"].lower(): e for e in ELEMENTS if e["symbol"]}
_ELEMENT_BY_NAME_EN = {e["name_en"].lower(): e for e in ELEMENTS if e["name_en"]}
_ELEMENT_BY_NAME_ZH = {e["name_zh"]: e for e in ELEMENTS if e["name_zh"]}
_ATOMIC_WEIGHT = {e["symbol"]: float(e["atomic_mass"]) for e in ELEMENTS if e["atomic_mass"]}


# ---------------------------------------------------------------- 工具 1：元素查询
def query_element(query: str) -> dict[str, Any]:
    """按元素符号、中文名或英文名查询元素性质。"""
    if not query:
        return {"ok": False, "error": "缺少查询关键字"}

    key = query.strip()
    element = (
        _ELEMENT_BY_SYMBOL.get(key.lower())
        or _ELEMENT_BY_NAME_ZH.get(key)
        or _ELEMENT_BY_NAME_EN.get(key.lower())
    )

    # 中文模糊匹配（如「氢元素」）
    if element is None:
        for zh_name, item in _ELEMENT_BY_NAME_ZH.items():
            if zh_name in key:
                element = item
                break

    if element is None:
        return {"ok": False, "error": f"未找到元素：{query}"}

    return {
        "ok": True,
        "element": {
            "原子序数": element["number"],
            "元素符号": element["symbol"],
            "中文名": element["name_zh"],
            "英文名": element["name_en"],
            "相对原子质量": element["atomic_mass"],
            "类别": element["category"],
            "常温状态": element["phase"],
            "熔点(K)": element["melt"],
            "沸点(K)": element["boil"],
            "密度": element["density"],
            "发现者": element["discovered_by"],
        },
    }


# ---------------------------------------------------------------- 工具 2：摩尔质量
def _parse_formula(formula: str) -> dict[str, float]:
    """解析化学式并返回各元素原子个数（支持括号与结晶水）。"""
    text = formula.replace(" ", "").replace("·", ".").replace("•", ".")

    # 结晶水：CuSO4.5H2O
    if "." in text:
        parts = text.split(".")
        total: dict[str, float] = {}
        for index, part in enumerate(parts):
            multiplier = 1.0
            match = re.match(r"^(\d+)(.*)$", part)
            if match and index > 0:
                multiplier = float(match.group(1))
                part = match.group(2)
            for symbol, count in _parse_formula(part).items():
                total[symbol] = total.get(symbol, 0) + count * multiplier
        return total

    tokens = re.findall(r"([A-Z][a-z]?|\(|\)|\d+)", text)
    if "".join(tokens) != text:
        raise ValueError(f"无法解析的化学式：{formula}")

    stack: list[dict[str, float]] = [{}]
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == "(":
            stack.append({})
        elif token == ")":
            group = stack.pop()
            multiplier = 1
            if index + 1 < len(tokens) and tokens[index + 1].isdigit():
                multiplier = int(tokens[index + 1])
                index += 1
            for symbol, count in group.items():
                stack[-1][symbol] = stack[-1].get(symbol, 0) + count * multiplier
        elif token.isdigit():
            raise ValueError(f"化学式中数字位置异常：{formula}")
        else:
            count = 1
            if index + 1 < len(tokens) and tokens[index + 1].isdigit():
                count = int(tokens[index + 1])
                index += 1
            if token not in _ATOMIC_WEIGHT:
                raise ValueError(f"未知元素符号：{token}")
            stack[-1][token] = stack[-1].get(token, 0) + count
        index += 1

    return stack[0]


def molar_mass(formula: str) -> dict[str, Any]:
    """计算化学式的摩尔质量（g/mol）。"""
    if not formula:
        return {"ok": False, "error": "缺少化学式"}

    try:
        composition = _parse_formula(formula)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}

    total = sum(_ATOMIC_WEIGHT[symbol] * count for symbol, count in composition.items())
    detail = [
        {"元素": symbol, "原子个数": count, "小计": round(_ATOMIC_WEIGHT[symbol] * count, 3)}
        for symbol, count in composition.items()
    ]
    return {
        "ok": True,
        "化学式": formula,
        "摩尔质量": round(total, 3),
        "单位": "g/mol",
        "组成": detail,
    }


# ---------------------------------------------------------------- 工具 3：方程式配平
def _split_side(side: str) -> list[dict[str, float]]:
    items = []
    for term in side.split("+"):
        term = term.strip()
        if term:
            items.append(_parse_formula(term))
    return items


def balance_equation(equation: str) -> dict[str, Any]:
    """配平化学方程式，返回最小整数系数。"""
    if not equation:
        return {"ok": False, "error": "缺少方程式"}

    normalized = equation.replace("→", "=").replace("->", "=").replace("——>", "=")
    if "=" not in normalized:
        return {"ok": False, "error": "方程式缺少等号或箭头，示例：Fe + O2 = Fe2O3"}

    left_text, right_text = normalized.split("=", 1)
    try:
        left = _split_side(left_text)
        right = _split_side(right_text)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}

    symbols: list[str] = []
    for group in left + right:
        for symbol in group:
            if symbol not in symbols:
                symbols.append(symbol)

    # 构造元素守恒矩阵：左侧系数为正，右侧为负，求解 A·x = 0
    rows = []
    for symbol in symbols:
        row = [group.get(symbol, 0) for group in left] + [-group.get(symbol, 0) for group in right]
        rows.append([Fraction(value) for value in row])

    columns = len(left) + len(right)
    # 最后一个系数固定为 1，转为非齐次线性方程组
    matrix = [row[:-1] + [-row[-1]] for row in rows]
    pivot_row = 0
    pivot_cols: list[int] = []
    for col in range(columns - 1):
        selected = None
        for r in range(pivot_row, len(matrix)):
            if matrix[r][col] != 0:
                selected = r
                break
        if selected is None:
            continue
        matrix[pivot_row], matrix[selected] = matrix[selected], matrix[pivot_row]
        divisor = matrix[pivot_row][col]
        matrix[pivot_row] = [value / divisor for value in matrix[pivot_row]]
        for r in range(len(matrix)):
            if r != pivot_row and matrix[r][col] != 0:
                factor = matrix[r][col]
                matrix[r] = [a - factor * b for a, b in zip(matrix[r], matrix[pivot_row])]
        pivot_cols.append(col)
        pivot_row += 1
        if pivot_row == len(matrix):
            break

    solution = [Fraction(0)] * (columns - 1)
    for r, col in enumerate(pivot_cols):
        solution[col] = matrix[r][-1]
    solution.append(Fraction(1))

    if any(value <= 0 for value in solution):
        return {"ok": False, "error": "无法得到合理配平系数，请检查化学式是否书写正确"}

    denominators = [value.denominator for value in solution]
    common = 1
    for denominator in denominators:
        common = common * denominator // _gcd(common, denominator)
    integers = [int(value * common) for value in solution]
    divisor = integers[0]
    for value in integers[1:]:
        divisor = _gcd(divisor, value)
    if divisor > 1:
        integers = [value // divisor for value in integers]

    terms_left = [term.strip() for term in left_text.split("+")]
    terms_right = [term.strip() for term in right_text.split("+")]
    balanced_left = " + ".join(
        (f"{coef} " if coef != 1 else "") + term for coef, term in zip(integers[: len(left)], terms_left)
    )
    balanced_right = " + ".join(
        (f"{coef} " if coef != 1 else "") + term for coef, term in zip(integers[len(left):], terms_right)
    )

    return {
        "ok": True,
        "原式": equation,
        "配平结果": f"{balanced_left} = {balanced_right}",
        "系数": integers,
        "说明": "系数为最小正整数比",
    }


def _gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return abs(a)


# ---------------------------------------------------------------- 工具 4：反应查询
def lookup_reaction(reactants: list[str]) -> dict[str, Any]:
    """查询两种试剂混合后的反应现象。"""
    if not reactants or len(reactants) < 2:
        return {"ok": False, "error": "请提供至少两种反应物"}

    codes = []
    for name in reactants[:2]:
        cleaned = name.strip()
        codes.append(_REAGENT_ALIASES.get(cleaned, cleaned))

    key = "+".join(sorted(codes))
    reaction = REACTION_DB.get(key)

    if reaction is None:
        return {
            "ok": True,
            "found": False,
            "提示": f"反应库中暂无 {' + '.join(reactants)} 的记录，请勿臆测，建议学生查阅教材或咨询教师",
        }

    return {
        "ok": True,
        "found": True,
        "反应类型": reaction["type"],
        "化学方程式": reaction["equation"],
        "实验现象": reaction["phenomenon"],
    }


# ---------------------------------------------------------------- 工具 5：安全查询
def get_safety_info(chemical: str) -> dict[str, Any]:
    """查询危化品的危险性、防护要求与急救措施。"""
    if not chemical:
        return {"ok": False, "error": "缺少化学品名称"}

    name = chemical.strip()
    info = SAFETY_DB.get(name)
    if info is None:
        for key, value in SAFETY_DB.items():
            if key in name or name in key:
                name, info = key, value
                break

    if info is None:
        return {
            "ok": True,
            "found": False,
            "提示": f"安全库中暂无「{chemical}」的条目，请按实验室通用规范操作并咨询指导教师",
        }

    return {
        "ok": True,
        "found": True,
        "化学品": name,
        "危险性": info["hazard"],
        "防护要求": info["protect"],
        "急救措施": info["firstaid"],
    }


# ---------------------------------------------------------------- 工具 6：知识检索（混合 RAG）
# 语料为 118 篇元素图鉴，切分为句子级知识块后建立 BM25 + 向量混合索引。
KNOWLEDGE_CHUNKS = load_chunks(DESCRIPTION_DIR)
INDEX_DIR = Path(__file__).resolve().parent / "knowledge_index"
_RETRIEVER: HybridRetriever | None = None


def _get_retriever() -> HybridRetriever:
    """惰性初始化检索器，确保此时环境变量已加载完成。"""
    global _RETRIEVER
    if _RETRIEVER is None:
        api_key = (
            os.getenv("EMBED_API_KEY")
            or os.getenv("VISION_API_KEY")
            or os.getenv("DEEPSEEK_API_KEY")
            or ""
        )
        _RETRIEVER = HybridRetriever(KNOWLEDGE_CHUNKS, INDEX_DIR, api_key)
    return _RETRIEVER


def search_knowledge(query: str, top_k: int = 3) -> dict[str, Any]:
    """在元素知识库中检索最相关的片段，并返回来源与命中方式。

    采用 BM25 稀疏检索与向量语义检索的混合方案：
    - 关键词精确命中（元素名、术语）由 BM25 覆盖
    - 语义相近但用词不同的表达由向量检索覆盖
    - 两路结果经 RRF 融合后按领域规则重排
    """
    if not query:
        return {"ok": False, "error": "缺少检索关键字"}

    retriever = _get_retriever()
    results = retriever.search(query, top_k)

    return {
        "ok": True,
        "found": bool(results),
        "results": results,
        "检索模式": "BM25 + 向量混合检索" if retriever.vector_enabled else "BM25（向量索引未启用）",
        "提示": "以上内容来自项目内置的元素图鉴，回答时请注明来源",
    }


# ---------------------------------------------------------------- 工具注册
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "query_element",
            "description": "查询化学元素的原子序数、相对原子质量、类别、熔沸点等性质。参数可传元素符号（H）、中文名（氢）或英文名（Hydrogen）。",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "元素符号、中文名或英文名"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "molar_mass",
            "description": "计算化学式的摩尔质量（相对分子质量），支持括号与结晶水，如 Ca(OH)2、CuSO4·5H2O。",
            "parameters": {
                "type": "object",
                "properties": {"formula": {"type": "string", "description": "化学式"}},
                "required": ["formula"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "balance_equation",
            "description": "配平化学方程式并返回最小整数系数。输入形如 Fe + O2 = Fe2O3。",
            "parameters": {
                "type": "object",
                "properties": {"equation": {"type": "string", "description": "未配平的化学方程式"}},
                "required": ["equation"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_reaction",
            "description": "查询两种试剂混合后的反应类型、化学方程式与实验现象。",
            "parameters": {
                "type": "object",
                "properties": {
                    "reactants": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "反应物名称列表，如 ['盐酸', '锌']",
                    }
                },
                "required": ["reactants"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_safety_info",
            "description": "查询某种化学品的危险性、防护要求与急救措施。涉及实验安全时优先调用。",
            "parameters": {
                "type": "object",
                "properties": {"chemical": {"type": "string", "description": "化学品名称"}},
                "required": ["chemical"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "在项目内置的元素图鉴中检索知识片段，用于回答元素发现史、性质、用途等科普类问题，可避免编造。",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "检索关键词或问题"}},
                "required": ["query"],
            },
        },
    },
]

_TOOL_IMPL = {
    "query_element": lambda args: query_element(args.get("query", "")),
    "molar_mass": lambda args: molar_mass(args.get("formula", "")),
    "balance_equation": lambda args: balance_equation(args.get("equation", "")),
    "lookup_reaction": lambda args: lookup_reaction(args.get("reactants", [])),
    "get_safety_info": lambda args: get_safety_info(args.get("chemical", "")),
    "search_knowledge": lambda args: search_knowledge(args.get("query", "")),
}


def execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """执行模型请求的工具调用，异常统一转为结构化错误，避免打断对话。"""
    impl = _TOOL_IMPL.get(name)
    if impl is None:
        return {"ok": False, "error": f"未知工具：{name}"}
    try:
        return impl(arguments or {})
    except Exception as exc:  # noqa: BLE001 - 工具层需兜底，保证对话不中断
        return {"ok": False, "error": f"工具执行失败：{exc}"}


def check_dangerous_request(text: str) -> dict[str, Any]:
    """检测是否存在危险化学请求，返回拦截结果。

    两级判定：先用固定关键词做快速匹配，再用组合正则覆盖
    「制作炸药的配方」这类中间插词的表达，避免被简单改写绕过。
    """
    lowered = (text or "").lower()

    matched = None
    for pattern in DANGEROUS_PATTERNS:
        if pattern.lower() in lowered:
            matched = pattern
            break

    if matched is None:
        for regex in DANGEROUS_REGEX:
            if re.search(regex, lowered):
                matched = regex
                break

    if matched is None:
        return {"blocked": False}

    return {
        "blocked": True,
        "matched": matched,
        "message": (
            "这个问题我不能回答哦。涉及危险化学品合成、爆炸物或药物滥用的操作细节，"
            "无论出于什么目的都不能提供。\n\n"
            "如果你对化学感兴趣，我很乐意陪你聊聊安全的实验：比如用紫甘蓝做酸碱指示剂、"
            "观察硫酸铜结晶，或者一起分析某道化学题的原理。"
        ),
    }
