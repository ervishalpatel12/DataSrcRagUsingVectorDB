"""
Pinecone Vector Database Service wrapper with support for both cloud Pinecone
and high-performance in-memory vector index fallback.
"""
from typing import List, Dict, Any, Optional
import math
import time
from app.core.config import settings

try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError:
    Pinecone = None


class PineconeService:
    """
    Manages connections, upserts, upgrades, and semantic search queries
    against Pinecone Vector Index with namespace support.
    """

    def __init__(self):
        self.api_key = settings.PINECONE_API_KEY
        self.index_name = settings.PINECONE_INDEX_NAME
        self.dimension = settings.PINECONE_DIMENSION
        self.metric = settings.PINECONE_METRIC
        self._pc = None
        self._index = None
        
        # Local in-memory vector storage per namespace:
        # { namespace: { vector_id: {"id": id, "values": [...], "metadata": {...}} } }
        self._local_storage: Dict[str, Dict[str, Dict[str, Any]]] = {
            settings.PINECONE_NAMESPACE_DEFAULT: {}
        }

    def _get_pinecone_index(self):
        """Attempts to initialize genuine Pinecone client if real API key configured."""
        if self._index is not None:
            return self._index

        if Pinecone is not None and self.api_key and not self.api_key.startswith("pcsk_demo"):
            try:
                self._pc = Pinecone(api_key=self.api_key)
                existing_indexes = [i.name for i in self._pc.list_indexes()]
                if self.index_name not in existing_indexes:
                    print(f"[PineconeService] Index '{self.index_name}' not found. Please create it or use demo mode.")
                else:
                    self._index = self._pc.Index(self.index_name)
                    return self._index
            except Exception as e:
                print(f"[PineconeService] Could not connect to remote Pinecone: {e}")

        return None

    # ==========================================
    # 1. Upsert Pipeline (Used by Upload)
    # ==========================================

    async def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: str = "default",
        batch_size: int = 100
    ) -> int:
        """
        Upserts vector records into Pinecone.
        Format of each vector: {"id": str, "values": List[float], "metadata": dict}
        """
        index = self._get_pinecone_index()
        upserted_count = 0

        if index:
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                index.upsert(vectors=batch, namespace=namespace)
                upserted_count += len(batch)
            return upserted_count

        # In-memory storage execution
        if namespace not in self._local_storage:
            self._local_storage[namespace] = {}

        for item in vectors:
            v_id = item["id"]
            self._local_storage[namespace][v_id] = {
                "id": v_id,
                "values": item["values"],
                "metadata": item.get("metadata", {}),
                "updated_at": time.time()
            }
            upserted_count += 1

        return upserted_count

    # ==========================================
    # 2. Upgrade Pipeline (Used by Upgrade)
    # ==========================================

    async def update_vector(
        self,
        vector_id: str,
        values: Optional[List[float]] = None,
        metadata_patch: Optional[Dict[str, Any]] = None,
        merge_metadata: bool = True,
        namespace: str = "default"
    ) -> bool:
        """
        Updates an existing vector record in Pinecone.
        Can update values, metadata, or both.
        """
        index = self._get_pinecone_index()

        if index:
            kwargs = {"id": vector_id, "namespace": namespace}
            if values is not None:
                kwargs["values"] = values
            if metadata_patch is not None:
                kwargs["set_metadata"] = metadata_patch
            index.update(**kwargs)
            return True

        # In-memory update
        ns_dict = self._local_storage.get(namespace, {})
        if vector_id not in ns_dict:
            # Create if not existing
            ns_dict[vector_id] = {
                "id": vector_id,
                "values": values or ([0.0] * self.dimension),
                "metadata": metadata_patch or {},
                "updated_at": time.time()
            }
            self._local_storage[namespace] = ns_dict
            return True

        record = ns_dict[vector_id]
        if values is not None:
            record["values"] = values

        if metadata_patch is not None:
            if merge_metadata:
                record["metadata"] = {**record.get("metadata", {}), **metadata_patch}
            else:
                record["metadata"] = metadata_patch

        record["updated_at"] = time.time()
        return True

    # ==========================================
    # 3. Retrieve / Semantic Search Pipeline
    # ==========================================

    async def query_vectors(
        self,
        query_vector: List[float],
        namespace: str = "default",
        top_k: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None,
        include_values: bool = False,
        include_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Executes nearest-neighbor semantic search against Pinecone index.
        """
        index = self._get_pinecone_index()

        if index:
            kwargs = {
                "vector": query_vector,
                "top_k": top_k,
                "namespace": namespace,
                "include_values": include_values,
                "include_metadata": include_metadata,
            }
            if filter_dict:
                kwargs["filter"] = filter_dict
            res = index.query(**kwargs)
            matches = []
            for match in res.matches:
                matches.append({
                    "id": match.id,
                    "score": float(match.score),
                    "metadata": match.metadata if hasattr(match, "metadata") else {},
                    "values": list(match.values) if (include_values and hasattr(match, "values")) else None
                })
            return matches

        # In-memory cosine similarity search
        ns_dict = self._local_storage.get(namespace, {})
        candidates = []

        for v_id, record in ns_dict.items():
            # Apply metadata filter if specified
            if filter_dict and not self._matches_filter(record.get("metadata", {}), filter_dict):
                continue

            score = self._compute_similarity(query_vector, record["values"], self.metric)
            match_data = {
                "id": v_id,
                "score": round(score, 5),
                "metadata": record.get("metadata", {}) if include_metadata else {},
                "values": record["values"] if include_values else None,
            }
            candidates.append(match_data)

        # Sort descending by similarity score
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates[:top_k]

    # ==========================================
    # 4. Helper Math & Filter Evaluation
    # ==========================================

    @staticmethod
    def _compute_similarity(vec_a: List[float], vec_b: List[float], metric: str = "cosine") -> float:
        """Calculates distance or similarity between two dense vectors."""
        if not vec_a or not vec_b:
            return 0.0

        if metric == "cosine":
            dot = sum(a * b for a, b in zip(vec_a, vec_b))
            norm_a = math.sqrt(sum(a * a for a in vec_a))
            norm_b = math.sqrt(sum(b * b for b in vec_b))
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return max(-1.0, min(1.0, dot / (norm_a * norm_b)))

        elif metric == "dotproduct":
            return sum(a * b for a, b in zip(vec_a, vec_b))

        elif metric == "euclidean":
            # Euclidean distance converted to inverted similarity: 1 / (1 + distance)
            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(vec_a, vec_b)))
            return 1.0 / (1.0 + dist)

        return 0.0

    @staticmethod
    def _matches_filter(metadata: Dict[str, Any], filter_dict: Dict[str, Any]) -> bool:
        """Evaluates MongoDB/Pinecone style filter conditions."""
        for field, condition in filter_dict.items():
            val = metadata.get(field)
            if isinstance(condition, dict):
                for op, expected in condition.items():
                    if op == "$eq" and val != expected:
                        return False
                    elif op == "$ne" and val == expected:
                        return False
                    elif op == "$in" and val not in expected:
                        return False
                    elif op == "$nin" and val in expected:
                        return False
                    elif op == "$gt" and (val is None or val <= expected):
                        return False
                    elif op == "$gte" and (val is None or val < expected):
                        return False
                    elif op == "$lt" and (val is None or val >= expected):
                        return False
                    elif op == "$lte" and (val is None or val > expected):
                        return False
            else:
                if val != condition:
                    return False
        return True

    # ==========================================
    # 5. Index Stats & Vector Inspection
    # ==========================================

    async def get_index_stats(self) -> Dict[str, Any]:
        """Returns vector count and namespace distribution."""
        index = self._get_pinecone_index()
        if index:
            try:
                stats = index.describe_index_stats()
                return {
                    "index_name": self.index_name,
                    "dimension": stats.dimension,
                    "metric": self.metric,
                    "total_vector_count": stats.total_vector_count,
                    "namespaces": {k: {"vector_count": v.vector_count} for k, v in stats.namespaces.items()},
                    "index_fullness": getattr(stats, "index_fullness", 0.0),
                }
            except Exception as e:
                print(f"[PineconeService] describe_index_stats error: {e}")

        total_count = sum(len(records) for records in self._local_storage.values())
        return {
            "index_name": self.index_name,
            "dimension": self.dimension,
            "metric": self.metric,
            "total_vector_count": total_count,
            "namespaces": {
                ns: {"vector_count": len(records)} for ns, records in self._local_storage.items()
            },
            "index_fullness": 0.0,
        }

    def get_all_vectors(self, namespace: str = "default") -> List[Dict[str, Any]]:
        """Returns all vectors in a namespace for visual inspection."""
        ns_records = self._local_storage.get(namespace, {})
        return list(ns_records.values())

    def delete_vector(self, vector_id: str, namespace: str = "default") -> bool:
        """Deletes vector by ID."""
        index = self._get_pinecone_index()
        if index:
            index.delete(ids=[vector_id], namespace=namespace)
            return True
        if namespace in self._local_storage and vector_id in self._local_storage[namespace]:
            del self._local_storage[namespace][vector_id]
            return True
        return False


pinecone_service = PineconeService()
