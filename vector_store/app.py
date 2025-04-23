from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import time
import numpy as np
import uvicorn
from datetime import datetime

from index_manager import FAISSIndexManager
from retrieval import VectorRetriever

# Configuration from environment
INDEX_PATH = os.environ.get("INDEX_PATH", "data/faiss_index")
METADATA_PATH = os.environ.get("METADATA_PATH", "data/metadata.pickle")
INDEX_TYPE = os.environ.get("INDEX_TYPE", "flat")
DIMENSION = int(os.environ.get("DIMENSION", "768"))  # BioBERT dimension
API_KEY = os.environ.get("SERVICE_API_KEY")

# Create data directory if it doesn't exist
os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
os.makedirs(os.path.dirname(METADATA_PATH), exist_ok=True)

# Initialize the FAISS index manager with safer approach
try:
    # First try to check if the index file exists and has content
    if os.path.exists(INDEX_PATH) and os.path.getsize(INDEX_PATH) > 0 and os.path.exists(METADATA_PATH) and os.path.getsize(METADATA_PATH) > 0:
        print(f"Loading existing index from {INDEX_PATH}")
        index_manager = FAISSIndexManager(
            index_type=INDEX_TYPE,
            dimension=DIMENSION,
            index_path=INDEX_PATH,
            metadata_path=METADATA_PATH
        )
    else:
        # Create new index if files don't exist or are empty
        print("Creating new index since no valid index found")
        index_manager = FAISSIndexManager(
            index_type=INDEX_TYPE,
            dimension=DIMENSION,
            index_path=None,
            metadata_path=None
        )
        # Save the new index
        index_manager.save(INDEX_PATH, METADATA_PATH)
except Exception as e:
    print(f"Error loading index: {str(e)}. Creating new index.")
    index_manager = FAISSIndexManager(
        index_type=INDEX_TYPE,
        dimension=DIMENSION,
        index_path=None,
        metadata_path=None
    )
    # Save the new index
    index_manager.save(INDEX_PATH, METADATA_PATH)

# Initialize the vector retriever
retriever = VectorRetriever(index_manager)

app = FastAPI(
    title="Vector Store Service",
    description="FAISS-based vector storage and retrieval for semantic search"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Models
class Chunk(BaseModel):
    """Document chunk with embedding"""
    text: str
    metadata: Dict[str, Any]
    embedding: List[float]
    chunk_id: int

class ChunkBatch(BaseModel):
    """Batch of chunks to add to the index"""
    chunks: List[Chunk]

class SearchByEmbeddingRequest(BaseModel):
    """Search request with embedding"""
    embedding: List[float]
    k: int = 5
    filters: Optional[Dict[str, Any]] = None

class SearchByTextRequest(BaseModel):
    """Search request with text"""
    text: str
    k: int = 5
    filters: Optional[Dict[str, Any]] = None

class KeywordSearchRequest(BaseModel):
    """Keyword search request"""
    keywords: str
    limit: int = 5
    filters: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    """Search result item"""
    text: str
    score: float
    metadata: Dict[str, Any]
    chunk_id: str

class SearchResponse(BaseModel):
    """Search response"""
    results: List[SearchResult]
    total_matches: int
    query_time_ms: float

class APIResponse(BaseModel):
    """Standard API response"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# Authentication middleware
async def verify_api_key(api_key: Optional[str] = None):
    """Verify API key if configured"""
    if API_KEY and (not api_key or api_key != API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# Routes
@app.post("/vectors/add", response_model=APIResponse)
async def add_vectors(batch: ChunkBatch, authenticated: bool = Depends(verify_api_key)):
    """Add document chunks with embeddings to the vector store"""
    try:
        # Convert chunks to the format expected by index_manager
        chunks = []
        for chunk in batch.chunks:
            chunks.append({
                "text": chunk.text,
                "metadata": chunk.metadata,
                "embedding": chunk.embedding,
                "chunk_id": chunk.chunk_id
            })
        
        # Add to index
        ids = index_manager.add_documents(chunks)
        
        # Save index and metadata
        index_manager.save()
        
        return APIResponse(
            success=True,
            message=f"Successfully added {len(chunks)} chunks to the vector store",
            data={"ids": ids}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectors/search", response_model=SearchResponse)
async def search_by_embedding(request: SearchByEmbeddingRequest, authenticated: bool = Depends(verify_api_key)):
    """Search for similar vectors using an embedding"""
    try:
        start_time = time.time()
        
        # Convert embedding to numpy array
        query_embedding = np.array(request.embedding, dtype=np.float32)
        
        # Search the index
        results = await retriever.search_by_embedding(
            query_embedding,
            k=request.k,
            filters=request.filters
        )
        
        # Calculate query time
        query_time_ms = (time.time() - start_time) * 1000
        
        return SearchResponse(
            results=results,
            total_matches=len(results),
            query_time_ms=query_time_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectors/keyword-search", response_model=SearchResponse)
async def keyword_search(request: KeywordSearchRequest, authenticated: bool = Depends(verify_api_key)):
    """
    Perform keyword-based search (fallback for direct string matching)
    This is a simple implementation - for production, consider a hybrid approach
    """
    try:
        start_time = time.time()
        
        # Simple keyword matching (in a real implementation, this would be more sophisticated)
        matching_chunks = []
        
        for chunk_id, chunk_data in index_manager.metadata["chunks"].items():
            # Check if keywords appear in the text
            if request.keywords.lower() in chunk_data["text"].lower():
                # Check filters if provided
                if request.filters and not index_manager._apply_filters(chunk_data["metadata"], request.filters):
                    continue
                
                # Calculate a simple score based on keyword frequency
                keyword_count = chunk_data["text"].lower().count(request.keywords.lower())
                score = min(0.99, keyword_count * 0.1)  # Simple scoring
                
                matching_chunks.append({
                    "text": chunk_data["text"],
                    "score": score,
                    "metadata": chunk_data["metadata"],
                    "chunk_id": chunk_id
                })
        
        # Sort by score and limit results
        matching_chunks.sort(key=lambda x: x["score"], reverse=True)
        results = matching_chunks[:request.limit]
        
        # Calculate query time
        query_time_ms = (time.time() - start_time) * 1000
        
        return SearchResponse(
            results=results,
            total_matches=len(matching_chunks),
            query_time_ms=query_time_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectors/document/{doc_id}", response_model=APIResponse)
async def get_document(doc_id: str, authenticated: bool = Depends(verify_api_key)):
    """Get a document and its chunks by ID"""
    try:
        document = retriever.get_document_by_id(doc_id)
        
        if not document:
            return APIResponse(
                success=False,
                message=f"Document with ID {doc_id} not found"
            )
        
        return APIResponse(
            success=True,
            message="Document retrieved successfully",
            data={"document": document}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/vectors/document/{doc_id}", response_model=APIResponse)
async def delete_document(doc_id: str, authenticated: bool = Depends(verify_api_key)):
    """Delete a document from the vector store"""
    try:
        success = index_manager.delete_document(doc_id)
        
        if not success:
            return APIResponse(
                success=False,
                message=f"Document with ID {doc_id} not found"
            )
        
        # Save changes
        index_manager.save()
        
        return APIResponse(
            success=True,
            message=f"Document with ID {doc_id} deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectors/documents", response_model=APIResponse)
async def list_documents(
    page: int = 1,
    limit: int = 20,
    filter: Optional[str] = None,
    authenticated: bool = Depends(verify_api_key)
):
    """List documents with pagination"""
    try:
        # Get all document IDs
        document_ids = list(index_manager.metadata["documents"].keys())
        
        # Apply filter if provided
        if filter:
            filtered_ids = []
            for doc_id in document_ids:
                doc_data = index_manager.metadata["documents"][doc_id]
                # Simple string matching in metadata or chunks
                if (filter.lower() in str(doc_data["metadata"]).lower() or 
                    any(filter.lower() in index_manager.metadata["chunks"][chunk_id]["text"].lower() 
                        for chunk_id in doc_data["chunks"] 
                        if chunk_id in index_manager.metadata["chunks"])):
                    filtered_ids.append(doc_id)
            document_ids = filtered_ids
        
        # Calculate pagination
        total = len(document_ids)
        start_idx = (page - 1) * limit
        end_idx = min(start_idx + limit, total)
        
        # Get paginated documents
        paginated_ids = document_ids[start_idx:end_idx]
        documents = []
        
        for doc_id in paginated_ids:
            doc_data = index_manager.metadata["documents"][doc_id]
            
            # Get first chunk text as preview
            preview_text = ""
            if doc_data["chunks"] and doc_data["chunks"][0] in index_manager.metadata["chunks"]:
                preview_text = index_manager.metadata["chunks"][doc_data["chunks"][0]]["text"]
                if len(preview_text) > 200:
                    preview_text = preview_text[:200] + "..."
            
            documents.append({
                "id": doc_id,
                "metadata": doc_data["metadata"],
                "chunk_count": len(doc_data["chunks"]),
                "preview": preview_text
            })
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(documents)} documents",
            data={
                "documents": documents,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "vector-store",
        "index_type": INDEX_TYPE,
        "vector_count": index_manager.index.ntotal,
        "document_count": len(index_manager.metadata["documents"])
    }

if __name__ == "__main__":
    # Run the FastAPI server
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)