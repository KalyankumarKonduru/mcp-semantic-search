from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import List, Dict, Any, Optional

from schema import (
    MCPContextRequest, 
    MCPContextResponse, 
    MCPDocumentBatch,
    MCPResponse
)
from provider import MCPProvider

# Get configuration from environment
EMBEDDING_SERVICE_URL = os.environ.get("EMBEDDING_SERVICE_URL", "http://embedding:8000")
VECTOR_STORE_SERVICE_URL = os.environ.get("VECTOR_STORE_SERVICE_URL", "http://vector-store:8001")
API_KEY = os.environ.get("API_KEY")

# Initialize the MCP provider
provider = MCPProvider(
    embedding_service_url=EMBEDDING_SERVICE_URL,
    vector_store_service_url=VECTOR_STORE_SERVICE_URL,
    api_key=API_KEY
)

# Create FastAPI app
app = FastAPI(
    title="MCP Context Provider for EHR Notes",
    description="MCP-compliant API for providing semantic context from EHR notes",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/context", response_model=MCPContextResponse)
async def get_context(request: MCPContextRequest):
    """
    Get context for a query (MCP-compliant endpoint)
    """
    return await provider.get_context(request)

@app.post("/documents", response_model=MCPResponse)
async def ingest_documents(batch: MCPDocumentBatch, background_tasks: BackgroundTasks):
    """
    Ingest documents into the context system
    """
    # Convert to list of documents
    documents = [doc.dict() for doc in batch.documents]
    
    # Process in background to avoid long-running request
    background_tasks.add_task(provider.ingest_documents, documents)
    
    return MCPResponse(
        success=True,
        message=f"Processing {len(documents)} documents in the background",
        data={"document_count": len(documents)}
    )

@app.delete("/documents/{document_id}", response_model=MCPResponse)
async def delete_document(document_id: str):
    """
    Delete a document from the context system
    """
    return await provider.delete_document(document_id)

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "ok", "service": "mcp-provider"}

if __name__ == "__main__":
    # Run the FastAPI server
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)