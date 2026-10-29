# Retrieve Endpoint Business Logic (`retrieve.py`)

## 1. High-Performance Retrieval Flow
The Retrieve endpoint delivers low-latency semantic search through the following stages:
```
Natural Language Query -> Real-Time Vectorization -> Namespace Routing -> Metadata Pre-filtering -> Cosine Nearest Neighbor Calculation -> Score Thresholding & Ranking
```

## 2. Core Retrieval Mechanics
1. **Query Embedding**:
   - Natural language queries undergo identical vectorization as indexed chunks, ensuring symmetrical latent space alignment.
   - For pre-computed embedding workflows (e.g. client-side transformers or caching tiers), `query_vector` bypasses the embedding model entirely.
2. **Metadata Filtering (Pre-filtering)**:
   - Filters are evaluated by Pinecone before vector distances are computed, narrowing the candidate space and accelerating lookups.
   - Example filter query:
     ```json
     {
       "category": { "$eq": "documentation" },
       "year": { "$gte": 2025 }
     }
     ```
3. **Similarity Metrics & Interpretation**:
   - **Cosine Similarity**: Values range from 0.0 (orthogonal) to 1.0 (identical direction).
   - Recommended confidence thresholds:
     - `>= 0.85`: High-precision match (direct factual response).
     - `0.70 - 0.84`: Strong contextual relevance (relevant passage).
     - `< 0.65`: Weak semantic overlap; recommended to filter out using `min_score`.
4. **Namespace Isolation**:
   - Queries execute against a single specified `namespace` to guarantee multi-tenant tenant isolation and data protection.
5. **Latency Targets**:
   - Query embedding generation: ~80ms.
   - Pinecone index traversal: ~10-25ms.
   - End-to-end P95 retrieval latency: < 150ms.
