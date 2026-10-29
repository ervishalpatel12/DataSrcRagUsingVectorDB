# Upload Endpoint Business Logic (`upload.py`)

## 1. Pipeline Architecture
The Upload endpoint implements a 4-stage sequential data ingestion pipeline:
```
Raw Documents/Files -> Semantic Chunking -> Batch Dense Vectorization -> Pinecone Multi-Vector Upsert
```

## 2. Business Rules & Operational Policies
1. **Document Ingestion & ID Allocation**:
   - If a document supplies a custom `id`, that ID is maintained as `doc_id`.
   - If omitted, a cryptographically random prefix (`doc_{uuid4}`) is assigned.
2. **Chunking & Boundary Splitting**:
   - Documents exceeding `chunk_size` are sliced with sentence-boundary awareness.
   - Chunks receive IDs formatted as `{doc_id}_c{chunk_index}` (e.g. `doc_a1b2_c0`, `doc_a1b2_c1`).
3. **Metadata Enrichment**:
   - `doc_id`: Relates chunks back to parent record.
   - `chunk_index` & `total_chunks`: Enables reconstructed context window queries.
   - `text`: Chunk verbatim content stored in Pinecone metadata (up to 40KB) allowing instant rendering without secondary database reads.
4. **Pinecone Upsert Batching**:
   - Vectors are submitted in batches of 100 with exponential backoff on HTTP 429/503.
   - Pinecone upsert operation is idempotent: resending the same chunk ID overwrites the previous embedding.
5. **Latency Target**:
   - Processing SLA: Under 250ms for single documents, under 1200ms for batches of 50 chunks.
