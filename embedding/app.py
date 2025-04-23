from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
import os

from embedder import TextEmbedder
from processors.document_processor import DocumentProcessor

# Initialize the embedding model and document processor
embedder = TextEmbedder()
processor = DocumentProcessor()

app = FastAPI(
    title="EHR Semantic Embedding Service",
    description="API for generating embeddings from EHR notes using BioBERT"
)

# Define API models
class Document(BaseModel):
    """Document to be embedded"""
    text: str
    doc_id: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class EmbeddingRequest(BaseModel):
    """Request for document embedding"""
    documents: List[Document]
    chunk: bool = True

class TextEmbeddingRequest(BaseModel):
    """Request for direct text embedding"""
    text: str

class EmbeddingResponse(BaseModel):
    """Response with embedding results"""
    chunks: List[Dict[str, Any]]
    success: bool
    message: str

class TextEmbeddingResponse(BaseModel):
    """Response with embedding for a single text"""
    embedding: List[float]
    success: bool

@app.post("/embed/documents", response_model=EmbeddingResponse)
async def embed_documents(request: EmbeddingRequest):
    """
    Process and embed documents, with optional chunking
    """
    try:
        all_chunks = []
        
        for document in request.documents:
            # Extract metadata if not provided
            if not document.metadata:
                metadata = processor.extract_metadata(document.text)
            else:
                metadata = document.metadata
                
            # Add document ID to metadata
            metadata["doc_id"] = document.doc_id
            
            # Chunk the document if requested
            if request.chunk:
                chunks = processor.chunk_document(document.text, metadata)
            else:
                chunks = [{
                    "text": document.text,
                    "metadata": metadata,
                    "chunk_id": 0
                }]
            
            # Embed each chunk
            for chunk in chunks:
                embedding = embedder.embed_text(chunk["text"])
                chunk["embedding"] = embedding.tolist()  # Convert to list for JSON
                all_chunks.append(chunk)
        
        return {
            "chunks": all_chunks,
            "success": True,
            "message": f"Successfully embedded {len(all_chunks)} chunks from {len(request.documents)} documents"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/text", response_model=TextEmbeddingResponse)
async def embed_text(request: TextEmbeddingRequest):
    """
    Generate embedding for a single text (for direct queries)
    """
    try:
        embedding = embedder.embed_text(request.text)
        return {
            "embedding": embedding.tolist(),
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "model": "biobert"}

if __name__ == "__main__":
    # Run the FastAPI server
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)