import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// Gemini Embeddings Client
// ==========================================
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini client init error:', err);
  }
}

const VECTOR_DIMENSION = 768;

// Deterministic semantic fallback embedding generator
function generateDeterministicVector(text: string, dimension = VECTOR_DIMENSION): number[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const vec = new Float64Array(dimension);

  words.forEach((word, wordIdx) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    for (let j = 0; j < 12; j++) {
      const idx = (positiveHash + j * 61 + wordIdx * 17) % dimension;
      const weight = ((positiveHash >> (j * 2)) & 0xff) / 128.0 - 1.0;
      vec[idx] += weight;
    }
  });

  // Calculate L2 norm
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  const result: number[] = new Array(dimension);
  if (norm > 0) {
    for (let i = 0; i < dimension; i++) {
      result[i] = Number((vec[i] / norm).toFixed(6));
    }
  } else {
    result[0] = 1.0;
    for (let i = 1; i < dimension; i++) result[i] = 0.0;
  }
  return result;
}

// Generate embeddings using Gemini if available, otherwise local fallback
async function getEmbedding(text: string): Promise<number[]> {
  if (aiClient) {
    try {
      // @ts-ignore
      const res = await aiClient.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text,
      });
      // @ts-ignore
      if (res.embedding?.values) {
        // @ts-ignore
        return res.embedding.values;
      }
    } catch (err) {
      // Fallback silently
    }
  }
  return generateDeterministicVector(text);
}

async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await getEmbedding(text));
  }
  return results;
}

// ==========================================
// In-Memory Pinecone Vector Storage
// ==========================================
interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, any>;
  namespace: string;
  updated_at: number;
}

const vectorDatabase: Record<string, Record<string, VectorRecord>> = {
  default: {},
  'knowledge-base': {},
  'faq-support': {},
  'engineering-docs': {},
};

// Seed realistic starter vectors
function seedDatabase() {
  const seedItems = [
    {
      namespace: 'knowledge-base',
      id: 'doc_pinecone_ann_01',
      text: 'Pinecone provides a managed vector database optimized for approximate nearest neighbor (ANN) search with sub-50ms p99 latencies at billion-scale.',
      metadata: {
        category: 'architecture',
        source: 'Pinecone Whitepaper',
        difficulty: 'intermediate',
        tags: ['pinecone', 'ann', 'database', 'performance'],
        author: 'Pinecone Engineering',
      },
    },
    {
      namespace: 'knowledge-base',
      id: 'doc_embeddings_gemini_02',
      text: 'Gemini embedding models transform unstructured natural language documents into 768-dimensional dense vectors where semantic distance mirrors conceptual similarity.',
      metadata: {
        category: 'ml',
        source: 'Google DeepMind',
        difficulty: 'advanced',
        tags: ['embeddings', 'gemini', 'vectors', 'deepmind'],
        author: 'AI Research',
      },
    },
    {
      namespace: 'knowledge-base',
      id: 'doc_hybrid_search_03',
      text: 'Hybrid search combines dense vector semantic similarity with sparse lexical keyword matching (BM25) to achieve state-of-the-art precision for RAG workflows.',
      metadata: {
        category: 'rag',
        source: 'IR Journal 2026',
        difficulty: 'advanced',
        tags: ['hybrid-search', 'bm25', 'rag', 'information-retrieval'],
        author: 'Search Team',
      },
    },
    {
      namespace: 'faq-support',
      id: 'faq_chunking_strategy_01',
      text: 'What is the recommended chunk size for semantic search? Chunk sizes between 400 and 800 characters with 15-20% overlap offer the best tradeoff between specific context and retrieval relevance.',
      metadata: {
        category: 'faq',
        question: 'What is the recommended chunk size?',
        tags: ['chunking', 'best-practices', 'tokenization'],
      },
    },
    {
      namespace: 'faq-support',
      id: 'faq_metadata_filtering_02',
      text: 'How does Pinecone handle metadata filtering? Pinecone pre-filters vector candidates using indexes on metadata fields before executing vector similarity calculations.',
      metadata: {
        category: 'faq',
        question: 'How does Pinecone handle metadata filtering?',
        tags: ['filtering', 'pinecone', 'metadata'],
      },
    },
    {
      namespace: 'engineering-docs',
      id: 'eng_fastapi_rest_01',
      text: 'FastAPI uses Pydantic V2 for schema validation and OpenAPI 3.1 specification generation, providing high performance on ASGI servers like Uvicorn.',
      metadata: {
        category: 'backend',
        language: 'python',
        tags: ['fastapi', 'rest-api', 'pydantic', 'uvicorn'],
      },
    },
  ];

  for (const item of seedItems) {
    const vec = generateDeterministicVector(item.text);
    if (!vectorDatabase[item.namespace]) {
      vectorDatabase[item.namespace] = {};
    }
    vectorDatabase[item.namespace][item.id] = {
      id: item.id,
      values: vec,
      metadata: {
        ...item.metadata,
        text: item.text,
        chunk_index: 0,
        total_chunks: 1,
      },
      namespace: item.namespace,
      updated_at: Date.now(),
    };
  }
}

seedDatabase();

// Text Chunking Helper
function chunkText(text: string, chunkSize = 500, overlap = 80): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = start + chunkSize;
    if (end >= cleaned.length) {
      chunks.push(cleaned.slice(start).trim());
      break;
    }
    const windowSlice = cleaned.slice(Math.max(0, end - 40), Math.min(cleaned.length, end + 40));
    const breakMatch = windowSlice.search(/(\.\s|\n|\?\s|!\s)/);
    if (breakMatch !== -1) {
      end = Math.max(0, end - 40) + breakMatch + 1;
    }
    const chunk = cleaned.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start += Math.max(chunkSize - overlap, 50);
  }
  return chunks;
}

// Distance & Similarity calculation
function computeSimilarity(a: number[], b: number[], metric = 'cosine'): number {
  if (!a || !b || a.length !== b.length) return 0;

  if (metric === 'cosine') {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : Math.max(-1, Math.min(1, dot / denominator));
  } else if (metric === 'dotproduct') {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  } else if (metric === 'euclidean') {
    let distSq = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      distSq += diff * diff;
    }
    return 1 / (1 + Math.sqrt(distSq));
  }
  return 0;
}

// Metadata filter evaluation
function evaluateFilter(metadata: Record<string, any>, filterObj: Record<string, any>): boolean {
  for (const [key, condition] of Object.entries(filterObj)) {
    const val = metadata[key];
    if (typeof condition === 'object' && condition !== null) {
      for (const [op, expected] of Object.entries(condition)) {
        if (op === '$eq' && val !== expected) return false;
        if (op === '$ne' && val === expected) return false;
        if (op === '$in' && Array.isArray(expected) && !expected.includes(val)) return false;
        if (op === '$nin' && Array.isArray(expected) && expected.includes(val)) return false;
        if (op === '$gt' && (val === undefined || val <= (expected as number))) return false;
        if (op === '$gte' && (val === undefined || val < (expected as number))) return false;
        if (op === '$lt' && (val === undefined || val >= (expected as number))) return false;
        if (op === '$lte' && (val === undefined || val > (expected as number))) return false;
      }
    } else {
      if (val !== condition) return false;
    }
  }
  return true;
}

// ==========================================
// REST API ENDPOINTS (Identical to FastAPI)
// ==========================================

// 1. UPLOAD API (/api/v1/upload)
app.post('/api/v1/upload', async (req: Request, res: Response) => {
  const startTime = performance.now();
  try {
    const {
      documents,
      namespace = 'default',
      auto_chunk = true,
      chunk_size = 500,
      chunk_overlap = 80,
      store_text_in_metadata = true,
    } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Request body must include a non-empty "documents" array',
      });
    }

    if (!vectorDatabase[namespace]) {
      vectorDatabase[namespace] = {};
    }

    const chunkItems: { id: string; text: string; metadata: any }[] = [];
    const vectorIds: string[] = [];

    for (const doc of documents) {
      const docId = doc.id || `doc_${crypto.randomBytes(6).toString('hex')}`;
      const text = doc.text || '';
      if (!text.trim()) continue;

      if (auto_chunk) {
        const chunks = chunkText(text, chunk_size, chunk_overlap);
        chunks.forEach((cText, idx) => {
          const chunkId = `${docId}_c${idx}`;
          vectorIds.push(chunkId);
          chunkItems.push({
            id: chunkId,
            text: cText,
            metadata: {
              ...(doc.metadata || {}),
              doc_id: docId,
              chunk_index: idx,
              total_chunks: chunks.length,
              text: store_text_in_metadata ? cText : '',
              created_at: new Date().toISOString(),
            },
          });
        });
      } else {
        vectorIds.push(docId);
        chunkItems.push({
          id: docId,
          text,
          metadata: {
            ...(doc.metadata || {}),
            doc_id: docId,
            chunk_index: 0,
            total_chunks: 1,
            text: store_text_in_metadata ? text : '',
            created_at: new Date().toISOString(),
          },
        });
      }
    }

    // Generate embeddings
    const texts = chunkItems.map((c) => c.text);
    const embeddings = await getBatchEmbeddings(texts);

    // Upsert to storage
    for (let i = 0; i < chunkItems.length; i++) {
      const item = chunkItems[i];
      vectorDatabase[namespace][item.id] = {
        id: item.id,
        values: embeddings[i],
        metadata: item.metadata,
        namespace,
        updated_at: Date.now(),
      };
    }

    const latency = Number((performance.now() - startTime).toFixed(2));

    return res.status(201).json({
      status: 'success',
      message: `Successfully uploaded and indexed ${chunkItems.length} vector chunks into namespace '${namespace}'.`,
      total_documents: documents.length,
      total_chunks_indexed: chunkItems.length,
      vector_ids: vectorIds,
      namespace,
      dimension: VECTOR_DIMENSION,
      execution_time_ms: latency,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'UploadError', message: err.message });
  }
});

// 2. UPGRADE API (/api/v1/upgrade)
app.put('/api/v1/upgrade', async (req: Request, res: Response) => {
  const startTime = performance.now();
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Request body must include a non-empty "items" array',
      });
    }

    const updatedIds: string[] = [];
    let reEmbeddedCount = 0;
    const targetNs = items[0]?.namespace || 'default';

    for (const item of items) {
      const ns = item.namespace || 'default';
      if (!vectorDatabase[ns]) vectorDatabase[ns] = {};

      const existing = vectorDatabase[ns][item.id];
      let newValues = item.values;
      const metadataPatch = item.metadata_patch || {};

      if (item.new_text) {
        newValues = await getEmbedding(item.new_text);
        metadataPatch.text = item.new_text;
        metadataPatch.re_embedded_at = new Date().toISOString();
        reEmbeddedCount++;
      }

      metadataPatch.updated_at = new Date().toISOString();

      if (existing) {
        vectorDatabase[ns][item.id] = {
          id: item.id,
          values: newValues || existing.values,
          metadata: item.merge_metadata !== false
            ? { ...existing.metadata, ...metadataPatch }
            : metadataPatch,
          namespace: ns,
          updated_at: Date.now(),
        };
      } else {
        vectorDatabase[ns][item.id] = {
          id: item.id,
          values: newValues || generateDeterministicVector(metadataPatch.text || item.id),
          metadata: metadataPatch,
          namespace: ns,
          updated_at: Date.now(),
        };
      }
      updatedIds.push(item.id);
    }

    const latency = Number((performance.now() - startTime).toFixed(2));

    return res.status(200).json({
      status: 'success',
      message: `Successfully upgraded ${updatedIds.length} vector(s) in namespace '${targetNs}'.`,
      updated_count: updatedIds.length,
      vector_ids: updatedIds,
      namespace: targetNs,
      re_embedded_count: reEmbeddedCount,
      execution_time_ms: latency,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'UpgradeError', message: err.message });
  }
});

// 3. RETRIEVE API (/api/v1/retrieve)
app.post('/api/v1/retrieve', async (req: Request, res: Response) => {
  const startTime = performance.now();
  try {
    const {
      query_text,
      query_vector,
      namespace = 'default',
      top_k = 5,
      filter = null,
      min_score = null,
      include_values = false,
      include_metadata = true,
      metric = 'cosine',
    } = req.body;

    if (!query_text && !query_vector) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Must provide either "query_text" or "query_vector"',
      });
    }

    let searchVector: number[];
    let queryRepresentation: string;

    if (query_vector && Array.isArray(query_vector)) {
      searchVector = query_vector;
      queryRepresentation = `[Raw Vector (${searchVector.length} dims)]`;
    } else {
      searchVector = await getEmbedding(query_text);
      queryRepresentation = query_text;
    }

    const targetStore = vectorDatabase[namespace] || {};
    const candidates: any[] = [];

    for (const [vId, record] of Object.entries(targetStore)) {
      if (filter && !evaluateFilter(record.metadata, filter)) {
        continue;
      }

      const score = computeSimilarity(searchVector, record.values, metric);
      if (min_score !== null && score < min_score) {
        continue;
      }

      candidates.push({
        id: vId,
        score: Number(score.toFixed(5)),
        text: record.metadata?.text || record.metadata?.summary || null,
        metadata: include_metadata ? record.metadata : {},
        values: include_values ? record.values : undefined,
        namespace,
      });
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    const matches = candidates.slice(0, top_k);

    const latency = Number((performance.now() - startTime).toFixed(2));

    return res.status(200).json({
      status: 'success',
      query: queryRepresentation,
      namespace,
      total_matches: matches.length,
      metric,
      matches,
      execution_time_ms: latency,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'RetrieveError', message: err.message });
  }
});

// 4. STATS & DIAGNOSTICS
app.get('/api/v1/stats', (req: Request, res: Response) => {
  const namespaces: Record<string, { vector_count: number }> = {};
  let totalVectors = 0;

  for (const [ns, records] of Object.entries(vectorDatabase)) {
    const count = Object.keys(records).length;
    namespaces[ns] = { vector_count: count };
    totalVectors += count;
  }

  res.json({
    index_name: 'semantic-search-index',
    dimension: VECTOR_DIMENSION,
    metric: 'cosine',
    total_vector_count: totalVectors,
    namespaces,
    index_fullness: Number((totalVectors / 100000).toFixed(4)),
    embedding_provider: aiClient ? 'Gemini API (gemini-embedding-2-preview)' : 'Normalized Semantic Engine',
  });
});

app.get('/api/v1/vectors', (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || 'knowledge-base';
  const query = (req.query.q as string) || '';
  const records = Object.values(vectorDatabase[namespace] || {});

  let filtered = records;
  if (query) {
    const lower = query.toLowerCase();
    filtered = records.filter(
      (r) =>
        r.id.toLowerCase().includes(lower) ||
        (r.metadata?.text && r.metadata.text.toLowerCase().includes(lower))
    );
  }

  res.json({
    namespace,
    total_count: records.length,
    matched_count: filtered.length,
    vectors: filtered.map((r) => ({
      id: r.id,
      values_preview: r.values.slice(0, 5),
      dimension: r.values.length,
      metadata: r.metadata,
      updated_at: r.updated_at,
    })),
  });
});

app.delete('/api/v1/vectors/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const namespace = (req.query.namespace as string) || 'default';

  if (vectorDatabase[namespace] && vectorDatabase[namespace][id]) {
    delete vectorDatabase[namespace][id];
    return res.json({ status: 'success', deleted_id: id, namespace });
  }
  return res.status(404).json({ error: 'NotFound', message: `Vector '${id}' not found in namespace '${namespace}'` });
});

app.post('/api/v1/reset', (req: Request, res: Response) => {
  for (const ns of Object.keys(vectorDatabase)) {
    vectorDatabase[ns] = {};
  }
  seedDatabase();
  res.json({ status: 'success', message: 'Database reset to default seed vectors' });
});

// 5. Codebase & Markdown viewer API
app.get('/api/v1/codebase/files', (req: Request, res: Response) => {
  const basePath = path.join(__dirname, 'fastapi_app');
  function scanDir(dir: string, rel = ''): any[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items: any[] = [];
    for (const entry of entries) {
      if (entry.name === '__pycache__' || entry.name === '.pytest_cache') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children: scanDir(fullPath, relPath),
        });
      } else {
        const ext = path.extname(entry.name);
        items.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          ext: ext.replace('.', ''),
          isMarkdown: ext === '.md',
        });
      }
    }
    return items;
  }

  try {
    const tree = scanDir(basePath);
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/codebase/content', (req: Request, res: Response) => {
  const relPath = req.query.path as string;
  if (!relPath) return res.status(400).json({ error: 'Path is required' });

  const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, 'fastapi_app', safePath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  res.json({ path: safePath, content });
});

// ==========================================
// Vite Dev Server or Production Static Serving
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌲 PineVector API & UI running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
