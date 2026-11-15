"""原混合检索与关系增强检索的离线评测。

保留原 15 题作为 dev；holdout 独立冻结，包含有证据的一跳/两跳、相似实体
hard negative 和无桥接负例。两种策略仅相差 ``use_relations`` 开关。

用法::

    .venv\\Scripts\\python.exe server/eval_rag.py
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chem_tools as chem  # noqa: E402

REPORT_PATH = Path(__file__).resolve().parent.parent / "docs" / "RAG评测报告.md"
HOLDOUT_VERSION = "holdout-v1-2026-11-15"

HARD_DIAMOND_PATH = "diamond_has_property_natural_hardest>diamond_allotrope_of_carbon"
SOFT_GRAPHITE_PATH = "graphite_has_property_soft_conductive>graphite_allotrope_of_carbon"
STRONG_GRAPHENE_PATH = "graphene_has_property_stronger_than_steel>graphene_allotrope_of_carbon"
GRAPHENE_PATH = "graphene_allotrope_of_carbon"
WHITE_PHOSPHORUS_PATH = (
    "white_phosphorus_has_property_air_self_ignition>"
    "white_phosphorus_allotrope_of_phosphorus"
)
RED_PHOSPHORUS_PATH = "red_phosphorus_allotrope_of_phosphorus"

# 原 15 题保持不变，仅补充分组及可追溯的期望路径/证据。
DEV_CASES: list[dict[str, Any]] = [
    {"q": "氢的用途", "expect": ["氢"], "group": "无路径"},
    {"q": "哪种元素最轻", "expect": ["氢", "氦"], "group": "无路径"},
    {"q": "稀有气体为什么稳定", "expect": ["氦", "氖", "氩", "氪", "氙", "氡"], "group": "无路径"},
    {"q": "金属为什么导电", "expect": ["金", "银", "铜", "铝"], "group": "无路径"},
    {"q": "半导体材料有哪些", "expect": ["硅", "锗"], "group": "无路径"},
    {
        "q": "自然界最硬的物质",
        "expect": ["碳"],
        "group": "两跳",
        "expected_path": HARD_DIAMOND_PATH,
        "evidence_ids": ["碳#5"],
    },
    {"q": "用于制造合金的金属", "expect": ["铁", "铝", "钛", "镁", "铬"], "group": "无路径"},
    {"q": "人体必需的微量元素", "expect": ["铁", "锌", "碘", "硒", "铜"], "group": "无路径"},
    {"q": "有放射性的元素", "expect": ["铀", "镭", "钋", "氡", "钍"], "group": "无路径"},
    {"q": "钠的性质", "expect": ["钠"], "group": "无路径"},
    {"q": "铁为什么会生锈", "expect": ["铁"], "group": "无路径"},
    {"q": "黄金为什么珍贵", "expect": ["金"], "group": "无路径"},
    {"q": "氮气在空气中的含量", "expect": ["氮"], "group": "无路径"},
    {"q": "碳的同素异形体", "expect": ["碳"], "group": "无路径"},
    {"q": "氧气对生命的意义", "expect": ["氧"], "group": "无路径"},
]
CASES = DEV_CASES  # 兼容旧调用；dev 问题及期望元素未改。

# 冻结：不得依据增强检索结果增删题目、别名或期望证据；变更需提升版本。
HOLDOUT_CASES: tuple[dict[str, Any], ...] = (
    {
        "q": "哪种元素的单质柔软且能导电",
        "expect": ["碳"],
        "group": "两跳",
        "expected_path": SOFT_GRAPHITE_PATH,
        "evidence_ids": ["碳#6"],
    },
    {
        "q": "什么元素的单质既轻又强于钢铁",
        "expect": ["碳"],
        "group": "两跳",
        "expected_path": STRONG_GRAPHENE_PATH,
        "evidence_ids": ["碳#9"],
    },
    {
        "q": "哪种元素的白磷会在空气中自燃",
        "expect": ["磷"],
        "group": "两跳",
        "expected_path": WHITE_PHOSPHORUS_PATH,
        "evidence_ids": ["磷#4"],
    },
    {
        "q": "石墨烯由什么元素组成",
        "expect": ["碳"],
        "group": "一跳",
        "expected_path": GRAPHENE_PATH,
        "evidence_ids": ["碳#9"],
    },
    {
        "q": "红磷也会在空气中自燃吗",
        "expect": ["磷"],
        "group": "相似实体负例",
        "expected_path": RED_PHOSPHORUS_PATH,
        "forbidden_paths": [WHITE_PHOSPHORUS_PATH],
        "evidence_ids": ["磷#5"],
    },
    {
        "q": "哪种元素的熔点最高",
        "expect": ["钨"],
        "group": "无桥接负例",
        "no_bridge": True,
    },
    {
        "q": "哪种元素常用于制造芯片",
        "expect": ["硅"],
        "group": "无桥接负例",
        "no_bridge": True,
    },
)

DATASETS = (("dev", DEV_CASES), ("holdout", HOLDOUT_CASES))
MODES = (("原混合检索", False), ("关系增强检索", True))
GROUP_ORDER = ("无路径", "一跳", "两跳", "相似实体负例", "无桥接负例")
_SEARCH_CACHE: dict[tuple[str, int, bool], list[dict[str, Any]]] = {}
_CHUNK_IDS = {
    (chunk["element"], chunk["text"]): chunk["id"]
    for chunk in chem.KNOWLEDGE_CHUNKS
    if chunk.get("id")
}


def search_hybrid(query: str, top_k: int = 3, use_relations: bool = False) -> list[dict[str, Any]]:
    """同一代码路径评测基线与增强，并保留实际块 ID 供证据指标使用。"""
    key = (query, top_k, use_relations)
    if key not in _SEARCH_CACHE:
        raw = chem._get_retriever().search(query, top_k, use_relations=use_relations)
        converted = []
        for item in raw:
            element = item["来源"].split("·")[-1]
            converted.append(
                {
                    "element": element,
                    "text": item["内容"],
                    "chunk_id": _CHUNK_IDS.get((element, item["内容"])),
                    "path_id": item.get("path_id"),
                    "relation_path": item.get("relation_path"),
                    "evidence_ids": item.get("evidence_ids", []),
                }
            )
        _SEARCH_CACHE[key] = converted
    return _SEARCH_CACHE[key]


def evaluate(cases: Sequence[dict[str, Any]], use_relations: bool) -> dict[str, Any]:
    """计算元素召回、路径、实际证据块及负例误桥接指标。"""
    hit1 = hit3 = 0
    reciprocal = 0.0
    path_hits = path_total = 0
    evidence_hits = evidence_total = 0
    negative_hits = negative_total = 0

    for case in cases:
        results = search_hybrid(case["q"], 3, use_relations)
        ranks = [
            rank for rank, chunk in enumerate(results, start=1) if chunk["element"] in case["expect"]
        ]
        if ranks:
            if ranks[0] == 1:
                hit1 += 1
            hit3 += 1
            reciprocal += 1.0 / ranks[0]

        expected_path = case.get("expected_path")
        if expected_path:
            path_total += 1
            if any(chunk.get("path_id") == expected_path for chunk in results):
                path_hits += 1

        expected_evidence = set(case.get("evidence_ids", []))
        if expected_evidence:
            evidence_total += len(expected_evidence)
            actual_evidence = {chunk.get("chunk_id") for chunk in results}
            evidence_hits += len(expected_evidence & actual_evidence)

        forbidden_paths = set(case.get("forbidden_paths", []))
        if case.get("no_bridge") or forbidden_paths:
            negative_total += 1
            actual_paths = {chunk.get("path_id") for chunk in results if chunk.get("path_id")}
            if (case.get("no_bridge") and actual_paths) or actual_paths.intersection(forbidden_paths):
                negative_hits += 1

    total = len(cases)
    return {
        "recall1": hit1 / total if total else 0.0,
        "recall3": hit3 / total if total else 0.0,
        "mrr": reciprocal / total if total else 0.0,
        "path_success": path_hits / path_total if path_total else None,
        "evidence_recall": evidence_hits / evidence_total if evidence_total else None,
        "false_bridge_rate": negative_hits / negative_total if negative_total else None,
        "hit1": hit1,
        "hit3": hit3,
        "total": total,
        "path_hits": path_hits,
        "path_total": path_total,
        "evidence_hits": evidence_hits,
        "evidence_total": evidence_total,
        "negative_hits": negative_hits,
        "negative_total": negative_total,
    }


def _ratio(value: float | None, hits: int, total: int) -> str:
    if value is None or total == 0:
        return "—"
    return f"{value * 100:.1f}%（{hits}/{total}）"


def _metric_row(dataset: str, group: str, mode: str, item: dict[str, Any]) -> str:
    return (
        f"| {dataset} | {group} | {mode} | "
        f"{_ratio(item['recall1'], item['hit1'], item['total'])} | "
        f"{_ratio(item['recall3'], item['hit3'], item['total'])} | {item['mrr']:.3f} | "
        f"{_ratio(item['path_success'], item['path_hits'], item['path_total'])} | "
        f"{_ratio(item['evidence_recall'], item['evidence_hits'], item['evidence_total'])} | "
        f"{_ratio(item['false_bridge_rate'], item['negative_hits'], item['negative_total'])} |"
    )


def _case_metric(case: dict[str, Any], use_relations: bool, kind: str) -> str:
    item = evaluate([case], use_relations)
    if kind == "recall":
        return "✓" if item["hit3"] else "✗"
    if kind == "path":
        if item["path_total"] == 0:
            return "—"
        return "✓" if item["path_hits"] else "✗"
    if item["evidence_total"] == 0:
        return "—"
    return "✓" if item["evidence_hits"] == item["evidence_total"] else "✗"


def main() -> None:
    scores: dict[tuple[str, str, str], dict[str, Any]] = {}
    for dataset, cases in DATASETS:
        for mode, use_relations in MODES:
            overall = evaluate(cases, use_relations)
            scores[(dataset, "全部", mode)] = overall
            print(
                f"{dataset:7s} {mode:8s} "
                f"Recall@1 {overall['hit1']:2d}/{overall['total']}  "
                f"Recall@3 {overall['hit3']:2d}/{overall['total']}  "
                f"MRR {overall['mrr']:.3f}  "
                f"PathSuccess@3 {_ratio(overall['path_success'], overall['path_hits'], overall['path_total'])}"
            )
            for group in GROUP_ORDER:
                grouped = [case for case in cases if case["group"] == group]
                if grouped:
                    scores[(dataset, group, mode)] = evaluate(grouped, use_relations)

    stats = chem._get_retriever().stats()
    lines = [
        "# RAG 检索效果评测报告",
        "",
        f"> 评测时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}　|　"
        f"dev：{len(DEV_CASES)} 题　|　冻结 holdout：{len(HOLDOUT_CASES)} 题（{HOLDOUT_VERSION}）　|　"
        f"知识块：{stats['知识块数']} 条",
        "",
        "## 一、总体对比",
        "",
        "两种策略使用完全相同的 BM25、LSA、bigram、RRF 与概念扩展代码；增强组仅开启关系证据第四路。",
        "",
        "| 数据集 | 分组 | 检索策略 | Recall@1 | Recall@3 | MRR | PathSuccess@3 | EvidenceRecall@3 | 负例误桥接率 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for dataset, _cases in DATASETS:
        for mode, _enabled in MODES:
            lines.append(_metric_row(dataset, "全部", mode, scores[(dataset, "全部", mode)]))

    lines += [
        "",
        "PathSuccess@3 只统计声明了期望路径的题；EvidenceRecall@3 按 Top-3 实际返回的稳定句子块 ID 计算；"
        "负例包含相似实体禁路径和无桥接题。基线不产生路径字段，因此路径与误桥接指标是其结构性下界/零值。",
        "",
        "## 二、dev / holdout 按关系路径分组",
        "",
        "| 数据集 | 关系路径分组 | 检索策略 | Recall@1 | Recall@3 | MRR | PathSuccess@3 | EvidenceRecall@3 | 负例误桥接率 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for dataset, cases in DATASETS:
        for group in GROUP_ORDER:
            if not any(case["group"] == group for case in cases):
                continue
            for mode, _enabled in MODES:
                lines.append(_metric_row(dataset, group, mode, scores[(dataset, group, mode)]))

    lines += [
        "",
        "## 三、冻结 holdout 设计",
        "",
        f"冻结版本：`{HOLDOUT_VERSION}`。它不参与别名或阈值调参；两跳题必须命中指定路径，"
        "红磷题禁止借白磷建立自燃路径，无桥接题禁止出现任何关系路径。完整评测问题均未写成图别名。",
        "",
        "| 问题 | 分组 | 期望路径 | 期望证据 | 负例约束 |",
        "|---|---|---|---|---|",
    ]
    for case in HOLDOUT_CASES:
        constraint = "不得出现任何路径" if case.get("no_bridge") else (
            "禁止：" + "、".join(f"`{path}`" for path in case.get("forbidden_paths", []))
            if case.get("forbidden_paths") else "—"
        )
        lines.append(
            f"| {case['q']} | {case['group']} | "
            f"{('`' + case['expected_path'] + '`') if case.get('expected_path') else '—'} | "
            f"{'、'.join(case.get('evidence_ids', [])) or '—'} | {constraint} |"
        )

    lines += [
        "",
        "## 四、逐题真实结果",
        "",
        "元素命中看 Top-3；路径与证据列仅对声明相应期望的题目计分。",
        "",
        "| 数据集 | 分组 | 问题 | 基线首条 | 增强首条 | 基线元素@3 | 增强元素@3 | Path@3 | Evidence@3 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for dataset, cases in DATASETS:
        for case in cases:
            baseline = search_hybrid(case["q"], 3, False)
            enhanced = search_hybrid(case["q"], 3, True)
            baseline_top = baseline[0]["element"] if baseline else "—"
            enhanced_top = enhanced[0]["element"] if enhanced else "—"
            lines.append(
                f"| {dataset} | {case['group']} | {case['q']} | {baseline_top} | {enhanced_top} | "
                f"{_case_metric(case, False, 'recall')} | {_case_metric(case, True, 'recall')} | "
                f"{_case_metric(case, True, 'path')} | {_case_metric(case, True, 'evidence')} |"
            )

    lines += [
        "",
        "## 五、索引与关系图状态",
        "",
        "| 项目 | 值 |",
        "|---|---|",
    ]
    for key, value in stats.items():
        lines.append(f"| {key} | {value} |")

    lines += [
        "",
        "## 六、实现与降级边界",
        "",
        "- `load_chunks` 按每个元素接受句子的顺序生成稳定 `元素名#序号` ID，短句过滤不会改变其他元素的编号。",
        "- 关系图只接受 `element/form/property` 节点及 `allotrope_of/form_of/has_property/related_to` 边；"
        "每条边必须有真实证据块，且文本支持非元素端点、块来源支持元素端点。",
        "- 查询使用全局最长、非重叠别名匹配，只接受最多两跳、终止于有效元素且证据完整的路径，并限制返回路径数。"
        "查询明确指定某同素异形体时，禁止借另一相似同素异形体搭桥。",
        "- 关系证据是 RRF 第四路候选，重排层级为“关系证据 > 显式元素 > 概念扩展 > 普通召回”；"
        "原三路、概念扩展和同元素最多两条规则均保留。",
        "- 图文件缺失、JSON 无效、证据 ID 不存在或文本不匹配时关系路为空，自动回退原混合检索。"
        "普通结果仍只有“来源/内容/匹配度/命中方式”，关系命中额外返回 `path_id/relation_path/evidence_ids`。",
        "- 本方案不做开放世界推理，也不判断命题真假；它只返回有语料证据的受控关系，未覆盖问题仍由原检索或大模型处理。",
    ]

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n报告已生成：{REPORT_PATH}")


if __name__ == "__main__":
    main()
