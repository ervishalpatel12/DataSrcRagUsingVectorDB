"""
Aggregated v1 Router unifying Upload, Upgrade, and Retrieve endpoints.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import upload, upgrade, retrieve
from app.services.pinecone_service import pinecone_service
from app.models.schemas import IndexStatsResponse

api_v1_router = APIRouter()

# Register the 3 core pipelines separately
api_v1_router.include_router(upload.router)
api_v1_router.include_router(upgrade.router)
api_v1_router.include_router(retrieve.router)


@api_v1_router.get(
    "/stats",
    response_model=IndexStatsResponse,
    tags=["System & Diagnostics"],
    summary="Pinecone Index Statistics & Health",
    description="Returns total vector counts, dimensionality, and namespace distributions."
)
async def get_index_stats() -> IndexStatsResponse:
    stats = await pinecone_service.get_index_stats()
    return IndexStatsResponse(**stats)


@api_v1_router.get(
    "/vectors",
    tags=["System & Diagnostics"],
    summary="Inspect Vectors in Namespace",
    description="Returns list of vector records for inspection and debugging."
)
async def list_vectors(namespace: str = "default"):
    records = pinecone_service.get_all_vectors(namespace=namespace)
    return {
        "namespace": namespace,
        "count": len(records),
        "vectors": records
    }


@api_v1_router.delete(
    "/vectors/{vector_id}",
    tags=["System & Diagnostics"],
    summary="Delete Vector from Index",
    description="Removes a single vector by its ID."
)
async def delete_vector(vector_id: str, namespace: str = "default"):
    success = pinecone_service.delete_vector(vector_id=vector_id, namespace=namespace)
    return {"status": "success" if success else "not_found", "deleted_id": vector_id}
