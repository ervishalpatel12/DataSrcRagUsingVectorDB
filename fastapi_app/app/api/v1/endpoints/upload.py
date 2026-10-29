"""
Upload Endpoint Router - Ingestion, chunking, embedding, and indexing into Pinecone.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import time
import uuid
import json
from typing import Optional

from app.core.security import verify_api_key
from app.models.schemas import UploadRequest, UploadResponse
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.services.pinecone_service import pinecone_service

router = APIRouter(prefix="/upload", tags=["Vector Upload Pipeline"])


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Index Documents into Vector Database",
    description="Ingests text documents, applies semantic chunking, computes dense vector embeddings, and upserts into Pinecone."
)
async def upload_documents(
    payload: UploadRequest,
    _api_key: str = Depends(verify_api_key)
) -> UploadResponse:
    start_time = time.perf_counter()

    try:
        all_chunks = []
        target_namespace = payload.namespace or "default"

        # Step 1: Chunking Pipeline
        for doc in payload.documents:
            doc_id = doc.id or f"doc_{uuid.uuid4().hex[:12]}"
            doc_ns = doc.namespace or target_namespace

            if payload.auto_chunk:
                chunks = chunking_service.chunk_document(
                    doc_id=doc_id,
                    text=doc.text,
                    chunk_size=payload.chunk_size,
                    chunk_overlap=payload.chunk_overlap,
                    base_metadata=doc.metadata,
                )
            else:
                chunks = [{
                    "chunk_id": doc_id,
                    "doc_id": doc_id,
                    "chunk_index": 0,
                    "text": doc.text,
                    "hash": chunking_service.compute_sha256(doc.text),
                    "metadata": {
                        **doc.metadata,
                        "doc_id": doc_id,
                        "chunk_index": 0,
                        "total_chunks": 1,
                        "text": doc.text if payload.store_text_in_metadata else "",
                    }
                }]

            for c in chunks:
                c["namespace"] = doc_ns
                all_chunks.append(c)

        if not all_chunks:
            raise HTTPException(status_code=400, detail="No valid chunks could be created from input documents")

        # Step 2: Embedding Generation Pipeline
        chunk_texts = [c["text"] for c in all_chunks]
        embeddings = await embedding_service.get_embeddings_batch(chunk_texts)

        # Step 3: Vector Preparation
        vectors_to_upsert = []
        vector_ids = []
        for chunk, emb in zip(all_chunks, embeddings):
            v_id = chunk["chunk_id"]
            vector_ids.append(v_id)
            vectors_to_upsert.append({
                "id": v_id,
                "values": emb,
                "metadata": chunk["metadata"]
            })

        # Step 4: Pinecone Upsert
        await pinecone_service.upsert_vectors(
            vectors=vectors_to_upsert,
            namespace=target_namespace
        )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        dimension = len(embeddings[0]) if embeddings else 768

        return UploadResponse(
            status="success",
            message=f"Successfully indexed {len(all_chunks)} vector chunks into namespace '{target_namespace}'.",
            total_documents=len(payload.documents),
            total_chunks_indexed=len(all_chunks),
            vector_ids=vector_ids,
            namespace=target_namespace,
            dimension=dimension,
            execution_time_ms=latency_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload pipeline failed: {str(e)}"
        )


@router.post(
    "/file",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Index Raw File (.txt, .md, .json)",
    description="Uploads text, Markdown, or JSON files directly, parses content, and upserts vectors into Pinecone."
)
async def upload_file(
    file: UploadFile = File(...),
    namespace: str = Form("default"),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(80),
    _api_key: str = Depends(verify_api_key)
) -> UploadResponse:
    start_time = time.perf_counter()

    content_bytes = await file.read()
    try:
        text_content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded file must be UTF-8 encoded text")

    filename = file.filename or "upload.txt"
    doc_id = f"file_{uuid.uuid4().hex[:10]}"

    chunks = chunking_service.chunk_document(
        doc_id=doc_id,
        text=text_content,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        base_metadata={"filename": filename, "source": "file_upload"}
    )

    chunk_texts = [c["text"] for c in chunks]
    embeddings = await embedding_service.get_embeddings_batch(chunk_texts)

    vectors = []
    vector_ids = []
    for chunk, emb in zip(chunks, embeddings):
        vectors.append({
            "id": chunk["chunk_id"],
            "values": emb,
            "metadata": chunk["metadata"]
        })
        vector_ids.append(chunk["chunk_id"])

    await pinecone_service.upsert_vectors(vectors=vectors, namespace=namespace)

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return UploadResponse(
        status="success",
        message=f"File '{filename}' parsed into {len(chunks)} vectors in namespace '{namespace}'.",
        total_documents=1,
        total_chunks_indexed=len(chunks),
        vector_ids=vector_ids,
        namespace=namespace,
        dimension=len(embeddings[0]) if embeddings else 768,
        execution_time_ms=latency_ms
    )
