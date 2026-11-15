"""受约束的 3D 场景动作协议。

模型只能选择白名单动作，具体对象与参数在服务端再次校验。实验室动作仅定位
器材或摆放反应所需物品，不执行混合、倾倒、加热及任何动态代码。
"""

from __future__ import annotations

import uuid
from typing import Any

from chem_tools import ELEMENTS

SURFACES = {"home", "periodic", "lab"}
PERIODIC_ACTIONS = {
    "highlight_elements",
    "clear_highlight",
    "focus_element",
    "set_temperature",
    "reset_view",
}
LAB_ACTIONS = {"focus_equipment", "load_reaction"}

_SYMBOLS = {element["symbol"] for element in ELEMENTS}
_NAME_TO_SYMBOL = {element["name_zh"]: element["symbol"] for element in ELEMENTS}

# 只开放可聚焦的现有器材；聚焦酒精灯不会触发点燃。
EQUIPMENT_TYPES = {
    "beaker", "test-tube", "flask", "round-bottom-flask", "volumetric-flask",
    "graduated-cylinder", "alcohol-lamp", "bunsen-burner", "test-tube-rack",
    "iron-stand", "tripod", "asbestos-net", "medicine-spoon", "dropper",
    "thermometer", "evaporating-dish", "crucible", "watch-glass", "glass-rod",
    "funnel", "separatory-funnel", "gas-jar", "combustion-spoon",
    "test-tube-clamp", "crucible-tongs", "tweezers", "mortar", "balance",
    "wash-bottle", "test-tube-brush", "drying-rack", "cloth", "waste-liquid",
    "waste-solid", "sharps-box", "reagent-liquid", "solid-bottle",
}

_LIQUIDS = {
    "HCl", "H2SO4", "HNO3", "NaOH", "AgNO3", "NaCl", "CuSO4", "FeCl3",
    "BaCl2", "Na2CO3", "Phenolphthalein", "KSCN", "H2O2", "CH3COOH",
    "NH3H2O", "NaHCO3", "MethylOrange", "Ethanol", "H2O",
}
_SOLIDS = {"Fe", "Zn", "Cu", "Mg", "CaCO3", "NaOH-solid", "CuO", "MnO2", "KMnO4", "S", "Fe2O3"}

# 装载清单与前端既有物品一一对应。摆放试剂瓶不等于把试剂加入容器。
SAFE_REACTIONS: dict[str, dict[str, Any]] = {
    "AgNO3+NaCl": {"reactants": ["AgNO3", "NaCl"], "note": "生成白色沉淀，避免试剂接触皮肤"},
    "BaCl2+Na2CO3": {"reactants": ["BaCl2", "Na2CO3"], "note": "钡盐有毒，操作后洗手"},
    "CuSO4+NaOH": {"reactants": ["CuSO4", "NaOH"], "note": "强碱有腐蚀性，佩戴护目镜与手套"},
    "FeCl3+NaOH": {"reactants": ["FeCl3", "NaOH"], "note": "强碱有腐蚀性，避免溅洒"},
    "NaOH+Phenolphthalein": {"reactants": ["NaOH", "Phenolphthalein"], "note": "仅装载器材，不自动滴加指示剂"},
    "FeCl3+KSCN": {"reactants": ["FeCl3", "KSCN"], "note": "试剂有害，操作后洗手"},
    "CuSO4+Fe": {"reactants": ["CuSO4", "Fe"], "note": "铜盐需回收，不可直接倒入下水道"},
}

CONTROL_SCENE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "control_scene",
        "description": (
            "控制当前 3D 页面。周期表支持高亮、清除、聚焦、调温、视角复位；"
            "实验室支持聚焦器材、装载安全反应所需物品。装载不代表混合或加热。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": sorted(PERIODIC_ACTIONS | LAB_ACTIONS),
                },
                "params": {
                    "type": "object",
                    "description": (
                        "highlight_elements: {symbols:[元素符号]}；focus_element:{symbol}；"
                        "set_temperature:{kelvin:0到6000}；focus_equipment:{equipment,reagent可选}；"
                        "load_reaction:{reaction,container可选}；其他动作用空对象。"
                    ),
                },
            },
            "required": ["action", "params"],
            "additionalProperties": False,
        },
    },
}

TOOL_LABEL = "控制 3D 场景"


def normalize_surface(value: Any) -> str:
    return value if value in SURFACES else "home"


def tools_for_surface(surface: str, role_name: str = "", is_doc: bool = False) -> list[dict[str, Any]] | None:
    """角色访谈与文档问答不开放场景控制，主页也不注入该工具。"""
    if role_name or is_doc or surface not in {"periodic", "lab"}:
        return None
    return CONTROL_SCENE_SCHEMA


def _error(message: str) -> dict[str, Any]:
    return {"ok": False, "error": message}


def _new_action(target: str, action: str, params: dict[str, Any]) -> dict[str, Any]:
    return {"id": f"scene-{uuid.uuid4().hex}", "action": action, "target": target, "params": params}


def _check_fields(params: dict[str, Any], allowed: set[str]) -> str:
    unknown = set(params) - allowed
    return f"不支持的参数：{', '.join(sorted(unknown))}" if unknown else ""


def validate_action(target: str, action: str, params: Any) -> tuple[dict[str, Any] | None, str]:
    """校验并规范化单个动作，失败时不返回可执行动作。"""
    if target not in {"periodic", "lab"} or not isinstance(params, dict):
        return None, "目标页面或动作参数无效"
    if target == "periodic" and action not in PERIODIC_ACTIONS:
        return None, "该动作不属于周期表安全白名单"
    if target == "lab" and action not in LAB_ACTIONS:
        return None, "实验室只允许聚焦器材或装载安全反应"

    if action in {"clear_highlight", "reset_view"}:
        if params:
            return None, "该动作不接受参数"
        return _new_action(target, action, {}), ""

    if action == "highlight_elements":
        if error := _check_fields(params, {"symbols"}):
            return None, error
        symbols = params.get("symbols")
        if not isinstance(symbols, list) or not 1 <= len(symbols) <= 18:
            return None, "高亮元素数量须为 1 到 18 个"
        if any(not isinstance(symbol, str) or symbol not in _SYMBOLS for symbol in symbols):
            return None, "包含无效元素符号"
        return _new_action(target, action, {"symbols": list(dict.fromkeys(symbols))}), ""

    if action == "focus_element":
        if error := _check_fields(params, {"symbol"}):
            return None, error
        symbol = params.get("symbol")
        if not isinstance(symbol, str) or symbol not in _SYMBOLS:
            return None, "聚焦元素符号无效"
        return _new_action(target, action, {"symbol": symbol}), ""

    if action == "set_temperature":
        if error := _check_fields(params, {"kelvin"}):
            return None, error
        kelvin = params.get("kelvin")
        if isinstance(kelvin, bool) or not isinstance(kelvin, (int, float)) or not 0 <= kelvin <= 6000:
            return None, "温度须为 0 到 6000 K 的数值"
        return _new_action(target, action, {"kelvin": round(float(kelvin), 2)}), ""

    if action == "focus_equipment":
        if error := _check_fields(params, {"equipment", "reagent"}):
            return None, error
        equipment = params.get("equipment")
        reagent = params.get("reagent") or None
        if equipment not in EQUIPMENT_TYPES:
            return None, "不支持聚焦该器材"
        if equipment in {"reagent-liquid", "solid-bottle"}:
            allowed = _LIQUIDS if equipment == "reagent-liquid" else _SOLIDS
            if reagent not in allowed:
                return None, "试剂类型与器材不匹配"
        elif reagent is not None:
            return None, "普通器材不接受试剂参数"
        normalized = {"equipment": equipment}
        if reagent:
            normalized["reagent"] = reagent
        return _new_action(target, action, normalized), ""

    if action == "load_reaction":
        if error := _check_fields(params, {"reaction", "container"}):
            return None, error
        reaction = params.get("reaction")
        container = params.get("container") or "beaker"
        if reaction not in SAFE_REACTIONS:
            return None, "该反应不在安全装载清单中，请改用手动实验指南"
        if container not in {"beaker", "test-tube", "flask"}:
            return None, "反应容器仅支持烧杯、试管或锥形瓶"
        items = [{"type": container}]
        for reagent in SAFE_REACTIONS[reaction]["reactants"]:
            items.append({
                "type": "solid-bottle" if reagent in _SOLIDS else "reagent-liquid",
                "reagent": reagent,
            })
        return _new_action(target, action, {
            "reaction": reaction,
            "container": container,
            "items": items,
            "note": SAFE_REACTIONS[reaction]["note"],
            "loaded_only": True,
        }), ""

    return None, "未知场景动作"


def execute_control_scene(surface: str, arguments: Any) -> dict[str, Any]:
    """Function Calling 的服务端执行入口。"""
    if surface not in {"periodic", "lab"}:
        return _error("当前页面未开放场景控制")
    if not isinstance(arguments, dict) or set(arguments) != {"action", "params"}:
        return _error("control_scene 仅接受 action 与 params")
    action, error = validate_action(surface, arguments.get("action"), arguments.get("params"))
    if error:
        return _error(error)
    return {
        "ok": True,
        "action": action,
        "message": "动作已下发；仅装载物品，不会自动混合、倾倒或加热" if surface == "lab" else "动作已下发",
    }


def derive_actions(surface: str, name: str, result: dict[str, Any]) -> list[dict[str, Any]]:
    """从确定性的化学工具结果派生高亮，避免模型凭空指定元素。"""
    if surface != "periodic" or not result.get("ok"):
        return []
    if name == "control_scene":
        return [result["action"]] if result.get("action") else []
    if name == "query_element":
        symbol = (result.get("element") or {}).get("元素符号")
        if symbol in _SYMBOLS:
            action, _ = validate_action("periodic", "highlight_elements", {"symbols": [symbol]})
            return [action] if action else []
    if name == "search_knowledge":
        symbols = []
        for row in result.get("results") or []:
            element_name = (row.get("来源") or "").split("·")[-1]
            symbol = _NAME_TO_SYMBOL.get(element_name)
            if symbol and symbol not in symbols:
                symbols.append(symbol)
        if symbols:
            action, _ = validate_action("periodic", "highlight_elements", {"symbols": symbols[:18]})
            return [action] if action else []
    return []


def append_unique(actions: list[dict[str, Any]], candidates: list[dict[str, Any]]) -> None:
    """按语义参数去重，避免一次回答反复高亮同一组元素。"""
    seen = {
        (item["target"], item["action"], repr(sorted(item["params"].items())))
        for item in actions
    }
    for action in candidates:
        key = (action["target"], action["action"], repr(sorted(action["params"].items())))
        if key not in seen:
            actions.append(action)
            seen.add(key)
