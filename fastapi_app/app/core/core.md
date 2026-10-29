# Core Package Business Logic & Architecture

## 1. Overview
The `app.core` package establishes fundamental system primitives, including centralized environment configuration, security boundary policies, and initialization lifecycles.

## 2. Configuration Strategy
- **Settings Source Hierarchy**:
  1. Operating system environment variables.
  2. `.env` file (parsed using `pydantic-settings`).
  3. Default fallback values tuned for high-concurrency vector pipelines.
- **Key Validation Invariants**:
  - `PINECONE_DIMENSION`: Must align precisely with the embedding model output dimension (default `768` for Gemini embeddings, `1536` for OpenAI text-embedding-3-small).
  - `PINECONE_METRIC`: Default is `cosine` which normalizes vector lengths to [-1.0, 1.0]. Alternatively, `dotproduct` requires unit length vectors, and `euclidean` (L2 distance) maps distances where 0 is identical.
  - `MAX_BATCH_DOCUMENTS`: Fixed at 100 to prevent HTTP connection timeouts and Pinecone per-request payload limits (Pinecone recommends <= 2MB per upsert payload).

## 3. Security Boundary Policies
- **Authentication Modes**:
  - `Development`: Enabled when `ENABLE_AUTH=False`. All requests are tagged with `"unauthenticated-dev-mode"` for friction-free local experimentation and automated testing.
  - `Production`: Enabled when `ENABLE_AUTH=True`. Requires valid `X-API-Key` headers matching authorized client keys.
- **Fail-Safe Response Format**:
  All security rejections return structured error JSON including HTTP code, standard error type, human-readable message, and internal error code (`MISSING_API_KEY` or `INVALID_API_KEY`).
