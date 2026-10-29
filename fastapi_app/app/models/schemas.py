"""
Pydantic V2 Data Models & Schema Contracts for PineVector REST API.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator


# ==========================================
# Common Primitives
# ==========================================

class VectorRecord(BaseModel):
    id: str = Field(..., description="Unique vector identifier in Pinecone index")
    values: Optional[List[float]] = Field(None, description="Dense embedding vector array")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata payload attached to vector")
    namespace: str = Field("default", description="Pinecone isolation namespace")


# ==========================================
# 1. Upload API Schemas
# ==========================================

class DocumentInput(BaseModel):
    id: Optional[str] = Field(None, description="Optional custom ID. If omitted, SHA-256 UUID will be auto-generated.")
    text: str = Field(..., min_length=1, description="Raw text content to vectorize and index")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom key-value pairs for filtering and citation")
    namespace: Optional[str] = Field(None, description="Target namespace. Defaults to parent request namespace.")

    @field_validator("text")
    def text_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Text content cannot be blank or whitespace-only")
        return v


class UploadRequest(BaseModel):
    documents: List[DocumentInput] = Field(..., min_length=1, max_length=100, description="List of documents to process and upload")
    namespace: str = Field("default", description="Default namespace for vectors in this upload batch")
    auto_chunk: bool = Field(True, description="Whether to split large documents into overlapping semantic chunks")
    chunk_size: int = Field(500, ge=100, le=4000, description="Maximum character length per chunk")
    chunk_overlap: int = Field(80, ge=0, le=500, description="Character overlap between consecutive chunks")
    store_text_in_metadata: bool = Field(True, description="Whether to store raw chunk text inside vector metadata for direct retrieval")


class UploadResponse(BaseModel):
    status: str = Field("success", description="Status code string")
    message: str = Field(..., description="Human-readable result summary")
    total_documents: int = Field(..., description="Count of raw input documents")
    total_chunks_indexed: int = Field(..., description="Count of discrete vector embeddings stored in Pinecone")
    vector_ids: List[str] = Field(..., description="List of newly indexed vector IDs")
    namespace: str = Field(..., description="Target namespace used")
    dimension: int = Field(..., description="Dimensionality of generated embeddings")
    execution_time_ms: float = Field(..., description="End-to-end pipeline processing latency")


# ==========================================
# 2. Upgrade API Schemas
# ==========================================

class UpgradeItem(BaseModel):
    id: str = Field(..., min_length=1, description="Target vector ID to update")
    new_text: Optional[str] = Field(None, description="If provided, automatically regenerates embeddings with the new text")
    values: Optional[List[float]] = Field(None, description="Direct new vector embedding values (overrides auto-embedding)")
    metadata_patch: Optional[Dict[str, Any]] = Field(None, description="Key-value pairs to update or add to metadata")
    merge_metadata: bool = Field(True, description="If True, merges patch into existing metadata. If False, replaces metadata entirely.")
    namespace: str = Field("default", description="Namespace containing the vector")


class UpgradeRequest(BaseModel):
    items: List[UpgradeItem] = Field(..., min_length=1, max_length=100, description="Batch of vector upgrade operations")


class UpgradeResponse(BaseModel):
    status: str = Field("success", description="Execution status")
    message: str = Field(..., description="Summary of updated vectors")
    updated_count: int = Field(..., description="Number of vectors upgraded")
    vector_ids: List[str] = Field(..., description="IDs of updated vectors")
    namespace: str = Field(..., description="Target namespace")
    re_embedded_count: int = Field(..., description="Number of vectors that had new embeddings generated")
    execution_time_ms: float = Field(..., description="Processing latency in ms")


# ==========================================
# 3. Retrieve / Semantic Search Schemas
# ==========================================

class FilterCondition(BaseModel):
    field: str
    operator: str = Field("$eq", description="Operator: $eq, $ne, $in, $nin, $gt, $gte, $lt, $lte")
    value: Any


class RetrieveRequest(BaseModel):
    query_text: Optional[str] = Field(None, description="Natural language search query to convert into embedding")
    query_vector: Optional[List[float]] = Field(None, description="Direct query vector (if already pre-computed)")
    namespace: str = Field("default", description="Target namespace to search within")
    top_k: int = Field(5, ge=1, le=50, description="Maximum number of nearest neighbor matches to return")
    filter: Optional[Dict[str, Any]] = Field(None, description="Pinecone metadata filter dictionary (e.g. {'category': {'$eq': 'tech'}})")
    min_score: Optional[float] = Field(None, ge=-1.0, le=1.0, description="Minimum similarity score threshold (filters out weak matches)")
    include_values: bool = Field(False, description="Whether to include dense vector float arrays in response")
    include_metadata: bool = Field(True, description="Whether to include metadata dictionaries in response")

    @field_validator("query_text")
    def validate_query_present(cls, v: Optional[str], info) -> Optional[str]:
        # Either query_text or query_vector must be provided
        return v


class ScoredMatch(BaseModel):
    id: str = Field(..., description="Matched vector ID")
    score: float = Field(..., description="Similarity score calculated by metric (e.g. Cosine similarity 0.0 to 1.0)")
    text: Optional[str] = Field(None, description="Original source text snippet extracted from metadata")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata key-value pairs associated with vector")
    values: Optional[List[float]] = Field(None, description="Vector embedding values (if requested)")
    namespace: str = Field(..., description="Namespace where match was found")


class RetrieveResponse(BaseModel):
    status: str = Field("success", description="Query status")
    query: str = Field(..., description="Executed query representation")
    namespace: str = Field(..., description="Queried namespace")
    total_matches: int = Field(..., description="Number of matching results meeting score threshold")
    metric: str = Field("cosine", description="Distance/similarity metric applied")
    matches: List[ScoredMatch] = Field(default_factory=list, description="Ranked list of vector matches ordered by score descending")
    execution_time_ms: float = Field(..., description="Query search latency in ms")


# ==========================================
# 4. System & Health Schemas
# ==========================================

class NamespaceStats(BaseModel):
    vector_count: int = Field(0, description="Total vectors in namespace")


class IndexStatsResponse(BaseModel):
    index_name: str
    dimension: int
    metric: str
    total_vector_count: int
    namespaces: Dict[str, NamespaceStats]
    index_fullness: float
