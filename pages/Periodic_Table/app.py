"""Flask app for the imported `Periodic_Table` module.

This app remains inside the original module directory so its templates, static
assets, and bundled data keep their natural relative layout. The outer
`backend_server.py` imports and reuses this app object instead of rebuilding a
second periodic-table backend.
"""
"""
该 Flask 应用本身位于一个名为 Periodic_Table 的模块目录内部。
目的是让模板文件、静态资源（CSS、JS）和数据文件保持原有的相对路径结构，便于维护。
外层的 backend_server.py 会直接导入并使用这个 app 对象，而不是重新创建一份后端，从而实现复用。
"""
#导入与全局配置
import json
import os
from pathlib import Path

from flask import Flask, jsonify, render_template

app = Flask(__name__)   #创建 Flask 应用实例

data_cache = {}     #全局字典，用于缓存加载并处理后的元素数据，避免每次请求时重复读取文件
BASE_DIR = Path(__file__).resolve().parent      #通过 Path(__file__).resolve().parent 获取当前脚本所在的目录路径（即 Periodic_Table 模块根目录）
DATA_FILE = BASE_DIR / "periodic_table_data" / "periodic_table_enriched.json"   #拼接出 periodic_table_enriched.json 的完整路径。该 JSON 文件包含了富化的元素信息（如熔点、沸点、原始分类等）

#辅助函数：将原始 JSON 中的元素分类字符串转换为前端友好的 URL 友好分类标识（slug），并统一到一套简化的 10 种分类体系中
#目的是方便前端通过 CSS 类名（如 element-card alkali-metal）对元素进行颜色区分和筛选。同时将原始数据中的细节差异统一到有限的几个分类中，简化 UI 逻辑
def remap_element_category(element):
    """
    根据新的10分类法，重新映射元素的分类。
    此函数在新数据结构下依然可以正常工作。
    """
    original_cat = element.get('category', 'unknown-category').lower()

    if 'predicted to be ' in original_cat:
        original_cat = original_cat.split('predicted to be ')[-1].strip()

    halogens = {9, 17, 35, 53, 85, 117}
    if element['number'] in halogens:
        return 'halogen'

    mapping = {
        'alkali metal': 'alkali-metal',
        'alkaline earth metal': 'alkaline-earth-metal',
        'lanthanide': 'lanthanide',
        'actinide': 'actinide',
        'transition metal': 'transition-metal',
        'post-transition metal': 'other-metal',
        'metalloid': 'metalloid',
        'polyatomic nonmetal': 'other-nonmetal',
        'diatomic nonmetal': 'other-nonmetal',
        'noble gas': 'noble-gas',
    }

    return mapping.get(original_cat, 'unknown-category')

#数据加载与缓存:应用启动时读取 JSON 数据文件，为每个元素添加 category_slug 字段，并将结果存入 data_cache['elements']
def load_data():
    """
    在应用启动时加载一次数据并进行分类重映射。
    已适配新的'periodic_table_enriched.json'文件。
    """
    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            all_data = json.load(f)

            processed_elements = []
            for elem in all_data['elements']:
                elem['category_slug'] = remap_element_category(elem)
                processed_elements.append(elem)

            data_cache['elements'] = processed_elements
        print("✅ Enriched element data loaded and re-categorized successfully.")
    except FileNotFoundError:   #如果文件找不到，会打印错误信息并将 data_cache['elements'] 设为空列表，避免程序崩溃，同时后续 API 会返回 500 错误提示数据未加载
        print(f"❌ FATAL ERROR: {DATA_FILE} not found. Please ensure the bundled data files are present.")
        data_cache['elements'] = []

# API 端点和路由保持不变，它们的功能不受影响
#路由与视图函数
@app.route("/")
def index():
    return render_template("index.html") #首页路由

@app.route("/api/elements") #获取全部元素 API
def get_all_elements():
    """API端点：返回经过重分类的元素数据列表"""
    if not data_cache.get('elements'):
        return jsonify({"error": "Element data not loaded on server."}), 500
    return jsonify(data_cache['elements'])


#根据温度查询相态 API:应用于前端的温度滑块，用户拖动滑块时动态查询该温度下每个元素的状态，并在周期表上用颜色或图标标注出来
@app.route("/api/phases/<int:temp_k>")
@app.route("/api/phases/<float:temp_k>")
def get_phases_by_temp(temp_k):
    """此函数在新数据结构下依然可以正常工作"""
    if not data_cache.get('elements'):
        return jsonify({"error": "Element data not loaded on server."}), 500

    temp_k = float(temp_k)
    phases = {}
    for element in data_cache['elements']:
        melt = element.get("melt")
        boil = element.get("boil")
        phase = "unknown"
        if melt is None or boil is None:
            if temp_k == 298.15 and element.get("phase"):
                phase = element["phase"].lower()
            else:
                phase = "unknown"
        else:
            if temp_k < melt:
                phase = "solid"
            elif temp_k < boil:
                phase = "liquid"
            else:
                phase = "gas"
        phases[element['number']] = phase
    return jsonify(phases)

# 在应用上下文中加载数据，保持不变
#应用启动与数据预加载
with app.app_context():
    load_data()


#开发服务器启动（可选）
if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug)

"""
┌─────────────────────────────────────────┐
│          Flask App (Periodic_Table)      │
├─────────────────────────────────────────┤
│  数据层：                                 │
│    - periodic_table_enriched.json        │
│    - data_cache (内存缓存)                │
├─────────────────────────────────────────┤
│  处理层：                                 │
│    - remap_element_category() 分类映射    │
│    - load_data() 数据预处理与缓存         │
├─────────────────────────────────────────┤
│  路由层：                                 │
│    - GET  /              → index.html    │
│    - GET  /api/elements  → JSON 元素列表  │
│    - GET  /api/phases/<temp_k> → 相态字典│
├─────────────────────────────────────────┤
│  启动方式：                               │
│    - 被外部 backend_server.py 导入使用    │
│    - 或直接 python 运行（开发调试）        │
└─────────────────────────────────────────┘
"""
"""
提供一个独立、可复用的周期表数据服务后端。

通过预加载和分类重映射，为前端提供开箱即用的、经过加工的数据。

清晰的 API 设计使得前端能够实现动态交互（如温度滑块改变相态显示）
"""