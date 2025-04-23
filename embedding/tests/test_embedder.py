import sys
import os
import unittest
import numpy as np
from unittest.mock import patch, MagicMock

# Add parent directory to path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from embedder import TextEmbedder
from processors.document_processor import DocumentProcessor

class TestTextEmbedder(unittest.TestCase):
    """
    Tests for the TextEmbedder class
    """
    
    @patch('embedder.AutoTokenizer')
    @patch('embedder.AutoModel')
    def setUp(self, mock_model, mock_tokenizer):
        """Set up the test case with mocked transformer models"""
        # Mock tokenizer
        self.mock_tokenizer_instance = MagicMock()
        mock_tokenizer.from_pretrained.return_value = self.mock_tokenizer_instance
        
        # Mock model
        self.mock_model_instance = MagicMock()
        mock_model.from_pretrained.return_value = self.mock_model_instance
        
        # Mock model outputs
        self.mock_outputs = MagicMock()
        self.mock_last_hidden_state = np.random.rand(1, 1, 768)  # Shape: [batch_size, sequence_length, hidden_size]
        self.mock_outputs.last_hidden_state = self.mock_last_hidden_state
        self.mock_model_instance.return_value = self.mock_outputs
        
        # Create embedder instance with mocks
        self.embedder = TextEmbedder(model_name="test-model", device="cpu")
    
    def test_init(self):
        """Test initialization of TextEmbedder"""
        self.assertEqual(self.embedder.max_length, 512)
        self.assertEqual(self.embedder.batch_size, 8)
        self.assertEqual(str(self.embedder.device), 'cpu')
    
    def test_embed_text(self):
        """Test embedding a single text"""
        # Arrange
        text = "This is a test document for embedding"
        self.mock_tokenizer_instance.return_value = {'input_ids': np.array([[1, 2, 3]])}
        
        # Act
        embedding = self.embedder.embed_text(text)
        
        # Assert
        self.assertEqual(embedding.shape, (768,))  # BioBERT embedding dimension
        self.assertAlmostEqual(np.linalg.norm(embedding), 1.0, places=6)  # Should be normalized
    
    def test_embed_texts_batch(self):
        """Test embedding multiple texts in batch"""
        # Arrange
        texts = ["Document 1", "Document 2", "Document 3"]
        self.mock_tokenizer_instance.return_value = {'input_ids': np.array([[1, 2], [3, 4], [5, 6]])}
        
        # Mock last_hidden_state for batch
        batch_hidden_state = np.random.rand(3, 1, 768)  # 3 documents
        self.mock_outputs.last_hidden_state = batch_hidden_state
        
        # Act
        embeddings = self.embedder.embed_texts(texts)
        
        # Assert
        self.assertEqual(embeddings.shape, (3, 768))  # 3 documents with 768-dim embeddings
        for i in range(3):
            self.assertAlmostEqual(np.linalg.norm(embeddings[i]), 1.0, places=6)  # Each should be normalized

class TestDocumentProcessor(unittest.TestCase):
    """
    Tests for the DocumentProcessor class
    """
    
    def setUp(self):
        """Set up the test case"""
        self.processor = DocumentProcessor(
            chunk_size=100,
            chunk_overlap=20,
            min_chunk_length=10
        )
    
    def test_extract_metadata(self):
        """Test metadata extraction"""
        # Arrange
        document = """
        PROGRESS NOTE
        Date: 2023-01-15
        
        Patient presented with symptoms of...
        """
        
        # Act
        metadata = self.processor.extract_metadata(document)
        
        # Assert
        self.assertEqual(metadata["note_type"], "progress_note")
        self.assertEqual(metadata["date"], "2023-01-15")
    
    def test_chunk_document_single_chunk(self):
        """Test chunking with small document (single chunk)"""
        # Arrange
        document = "This is a short document that should fit in one chunk."
        metadata = {"doc_id": "test-doc", "note_type": "progress_note"}
        
        # Act
        chunks = self.processor.chunk_document(document, metadata)
        
        # Assert
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["text"], document)
        self.assertEqual(chunks[0]["metadata"], metadata)
        self.assertEqual(chunks[0]["chunk_id"], 0)
    
    def test_chunk_document_multiple_chunks(self):
        """Test chunking with large document (multiple chunks)"""
        # Arrange
        paragraphs = []
        for i in range(20):
            paragraphs.append(f"This is paragraph {i} with some text that will contribute to the total size.")
        
        document = "\n\n".join(paragraphs)
        metadata = {"doc_id": "test-doc", "note_type": "progress_note"}
        
        # Act
        chunks = self.processor.chunk_document(document, metadata)
        
        # Assert
        self.assertGreater(len(chunks), 1)  # Should produce multiple chunks
        
        # Check if all chunks have the correct metadata
        for chunk in chunks:
            self.assertEqual(chunk["metadata"], metadata)
            self.assertIsInstance(chunk["chunk_id"], int)
        
        # Check if there's overlap between chunks
        words_in_first_chunk = set(chunks[0]["text"].split())
        words_in_second_chunk = set(chunks[1]["text"].split())
        
        # There should be some overlap between chunks
        self.assertTrue(bool(words_in_first_chunk.intersection(words_in_second_chunk)))

if __name__ == '__main__':
    unittest.main()