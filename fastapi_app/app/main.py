"""
FastAPI Entry Point for PineVector Vector Database Service.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown hooks."""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"🌲 Pinecone Target Index: {settings.PINECONE_INDEX_NAME} (Metric: {settings.PINECONE_METRIC}, Dim: {settings.PINECONE_DIMENSION})")
    print(f"🧠 Embedding Provider: {settings.EMBEDDING_PROVIDER} ({settings.EMBEDDING_MODEL})")
    yield
    print("🛑 Shutting down PineVector service...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Modular REST API Architecture for Pinecone Vector Database
    
    This service provides three dedicated, production-grade vector pipelines:
    * 📤 **Upload API** (`/api/v1/upload`): Document ingestion, semantic chunking, dense embeddings, batch upsert.
    * 🔄 **Upgrade API** (`/api/v1/upgrade`): Vector modification, metadata patch merge, text re-embedding.
    * 🔍 **Retrieve API** (`/api/v1/retrieve`): Nearest-neighbor search, metadata filtering, namespace scoping.
    
    Each package folder contains dedicated `.md` documentation describing business logic in depth.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular API Routers
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["System & Diagnostics"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "documentation": "/docs",
        "endpoints": {
            "upload": f"{settings.API_V1_PREFIX}/upload",
            "upgrade": f"{settings.API_V1_PREFIX}/upgrade",
            "retrieve": f"{settings.API_V1_PREFIX}/retrieve",
            "stats": f"{settings.API_V1_PREFIX}/stats"
        }
    }


@app.get("/healthz", tags=["System & Diagnostics"])
async def health_check():
    return {"status": "healthy", "service": "PineVector"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
