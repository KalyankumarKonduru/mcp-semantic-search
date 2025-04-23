import re
from typing import List, Dict, Any, Tuple

class DocumentProcessor:
    """
    Processor for EHR documents with chunking and metadata extraction
    """
    
    def __init__(
        self, 
        chunk_size: int = 256,
        chunk_overlap: int = 64,
        min_chunk_length: int = 50
    ):
        """Initialize the document processor"""
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_length = min_chunk_length
    
    def extract_metadata(self, document: str) -> Dict[str, Any]:
        """Extract metadata from the document"""
        # Placeholder for metadata extraction
        metadata = {
            "note_type": self._extract_note_type(document),
            "date": self._extract_date(document),
            "provider": self._extract_provider(document),
            "department": self._extract_department(document),
        }
        
        return metadata
    
    def _extract_note_type(self, document: str) -> str:
        """Extract the note type from document"""
        if "DISCHARGE SUMMARY" in document.upper():
            return "discharge_summary"
        elif "PROGRESS NOTE" in document.upper():
            return "progress_note"
        elif "CONSULTATION" in document.upper():
            return "consultation"
        else:
            return "unknown"
    
    def _extract_date(self, document: str) -> str:
        """Extract the date from document"""
        date_pattern = r'\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b'
        match = re.search(date_pattern, document)
        return match.group(0) if match else ""
    
    def _extract_provider(self, document: str) -> str:
        """Extract provider information"""
        return ""
    
    def _extract_department(self, document: str) -> str:
        """Extract department information"""
        return ""
    
    def chunk_document(self, document: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Split a document into chunks with overlapping content"""
        # Simple splitting by paragraphs
        paragraphs = [p for p in document.split('\n\n') if p.strip()]
        
        # Create chunks by grouping paragraphs
        chunks = []
        current_chunk = []
        current_size = 0
        
        for paragraph in paragraphs:
            # Rough estimate of tokens (words)
            paragraph_size = len(paragraph.split())
            
            if current_size + paragraph_size > self.chunk_size and current_size >= self.min_chunk_length:
                # Current chunk is full, create a new one
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "metadata": metadata.copy(),
                    "chunk_id": len(chunks)
                })
                
                # Start new chunk with overlap
                overlap_size = 0
                overlap_paragraphs = []
                
                for p in reversed(current_chunk):
                    p_size = len(p.split())
                    if overlap_size + p_size <= self.chunk_overlap:
                        overlap_paragraphs.insert(0, p)
                        overlap_size += p_size
                    else:
                        break
                
                current_chunk = overlap_paragraphs
                current_size = overlap_size
            
            # Add paragraph to current chunk
            current_chunk.append(paragraph)
            current_size += paragraph_size
        
        # Add the last chunk if it's not empty
        if current_chunk and current_size >= self.min_chunk_length:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "metadata": metadata.copy(),
                "chunk_id": len(chunks)
            })
        
        return chunks