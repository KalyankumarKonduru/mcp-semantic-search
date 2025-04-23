import numpy as np
from typing import List, Dict, Any, Optional
from .index_manager import FAISSIndexManager

class VectorRetriever:
    """
    High-level retrieval interface for semantic search
    """
    
    def __init__(self, index_manager: FAISSIndexManager):
        """Initialize the retriever with a FAISS index manager"""
        self.index_manager = index_manager
    
    async def search_by_text(
        self, 
        query_text: str,
        embedder,
        k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for documents by text query"""
        # Generate embedding for query
        query_embedding = embedder.embed_text(query_text)
        
        # Search using embedding
        results = self.index_manager.search(query_embedding, k, filters)
        
        return results
    
    async def search_by_embedding(
        self,
        query_embedding: np.ndarray,
        k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for documents by vector embedding"""
        # Search using provided embedding
        results = self.index_manager.search(query_embedding, k, filters)
        
        return results
    
    def get_document_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a document by ID"""
        if doc_id not in self.index_manager.metadata["documents"]:
            return None
            
        doc_data = self.index_manager.metadata["documents"][doc_id]
        
        # Collect all chunks for this document
        chunks = []
        for chunk_id in doc_data["chunks"]:
            if chunk_id in self.index_manager.metadata["chunks"]:
                chunks.append(self.index_manager.metadata["chunks"][chunk_id])
        
        return {
            "metadata": doc_data["metadata"],
            "chunks": chunks
        }