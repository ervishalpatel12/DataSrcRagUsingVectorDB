# Upgrade Endpoint Business Logic (`upgrade.py`)

## 1. Upgrade Scenarios Supported
Vector entries frequently evolve during the lifecycle of an application. The Upgrade endpoint accommodates three distinct modification semantics:
1. **Metadata-Only Updates**: Modifies tags, access control lists, timestamps, or categories without paying the computational cost of recalculating vector embeddings.
2. **Re-Embedding & Content Revision**: When raw text changes (e.g. documentation updated, bug fixed), providing `new_text` generates fresh embeddings via `embedding_service`, stamps `re_embedded_at`, and updates the vector coordinates atomically.
3. **Explicit Vector Replacement**: Used when downstream models, cross-encoders, or fine-tuned embedding algorithms generate new coordinates externally and require direct injection.

## 2. Invariants & Rules
- **Non-Destructive Merge Default**: By default (`merge_metadata=True`), existing metadata fields are preserved unless explicitly overwritten by the patch. Setting `merge_metadata=False` resets the vector's metadata dictionary to the new patch only.
- **Audit Trails**: Every upgrade operation automatically stamps the Unix timestamp in `updated_at`.
- **Dimensionality Safety**: If raw float arrays are passed in `values`, Pinecone client validates that the length equals the configured index dimensionality (768).
- **Idempotency**: Multiple repeated calls with the same payload achieve identical persistent state without duplicating vectors.
