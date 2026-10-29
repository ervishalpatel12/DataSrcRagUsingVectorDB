# Models Package Business Logic & Schema Contracts

## 1. Overview
The `app.models` package standardizes data transfer objects (DTOs), request payloads, and response envelopes across all three isolated API pipelines: **Upload**, **Upgrade**, and **Retrieve**.

## 2. Invariants & Validation Constraints
- **Document Text Hygiene**: Blank strings or strings with only whitespace are rejected with HTTP 422 before tokenization or vector model calls are made.
- **Dimensionality Integrity**: Vector values must match `PINECONE_DIMENSION` (768). If custom float arrays are provided, length mismatches trigger early 400 Bad Request responses.
- **Chunk Size & Overlap Boundary**:
  - `chunk_size` is clamped between 100 and 4,000 characters.
  - `chunk_overlap` is strictly enforced to be `<= chunk_size / 2` to prevent degenerate sliding windows that produce redundant embeddings.
- **Top-K Limit**: Clamped between 1 and 50 to maintain Pinecone p99 query latency under 15ms.

## 3. Metadata Schema Guidelines
- Metadata stored in Pinecone is limited to 40KB per vector by Pinecone platform limits.
- Essential fields automatically injected:
  - `text`: Chunk text snippet for instant frontend highlight without secondary document lookups.
  - `doc_id`: Source document parent identifier.
  - `chunk_index`: Position of chunk within document.
  - `total_chunks`: Count of chunks for the parent document.
  - `created_at`: ISO-8601 UTC timestamp.
  - `updated_at`: Version modification timestamp.
  - `hash`: Content SHA-256 for deduplication checks.

## 4. Query & Filter Compatibility
Pinecone metadata filters support MongoDB-style operators:
- `$eq`: Exact match equality.
- `$ne`: Inequality filter.
- `$in`: Element in list.
- `$nin`: Element not in list.
- `$gt`, `$gte`, `$lt`, `$lte`: Numeric comparisons (e.g. timestamps, prices, ratings).
