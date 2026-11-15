"""轻量、可校验的关系证据图。

图只负责把查询中的受控别名连接到语料中的有效元素；每条边都必须指向
真实句子块，且句子块需同时支持边的两个端点。任何加载或校验失败都只
禁用相应关系能力，不影响普通混合检索。
"""

from __future__ import annotations

import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

ALLOWED_NODE_KINDS = frozenset({"element", "form", "property"})
ALLOWED_RELATIONS = frozenset({"allotrope_of", "form_of", "has_property", "related_to"})
DEFAULT_MAX_HOPS = 2
DEFAULT_MAX_PATHS = 8


class RelationGraph:
    """受控关系图，提供最长别名匹配和有限深度证据路径搜索。"""

    def __init__(
        self,
        data: dict[str, Any] | None,
        chunks: list[dict[str, str]],
        valid_elements: set[str] | None = None,
        max_hops: int = DEFAULT_MAX_HOPS,
        max_paths: int = DEFAULT_MAX_PATHS,
    ) -> None:
        self.max_hops = max(0, min(int(max_hops), 2))
        self.max_paths = max(1, int(max_paths))
        self.available = False
        self.error = ""
        self.invalid_edges = 0
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: dict[str, dict[str, Any]] = {}
        self._aliases: dict[str, tuple[str, ...]] = {}
        self._adjacency: dict[str, list[tuple[str, str, bool]]] = defaultdict(list)
        self._chunks = {chunk.get("id"): chunk for chunk in chunks if chunk.get("id")}
        self._valid_elements = (
            valid_elements
            if valid_elements is not None
            else {chunk.get("element", "") for chunk in chunks if chunk.get("element")}
        )

        if not isinstance(data, dict):
            self.error = "关系图缺失或格式无效"
            return
        if not isinstance(data.get("nodes"), list) or not isinstance(data.get("edges"), list):
            self.error = "关系图缺少 nodes/edges"
            return

        self._load_nodes(data["nodes"])
        self._load_edges(data["edges"])
        for edge_id, edge in self.edges.items():
            source, target = edge["source"], edge["target"]
            self._adjacency[source].append((edge_id, target, True))
            self._adjacency[target].append((edge_id, source, False))
        for neighbors in self._adjacency.values():
            neighbors.sort(key=lambda item: (item[1], item[0]))
        self.available = True

    @classmethod
    def from_file(
        cls,
        path: Path | str | None,
        chunks: list[dict[str, str]],
        valid_elements: set[str] | None = None,
        max_hops: int = DEFAULT_MAX_HOPS,
        max_paths: int = DEFAULT_MAX_PATHS,
    ) -> "RelationGraph":
        """读取图文件；文件不存在或 JSON 无效时返回不可用的空图。"""
        if path is None:
            return cls(None, chunks, valid_elements, max_hops, max_paths)
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            graph = cls(None, chunks, valid_elements, max_hops, max_paths)
            graph.error = "关系图文件缺失或无效"
            return graph
        return cls(data, chunks, valid_elements, max_hops, max_paths)

    def _load_nodes(self, raw_nodes: list[Any]) -> None:
        for item in raw_nodes:
            if not isinstance(item, dict):
                continue
            node_id = item.get("id")
            kind = item.get("kind")
            name = item.get("name")
            aliases = item.get("aliases", [])
            if (
                not isinstance(node_id, str)
                or not node_id
                or node_id in self.nodes
                or kind not in ALLOWED_NODE_KINDS
                or not isinstance(name, str)
                or not name
                or not isinstance(aliases, list)
                or not all(isinstance(alias, str) and alias for alias in aliases)
            ):
                continue
            if kind == "element" and name not in self._valid_elements:
                continue
            self.nodes[node_id] = {"id": node_id, "kind": kind, "name": name}
            self._aliases[node_id] = tuple(dict.fromkeys((name, *aliases)))

    def _node_supported(self, node_id: str, chunk: dict[str, str]) -> bool:
        node = self.nodes[node_id]
        if node["kind"] == "element":
            return chunk.get("element") == node["name"]
        text = chunk.get("text", "")
        return any(alias in text for alias in self._aliases[node_id])

    def _valid_evidence(self, source: str, target: str, evidence_ids: Any) -> bool:
        if (
            not isinstance(evidence_ids, list)
            or not evidence_ids
            or not all(isinstance(item, str) and item for item in evidence_ids)
        ):
            return False
        for evidence_id in evidence_ids:
            chunk = self._chunks.get(evidence_id)
            if chunk is None:
                return False
            if not self._node_supported(source, chunk) or not self._node_supported(target, chunk):
                return False
        return True

    def _load_edges(self, raw_edges: list[Any]) -> None:
        for item in raw_edges:
            if not isinstance(item, dict):
                self.invalid_edges += 1
                continue
            edge_id = item.get("id")
            source, target = item.get("source"), item.get("target")
            relation = item.get("relation")
            if (
                not isinstance(edge_id, str)
                or not edge_id
                or edge_id in self.edges
                or source not in self.nodes
                or target not in self.nodes
                or source == target
                or relation not in ALLOWED_RELATIONS
                or not self._valid_evidence(source, target, item.get("evidence_ids"))
            ):
                self.invalid_edges += 1
                continue
            self.edges[edge_id] = {
                "id": edge_id,
                "source": source,
                "target": target,
                "relation": relation,
                "evidence_ids": tuple(dict.fromkeys(item["evidence_ids"])),
            }

    def match_nodes(self, query: str) -> list[str]:
        """返回非重叠的最长别名匹配，避免「金刚石」吞掉「金刚石薄膜」。"""
        if not query:
            return []
        candidates: list[tuple[int, int, str, str]] = []
        for node_id, aliases in self._aliases.items():
            for alias in aliases:
                start = query.find(alias)
                while start >= 0:
                    candidates.append((start, start + len(alias), alias, node_id))
                    start = query.find(alias, start + 1)

        # 先全局保留最长词，再按查询中的位置恢复匹配顺序。
        candidates.sort(key=lambda item: (-(item[1] - item[0]), item[0], item[3], item[2]))
        occupied: list[tuple[int, int]] = []
        selected: list[tuple[int, int, str, str]] = []
        for candidate in candidates:
            start, end = candidate[:2]
            if any(start < used_end and end > used_start for used_start, used_end in occupied):
                continue
            occupied.append((start, end))
            selected.append(candidate)

        selected.sort(key=lambda item: (item[0], -(item[1] - item[0]), item[3]))
        return list(dict.fromkeys(item[3] for item in selected))

    def _conflicts_with_explicit_entity(self, path_nodes: list[str], matched: list[str]) -> bool:
        """查询明确指定某同素异形体/元素时，不借相似实体搭错误关系桥。"""
        path_set = set(path_nodes)
        for kind in ("form", "element"):
            explicit = {node_id for node_id in matched if self.nodes[node_id]["kind"] == kind}
            if explicit and not explicit.intersection(path_set):
                return True
        return False

    def _make_path(self, node_ids: list[str], steps: list[tuple[str, bool]]) -> dict[str, Any]:
        names = [self.nodes[node_id]["name"] for node_id in node_ids]
        readable = names[0]
        evidence_ids: list[str] = []
        edge_ids: list[str] = []
        for index, (edge_id, forward) in enumerate(steps):
            edge = self.edges[edge_id]
            arrow = f" —[{edge['relation']}]→ " if forward else f" ←[{edge['relation']}]— "
            readable += arrow + names[index + 1]
            edge_ids.append(edge_id)
            evidence_ids.extend(edge["evidence_ids"])
        return {
            "path_id": ">".join(edge_ids),
            "relation_path": readable,
            "evidence_ids": tuple(dict.fromkeys(evidence_ids)),
            "terminal_element": self.nodes[node_ids[-1]]["name"],
            "node_ids": tuple(node_ids),
            "hops": len(steps),
        }

    def find_paths(self, query: str) -> list[dict[str, Any]]:
        """查找一至两跳、终止于有效元素且证据完整的路径。"""
        if not self.available or not self.edges or self.max_hops == 0:
            return []
        matched = self.match_nodes(query)
        if not matched:
            return []

        paths: list[dict[str, Any]] = []
        seen_path_ids: set[str] = set()
        search_cap = self.max_paths * 4
        for start in matched:
            queue = deque([(start, [start], [])])
            while queue and len(paths) < search_cap:
                current, node_ids, steps = queue.popleft()
                depth = len(steps)
                if depth and self.nodes[current]["kind"] == "element":
                    if self._conflicts_with_explicit_entity(node_ids, matched):
                        continue
                    path = self._make_path(node_ids, steps)
                    if path["path_id"] not in seen_path_ids:
                        seen_path_ids.add(path["path_id"])
                        paths.append(path)
                    continue
                if depth >= self.max_hops:
                    continue
                for edge_id, next_node, forward in self._adjacency.get(current, []):
                    if next_node in node_ids:
                        continue
                    queue.append((next_node, node_ids + [next_node], steps + [(edge_id, forward)]))

        matched_set = set(matched)
        paths.sort(
            key=lambda path: (
                -len(matched_set.intersection(path["node_ids"])),
                path["hops"],
                path["path_id"],
            )
        )
        return paths[: self.max_paths]

    def stats(self) -> dict[str, Any]:
        return {
            "available": self.available,
            "nodes": len(self.nodes),
            "edges": len(self.edges),
            "invalid_edges": self.invalid_edges,
            "max_hops": self.max_hops,
            "max_paths": self.max_paths,
            "error": self.error,
        }
