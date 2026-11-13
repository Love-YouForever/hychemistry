"""混合检索 RAG 引擎的单元测试。

用小型语料构造检索器，不依赖真实图鉴与索引文件，可在 CI 中离线快速运行。
"""

import pytest
import rag_engine as rag

TOY_CHUNKS = [
    {"element": "氢", "text": "氢是宇宙中最轻的元素，火箭燃料与燃料电池都会用到氢"},
    {"element": "氢", "text": "氢气在氧气中燃烧生成水，火焰呈淡蓝色"},
    {"element": "氢", "text": "氢的同位素包括氕、氘和氚"},
    {"element": "硅", "text": "硅是重要的半导体材料，芯片工业的基石"},
    {"element": "锗", "text": "锗也是半导体材料，早期晶体管由锗制成"},
    {"element": "铜", "text": "铜具有良好的导电性，广泛用于电线和电缆"},
    {"element": "铁", "text": "铁是制造合金的主体金属，钢铁工业的原料"},
]


# ---------------------------------------------------------------- 分词与语料
class TestTokenize:
    def test_bigrams(self):
        assert rag.tokenize("氢气燃烧") == ["氢气", "气燃", "燃烧"]

    def test_single_char_kept(self):
        assert rag.tokenize("氧") == ["氧"]

    def test_ascii_tokenized(self):
        assert rag.tokenize("Fe2O3") == ["fe2o3"]

    def test_empty(self):
        assert rag.tokenize("") == []


class TestLoadChunks:
    def test_split_and_filter(self, tmp_path):
        (tmp_path / "氧.txt").write_text(
            "氧是地壳中含量最多的元素。氧支持燃烧；短句\n这是一段长度足够的描述文字。",
            encoding="utf-8",
        )
        chunks = rag.load_chunks(tmp_path)
        texts = [chunk["text"] for chunk in chunks]
        assert all(len(text) >= 12 for text in texts)
        assert chunks[0]["element"] == "氧"
        assert "氧是地壳中含量最多的元素" in texts

    def test_missing_dir(self, tmp_path):
        assert rag.load_chunks(tmp_path / "不存在") == []


# ---------------------------------------------------------------- 向量索引
class TestLocalVectorIndex:
    def test_fit_and_encode(self):
        index = rag.LocalVectorIndex().fit([chunk["text"] for chunk in TOY_CHUNKS])
        assert index.ok is True
        vector = index.encode("半导体材料")
        assert vector is not None
        assert vector.shape[0] == index.matrix.shape[1]

    def test_save_and_load(self, tmp_path):
        index = rag.LocalVectorIndex().fit([chunk["text"] for chunk in TOY_CHUNKS])
        index.save(tmp_path, len(TOY_CHUNKS))

        loaded = rag.LocalVectorIndex()
        assert loaded.load(tmp_path, len(TOY_CHUNKS)) is True
        assert loaded.ok is True

    def test_load_rejects_count_mismatch(self, tmp_path):
        index = rag.LocalVectorIndex().fit([chunk["text"] for chunk in TOY_CHUNKS])
        index.save(tmp_path, len(TOY_CHUNKS))

        loaded = rag.LocalVectorIndex()
        assert loaded.load(tmp_path, len(TOY_CHUNKS) + 1) is False

    def test_load_missing_file(self, tmp_path):
        assert rag.LocalVectorIndex().load(tmp_path, 1) is False

    def test_encode_without_fit(self):
        assert rag.LocalVectorIndex().encode("任意文本") is None


class TestBuildIndex:
    def test_build(self, tmp_path):
        result = rag.build_index(TOY_CHUNKS, tmp_path)
        assert result["ok"] is True
        assert result["count"] == len(TOY_CHUNKS)
        assert result["dim"] >= 2
        assert (tmp_path / rag.INDEX_FILENAME).is_file()
        assert (tmp_path / "meta.json").is_file()

    def test_empty_corpus(self, tmp_path):
        assert rag.build_index([], tmp_path)["ok"] is False


# ---------------------------------------------------------------- 检索器
@pytest.fixture()
def retriever(tmp_path):
    rag.build_index(TOY_CHUNKS, tmp_path)
    return rag.HybridRetriever(TOY_CHUNKS, tmp_path)


class TestElementSignals:
    def test_mentioned_elements(self, retriever):
        assert retriever._mentioned_elements("氢的用途") == {"氢"}

    def test_metal_word_not_matched(self, retriever):
        assert "金" not in retriever._mentioned_elements("金属为什么导电")

    def test_concept_expansion(self, retriever):
        assert retriever._concept_elements("半导体材料有哪些") == {"硅", "锗"}


class TestSearch:
    def test_returns_expected_fields(self, retriever):
        results = retriever.search("氢的用途", top_k=2)
        assert results
        assert set(results[0]) == {"来源", "内容", "匹配度", "命中方式"}
        assert results[0]["来源"].startswith("元素图鉴·")

    def test_element_query_hits_first(self, retriever):
        results = retriever.search("氢的用途", top_k=3)
        assert results[0]["来源"] == "元素图鉴·氢"

    def test_concept_query_hits_concept_element(self, retriever):
        results = retriever.search("半导体材料有哪些", top_k=3)
        assert results[0]["来源"] in {"元素图鉴·硅", "元素图鉴·锗"}

    def test_top_k_respected(self, retriever):
        assert len(retriever.search("元素", top_k=2)) <= 2

    def test_same_element_at_most_twice(self, retriever):
        results = retriever.search("氢", top_k=3)
        elements = [item["来源"] for item in results]
        assert elements.count("元素图鉴·氢") <= 2

    def test_empty_query(self, retriever):
        assert retriever.search("   ") == []

    def test_unknown_query_no_crash(self, retriever):
        assert isinstance(retriever.search("量子纠缠"), list)

    def test_bm25_search_depth(self, retriever):
        hits = retriever.bm25_search("氢", top_k=2)
        assert len(hits) == 2

    def test_vector_search_runs(self, retriever):
        assert retriever.vector_enabled is True
        hits = retriever.vector_search("半导体", top_k=3)
        assert len(hits) == 3


class TestStats:
    def test_stats_fields(self, retriever):
        stats = retriever.stats()
        assert stats["知识块数"] == len(TOY_CHUNKS)
        assert "BM25" in stats["向量检索"] or "LSA" in stats["向量检索"]
        assert stats["向量维度"] >= 2

    def test_without_index_dir_degrades(self):
        plain = rag.HybridRetriever(TOY_CHUNKS)
        assert plain.vector_enabled is False
        assert plain.search("氢", top_k=2)
