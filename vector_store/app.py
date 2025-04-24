from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import time
import numpy as np
import uvicorn

from index_manager import FAISSIndexManager
from retrieval import VectorRetriever

# --- CONFIGURATION ---
INDEX_PATH    = os.environ.get("INDEX_PATH",    "data/faiss_index")
METADATA_PATH = os.environ.get("METADATA_PATH", "data/metadata.pickle")
INDEX_TYPE    = os.environ.get("INDEX_TYPE",    "flat")
DIMENSION     = int(os.environ.get("DIMENSION", "768"))
API_KEY       = os.environ.get("SERVICE_API_KEY")

# --- SETUP DIRECTORIES ---
os.makedirs(os.path.dirname(INDEX_PATH),    exist_ok=True)
os.makedirs(os.path.dirname(METADATA_PATH), exist_ok=True)

# --- INITIALIZE FAISS INDEX (LOAD OR NEW) ---
try:
    if os.path.exists(INDEX_PATH) and os.path.getsize(INDEX_PATH) > 0 \
    and os.path.exists(METADATA_PATH) and os.path.getsize(METADATA_PATH) > 0:
        print(f"Loading existing index from {INDEX_PATH}")
        index_manager = FAISSIndexManager(
            index_type=INDEX_TYPE,
            dimension=DIMENSION,
            index_path=INDEX_PATH,
            metadata_path=METADATA_PATH
        )
    else:
        print("Creating new index (no valid index files found)")
        index_manager = FAISSIndexManager(
            index_type=INDEX_TYPE,
            dimension=DIMENSION,
            index_path=None,
            metadata_path=None
        )
        index_manager.save(INDEX_PATH, METADATA_PATH)
except Exception as e:
    print(f"Error loading index ({e}), creating new one")
    index_manager = FAISSIndexManager(
        index_type=INDEX_TYPE,
        dimension=DIMENSION,
        index_path=None,
        metadata_path=None
    )
    index_manager.save(INDEX_PATH, METADATA_PATH)

retriever = VectorRetriever(index_manager)

app = FastAPI(
    title="Vector Store Service",
    description="FAISS-based vector storage and retrieval for semantic search"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class Chunk(BaseModel):
    text: str
    metadata: Dict[str, Any]
    embedding: List[float]
    chunk_id: int

class ChunkBatch(BaseModel):
    chunks: List[Chunk]

class SearchByEmbeddingRequest(BaseModel):
    embedding: List[float]
    k: int = 5
    filters: Optional[Dict[str, Any]] = None

class KeywordSearchRequest(BaseModel):
    keywords: str
    limit: int = 5
    filters: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    text: str
    score: float
    metadata: Dict[str, Any]
    chunk_id: str

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_matches: int
    query_time_ms: float

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# --- AUTH ---
async def verify_api_key(x_api_key: str = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# --- ROUTES ---
@app.post("/vectors/add", response_model=APIResponse)
async def add_vectors(batch: ChunkBatch, auth=Depends(verify_api_key)):
    try:
        docs = []
        for c in batch.chunks:
            docs.append({
                "text": c.text,
                "metadata": c.metadata,
                "embedding": c.embedding,
                "chunk_id": c.chunk_id
            })
        ids = index_manager.add_documents(docs)
        index_manager.save()
        return APIResponse(success=True,
                           message=f"Added {len(ids)} chunks",
                           data={"ids": ids})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vectors/search", response_model=SearchResponse)
async def search_by_embedding(
    req: SearchByEmbeddingRequest,
    auth=Depends(verify_api_key)
):
    start = time.time()
    try:
        qemb = np.array(req.embedding, dtype=np.float32)
        results = await retriever.search_by_embedding(qemb, k=req.k, filters=req.filters)
        elapsed = (time.time() - start) * 1000
        return SearchResponse(results=results, total_matches=len(results), query_time_ms=elapsed)
    except Exception as e:
        # print full traceback to logs
        import traceback; traceback.print_exc()
        elapsed = (time.time() - start) * 1000
        # return empty results instead of HTTP 500
        return SearchResponse(results=[], total_matches=0, query_time_ms=elapsed)


@app.post("/vectors/keyword-search", response_model=SearchResponse)
async def keyword_search(
    req: KeywordSearchRequest,
    auth=Depends(verify_api_key)
):
    start = time.time()
    try:
        matches = []
        for cid, data in index_manager.metadata["chunks"].items():
            text = data["text"]
            # decode Python bytes if present
            if isinstance(text, (bytes, bytearray)):
                text = text.decode("utf-8", errors="ignore")
            if req.keywords.lower() in text.lower():
                if req.filters and not index_manager._apply_filters(data["metadata"], req.filters):
                    continue
                cnt = text.lower().count(req.keywords.lower())
                score = min(0.99, cnt * 0.1)
                matches.append({"text": text,
                                "score": score,
                                "metadata": data["metadata"],
                                "chunk_id": cid})
        matches.sort(key=lambda x: x["score"], reverse=True)
        res = matches[:req.limit]
        elapsed = (time.time() - start) * 1000
        return SearchResponse(results=res, total_matches=len(matches), query_time_ms=elapsed)
    except Exception as e:
        import traceback; traceback.print_exc()
        elapsed = (time.time() - start) * 1000
        return SearchResponse(results=[], total_matches=0, query_time_ms=elapsed)


@app.get("/vectors/document/{doc_id}", response_model=APIResponse)
async def get_document(doc_id: str, auth=Depends(verify_api_key)):
    doc = retriever.get_document_by_id(doc_id)
    if not doc:
        return APIResponse(success=False, message="Not found")
    return APIResponse(success=True, message="OK", data={"document": doc})


@app.delete("/vectors/document/{doc_id}", response_model=APIResponse)
async def delete_document(doc_id: str, auth=Depends(verify_api_key)):
    ok = index_manager.delete_document(doc_id)
    if not ok:
        return APIResponse(success=False, message="Not found")
    index_manager.save()
    return APIResponse(success=True, message="Deleted")


@app.get("/vectors/documents", response_model=APIResponse)
async def list_documents(
    page: int = 1,
    limit: int = 20,
    filter: Optional[str] = None,
    auth=Depends(verify_api_key)
):
    all_ids = list(index_manager.metadata["documents"].keys())
    if filter:
        filtered = []
        for did in all_ids:
            m = index_manager.metadata["documents"][did]
            if filter.lower() in str(m["metadata"]).lower():
                filtered.append(did)
        all_ids = filtered
    total = len(all_ids)
    start = (page - 1)*limit
    subset = all_ids[start:start+limit]
    docs = []
    for did in subset:
        meta = index_manager.metadata["documents"][did]
        preview = ""
        if meta["chunks"]:
            cid = meta["chunks"][0]
            txt = index_manager.metadata["chunks"][cid]["text"]
            if isinstance(txt, (bytes, bytearray)):
                txt = txt.decode("utf-8", errors="ignore")
            preview = txt[:200] + ("…" if len(txt)>200 else "")
        docs.append({"id": did, "metadata": meta["metadata"], "chunk_count": len(meta["chunks"]), "preview": preview})
    return APIResponse(success=True,
                       message=f"Got {len(docs)}",
                       data={"documents": docs, "total": total, "page": page, "pages": (total+limit-1)//limit})

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "vector-store",
        "index_type": INDEX_TYPE,
        "vector_count": index_manager.index.ntotal,
        "document_count": len(index_manager.metadata["documents"])
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
