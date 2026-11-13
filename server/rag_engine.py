"""混合检索 RAG 引擎

三路能力组合，兼顾精确匹配与语义理解：

1. **BM25** —— 稀疏检索，擅长关键词精确命中（元素名、术语）
2. **LSA 向量检索** —— TF-IDF + 截断 SVD 降维得到的稠密向量，擅长语义相近但用词不同的表达
3. **RRF 融合 + 规则重排** —— 把两路结果按排名融合，再用领域规则微调

全部在本机计算，不调用任何外部接口，因此无额度限制、可离线运行、结果可复现。
若环境缺少 scikit-learn，会自动降级为纯 BM25。
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

try:
    import joblib
    from sklearn.decomposition import TruncatedSVD
    from sklearn.feature_extraction.text import TfidfVectorizer

    SKLEARN_AVAILABLE = True
except ImportError:  # pragma: no cover
    SKLEARN_AVAILABLE = False

# BM25 参数
K1 = 1.5
B = 0.75
# RRF 融合参数
RRF_K = 60
# LSA 维度
LSA_DIM = 256
INDEX_FILENAME = "local_index.joblib"

# 领域概念扩展：教材级概念 → 元素集合
# 「金属为什么导电」「半导体材料有哪些」这类提问不含具体元素名，
# 字面检索无从下手，先把概念落到元素上，再按元素召回知识块。
CONCEPT_MEMBERS: dict[str, tuple[str, ...]] = {
    "稀有气体": ("氦", "氖", "氩", "氪", "氙", "氡"),
    "惰性气体": ("氦", "氖", "氩", "氪", "氙", "氡"),
    "半导体": ("硅", "锗"),
    "碱金属": ("锂", "钠", "钾", "铷", "铯"),
    "卤素": ("氟", "氯", "溴", "碘"),
    "放射性": ("铀", "镭", "钋", "氡", "钍", "钷"),
    "合金": ("铁", "铝", "钛", "镁", "铬", "镍"),
    "导电": ("铜", "银", "金", "铝"),
    "微量元素": ("铁", "锌", "碘", "硒", "铜", "锰"),
}


# ---------------------------------------------------------------- 分词
def tokenize(text: str) -> list[str]:
    """中文二元组 + 英文/数字词，兼顾召回与实现成本。"""
    cleaned = re.sub(r"[^\u4e00-\u9fa5A-Za-z0-9]", "", text or "")
    tokens: list[str] = []

    for segment in re.findall(r"[\u4e00-\u9fa5]+", cleaned):
        tokens.extend(segment[i : i + 2] for i in range(len(segment) - 1))
        if len(segment) == 1:
            tokens.append(segment)

    tokens.extend(token.lower() for token in re.findall(r"[A-Za-z0-9]+", cleaned))
    return tokens


# ---------------------------------------------------------------- 语料
def load_chunks(description_dir: Path) -> list[dict[str, str]]:
    """把元素科普文本切分为句子级知识块。"""
    chunks: list[dict[str, str]] = []
    if not description_dir.is_dir():
        return chunks

    for path in sorted(description_dir.glob("*.txt")):
        element_name = path.stem
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for raw in re.split(r"[。；\n]+", content):
            sentence = raw.strip()
            if len(sentence) >= 12:
                chunks.append({"element": element_name, "text": sentence})
    return chunks


# ---------------------------------------------------------------- 本地向量索引
def _l2_normalize(matrix):
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.clip(norms, 1e-9, None)


class LocalVectorIndex:
    """TF-IDF 字符 n-gram + 截断 SVD 的本地稠密向量索引。"""

    def __init__(self) -> None:
        self.vectorizer = None
        self.svd = None
        self.matrix = None
        self.ok = False

    def fit(self, texts: list[str]) -> "LocalVectorIndex":
        if not SKLEARN_AVAILABLE or not texts:
            return self

        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(1, 2),
            max_features=30000,
            sublinear_tf=True,
        )
        tfidf = self.vectorizer.fit_transform(texts)

        max_components = max(min(LSA_DIM, tfidf.shape[1] - 1, len(texts) - 1), 2)
        self.svd = TruncatedSVD(n_components=max_components, random_state=42)
        self.matrix = _l2_normalize(self.svd.fit_transform(tfidf)).astype(np.float32)
        self.ok = True
        return self

    def encode(self, text: str):
        if not self.ok:
            return None
        reduced = self.svd.transform(self.vectorizer.transform([text]))
        return _l2_normalize(reduced)[0]

    # ---------- 持久化 ----------
    def save(self, directory: Path, count: int) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "vectorizer": self.vectorizer,
                "svd": self.svd,
                "matrix": self.matrix,
                "count": count,
            },
            directory / INDEX_FILENAME,
            compress=3,
        )
        meta = {
            "count": count,
            "dim": int(self.matrix.shape[1]) if self.matrix is not None else 0,
            "method": "TF-IDF(char 1-2gram) + TruncatedSVD",
        }
        (directory / "meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def load(self, directory: Path, expected_count: int) -> bool:
        if not SKLEARN_AVAILABLE:
            return False
        path = directory / INDEX_FILENAME
        if not path.is_file():
            return False
        try:
            payload = joblib.load(path)
            if payload.get("count") != expected_count:
                return False  # 语料变动，索引失效
            self.vectorizer = payload["vectorizer"]
            self.svd = payload["svd"]
            self.matrix = payload["matrix"]
            self.ok = True
            return True
        except (OSError, ValueError, KeyError):
            return False


def build_index(chunks: list[dict[str, str]], output_dir: Path) -> dict[str, Any]:
    """构建并保存本地向量索引。"""
    if not SKLEARN_AVAILABLE:
        return {"ok": False, "error": "未安装 scikit-learn，无法构建向量索引"}
    if not chunks:
        return {"ok": False, "error": "语料为空"}

    texts = [f"{chunk['element']}：{chunk['text']}" for chunk in chunks]
    index = LocalVectorIndex().fit(texts)
    index.save(output_dir, len(chunks))

    return {
        "ok": True,
        "count": len(chunks),
        "dim": int(index.matrix.shape[1]),
        "method": "TF-IDF(char 1-2gram) + TruncatedSVD",
    }


# ---------------------------------------------------------------- 混合检索器
class HybridRetriever:
    """BM25 + LSA 向量 + RRF 的混合检索器。"""

    def __init__(
        self,
        chunks: list[dict[str, str]],
        index_dir: Path | None = None,
        api_key: str = "",
    ) -> None:
        self.chunks = chunks
        self.api_key = api_key  # 保留参数以兼容旧调用，本地索引不需要

        # BM25 统计量
        self.tokenized = [tokenize(chunk["text"]) for chunk in chunks]
        self.doc_len = [len(tokens) for tokens in self.tokenized]
        self.avgdl = (sum(self.doc_len) / len(self.doc_len)) if self.doc_len else 0.0
        self.n_docs = len(chunks)

        self.df: Counter[str] = Counter()
        for tokens in self.tokenized:
            self.df.update(set(tokens))

        # 元素名集合，用于查询命中的加权
        self.element_names = {chunk["element"] for chunk in chunks if chunk["element"]}

        self.vector_index = LocalVectorIndex()
        self.index_info: dict[str, Any] = {}

        if index_dir is not None and chunks:
            loaded = self.vector_index.load(index_dir, len(chunks))
            if not loaded:
                # 索引缺失或不匹配，现场构建（1213 条约 2 秒）
                self.vector_index.fit([f"{c['element']}：{c['text']}" for c in chunks])
            if self.vector_index.ok:
                self.index_info = {
                    "dim": int(self.vector_index.matrix.shape[1]),
                    "method": "TF-IDF + SVD",
                }

    @property
    def vector_enabled(self) -> bool:
        return self.vector_index.ok

    # ---------- 查询中的元素识别 ----------
    def _mentioned_elements(self, query: str) -> set[str]:
        """识别查询中提到的元素名。

        单字元素容易被常用词误伤：「金属」含「金」、「合金」含「金」，
        出现这类词时不把这些单字当作元素提及。
        """
        mentioned = {name for name in self.element_names if name in query}
        if "金属" in query or "合金" in query:
            mentioned -= {"金", "铁", "铜", "银", "铅", "锡", "汞", "铝", "锌", "镍"}
        return mentioned

    def _concept_elements(self, query: str) -> set[str]:
        """把查询中的学科概念展开为元素集合。"""
        found: set[str] = set()
        for keyword, members in CONCEPT_MEMBERS.items():
            if keyword in query:
                found.update(members)
        return found & self.element_names

    # ---------- BM25 ----------
    def _idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.n_docs - df + 0.5) / (df + 0.5))

    def bm25_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        terms = tokenize(query)
        if not terms:
            return []

        # 查询中出现的元素名（如「氢的用途」中的「氢」）
        mentioned = self._mentioned_elements(query)

        scores: list[tuple[int, float]] = []
        for index, tokens in enumerate(self.tokenized):
            if not tokens:
                continue
            counts = Counter(tokens)
            score = 0.0
            length = self.doc_len[index]
            for term in terms:
                freq = counts.get(term, 0)
                if freq == 0:
                    continue
                denominator = freq + K1 * (1 - B + B * length / max(self.avgdl, 1e-9))
                score += self._idf(term) * (freq * (K1 + 1)) / denominator

            # 元素名命中属于强信号：中文短语分词后常与文档用词错位，
            # 若不做加权，像「氢的用途」这类问题会因字面不重合而漏召。
            element = self.chunks[index]["element"]
            if element and element in mentioned:
                score += self._idf(element) * 5.0

            if score > 0:
                scores.append((index, score))

        scores.sort(key=lambda item: item[1], reverse=True)
        return scores[:top_k]

    # ---------- 字面重叠 ----------
    def bigram_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        """字符二元组重叠度，用于补足中文短语与文档用词错位时的召回。"""
        grams = {token for token in tokenize(query) if len(token) == 2}
        if not grams:
            return []

        mentioned = self._mentioned_elements(query)

        scores: list[tuple[int, float]] = []
        for index, tokens in enumerate(self.tokenized):
            overlap = len(grams & set(tokens))
            if overlap == 0:
                continue
            element = self.chunks[index]["element"]
            if element and element in mentioned:
                overlap += 6
            scores.append((index, float(overlap)))

        scores.sort(key=lambda item: item[1], reverse=True)
        return scores[:top_k]

    # ---------- 向量检索 ----------
    def vector_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        if not self.vector_enabled or np is None:
            return []

        vector = self.vector_index.encode(query)
        if vector is None:
            return []

        similarities = self.vector_index.matrix @ vector
        top_indices = np.argsort(-similarities)[:top_k]
        return [(int(i), float(similarities[i])) for i in top_indices]

    # ---------- 混合检索 ----------
    def search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        """返回重排后的检索结果。"""
        if not query.strip():
            return []

        bm25_hits = self.bm25_search(query, top_k=10)
        vector_hits = self.vector_search(query, top_k=10)
        bigram_hits = self.bigram_search(query, top_k=10)

        # RRF 融合：按排名而非分数加权，避免三路分数量纲不同
        fused: dict[int, float] = {}
        sources: dict[int, set[str]] = {}

        for label, hits in (("bm25", bm25_hits), ("vector", vector_hits), ("bigram", bigram_hits)):
            for rank, (index, _score) in enumerate(hits):
                fused[index] = fused.get(index, 0.0) + 1.0 / (RRF_K + rank + 1)
                sources.setdefault(index, set()).add(label)

        if not fused:
            return []

        mentioned = self._mentioned_elements(query)
        concept_keywords = [keyword for keyword in CONCEPT_MEMBERS if keyword in query]
        concepts = self._concept_elements(query) - mentioned

        # 概念扩展补池：概念对应的元素即使没被三路召回，也纳入候选
        if concepts:
            base = 1.0 / (RRF_K + 1) * 0.8
            for index, chunk in enumerate(self.chunks):
                if chunk["element"] in concepts and index not in fused:
                    fused[index] = base
                    sources[index] = {"concept"}

        # 规则重排：元素名命中 > 概念命中 > 普通召回
        ranked = []
        for index, base in fused.items():
            chunk = self.chunks[index]
            element = chunk["element"]

            if element and element in mentioned:
                tier = 2
            elif element in concepts:
                tier = 1
            else:
                tier = 0

            bonus = 0.0

            if len(sources.get(index, set())) >= 2:
                bonus += 0.008

            length = len(chunk["text"])
            if 20 <= length <= 90:
                bonus += 0.003

            # 块内直接提到概念词（如「半导体」出现在硅的简介里）优先
            if concept_keywords and any(keyword in chunk["text"] for keyword in concept_keywords):
                bonus += 0.02

            ranked.append((tier, base + bonus, index))

        ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)

        # 来源多样性：同一元素最多取 2 条
        results: list[dict[str, Any]] = []
        per_element: Counter[str] = Counter()
        for _tier, score, index in ranked:
            chunk = self.chunks[index]
            if per_element[chunk["element"]] >= 2:
                continue
            per_element[chunk["element"]] += 1
            results.append(
                {
                    "来源": f"元素图鉴·{chunk['element']}",
                    "内容": chunk["text"],
                    "匹配度": round(score, 6),
                    "命中方式": "+".join(sorted(sources.get(index, set()))),
                }
            )
            if len(results) >= top_k:
                break

        return results

    # ---------- 状态 ----------
    def stats(self) -> dict[str, Any]:
        return {
            "知识块数": self.n_docs,
            "词表规模": len(self.df),
            "平均块长度": round(self.avgdl, 1),
            "向量检索": "已启用（本地 LSA）" if self.vector_enabled else "未启用（降级为 BM25）",
            "向量维度": self.index_info.get("dim", 0),
            "向量方法": self.index_info.get("method", "-"),
        }
