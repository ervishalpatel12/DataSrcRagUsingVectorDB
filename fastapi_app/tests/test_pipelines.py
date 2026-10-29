"""
Unit and integration tests for Upload, Upgrade, and Retrieve pipelines.
"""
import pytest
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.services.pinecone_service import pinecone_service


@pytest.mark.asyncio
async def test_chunking_and_upload():
    doc_id = "test_doc_01"
    sample_text = "Vector databases enable semantic retrieval. Dense embeddings capture meaning. Fast ANN search is achieved via indexing."
    
    chunks = chunking_service.chunk_document(doc_id=doc_id, text=sample_text, chunk_size=50, chunk_overlap=10)
    assert len(chunks) >= 1
    assert chunks[0]["chunk_id"].startswith(doc_id)

    texts = [c["text"] for c in chunks]
    embeddings = await embedding_service.get_embeddings_batch(texts)
    assert len(embeddings) == len(chunks)
    assert len(embeddings[0]) == 768

    vectors = [{"id": c["chunk_id"], "values": emb, "metadata": c["metadata"]} for c, emb in zip(chunks, embeddings)]
    upserted = await pinecone_service.upsert_vectors(vectors, namespace="test-ns")
    assert upserted == len(chunks)


@pytest.mark.asyncio
async def test_upgrade_pipeline():
    v_id = "test_doc_01_c0"
    updated = await pinecone_service.update_vector(
        vector_id=v_id,
        metadata_patch={"reviewed": True, "category": "ai"},
        namespace="test-ns"
    )
    assert updated is True


@pytest.mark.asyncio
async def test_retrieve_pipeline():
    query_text = "semantic retrieval and dense embeddings"
    query_vector = await embedding_service.get_embedding(query_text)
    
    matches = await pinecone_service.query_vectors(
        query_vector=query_vector,
        namespace="test-ns",
        top_k=2
    )
    assert len(matches) > 0
    assert "score" in matches[0]
    assert matches[0]["score"] > 0.0
