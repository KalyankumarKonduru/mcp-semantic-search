import torch
from typing import List, Dict, Any, Optional, Union
from transformers import AutoTokenizer, AutoModel
import numpy as np

class TextEmbedder:
    """
    Text embedding service using BioBERT or ClinicalBERT
    """
    
    def __init__(
        self, 
        model_name: str = "dmis-lab/biobert-base-cased-v1.1", 
        device: Optional[str] = None,
        max_length: int = 512,
        batch_size: int = 8
    ):
        """Initialize the text embedder with BioBERT model"""
        self.max_length = max_length
        self.batch_size = batch_size
        
        # Determine device (CPU/GPU)
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        
        print(f"Loading {model_name} on {self.device}...")
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        
        print(f"Model loaded successfully")
    
    def embed_text(self, text: str) -> np.ndarray:
        """Generate embeddings for a single text"""
        # Tokenize the text
        inputs = self.tokenizer(
            text,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).to(self.device)
        
        # Generate embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Use CLS token embedding as the document embedding
        embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
        
        # Normalize embedding to unit length
        embedding_norm = np.linalg.norm(embedding)
        if embedding_norm > 0:
            embedding = embedding / embedding_norm
            
        return embedding[0]  # Return as 1D array
    
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for multiple texts"""
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i:i + self.batch_size]
            
            # Tokenize the batch
            inputs = self.tokenizer(
                batch_texts,
                max_length=self.max_length,
                padding="max_length",
                truncation=True,
                return_tensors="pt"
            ).to(self.device)
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                
            # Use CLS token embedding as the document embedding
            embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
            
            # Normalize embeddings to unit length
            for j, embedding in enumerate(embeddings):
                embedding_norm = np.linalg.norm(embedding)
                if embedding_norm > 0:
                    embeddings[j] = embedding / embedding_norm
            
            all_embeddings.append(embeddings)
        
        return np.vstack(all_embeddings)