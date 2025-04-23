import sys
import os
import unittest
import numpy as np
import tempfile
import pickle
import faiss
from unittest.mock import patch, MagicMock

# Add parent directory to path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from index_manager import FAISSIndexManager

class TestFAISSIndexManager(unittest.TestCase):
    """
    Tests for the FAISSIndexManager class
    """
    
    def setUp(self):
        """Set up the test case"""
        # Create temporary files for index and metadata
        self.temp_dir = tempfile.TemporaryDirectory()
        self.index_path = os.path.join(self.temp_dir.name, "test_index")
        self.metadata_path = os.path.join(self.temp_dir.name, "test_metadata.pickle")
        
        # Initialize with default parameters
        self.dimension = 768
        self.index_manager = FAISSIndexManager(
            index_type="flat",
            dimension=self.dimension,
            index_path=self.index_path,
            metadata_path=self.metadata_path
        )
    
    def tearDown(self):
        """Clean up after the test"""
        self.temp_dir.cleanup()
    
    def test_init(self):
        """Test initialization with default parameters"""
        self.assertEqual(self.index_manager.dimension, self.dimension)
        self.assertEqual(self.index_manager.index_type, "flat")
        self.assertTrue(isinstance(self.index_manager.index, faiss.IndexFlatIP))
        self.assertEqual(self.index_manager.index.d, self.dimension)
        
        # Check metadata structure
        self.assertIn("documents", self.index_manager.metadata)
        self.assertIn("chunks", self.index_manager.metadata)
        self.assertIn("id_mapping", self.index_manager.metadata)
    
    def test_create_index_flat(self):
        """Test creating a flat index"""
        index = self.index_manager._create_index()
        self.assertTrue(isinstance(index, faiss.IndexFlatIP))
        self.assertEqual(index.d, self.dimension)
    
    def test_create_index_ivf_flat(self):
        """Test creating an IVF flat index"""
        index_manager = FAISSIndexManager(
            index_type="ivf_flat",
            dimension=self.dimension
        )
        index = index_manager._create_index()
        self.assertTrue(isinstance(index, faiss.IndexIVFFlat))
        self.assertEqual(index.d, self.dimension)
        self.assertEqual(index.nprobe, 10)  # Default nprobe value
    
    def test_create_index_hnsw(self):
        """Test creating an HNSW index"""
        index_manager = FAISSIndexManager(
            index_type="hnsw",
            dimension=self.dimension
        )
        index = index_manager._create_index()
        self.assertTrue(isinstance(index, faiss.IndexHNSWFlat))
        self.assertEqual(index.d, self.dimension)
    
    def test_add_documents(self):
        """Test adding documents to the index"""
        # Create test chunks
        chunks = []
        for i in range(5):
            # Random embedding vector
            embedding = np.random.rand(self.dimension).astype(np.float32)
            # Normalize
            embedding = embedding / np.linalg.norm(embedding)
            
            chunks.append({
                "text": f"Chunk {i}",
                "metadata": {
                    "doc_id": f"doc_{i//2}",  # Two chunks per document
                    "note_type": "test_note"
                },
                "embedding": embedding.tolist(),
                "chunk_id": i
            })
        
        # Add to index
        ids = self.index_manager.add_documents(chunks)
        
        # Check if vectors were added to the index
        self.assertEqual(self.index_manager.index.ntotal, 5)
        
        # Check if metadata was updated
        self.assertEqual(len(self.index_manager.metadata["id_mapping"]), 5)
        
        # Check document metadata
        self.assertEqual(len(self.index_manager.metadata["documents"]), 3)  # Should have 3 docs (0, 1, 2)
        
        # Check that document 0 has 2 chunks
        doc_0 = self.index_manager.metadata["documents"]["doc_0"]
        self.assertEqual(len(doc_0["chunks"]), 2)
        
        # Return the assigned IDs
        self.assertEqual(len(ids), 5)
        self.assertEqual(ids, list(range(5)))
    
    def test_search(self):
        """Test searching for similar documents"""
        # Add documents first
        chunks = []
        for i in range(5):
            # Create embeddings with known similarity patterns
            # Chunks 0-2 are similar, chunks 3-4 are similar to each other but different from 0-2
            if i < 3:
                base_embedding = np.array([1.0, 0.0] + [0.0] * (self.dimension - 2))
            else:
                base_embedding = np.array([0.0, 1.0] + [0.0] * (self.dimension - 2))
                
            # Add some noise
            noise = np.random.rand(self.dimension) * 0.1
            embedding = base_embedding + noise
            # Normalize
            embedding = embedding / np.linalg.norm(embedding)
            
            chunks.append({
                "text": f"Chunk {i}",
                "metadata": {
                    "doc_id": f"doc_{i//2}",
                    "note_type": "test_note"
                },
                "embedding": embedding.tolist(),
                "chunk_id": i
            })
        
        # Add to index
        self.index_manager.add_documents(chunks)
        
        # Search with a query similar to the first group
        query_embedding = np.array([0.9, 0.1] + [0.0] * (self.dimension - 2))
        query_embedding = query_embedding / np.linalg.norm(query_embedding)
        
        # Search with k=2
        results = self.index_manager.search(query_embedding, k=2)
        
        # Should return 2 results
        self.assertEqual(len(results), 2)
        
        # Results should be from the first group (chunks 0-2)
        for result in results:
            self.assertIn(int(result["chunk_id"].split("_")[-1]), [0, 1, 2])
    
    def test_apply_filters(self):
        """Test applying metadata filters"""
        # Create test metadata
        metadata = {
            "doc_id": "doc_1",
            "note_type": "progress_note",
            "date": "2023-05-15",
            "department": "Cardiology"
        }
        
        # Test filter matching
        filter1 = {"note_type": "progress_note"}
        self.assertTrue(self.index_manager._apply_filters(metadata, filter1))
        
        # Test filter not matching
        filter2 = {"note_type": "discharge_summary"}
        self.assertFalse(self.index_manager._apply_filters(metadata, filter2))
        
        # Test multiple filter criteria - all matching
        filter3 = {"note_type": "progress_note", "department": "Cardiology"}
        self.assertTrue(self.index_manager._apply_filters(metadata, filter3))
        
        # Test multiple filter criteria - one not matching
        filter4 = {"note_type": "progress_note", "department": "Neurology"}
        self.assertFalse(self.index_manager._apply_filters(metadata, filter4))
        
        # Test list filter
        filter5 = {"note_type": ["progress_note", "discharge_summary"]}
        self.assertTrue(self.index_manager._apply_filters(metadata, filter5))
        
        # Test date range filter
        filter6 = {"date_range": {"start": "2023-01-01", "end": "2023-12-31"}}
        self.assertTrue(self.index_manager._apply_filters(metadata, filter6))
        
        filter7 = {"date_range": {"start": "2023-06-01", "end": "2023-12-31"}}
        self.assertFalse(self.index_manager._apply_filters(metadata, filter7))
    
    def test_delete_document(self):
        """Test deleting a document"""
        # Add documents first
        chunks = []
        for i in range(4):
            embedding = np.random.rand(self.dimension).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
            
            chunks.append({
                "text": f"Chunk {i}",
                "metadata": {
                    "doc_id": f"doc_{i//2}",  # Two chunks per document
                    "note_type": "test_note"
                },
                "embedding": embedding.tolist(),
                "chunk_id": i
            })
        
        # Add to index
        self.index_manager.add_documents(chunks)
        
        # Verify initial state
        self.assertEqual(len(self.index_manager.metadata["documents"]), 2)
        self.assertEqual(len(self.index_manager.metadata["chunks"]), 4)
        
        # Delete document 0
        result = self.index_manager.delete_document("doc_0")
        
        # Verify deletion
        self.assertTrue(result)
        self.assertEqual(len(self.index_manager.metadata["documents"]), 1)
        self.assertEqual(len(self.index_manager.metadata["chunks"]), 2)
        self.assertNotIn("doc_0", self.index_manager.metadata["documents"])
        
        # Try to delete non-existent document
        result = self.index_manager.delete_document("non_existent_doc")
        self.assertFalse(result)
    
    def test_save_and_load(self):
        """Test saving and loading the index and metadata"""
        # Add some documents
        chunks = []
        for i in range(3):
            embedding = np.random.rand(self.dimension).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
            
            chunks.append({
                "text": f"Chunk {i}",
                "metadata": {
                    "doc_id": f"doc_{i}",
                    "note_type": "test_note"
                },
                "embedding": embedding.tolist(),
                "chunk_id": i
            })
        
        # Add to index
        self.index_manager.add_documents(chunks)
        
        # Save
        index_path, metadata_path = self.index_manager.save()
        
        # Create new manager and load saved data
        new_manager = FAISSIndexManager(
            index_type="flat",
            dimension=self.dimension,
            index_path=index_path,
            metadata_path=metadata_path
        )
        
        # Check if data was loaded correctly
        self.assertEqual(new_manager.index.ntotal, 3)
        self.assertEqual(len(new_manager.metadata["documents"]), 3)
        self.assertEqual(len(new_manager.metadata["chunks"]), 3)
        self.assertEqual(len(new_manager.metadata["id_mapping"]), 3)

if __name__ == '__main__':
    unittest.main()