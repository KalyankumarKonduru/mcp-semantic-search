import sys
import os
import unittest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

# Add parent directory to path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from provider import MCPProvider
from schema import (
    MCPContextRequest,
    MCPMetadataFilter,
    MCPContextResponse,
    MCPResponse
)

class TestMCPProvider(unittest.TestCase):
    """
    Tests for the MCPProvider class
    """
    
    def setUp(self):
        """Set up the test case"""
        self.embedding_service_url = "http://embedding:8000"
        self.vector_store_service_url = "http://vector-store:8001"
        self.api_key = "test-api-key"
        
        # Create provider instance
        self.provider = MCPProvider(
            embedding_service_url=self.embedding_service_url,
            vector_store_service_url=self.vector_store_service_url,
            api_key=self.api_key
        )
    
    def test_init(self):
        """Test initialization of MCPProvider"""
        self.assertEqual(self.provider.embedding_service_url, self.embedding_service_url)
        self.assertEqual(self.provider.vector_store_service_url, self.vector_store_service_url)
        self.assertEqual(self.provider.api_key, self.api_key)
    
    async def test_get_headers(self):
        """Test getting headers with API key"""
        headers = await self.provider._get_headers()
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Authorization"], f"Bearer {self.api_key}")
        
        # Test without API key
        provider_no_key = MCPProvider(
            embedding_service_url=self.embedding_service_url,
            vector_store_service_url=self.vector_store_service_url
        )
        headers = await provider_no_key._get_headers()
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertNotIn("Authorization", headers)
    
    @patch('aiohttp.ClientSession')
    async def test_ingest_documents(self, mock_session):
        """Test ingesting documents"""
        # Setup mock responses
        mock_cm = MagicMock()
        mock_session.return_value.__aenter__.return_value = mock_cm
        
        # Mock embedding response
        mock_embed_response = AsyncMock()
        mock_embed_response.status = 200
        mock_embed_response.json = AsyncMock(return_value={
            "chunks": [
                {
                    "text": "Test chunk",
                    "metadata": {"doc_id": "doc_1", "note_type": "test"},
                    "embedding": [0.1, 0.2, 0.3]
                }
            ],
            "success": True
        })
        
        # Mock vector store response
        mock_vector_response = AsyncMock()
        mock_vector_response.status = 200
        mock_vector_response.json = AsyncMock(return_value={
            "success": True,
            "message": "Successfully added vectors"
        })
        
        # Configure mock to return different responses for different endpoints
        mock_cm.post.side_effect = [mock_embed_response, mock_vector_response]
        
        # Test documents
        documents = [
            {
                "text": "Test document",
                "document_id": "doc_1",
                "metadata": {"note_type": "test"}
            }
        ]
        
        # Call the method
        response = await self.provider.ingest_documents(documents)
        
        # Assertions
        self.assertTrue(response.success)
        self.assertEqual(response.data["document_count"], 1)
        self.assertEqual(response.data["chunk_count"], 1)
        
        # Verify calls
        self.assertEqual(mock_cm.post.call_count, 2)
        
        # First call should be to embedding service
        args1, kwargs1 = mock_cm.post.call_args_list[0]
        self.assertEqual(args1[0], f"{self.embedding_service_url}/embed/documents")
        
        # Second call should be to vector store
        args2, kwargs2 = mock_cm.post.call_args_list[1]
        self.assertEqual(args2[0], f"{self.vector_store_service_url}/vectors/add")
    
    @patch('aiohttp.ClientSession')
    async def test_get_context(self, mock_session):
        """Test getting context for a query"""
        # Setup mock responses
        mock_cm = MagicMock()
        mock_session.return_value.__aenter__.return_value = mock_cm
        
        # Mock embedding response
        mock_embed_response = AsyncMock()
        mock_embed_response.status = 200
        mock_embed_response.json = AsyncMock(return_value={
            "embedding": [0.1, 0.2, 0.3],
            "success": True
        })
        
        # Mock vector store response
        mock_vector_response = AsyncMock()
        mock_vector_response.status = 200
        mock_vector_response.json = AsyncMock(return_value={
            "results": [
                {
                    "text": "Test result",
                    "score": 0.85,
                    "metadata": {
                        "doc_id": "doc_1",
                        "note_type": "progress_note",
                        "date": "2023-05-01"
                    },
                    "chunk_id": "doc_1_0"
                }
            ],
            "total_matches": 1,
            "query_time_ms": 25
        })
        
        # Configure mock to return different responses for different endpoints
        mock_cm.post.side_effect = [mock_embed_response, mock_vector_response]
        
        # Create request
        request = MCPContextRequest(
            query="test query",
            limit=5,
            metadata_filters=MCPMetadataFilter(
                note_type=["progress_note"]
            )
        )
        
        # Call the method
        response = await self.provider.get_context(request)
        
        # Assertions
        self.assertEqual(len(response.contexts), 1)
        self.assertEqual(response.contexts[0].text, "Test result")
        self.assertEqual(response.contexts[0].relevance_score, 0.85)
        self.assertEqual(response.contexts[0].source.document_id, "doc_1")
        self.assertEqual(response.contexts[0].source.note_type, "progress_note")
        self.assertEqual(response.metadata["total_matches"], 1)
        self.assertEqual(response.metadata["query_time_ms"], 25)
        
        # Verify calls
        self.assertEqual(mock_cm.post.call_count, 2)
        
        # First call should be to embedding service
        args1, kwargs1 = mock_cm.post.call_args_list[0]
        self.assertEqual(args1[0], f"{self.embedding_service_url}/embed/text")
        
        # Second call should be to vector store
        args2, kwargs2 = mock_cm.post.call_args_list[1]
        self.assertEqual(args2[0], f"{self.vector_store_service_url}/vectors/search")
    
    @patch('aiohttp.ClientSession')
    async def test_delete_document(self, mock_session):
        """Test deleting a document"""
        # Setup mock responses
        mock_cm = MagicMock()
        mock_session.return_value.__aenter__.return_value = mock_cm
        
        # Mock vector store response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "success": True,
            "message": "Document deleted successfully"
        })
        
        # Configure mock
        mock_cm.delete.return_value.__aenter__.return_value = mock_response
        
        # Call the method
        response = await self.provider.delete_document("doc_1")
        
        # Assertions
        self.assertTrue(response.success)
        self.assertEqual(response.message, "Document deleted successfully")
        self.assertEqual(response.data["document_id"], "doc_1")
        
        # Verify call
        mock_cm.delete.assert_called_once_with(
            f"{self.vector_store_service_url}/vectors/document/doc_1",
            headers=await self.provider._get_headers()
        )
    
    @patch('aiohttp.ClientSession')
    async def test_ingest_documents_error(self, mock_session):
        """Test handling errors during document ingestion"""
        # Setup mock responses
        mock_cm = MagicMock()
        mock_session.return_value.__aenter__.return_value = mock_cm
        
        # Mock embedding response with error
        mock_embed_response = AsyncMock()
        mock_embed_response.status = 500
        mock_embed_response.text = AsyncMock(return_value="Internal server error")
        
        # Configure mock
        mock_cm.post.return_value.__aenter__.return_value = mock_embed_response
        
        # Test documents
        documents = [
            {
                "text": "Test document",
                "document_id": "doc_1",
                "metadata": {"note_type": "test"}
            }
        ]
        
        # Call the method
        response = await self.provider.ingest_documents(documents)
        
        # Assertions
        self.assertFalse(response.success)
        self.assertIn("Error processing documents", response.message)
        self.assertIn("Embedding service error", response.message)

def run_async_test(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

if __name__ == '__main__':
    unittest.main()