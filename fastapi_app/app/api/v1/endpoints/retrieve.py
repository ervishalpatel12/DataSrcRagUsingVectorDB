"""
Retrieve Endpoint Router - Semantic similarity search and vector retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import time

from app.core.security import verify_api_key
from app.models.schemas import RetrieveRequest, RetrieveResponse, ScoredMatch
from app.services.embedding_service import embedding_service
from app.services.pinecone_service import pinecone_service
from app.core.config import settings

router = APIRouter(prefix="/retrieve", tags=["Vector Retrieval Pipeline"])


@router.post(
    "",
    response_model=RetrieveResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Vector Retrieval & Nearest-Neighbor Search",
    description="Vectorizes natural language queries, executes cosine/dotproduct similarity against Pinecone, and returns ranked matches with metadata filtering."
)
async def retrieve_similar_vectors(
    payload: RetrieveRequest,
    _api_key: str = Depends(verify_api_key)
) -> RetrieveResponse:
    start_time = time.perf_counter()

    # Validation: Ensure either query_text or query_vector is supplied
    if not payload.query_text and not payload.query_vector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'query_text' or 'query_vector' must be supplied for retrieval."
        )

    try:
        # Step 1: Compute Query Embedding if text query provided
        if payload.query_vector:
            query_vector = payload.query_vector
            query_repr = f"[Raw Vector of dimension {len(query_vector)}]"
        else:
            query_vector = await embedding_service.get_embedding(payload.query_text)
            query_repr = payload.query_text

        # Step 2: Query Pinecone Vector Index
        target_namespace = payload.namespace or "default"
        raw_matches = await pinecone_service.query_vectors(
            query_vector=query_vector,
            namespace=target_namespace,
            top_k=payload.top_k,
            filter_dict=payload.filter,
            include_values=payload.include_values,
            include_metadata=payload.include_metadata,
        )

        # Step 3: Apply Minimum Score Thresholding & Build Match Objects
        scored_matches = []
        for match in raw_matches:
            score = match["score"]
            if payload.min_score is not None and score < payload.min_score:
                continue

            metadata = match.get("metadata", {})
            text_snippet = metadata.get("text") or metadata.get("summary")

            scored_matches.append(
                ScoredMatch(
                    id=match["id"],
                    score=score,
                    text=text_snippet,
                    metadata=metadata,
                    values=match.get("values") if payload.include_values else None,
                    namespace=target_namespace
                )
            )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return RetrieveResponse(
            status="success",
            query=query_repr,
            namespace=target_namespace,
            total_matches=len(scored_matches),
            metric=settings.PINECONE_METRIC,
            matches=scored_matches,
            execution_time_ms=latency_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic retrieval pipeline failed: {str(e)}"
        )
