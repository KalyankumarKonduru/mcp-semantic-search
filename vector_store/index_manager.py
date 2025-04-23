import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any, Optional, Tuple
import pickle

class FAISSIndexManager:
    """
    Manager for FAISS index operations - storing and retrieving vectors
    """
    
    def __init__(
        self,
        index_type: str = "flat",
        dimension: int = 768,  # BioBERT embedding dimension
        index_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
        nlist: int = 100,  # For IVF indices
        nprobe: int = 10   # For IVF search
    ):
        """Initialize the FAISS index manager"""
        self.dimension = dimension
        self.index_type = index_type
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.nlist = nlist
        self.nprobe = nprobe
        
        # Initialize or load index
        if index_path and os.path.exists(index_path):
            print(f"Loading existing index from {index_path}")
            self.index = faiss.read_index(index_path)
            
            if self.index_type.startswith("ivf"):
                # Set search parameters for IVF index
                self.index.nprobe = self.nprobe
        else:
            print(f"Creating new {index_type} index with dimension {dimension}")
            self.index = self._create_index()
            
        # Initialize or load metadata
        if metadata_path and os.path.exists(metadata_path):
            print(f"Loading existing metadata from {metadata_path}")
            with open(metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            self.metadata = {
                "documents": {},  # doc_id -> document metadata
                "chunks": {},     # chunk_id -> chunk metadata
                "id_mapping": []  # Mapping of FAISS IDs to chunk IDs
            }
    
    def _create_index(self) -> faiss.Index:
        """Create a new FAISS index based on the specified type"""
        if self.index_type == "flat":
            # Flat index - exact but slow for large datasets
            index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
            
        elif self.index_type == "ivf_flat":
            # IVF with flat quantizer - faster search, slight accuracy loss
            quantizer = faiss.IndexFlatIP(self.dimension)
            index = faiss.IndexIVFFlat(quantizer, self.dimension, self.nlist, faiss.METRIC_INNER_PRODUCT)
            index.nprobe = self.nprobe
            # Need to train this index before adding vectors
            
        elif self.index_type == "hnsw":
            # Hierarchical Navigable Small World - very fast, good accuracy
            index = faiss.IndexHNSWFlat(self.dimension, 32)  # 32 neighbors
            
        else:
            raise ValueError(f"Unsupported index type: {self.index_type}")
            
        return index
    
    def add_documents(self, chunks: List[Dict[str, Any]]) -> List[int]:
        """Add document chunks to the index"""
        # Extract embeddings
        embeddings = []
        for chunk in chunks:
            embedding = np.array(chunk["embedding"], dtype=np.float32)
            # Normalize embedding (important for inner product metric)
            faiss.normalize_L2(embedding.reshape(1, -1))
            embeddings.append(embedding)
        
        embeddings_array = np.vstack(embeddings).astype(np.float32)
        
        # Train index if needed (for IVF indices)
        if self.index_type.startswith("ivf") and not self.index.is_trained:
            print("Training IVF index...")
            self.index.train(embeddings_array)
        
        # Add vectors to index
        start_id = self.index.ntotal
        self.index.add(embeddings_array)
        
        # Assign IDs
        assigned_ids = list(range(start_id, start_id + len(chunks)))
        
        # Update metadata
        for i, chunk in enumerate(chunks):
            chunk_id = f"{chunk['metadata']['doc_id']}_{chunk['chunk_id']}"
            faiss_id = assigned_ids[i]
            
            # Store chunk metadata
            self.metadata["chunks"][chunk_id] = {
                "text": chunk["text"],
                "metadata": chunk["metadata"],
                "faiss_id": faiss_id
            }
            
            # Update document metadata if new
            doc_id = chunk["metadata"]["doc_id"]
            if doc_id not in self.metadata["documents"]:
                self.metadata["documents"][doc_id] = {
                    "chunks": [],
                    "metadata": chunk["metadata"]
                }
                
            self.metadata["documents"][doc_id]["chunks"].append(chunk_id)
            
            # Update ID mapping
            self.metadata["id_mapping"].append(chunk_id)
        
        return assigned_ids
    
    def search(
        self, 
        query_embedding: np.ndarray, 
        k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents using a query embedding"""
        # Normalize query vector
        query_embedding = query_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(query_embedding)
        
        # Perform search (get more results than needed for filtering)
        multiplier = 10 if filters else 1
        k_search = min(k * multiplier, self.index.ntotal)
        scores, faiss_ids = self.index.search(query_embedding, k_search)
        
        # Convert to list of results
        results = []
        for i, (score, faiss_id) in enumerate(zip(scores[0], faiss_ids[0])):
            # Skip invalid IDs
            if faiss_id == -1:
                continue
                
            # Get corresponding chunk
            chunk_id = self.metadata["id_mapping"][faiss_id]
            chunk_data = self.metadata["chunks"][chunk_id]
            
            # Apply filters if specified
            if filters and not self._apply_filters(chunk_data["metadata"], filters):
                continue
                
            # Add to results
            results.append({
                "text": chunk_data["text"],
                "score": float(score),  # Convert to Python float
                "metadata": chunk_data["metadata"],
                "chunk_id": chunk_id
            })
            
            # Stop if we have enough results
            if len(results) >= k:
                break
                
        return results
    
    def _apply_filters(self, metadata: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Apply metadata filters to a chunk"""
        for key, value in filters.items():
            if key not in metadata:
                return False
                
            if key == "date_range":
                # Special handling for date ranges
                if "start" in value and metadata["date"] < value["start"]:
                    return False
                if "end" in value and metadata["date"] > value["end"]:
                    return False
            
            elif isinstance(value, list):
                # List values - any match is sufficient
                if metadata[key] not in value:
                    return False
            
            elif metadata[key] != value:
                # Direct comparison
                return False
                
        return True
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and all its chunks"""
        # Check if document exists
        if doc_id not in self.metadata["documents"]:
            return False
            
        # Get all chunks for this document
        doc_data = self.metadata["documents"][doc_id]
        chunk_ids = doc_data["chunks"]
        
        # For now, we don't actually remove vectors from FAISS
        # (FAISS doesn't support efficient removal)
        # Instead, we'll mark them as deleted in the metadata
        
        # Remove from metadata
        for chunk_id in chunk_ids:
            if chunk_id in self.metadata["chunks"]:
                # Mark FAISS ID as invalid in ID mapping
                faiss_id = self.metadata["chunks"][chunk_id]["faiss_id"]
                del self.metadata["chunks"][chunk_id]
        
        # Remove document from metadata
        del self.metadata["documents"][doc_id]
        
        return True
    
    def save(self, index_path: Optional[str] = None, metadata_path: Optional[str] = None) -> Tuple[str, str]:
        """Save index and metadata to disk"""
        index_path = index_path or self.index_path
        metadata_path = metadata_path or self.metadata_path
        
        if not index_path or not metadata_path:
            raise ValueError("Index path and metadata path must be specified")
        
        # Create directories if needed
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
        
        # Save index
        faiss.write_index(self.index, index_path)
        
        # Save metadata
        with open(metadata_path, 'wb') as f:
            pickle.dump(self.metadata, f)
            
        return index_path, metadata_path