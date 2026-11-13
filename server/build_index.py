"""构建 RAG 检索索引

把 118 篇元素图鉴切分为 1213 个知识块，用字符 n-gram TF-IDF + 截断 SVD
在本机生成稠密向量并落盘。全程离线，不需要任何密钥或网络。

索引文件约 29 MB，未纳入仓库，首次运行服务时会自动在内存中拟合；
提前构建可省去每次启动约 2 秒的拟合开销。

用法::

    python server/build_index.py          # 已存在则跳过
    python server/build_index.py --force  # 强制重建
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag_engine import build_index, load_chunks  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
DESCRIPTION_DIR = BASE_DIR / "pages" / "Periodic_Table" / "交互式元素周期表" / "description"
INDEX_DIR = BASE_DIR / "server" / "knowledge_index"


def main() -> None:
    parser = argparse.ArgumentParser(description="构建 RAG 检索索引")
    parser.add_argument("--force", action="store_true", help="强制重建")
    args = parser.parse_args()

    meta_file = INDEX_DIR / "meta.json"
    if meta_file.is_file() and not args.force:
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        print(f"索引已存在：{meta['count']} 条，{meta['dim']} 维，{meta.get('method', '')}")
        print("如需重建请加 --force")
        return

    chunks = load_chunks(DESCRIPTION_DIR)
    print(f"知识块：{len(chunks)} 条")
    if not chunks:
        print("未找到语料，请检查 description 目录")
        return

    start = time.time()
    result = build_index(chunks, INDEX_DIR)
    elapsed = time.time() - start

    if result.get("ok"):
        print(f"索引构建完成：{result['count']} 条 × {result['dim']} 维")
        print(f"方法：{result['method']}　耗时：{elapsed:.1f} 秒")
        size = (INDEX_DIR / "local_index.joblib").stat().st_size / 1024 / 1024
        print(f"索引文件：{size:.1f} MB　路径：{INDEX_DIR}")
    else:
        print(f"构建失败：{result.get('error')}")


if __name__ == "__main__":
    main()
