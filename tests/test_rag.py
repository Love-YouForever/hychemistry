"""混合检索 RAG 引擎的单元测试。

主体用小型语料构造检索器，另校验真实关系证据 ID；全部离线运行。
"""

import copy
import json
from pathlib import Path

import chem_tools as chem
import pytest
import rag_engine as rag
from relation_graph import RelationGraph

TOY_CHUNKS = [
    {"element": "氢", "text": "氢是宇宙中最轻的元素，火箭燃料与燃料电池都会用到氢"},
    {"element": "氢", "text": "氢气在氧气中燃烧生成水，火焰呈淡蓝色"},
    {"element": "氢", "text": "氢的同位素包括氕、氘和氚"},
    {"element": "硅", "text": "硅是重要的半导体材料，芯片工业的基石"},
    {"element": "锗", "text": "锗也是半导体材料，早期晶体管由锗制成"},
    {"element": "铜", "text": "铜具有良好的导电性，广泛用于电线和电缆"},
    {"element": "铁", "text": "铁是制造合金的主体金属，钢铁工业的原料"},
]

GRAPH_CHUNKS = [
    {"id": "碳#1", "element": "碳", "text": "金刚石是碳元素中极致坚硬的一种同素异形体"},
    {"id": "碳#2", "element": "碳", "text": "金刚石薄膜是碳元素的一种薄膜形态"},
    {"id": "磷#1", "element": "磷", "text": "白磷在空气中会自燃，是磷的一种同素异形体"},
    {"id": "磷#2", "element": "磷", "text": "红磷性质较为稳定，是磷的一种同素异形体"},
]

GRAPH_DATA = {
    "nodes": [
        {"id": "element:carbon", "kind": "element", "name": "碳", "aliases": ["碳元素"]},
        {"id": "form:diamond", "kind": "form", "name": "金刚石", "aliases": ["钻石"]},
        {"id": "form:diamond_film", "kind": "form", "name": "金刚石薄膜", "aliases": []},
        {"id": "property:hardest", "kind": "property", "name": "自然界最硬", "aliases": ["最硬", "极致坚硬"]},
        {"id": "element:phosphorus", "kind": "element", "name": "磷", "aliases": ["磷元素"]},
        {"id": "form:white_p", "kind": "form", "name": "白磷", "aliases": []},
        {"id": "form:red_p", "kind": "form", "name": "红磷", "aliases": []},
        {"id": "property:self_ignition", "kind": "property", "name": "空气自燃", "aliases": ["自燃"]},
    ],
    "edges": [
        {
            "id": "diamond_carbon",
            "source": "form:diamond",
            "relation": "allotrope_of",
            "target": "element:carbon",
            "evidence_ids": ["碳#1"],
        },
        {
            "id": "diamond_hardest",
            "source": "form:diamond",
            "relation": "has_property",
            "target": "property:hardest",
            "evidence_ids": ["碳#1"],
        },
        {
            "id": "film_carbon",
            "source": "form:diamond_film",
            "relation": "form_of",
            "target": "element:carbon",
            "evidence_ids": ["碳#2"],
        },
        {
            "id": "white_p_phosphorus",
            "source": "form:white_p",
            "relation": "allotrope_of",
            "target": "element:phosphorus",
            "evidence_ids": ["磷#1"],
        },
        {
            "id": "white_p_self_ignition",
            "source": "form:white_p",
            "relation": "has_property",
            "target": "property:self_ignition",
            "evidence_ids": ["磷#1"],
        },
        {
            "id": "red_p_phosphorus",
            "source": "form:red_p",
            "relation": "allotrope_of",
            "target": "element:phosphorus",
            "evidence_ids": ["磷#2"],
        },
    ],
}


def write_graph(tmp_path, data=None):
    path = tmp_path / "relations.json"
    path.write_text(json.dumps(data or GRAPH_DATA, ensure_ascii=False), encoding="utf-8")
    return path


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
        assert [chunk["id"] for chunk in chunks] == ["氧#1", "氧#2"]
        assert [chunk["id"] for chunk in rag.load_chunks(tmp_path)] == ["氧#1", "氧#2"]
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


# ---------------------------------------------------------------- 关系证据图
class TestRelationGraph:
    def test_two_hop_hit_and_provenance(self, tmp_path):
        retriever = rag.HybridRetriever(
            GRAPH_CHUNKS, relation_graph_path=write_graph(tmp_path)
        )
        results = retriever.search("自然界最硬的物质", top_k=3)

        assert results[0]["来源"] == "元素图鉴·碳"
        assert results[0]["path_id"] == "diamond_hardest>diamond_carbon"
        assert "金刚石" in results[0]["relation_path"]
        assert "碳" in results[0]["relation_path"]
        assert results[0]["evidence_ids"] == ["碳#1"]
        assert "relation" in results[0]["命中方式"]

    def test_hop_limit_rejects_two_hop_path(self, tmp_path):
        graph = RelationGraph.from_file(
            write_graph(tmp_path), GRAPH_CHUNKS, max_hops=1
        )
        assert graph.find_paths("最硬") == []
        direct = graph.find_paths("金刚石")
        assert len(direct) == 1
        assert direct[0]["hops"] == 1

    def test_longest_alias_wins(self, tmp_path):
        graph = RelationGraph.from_file(write_graph(tmp_path), GRAPH_CHUNKS)
        assert graph.match_nodes("金刚石薄膜由什么组成") == ["form:diamond_film"]
        paths = graph.find_paths("金刚石薄膜由什么组成")
        assert [path["path_id"] for path in paths] == ["film_carbon"]

    def test_path_count_is_bounded(self, tmp_path):
        graph = RelationGraph.from_file(
            write_graph(tmp_path), GRAPH_CHUNKS, max_paths=1
        )
        assert len(graph.find_paths("金刚石薄膜与金刚石谁最硬")) <= 1

    def test_missing_evidence_disables_edge(self, tmp_path):
        data = copy.deepcopy(GRAPH_DATA)
        data["edges"][1]["evidence_ids"] = ["碳#999"]
        graph = RelationGraph.from_file(write_graph(tmp_path, data), GRAPH_CHUNKS)
        assert graph.invalid_edges == 1
        assert graph.find_paths("最硬") == []

    def test_mismatched_evidence_disables_edge(self, tmp_path):
        data = copy.deepcopy(GRAPH_DATA)
        data["edges"][1]["evidence_ids"] = ["碳#2"]
        graph = RelationGraph.from_file(write_graph(tmp_path, data), GRAPH_CHUNKS)
        assert graph.invalid_edges == 1
        assert graph.find_paths("最硬") == []

    def test_similar_form_does_not_bridge_to_wrong_property(self, tmp_path):
        graph = RelationGraph.from_file(write_graph(tmp_path), GRAPH_CHUNKS)
        paths = graph.find_paths("红磷也会在空气中自燃吗")
        assert [path["path_id"] for path in paths] == ["red_p_phosphorus"]

        retriever = rag.HybridRetriever(
            GRAPH_CHUNKS, relation_graph_path=write_graph(tmp_path)
        )
        results = retriever.search("红磷也会在空气中自燃吗", top_k=3)
        assert "white_p_self_ignition>white_p_phosphorus" not in {
            item.get("path_id") for item in results
        }


# ---------------------------------------------------------------- 降级与兼容
class TestRelationFallback:
    def test_missing_graph_falls_back_to_original_results(self, tmp_path):
        retriever = rag.HybridRetriever(
            GRAPH_CHUNKS, relation_graph_path=tmp_path / "不存在.json"
        )
        assert retriever.relation_enabled is False
        enhanced = retriever.search("金刚石", top_k=3, use_relations=True)
        baseline = retriever.search("金刚石", top_k=3, use_relations=False)
        assert enhanced == baseline
        assert all(set(item) == {"来源", "内容", "匹配度", "命中方式"} for item in enhanced)

    def test_invalid_json_falls_back(self, tmp_path):
        path = tmp_path / "invalid.json"
        path.write_text("{", encoding="utf-8")
        retriever = rag.HybridRetriever(GRAPH_CHUNKS, relation_graph_path=path)
        assert retriever.relation_enabled is False
        assert retriever.search("金刚石", top_k=2)

    def test_original_three_rrf_routes_regress(self, retriever, monkeypatch):
        monkeypatch.setattr(retriever, "bm25_search", lambda query, top_k: [(0, 3.0)])
        monkeypatch.setattr(retriever, "vector_search", lambda query, top_k: [(0, 0.9)])
        monkeypatch.setattr(retriever, "bigram_search", lambda query, top_k: [(0, 2.0)])

        def unexpected_relation_call(query, top_k):
            raise AssertionError("关闭关系增强时不应调用第四路")

        monkeypatch.setattr(retriever, "relation_search", unexpected_relation_call)
        results = retriever.search("氢的用途", top_k=1, use_relations=False)
        assert results[0]["命中方式"] == "bigram+bm25+vector"
        assert set(results[0]) == {"来源", "内容", "匹配度", "命中方式"}

    def test_chem_tools_passthrough(self, monkeypatch):
        captured = {}

        class StubRetriever:
            vector_enabled = False

            def search(self, query, top_k, use_relations=True):
                captured.update(query=query, top_k=top_k, use_relations=use_relations)
                return [
                    {
                        "来源": "元素图鉴·碳",
                        "内容": "金刚石是碳元素中极致坚硬的一种同素异形体",
                        "匹配度": 0.1,
                        "命中方式": "relation",
                        "path_id": "diamond_hardest>diamond_carbon",
                        "relation_path": "最硬 ←[has_property]— 金刚石 —[allotrope_of]→ 碳",
                        "evidence_ids": ["碳#1"],
                    }
                ]

        monkeypatch.setattr(chem, "_RETRIEVER", StubRetriever())
        output = chem.search_knowledge("最硬", top_k=2, use_relations=True)
        assert captured == {"query": "最硬", "top_k": 2, "use_relations": True}
        assert output["results"][0]["path_id"] == "diamond_hardest>diamond_carbon"
        assert output["results"][0]["evidence_ids"] == ["碳#1"]


class TestRealRelationEvidence:
    def test_real_ids_and_all_edges_validate(self):
        graph_path = Path(chem.__file__).with_name("knowledge_relations.json")
        graph = RelationGraph.from_file(graph_path, chem.KNOWLEDGE_CHUNKS)
        assert graph.available is True
        assert graph.invalid_edges == 0
        assert len(graph.edges) == 10

        chunks = {chunk["id"]: chunk["text"] for chunk in chem.KNOWLEDGE_CHUNKS}
        expected_terms = {
            "碳#5": ("钻石", "极致坚硬"),
            "碳#6": ("石墨", "柔软而导电"),
            "碳#9": ("石墨烯", "强于钢铁"),
            "磷#4": ("白磷", "自燃"),
            "磷#5": ("红磷", "黑磷"),
        }
        for chunk_id, terms in expected_terms.items():
            assert all(term in chunks[chunk_id] for term in terms)

        aliases = {
            alias
            for node in json.loads(graph_path.read_text(encoding="utf-8"))["nodes"]
            for alias in [node["name"], *node["aliases"]]
        }
        assert "自然界最硬的物质" not in aliases
