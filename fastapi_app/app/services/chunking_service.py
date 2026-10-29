"""
Document chunking and text decomposition service.
"""
from typing import List, Dict, Any
import hashlib
import re


class ChunkingService:
    """
    Splits continuous text documents into overlapping semantic chunks
    optimized for dense vector embeddings.
    """

    @staticmethod
    def compute_sha256(text: str) -> str:
        """Generates deterministic hash of text for deduplication."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def chunk_document(
        self,
        doc_id: str,
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 80,
        base_metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Splits text into chunks preserving sentence boundaries where possible.
        """
        base_metadata = base_metadata or {}
        cleaned_text = text.strip()
        
        if len(cleaned_text) <= chunk_size:
            return [{
                "chunk_id": f"{doc_id}_c0",
                "doc_id": doc_id,
                "chunk_index": 0,
                "text": cleaned_text,
                "hash": self.compute_sha256(cleaned_text),
                "metadata": {
                    **base_metadata,
                    "doc_id": doc_id,
                    "chunk_index": 0,
                    "total_chunks": 1,
                    "text": cleaned_text,
                }
            }]

        chunks = []
        start = 0
        text_length = len(cleaned_text)
        chunk_idx = 0

        while start < text_length:
            end = start + chunk_size
            if end >= text_length:
                chunk_slice = cleaned_text[start:text_length].strip()
                if chunk_slice:
                    chunks.append(chunk_slice)
                break

            # Find nearest sentence break or paragraph break
            search_window = cleaned_text[end - 50:end + 50]
            break_match = re.search(r"(\. |\n|\? |\! )", search_window)
            
            if break_match:
                end_adjusted = (end - 50) + break_match.end()
                chunk_slice = cleaned_text[start:end_adjusted].strip()
            else:
                chunk_slice = cleaned_text[start:end].strip()

            if chunk_slice:
                chunks.append(chunk_slice)

            # Move start forward with overlap
            step = max(chunk_size - chunk_overlap, 50)
            start += step

        total_chunks = len(chunks)
        results = []
        for i, c_text in enumerate(chunks):
            chunk_id = f"{doc_id}_c{i}"
            results.append({
                "chunk_id": chunk_id,
                "doc_id": doc_id,
                "chunk_index": i,
                "text": c_text,
                "hash": self.compute_sha256(c_text),
                "metadata": {
                    **base_metadata,
                    "doc_id": doc_id,
                    "chunk_index": i,
                    "total_chunks": total_chunks,
                    "text": c_text,
                }
            })

        return results


chunking_service = ChunkingService()
