# API Package Business Logic & Routing Architecture

## 1. Modular Separation Principle
As demanded by production vector search systems, the API boundary is strictly partitioned into three independent endpoints:
1. **Upload API (`/api/v1/upload`)**: Responsible exclusively for document intake, validation, chunking, embedding generation, and initial index insertion.
2. **Upgrade API (`/api/v1/upgrade`)**: Responsible exclusively for patching existing vector metadata, replacing vector coordinates, re-vectorizing revised document text, and maintaining version increments.
3. **Retrieve API (`/api/v1/retrieve`)**: High-throughput semantic search pipeline handling query vectorization, namespace isolation, metadata filtering, similarity metric ranking, and score gating.

## 2. API Versioning & Routing Hierarchy
- Root URL: `/api/v1`
- Sub-routers:
  - `/api/v1/upload` -> `endpoints.upload.router`
  - `/api/v1/upgrade` -> `endpoints.upgrade.router`
  - `/api/v1/retrieve` -> `endpoints.retrieve.router`
  - `/api/v1/system` -> Health, Pinecone index stats, and vector inspection

## 3. Response Envelope Standard
Every successful JSON response carries:
- `status`: `"success"`
- Operation-specific payload fields (`vector_ids`, `matches`, `updated_count`, etc.)
- `execution_time_ms`: Server-side latency in milliseconds for SLA monitoring.
