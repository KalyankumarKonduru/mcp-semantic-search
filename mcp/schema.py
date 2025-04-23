from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class MCPMetadataFilter(BaseModel):
    """
    Metadata filters for MCP context requests
    """
    note_type: Optional[List[str]] = None
    date_range: Optional[Dict[str, str]] = None
    provider: Optional[str] = None
    department: Optional[str] = None
    custom: Optional[Dict[str, Any]] = None

class MCPContextRequest(BaseModel):
    """
    MCP-compliant context request format
    """
    query: str
    limit: int = 5
    metadata_filters: Optional[MCPMetadataFilter] = None
    return_sources: bool = True

class MCPContextSource(BaseModel):
    """
    Source metadata for a context item
    """
    document_id: str
    note_type: Optional[str] = None
    date: Optional[str] = None
    author: Optional[str] = None
    department: Optional[str] = None
    custom: Optional[Dict[str, Any]] = None

class MCPContextItem(BaseModel):
    """
    A single context item in an MCP response
    """
    text: str
    source: MCPContextSource
    relevance_score: float

class MCPContextResponse(BaseModel):
    """
    MCP-compliant context response format
    """
    contexts: List[MCPContextItem]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MCPDocumentInput(BaseModel):
    """
    Format for document submission to MCP provider
    """
    text: str
    document_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MCPDocumentBatch(BaseModel):
    """
    Batch of documents for ingestion
    """
    documents: List[MCPDocumentInput]

class MCPResponse(BaseModel):
    """
    Standard MCP response format
    """
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None