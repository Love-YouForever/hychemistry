"""元素幻语 · MCP 化学工具服务

把项目内置的 6 个化学工具以 Model Context Protocol 标准暴露出去，
任何支持 MCP 的客户端（Claude Desktop、Cursor、自研 Agent 等）都能直接调用，
无需了解本项目的内部实现。

运行方式
--------
标准输入输出（供 Claude Desktop / Cursor 等以子进程方式接入）::

    python server/mcp_server.py

HTTP 方式（供局域网内其他应用调用）::

    python server/mcp_server.py --http 8930
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# 保证同目录的 chem_tools 可被导入
sys.path.insert(0, str(Path(__file__).resolve().parent))

import chem_tools as chem
from mcp.server.mcpserver import MCPServer

mcp = MCPServer(
    name="element-whisper-chem",
    title="元素幻语 · 化学工具服务",
    description="面向中学化学教学场景的确定性计算与知识检索服务",
    instructions=(
        "本服务提供化学领域可验证的工具能力。"
        "涉及元素性质、摩尔质量、方程式配平、反应现象、危化品安全时，"
        "应优先调用对应工具获取准确结果，不要凭记忆回答。"
    ),
    version="1.0.0",
)


def _dump(data: dict) -> str:
    """统一以 JSON 字符串返回，保留中文。"""
    return json.dumps(data, ensure_ascii=False)


# ---------------------------------------------------------------- 工具
@mcp.tool()
def query_element(query: str) -> str:
    """查询化学元素的性质，包括原子序数、相对原子质量、类别、熔沸点与发现者。

    query 可传元素符号（如 H）、中文名（如 氢）或英文名（如 Hydrogen）。
    """
    return _dump(chem.query_element(query))


@mcp.tool()
def molar_mass(formula: str) -> str:
    """计算化学式的摩尔质量（g/mol），支持括号与结晶水。

    示例：H2O、Ca(OH)2、CuSO4·5H2O。
    """
    return _dump(chem.molar_mass(formula))


@mcp.tool()
def balance_equation(equation: str) -> str:
    """配平化学方程式，返回最小整数系数。

    输入形如 "Fe + O2 = Fe2O3"，输出配平后的完整方程式与系数。
    """
    return _dump(chem.balance_equation(equation))


@mcp.tool()
def lookup_reaction(reactants: list[str]) -> str:
    """查询两种试剂混合后的反应类型、化学方程式与实验现象。

    reactants 为反应物名称列表，例如 ["盐酸", "锌"]。
    """
    return _dump(chem.lookup_reaction(reactants))


@mcp.tool()
def get_safety_info(chemical: str) -> str:
    """查询化学品的危险性、防护要求与急救措施。涉及实验安全时优先调用。"""
    return _dump(chem.get_safety_info(chemical))


@mcp.tool()
def search_knowledge(query: str, top_k: int = 3) -> str:
    """在元素知识库中检索科普片段，返回内容与来源标注，用于回答元素发现史、性质、用途等问题。"""
    return _dump(chem.search_knowledge(query, top_k))


# ---------------------------------------------------------------- 资源
@mcp.resource("chem://element/{symbol}")
def element_profile(symbol: str) -> str:
    """以资源形式提供单个元素的结构化资料，URI 形如 chem://element/Fe。"""
    return _dump(chem.query_element(symbol))


@mcp.resource("chem://catalog/elements")
def element_catalog() -> str:
    """提供已收录元素的清单（原子序数、符号、中英文名）。"""
    catalog = [
        {
            "number": item["number"],
            "symbol": item["symbol"],
            "name_zh": item["name_zh"],
            "name_en": item["name_en"],
        }
        for item in chem.ELEMENTS
    ]
    return _dump({"ok": True, "count": len(catalog), "elements": catalog})


@mcp.resource("chem://catalog/reactions")
def reaction_catalog() -> str:
    """提供内置反应库清单，便于客户端了解可查询的反应范围。"""
    reactions = [
        {"key": key, "type": value["type"], "equation": value["equation"]}
        for key, value in chem.REACTION_DB.items()
    ]
    return _dump({"ok": True, "count": len(reactions), "reactions": reactions})


# ---------------------------------------------------------------- 启动
def main() -> None:
    parser = argparse.ArgumentParser(description="元素幻语 MCP 化学工具服务")
    parser.add_argument("--http", type=int, default=0, help="以 streamable-http 方式在指定端口启动")
    args = parser.parse_args()

    if args.http:
        mcp.run(transport="streamable-http", port=args.http, host="127.0.0.1")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
