from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
import asyncio
import time
import os
import aiohttp

from schema import (
    MCPContextRequest, 
    MCPContextResponse, 
    MCPContextItem,
    MCPContextSource,
    MCPDocumentBatch,
    MCPResponse,
    MCPMetadataFilter
)

class MCPProvider:
    def __init__(self, embedding_service_url: str, vector_store_service_url: str, api_key: Optional[str] = None):
        self.embedding_service_url = embedding_service_url
        self.vector_store_service_url = vector_store_service_url
        self.api_key = api_key

    async def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            # Embedding service expects Authorization: Bearer …
            headers["Authorization"] = f"Bearer {self.api_key}"
            # Vector-store expects x-api-key
            headers["x-api-key"] = self.api_key
        return headers

    async def ingest_documents(self, documents: List[Dict[str, Any]]) -> MCPResponse:
        try:
            embed_docs = [
                {"text": doc["text"], "doc_id": doc["document_id"], "metadata": doc["metadata"]}
                for doc in documents
            ]

            async with aiohttp.ClientSession() as session:
                headers = await self._get_headers()

                # 1) chunk + embed
                async with session.post(
                    f"{self.embedding_service_url}/embed/documents",
                    json={"documents": embed_docs, "chunk": True},
                    headers=headers
                ) as resp_embed:
                    if resp_embed.status != 200:
                        raise ValueError(f"Embedding service error: {await resp_embed.text()}")
                    embedding_result = await resp_embed.json()

                # 2) add to vector store
                chunks = embedding_result["chunks"]
                async with session.post(
                    f"{self.vector_store_service_url}/vectors/add",
                    json={"chunks": chunks},
                    headers=headers  # now carrying x-api-key
                ) as resp_store:
                    if resp_store.status != 200:
                        raise ValueError(f"Vector store error: {await resp_store.text()}")
                    storage_result = await resp_store.json()

            return MCPResponse(
                success=True,
                message=f"Successfully processed {len(documents)} documents into {len(chunks)} chunks",
                data={"document_count": len(documents), "chunk_count": len(chunks)}
            )
        except Exception as e:
            return MCPResponse(success=False, message=f"Error processing documents: {str(e)}")

    
    async def get_context(self, request: MCPContextRequest) -> MCPContextResponse:
        """
        Get context for a query according to MCP protocol
        
        Args:
            request: Query and parameters
            
        Returns:
            Relevant context items
        """
        try:
            # Convert filters to vector store format
            filters = None
            if request.metadata_filters:
                filters = {}
                for key, value in request.metadata_filters.dict(exclude_none=True).items():
                    if key != "custom":
                        filters[key] = value
                    else:
                        # Merge custom filters into top level
                        filters.update(value)
            
            # Get query embedding
            async with aiohttp.ClientSession() as session:
                headers = await self._get_headers()
                
                # Step 1: Get query embedding
                async with session.post(
                    f"{self.embedding_service_url}/embed/text",
                    json={"text": request.query},
                    headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"Embedding service error: {error_text}")
                    
                    embedding_result = await response.json()
                
                # Step 2: Search for similar documents
                search_payload = {
                    "embedding": embedding_result["embedding"],
                    "k": request.limit,
                    "filters": filters
                }
                
                async with session.post(
                    f"{self.vector_store_service_url}/vectors/search",
                    json=search_payload,
                    headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"Vector store error: {error_text}")
                    
                    search_result = await response.json()
            
            # Format results as MCP context items
            context_items = []
            for result in search_result["results"]:
                metadata = result["metadata"]
                
                source = MCPContextSource(
                    document_id=metadata.get("doc_id", "unknown"),
                    note_type=metadata.get("note_type"),
                    date=metadata.get("date"),
                    author=metadata.get("provider"),
                    department=metadata.get("department")
                )
                
                context_items.append(MCPContextItem(
                    text=result["text"],
                    source=source,
                    relevance_score=result["score"]
                ))
            
            # Create response
            response = MCPContextResponse(
                contexts=context_items,
                metadata={
                    "total_matches": search_result.get("total_matches", len(context_items)),
                    "query_time_ms": search_result.get("query_time_ms", 0)
                }
            )
            
            return response
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving context: {str(e)}")
    
    async def delete_document(self, document_id: str) -> MCPResponse:
        """
        Delete a document from the context system
        
        Args:
            document_id: ID of document to delete
            
        Returns:
            Response with deletion status
        """
        try:
            async with aiohttp.ClientSession() as session:
                headers = await self._get_headers()
                
                async with session.delete(
                    f"{self.vector_store_service_url}/vectors/document/{document_id}",
                    headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"Vector store error: {error_text}")
                    
                    result = await response.json()
            
            return MCPResponse(
                success=result.get("success", False),
                message=result.get("message", "Document deleted"),
                data={"document_id": document_id}
            )
            
        except Exception as e:
            return MCPResponse(
                success=False,
                message=f"Error deleting document: {str(e)}"
            )