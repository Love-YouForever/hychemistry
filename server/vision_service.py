"""多模态视觉理解：识别化学方程式、实验装置与试剂标签。

设计思路
--------
纯 OCR 只能「抄下来」，教学价值有限。因此这里把视觉识别与化学工具链打通：

    拍照 → 通义千问 VL 识别 → 判断类型 → 若是方程式则自动调用配平工具校验

这样模型既能看懂图，也能用确定性工具验证识别结果，避免「看错还讲错」。
"""

from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path
from typing import Any

import requests


# 复用与 aigent_service 相同的 .env 载入逻辑（保持模块独立，避免循环依赖）
def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()

VISION_API_KEY = os.getenv("VISION_API_KEY", "")
VISION_MODEL_URL = os.getenv(
    "VISION_MODEL_URL",
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
)
VISION_MODEL_NAME = os.getenv("VISION_MODEL_NAME", "qwen3-vl-plus")
VISION_FALLBACK_MODEL = os.getenv("VISION_FALLBACK_MODEL", "qwen-vl-plus")

MAX_IMAGE_BYTES = 6 * 1024 * 1024  # 6 MB

VISION_PROMPT = """你是化学教学场景的视觉助手，负责帮中学生看懂化学相关的图片。

请分析图片内容，严格只返回如下 JSON（不要加任何解释文字、不要用 markdown 代码块）：
{
  "type": "equation | apparatus | reagent | other",
  "content": "识别到的化学方程式、装置名称或试剂名称",
  "explanation": "面向中学生的简明讲解，60 字以内",
  "safety": "若涉及危险操作或危化品，给出安全提示；否则填空字符串",
  "confidence": "high | medium | low"
}

判断规则：
- 图片是化学方程式（手写或印刷）→ type 为 equation，content 写标准化学式，如 "Fe + O2 = Fe2O3"
- 图片是实验装置（烧杯、酒精灯、铁架台等组合）→ type 为 apparatus，content 写装置名称
- 图片是试剂瓶、标签、元素卡片 → type 为 reagent
- 其他 → other
- 看不清或与化学无关时，confidence 设为 low，content 写 "无法识别"
"""


def _strip_data_url(image: str) -> tuple[str, str]:
    """把 data URL 拆成 (mime, base64)，也兼容纯 base64。"""
    if image.startswith("data:"):
        header, _, payload = image.partition(",")
        mime = header[5:].split(";")[0] or "image/jpeg"
        return mime, payload
    return "image/jpeg", image


def _extract_json(text: str) -> dict[str, Any]:
    """从模型输出中稳健地提取 JSON（兼容 ```json 包裹与多余说明）。"""
    cleaned = text.strip()

    fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass

    return {
        "type": "other",
        "content": "无法识别",
        "explanation": text.strip()[:120],
        "safety": "",
        "confidence": "low",
    }


def analyze_image(image_data: str, question: str = "") -> dict[str, Any]:
    """调用视觉模型识别图片，返回结构化结果。

    降级链：主视觉模型 → 备用视觉模型 → 本地 OCR（若环境可用）→ 引导手动输入。
    返回结果中的 degraded / chain 字段用于界面展示「异常处理与降级」链路。

    :param image_data: data URL 或纯 base64 字符串
    :param question: 用户附加的问题（可选）
    """
    if not VISION_API_KEY:
        return {"ok": False, "error": "未配置 VISION_API_KEY，请在 .env 中填写后重试"}

    mime, payload = _strip_data_url(image_data or "")
    if not payload:
        return {"ok": False, "error": "缺少图片数据"}

    try:
        raw_size = len(base64.b64decode(payload + "==" * (4 - len(payload) % 4)))
    except Exception:
        return {"ok": False, "error": "图片数据格式不正确"}

    if raw_size > MAX_IMAGE_BYTES:
        return {"ok": False, "error": "图片过大，请压缩到 6MB 以内"}

    user_text = VISION_PROMPT
    if question.strip():
        user_text += f"\n\n用户额外问题：{question.strip()}"

    body = {
        "model": VISION_MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{payload}"}},
                ],
            }
        ],
        "temperature": 0.1,
    }

    headers = {
        "Authorization": f"Bearer {VISION_API_KEY}",
        "Content-Type": "application/json",
    }

    # 一级：主视觉模型；二级：备用视觉模型（同协议不同型号，避免单模型故障）
    for model_name in _vision_models():
        try:
            response = requests.post(
                VISION_MODEL_URL, headers=headers, json={**body, "model": model_name}, timeout=60
            )
        except requests.RequestException:
            continue

        if response.status_code != 200:
            continue

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, json.JSONDecodeError):
            continue

        parsed = _extract_json(content)
        _fill_defaults(parsed)
        is_fallback = model_name != VISION_MODEL_NAME
        return {
            "ok": True,
            "result": parsed,
            "model": model_name,
            "degraded": is_fallback,
            "chain": f"视觉模型：{VISION_MODEL_NAME} 不可用 → 已切换 {model_name}（备用）"
            if is_fallback
            else "",
        }

    # 三级：本地 OCR 兜底（仅在运行环境确实安装了 pytesseract + Pillow 时启用）
    ocr_text = _local_ocr(payload)
    if ocr_text:
        return {
            "ok": True,
            "result": _parse_ocr_text(ocr_text),
            "model": "local-ocr",
            "degraded": True,
            "chain": "视觉模型不可用 → 已切换本地 OCR（识别精度有限，建议核对）",
        }

    # 四级：全部不可用，引导手动输入，但化学工具链仍可继续工作
    return {
        "ok": False,
        "error": "视觉模型暂时不可用，本地 OCR 也未启用。可以先把方程式打出来发给我，我依然能帮你配平校验。",
        "chain": "视觉模型不可用 → 本地 OCR 未启用 → 引导手动输入（工具链仍可用）",
    }


def _vision_models() -> list[str]:
    """按优先级返回可用的视觉模型列表。"""
    models = [VISION_MODEL_NAME]
    if VISION_FALLBACK_MODEL and VISION_FALLBACK_MODEL != VISION_MODEL_NAME:
        models.append(VISION_FALLBACK_MODEL)
    return models


def _fill_defaults(parsed: dict[str, Any]) -> None:
    parsed.setdefault("type", "other")
    parsed.setdefault("content", "无法识别")
    parsed.setdefault("explanation", "")
    parsed.setdefault("safety", "")
    parsed.setdefault("confidence", "low")


def _local_ocr(payload: str) -> str:
    """本地 OCR 兜底：缺少依赖时直接返回空串，不影响主流程。"""
    try:
        import io

        import pytesseract
        from PIL import Image
    except Exception:
        return ""

    try:
        image = Image.open(io.BytesIO(base64.b64decode(payload)))
        return (pytesseract.image_to_string(image, lang="chi_sim+eng") or "").strip()
    except Exception:
        return ""


EQUATION_PATTERN = re.compile(r"[A-Z][A-Za-z0-9()]*\s*(?:\+|＝|=|->|→)\s*[A-Z0-9][^\s，。；]*")


def _parse_ocr_text(text: str) -> dict[str, Any]:
    """把本地 OCR 的纯文本整理成与视觉模型一致的结构。"""
    compact = " ".join(text.split())
    match = EQUATION_PATTERN.search(compact)
    if match:
        return {
            "type": "equation",
            "content": match.group(0),
            "explanation": "本地 OCR 识别到疑似方程式，已交由配平工具做确定性校验。",
            "safety": "",
            "confidence": "low",
        }
    return {
        "type": "other",
        "content": compact[:60] or "无法识别",
        "explanation": "视觉模型不可用，本地 OCR 只提取到部分文字，建议手动输入方程式再校验。",
        "safety": "",
        "confidence": "low",
    }
