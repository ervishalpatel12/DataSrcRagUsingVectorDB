"""
Upgrade Endpoint Router - Vector modification, metadata patching, and re-embedding.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import time
from typing import List

from app.core.security import verify_api_key
from app.models.schemas import UpgradeRequest, UpgradeResponse, UpgradeItem
from app.services.embedding_service import embedding_service
from app.services.pinecone_service import pinecone_service

router = APIRouter(prefix="/upgrade", tags=["Vector Upgrade Pipeline"])


@router.put(
    "",
    response_model=UpgradeResponse,
    status_code=status.HTTP_200_OK,
    summary="Upgrade Existing Vectors in Pinecone Index",
    description="Updates vector embeddings, modifies metadata patches, or recalculates embeddings when document text changes."
)
async def upgrade_vectors(
    payload: UpgradeRequest,
    _api_key: str = Depends(verify_api_key)
) -> UpgradeResponse:
    start_time = time.perf_counter()

    if not payload.items:
        raise HTTPException(status_code=400, detail="Upgrade request items list cannot be empty")

    updated_ids = []
    re_embedded_count = 0
    target_namespace = payload.items[0].namespace or "default"

    try:
        for item in payload.items:
            v_id = item.id
            values = item.values
            metadata_patch = item.metadata_patch or {}

            # If new_text is specified, compute new vector embedding automatically
            if item.new_text:
                new_vector = await embedding_service.get_embedding(item.new_text)
                values = new_vector
                metadata_patch["text"] = item.new_text
                metadata_patch["re_embedded_at"] = time.time()
                re_embedded_count += 1

            # Stamp version metadata
            metadata_patch["updated_at"] = time.time()

            # Execute Pinecone update
            await pinecone_service.update_vector(
                vector_id=v_id,
                values=values,
                metadata_patch=metadata_patch if metadata_patch else None,
                merge_metadata=item.merge_metadata,
                namespace=item.namespace or target_namespace
            )

            updated_ids.append(v_id)

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return UpgradeResponse(
            status="success",
            message=f"Successfully upgraded {len(updated_ids)} vector(s) in namespace '{target_namespace}'.",
            updated_count=len(updated_ids),
            vector_ids=updated_ids,
            namespace=target_namespace,
            re_embedded_count=re_embedded_count,
            execution_time_ms=latency_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upgrade operation failed: {str(e)}"
        )


@router.patch(
    "/{vector_id}/metadata",
    response_model=UpgradeResponse,
    status_code=status.HTTP_200_OK,
    summary="Quick Metadata Patch for Single Vector",
    description="Patches metadata key-value pairs without touching the high-dimensional vector values."
)
async def patch_vector_metadata(
    vector_id: str,
    metadata_patch: dict,
    namespace: str = "default",
    _api_key: str = Depends(verify_api_key)
) -> UpgradeResponse:
    start_time = time.perf_counter()

    await pinecone_service.update_vector(
        vector_id=vector_id,
        values=None,
        metadata_patch=metadata_patch,
        merge_metadata=True,
        namespace=namespace
    )

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return UpgradeResponse(
        status="success",
        message=f"Metadata patched for vector '{vector_id}'.",
        updated_count=1,
        vector_ids=[vector_id],
        namespace=namespace,
        re_embedded_count=0,
        execution_time_ms=latency_ms
    )
