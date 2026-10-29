# Services Package Business Logic & Processing Pipeline

## 1. Overview
The `app.services` package encapsulates the computational engine for document processing, dense vector embedding generation, and Pinecone database connectivity.

## 2. Chunking Logic (`chunking_service.py`)
- **Semantic Boundary Heuristic**:
  Instead of slicing texts blindly at fixed character offsets (which splits words in half), the chunker checks a 100-character boundary window for punctuation marks (`. `, `\n`, `? `, `! `) to produce syntactically coherent chunks.
- **Overlap Guarantee**:
  Consecutive chunks maintain `chunk_overlap` characters (default 80) to preserve cross-sentence context across chunk boundaries, preventing missing context during query retrieval.
- **Deterministic ID Generation**:
  Chunks receive IDs patterned as `{doc_id}_c{chunk_index}`. A SHA-256 hash of the chunk content is embedded in metadata to enable idempotent upserts and duplicate detection.

## 3. Embedding Pipeline (`embedding_service.py`)
- **Provider Protocol**:
  1. Default: Interacts with Gemini embedding models (`gemini-embedding-2-preview` or `text-embedding-004`) returning 768-dimensional normalized vectors.
  2. Batch Processing: Texts are embedded in parallel batches of up to 64 strings to balance throughput with API rate limits.
  3. Resilient Fallback: If network interruptions or missing API keys occur, a deterministic pseudo-semantic hash projection normalizes vectors to unit L2 length so tests and local dev servers remain functional.

## 4. Pinecone Database Client (`pinecone_service.py`)
- **Batch Upsert Protocol**:
  Vectors are sliced into batches of 100 before transmitting to Pinecone over HTTPS/gRPC. Each vector includes `id`, `values` (float array), and rich `metadata`.
- **Atomic Vector Upgrade**:
  Pinecone's `index.update(id, values=..., set_metadata=..., namespace=...)` is utilized to modify existing records without requiring full deletion and re-indexing.
- **Multi-Tenancy & Namespaces**:
  All vector operations (Upload, Upgrade, Retrieve, Delete) explicitly parameterize `namespace` to isolate user or department collections without creating multiple billing indexes.
- **Similarity Computation**:
  - `cosine`: $\frac{A \cdot B}{\|A\| \|B\|}$ yielding values from -1.0 to 1.0 (most common).
  - `dotproduct`: $A \cdot B$ (assumes pre-normalized vectors).
  - `euclidean`: $\frac{1}{1 + \sqrt{\sum (A_i - B_i)^2}}$, mapped into an intuitive [0, 1] similarity scale.
