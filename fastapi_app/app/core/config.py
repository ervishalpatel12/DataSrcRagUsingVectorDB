"""
Configuration Management for FastAPI & Pinecone Vector Database Service.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Config
    APP_NAME: str = "PineVector REST API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    API_KEY_NAME: str = "X-API-Key"
    API_KEYS: List[str] = ["pinevector-dev-secret-key-2026", "pinevector-prod-key"]
    ENABLE_AUTH: bool = False  # Set to True for production enforcement

    # Pinecone Vector Database Config
    PINECONE_API_KEY: str = "pcsk_demo_api_key"
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "semantic-search-index"
    PINECONE_NAMESPACE_DEFAULT: str = "default"
    PINECONE_DIMENSION: int = 768  # Matches gemini-embedding-2-preview & text-embedding-004
    PINECONE_METRIC: str = "cosine"  # cosine, dotproduct, or euclidean

    # Embedding Model Config
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini", "pinecone-inference", or "local"
    EMBEDDING_MODEL: str = "gemini-embedding-2-preview"
    EMBEDDING_BATCH_SIZE: int = 64

    # Chunking Config
    DEFAULT_CHUNK_SIZE: int = 500
    DEFAULT_CHUNK_OVERLAP: int = 80
    MAX_DOCUMENT_LENGTH: int = 500000  # ~500k chars per document
    MAX_BATCH_DOCUMENTS: int = 100

    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
