import os
import numpy as np
import faiss
import pickle
from typing import List, Dict, Any, Optional, Tuple

class FAISSIndexManager:
    """
    Manager for FAISS index operations - storing and retrieving vectors
    """

    def __init__(
        self,
        index_type: str = "flat",
        dimension: int = 768,
        index_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
        nlist: int = 100,
        nprobe: int = 10
    ):
        self.dimension = dimension
        self.index_type = index_type
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.nlist = nlist
        self.nprobe = nprobe

        # Load or create FAISS index
        if index_path and os.path.exists(index_path):
            self.index = faiss.read_index(index_path)
            if self.index_type.startswith("ivf"):
                self.index.nprobe = self.nprobe
        else:
            quant = faiss.IndexFlatIP(self.dimension)
            if self.index_type == "flat":
                self.index = quant
            elif self.index_type == "ivf_flat":
                idx = faiss.IndexIVFFlat(quant, self.dimension, self.nlist, faiss.METRIC_INNER_PRODUCT)
                idx.nprobe = self.nprobe
                self.index = idx
            elif self.index_type == "hnsw":
                self.index = faiss.IndexHNSWFlat(self.dimension, 32)
            else:
                raise ValueError(f"Unsupported index type {self.index_type}")

        # Load or init metadata
        if metadata_path and os.path.exists(metadata_path):
            with open(metadata_path, "rb") as f:
                self.metadata = pickle.load(f)
        else:
            self.metadata = {
                "documents": {},
                "chunks": {},
                "id_mapping": []
            }

    def add_documents(self, chunks: List[Dict[str, Any]]) -> List[int]:
        embeddings = []
        for chunk in chunks:
            emb = np.array(chunk["embedding"], dtype=np.float32)
            faiss.normalize_L2(emb.reshape(1, -1))
            embeddings.append(emb)
        arr = np.vstack(embeddings).astype(np.float32)

        if self.index_type.startswith("ivf") and not self.index.is_trained:
            self.index.train(arr)

        start = self.index.ntotal
        self.index.add(arr)
        assigned = list(range(start, start + len(chunks)))

        for i, chunk in enumerate(chunks):
            cid = f"{chunk['metadata']['doc_id']}_{chunk['chunk_id']}"
            fa = assigned[i]
            self.metadata["chunks"][cid] = {
                "text": chunk["text"],
                "metadata": chunk["metadata"],
                "faiss_id": fa
            }
            doc = chunk["metadata"]["doc_id"]
            if doc not in self.metadata["documents"]:
                self.metadata["documents"][doc] = {
                    "chunks": [], "metadata": chunk["metadata"]
                }
            self.metadata["documents"][doc]["chunks"].append(cid)
            self.metadata["id_mapping"].append(cid)

        return assigned

    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # 1) If no vectors at all yet, just return []
        if self.index.ntotal == 0:
            return []

        # 2) Normalize
        q = query_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(q)

        # 3) Perform FAISS search
        mult = 10 if filters else 1
        k_search = max(1, min(self.index.ntotal, k * mult))
        scores, ids = self.index.search(q, k_search)

        out = []
        for sc, fid in zip(scores[0], ids[0]):
            if fid < 0:
                continue

            chunk_id = self.metadata["id_mapping"][fid]

            # **SKIP** if this chunk was deleted and no longer in metadata
            if chunk_id not in self.metadata["chunks"]:
                continue

            data = self.metadata["chunks"][chunk_id]
            meta = data["metadata"]

            if filters and not self._apply_filters(meta, filters):
                continue

            # Decode bytes if needed
            txt = data["text"]
            if isinstance(txt, (bytes, bytearray)):
                txt = txt.decode("utf-8", errors="ignore")

            out.append({
                "text": txt,
                "score": float(sc),
                "metadata": meta,
                "chunk_id": chunk_id
            })
            if len(out) >= k:
                break

        return out

    def _apply_filters(self, metadata: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        for key, val in filters.items():
            if key not in metadata:
                return False
            if key == "date_range":
                if "start" in val and metadata["date"] < val["start"]:
                    return False
                if "end"   in val and metadata["date"] > val["end"]:
                    return False
            elif isinstance(val, list):
                if metadata[key] not in val:
                    return False
            elif metadata[key] != val:
                return False
        return True

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self.metadata["documents"]:
            return False

        # Remove all its chunks
        chunk_ids = self.metadata["documents"][doc_id]["chunks"]
        for cid in chunk_ids:
            self.metadata["chunks"].pop(cid, None)

        # Remove the document entry
        del self.metadata["documents"][doc_id]

        # **Also purge those chunk_ids out of id_mapping**
        self.metadata["id_mapping"] = [
            cid for cid in self.metadata["id_mapping"]
            if cid not in chunk_ids
        ]

        return True


    def save(self, index_path: Optional[str] = None, metadata_path: Optional[str] = None) -> Tuple[str, str]:
        ip = index_path or self.index_path
        mp = metadata_path or self.metadata_path
        if not ip or not mp:
            raise ValueError("Index path and metadata path must be specified")
        os.makedirs(os.path.dirname(ip), exist_ok=True)
        os.makedirs(os.path.dirname(mp), exist_ok=True)
        faiss.write_index(self.index, ip)
        with open(mp, "wb") as f:
            pickle.dump(self.metadata, f)
        return ip, mp