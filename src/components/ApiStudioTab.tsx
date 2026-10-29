import React, { useState } from 'react';
import {
  Upload,
  ArrowUpCircle,
  Search,
  Play,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Code2,
  FileText,
  Sliders,
  ChevronRight,
  Database,
  Sparkles,
  Info
} from 'lucide-react';
import { UploadResponse, UpgradeResponse, RetrieveResponse } from '../types';

interface ApiStudioTabProps {
  onRefreshData: () => void;
  availableNamespaces: string[];
}

export const ApiStudioTab: React.FC<ApiStudioTabProps> = ({
  onRefreshData,
  availableNamespaces,
}) => {
  const [pipelineMode, setPipelineMode] = useState<'upload' | 'upgrade' | 'retrieve'>('upload');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'python' | 'ts'>('curl');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // Upload State
  // ==========================================
  const [uploadNs, setUploadNs] = useState('knowledge-base');
  const [uploadDocText, setUploadDocText] = useState(
    'Dense vector indexes like Pinecone use Hierarchical Navigable Small World (HNSW) graphs to compute approximate nearest neighbor queries in milliseconds.'
  );
  const [uploadDocCategory, setUploadDocCategory] = useState('engineering');
  const [uploadDocAuthor, setUploadDocAuthor] = useState('Systems Architect');
  const [uploadAutoChunk, setUploadAutoChunk] = useState(true);
  const [uploadChunkSize, setUploadChunkSize] = useState(400);
  const [uploadChunkOverlap, setUploadChunkOverlap] = useState(60);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);

  // ==========================================
  // Upgrade State
  // ==========================================
  const [upgradeNs, setUpgradeNs] = useState('knowledge-base');
  const [upgradeVectorId, setUpgradeVectorId] = useState('doc_pinecone_ann_01');
  const [upgradeNewText, setUpgradeNewText] = useState(
    'Pinecone serverless indexes decouple compute and storage, delivering instantaneous scaling with zero cold-starts.'
  );
  const [upgradeMetadataPatch, setUpgradeMetadataPatch] = useState(
    JSON.stringify({ version: '3.0', status: 'reviewed', priority: 'high' }, null, 2)
  );
  const [upgradeMerge, setUpgradeMerge] = useState(true);
  const [upgradeResponse, setUpgradeResponse] = useState<UpgradeResponse | null>(null);

  // ==========================================
  // Retrieve State
  // ==========================================
  const [retrieveNs, setRetrieveNs] = useState('knowledge-base');
  const [retrieveQuery, setRetrieveQuery] = useState('How do dense vectors and HNSW graphs work for ANN search?');
  const [retrieveTopK, setRetrieveTopK] = useState(3);
  const [retrieveMetric, setRetrieveMetric] = useState('cosine');
  const [retrieveMinScore, setRetrieveMinScore] = useState(0.5);
  const [retrieveFilterKey, setRetrieveFilterKey] = useState('');
  const [retrieveFilterVal, setRetrieveFilterVal] = useState('');
  const [retrieveResponse, setRetrieveResponse] = useState<RetrieveResponse | null>(null);

  // Handle Copy Snippet
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Presets for Upload
  const applyUploadPreset = (preset: 'ai' | 'support' | 'ecommerce') => {
    if (preset === 'ai') {
      setUploadNs('knowledge-base');
      setUploadDocText(
        'Vector embeddings map semantic meaning into geometric proximity. In contrast to lexical TF-IDF or BM25 keywords, cosine similarity in vector space captures synonyms, analogies, and conceptual alignment.'
      );
      setUploadDocCategory('ai-theory');
      setUploadDocAuthor('Dr. Chen');
    } else if (preset === 'support') {
      setUploadNs('faq-support');
      setUploadDocText(
        'Q: How do I handle rate limits when upserting to Pinecone? A: Batch records up to 100 items per request and implement truncated exponential backoff with jitter on HTTP 429 status codes.'
      );
      setUploadDocCategory('troubleshooting');
      setUploadDocAuthor('Support Team');
    } else {
      setUploadNs('engineering-docs');
      setUploadDocText(
        'Product: Enterprise Vector Gateway v2. Features: Fast streaming semantic retrieval, automated metadata validation via Pydantic V2, and multi-cloud Pinecone replication.'
      );
      setUploadDocCategory('product-specs');
      setUploadDocAuthor('Product Lead');
    }
  };

  // ==========================================
  // API Execution Handlers
  // ==========================================
  const executeUpload = async () => {
    setIsLoading(true);
    try {
      const payload = {
        documents: [
          {
            id: `doc_${Date.now().toString(36)}`,
            text: uploadDocText,
            metadata: {
              category: uploadDocCategory,
              author: uploadDocAuthor,
            },
          },
        ],
        namespace: uploadNs,
        auto_chunk: uploadAutoChunk,
        chunk_size: uploadChunkSize,
        chunk_overlap: uploadChunkOverlap,
        store_text_in_metadata: true,
      };

      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setUploadResponse(data);
      onRefreshData();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeUpgrade = async () => {
    setIsLoading(true);
    try {
      let parsedPatch = {};
      try {
        parsedPatch = JSON.parse(upgradeMetadataPatch);
      } catch (e) {
        alert('Metadata patch must be valid JSON');
        setIsLoading(false);
        return;
      }

      const payload = {
        items: [
          {
            id: upgradeVectorId,
            new_text: upgradeNewText.trim() ? upgradeNewText : undefined,
            metadata_patch: parsedPatch,
            merge_metadata: upgradeMerge,
            namespace: upgradeNs,
          },
        ],
      };

      const res = await fetch('/api/v1/upgrade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setUpgradeResponse(data);
      onRefreshData();
    } catch (err: any) {
      alert(`Upgrade failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeRetrieve = async () => {
    setIsLoading(true);
    try {
      let filterObj: any = null;
      if (retrieveFilterKey.trim() && retrieveFilterVal.trim()) {
        filterObj = { [retrieveFilterKey.trim()]: { $eq: retrieveFilterVal.trim() } };
      }

      const payload = {
        query_text: retrieveQuery,
        namespace: retrieveNs,
        top_k: retrieveTopK,
        metric: retrieveMetric,
        min_score: retrieveMinScore,
        filter: filterObj,
        include_metadata: true,
        include_values: false,
      };

      const res = await fetch('/api/v1/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRetrieveResponse(data);
    } catch (err: any) {
      alert(`Retrieve failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Dynamic Code Generators
  // ==========================================
  const getCurlSnippet = () => {
    if (pipelineMode === 'upload') {
      return `curl -X POST "http://localhost:8000/api/v1/upload" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documents": [
      {
        "id": "doc_manual_01",
        "text": "${uploadDocText.replace(/"/g, '\\"')}",
        "metadata": { "category": "${uploadDocCategory}", "author": "${uploadDocAuthor}" }
      }
    ],
    "namespace": "${uploadNs}",
    "auto_chunk": ${uploadAutoChunk},
    "chunk_size": ${uploadChunkSize},
    "chunk_overlap": ${uploadChunkOverlap}
  }'`;
    } else if (pipelineMode === 'upgrade') {
      return `curl -X PUT "http://localhost:8000/api/v1/upgrade" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "id": "${upgradeVectorId}",
        "new_text": "${upgradeNewText.replace(/"/g, '\\"')}",
        "metadata_patch": ${upgradeMetadataPatch.replace(/\n/g, ' ')},
        "namespace": "${upgradeNs}",
        "merge_metadata": ${upgradeMerge}
      }
    ]
  }'`;
    } else {
      const filterClause = retrieveFilterKey ? `, "filter": { "${retrieveFilterKey}": { "$eq": "${retrieveFilterVal}" } }` : '';
      return `curl -X POST "http://localhost:8000/api/v1/retrieve" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query_text": "${retrieveQuery.replace(/"/g, '\\"')}",
    "namespace": "${retrieveNs}",
    "top_k": ${retrieveTopK},
    "min_score": ${retrieveMinScore}${filterClause}
  }'`;
    }
  };

  const getPythonSnippet = () => {
    if (pipelineMode === 'upload') {
      return `import httpx

payload = {
    "documents": [
        {
            "id": "doc_manual_01",
            "text": """${uploadDocText}""",
            "metadata": {"category": "${uploadDocCategory}", "author": "${uploadDocAuthor}"}
        }
    ],
    "namespace": "${uploadNs}",
    "auto_chunk": ${uploadAutoChunk ? 'True' : 'False'},
    "chunk_size": ${uploadChunkSize},
    "chunk_overlap": ${uploadChunkOverlap}
}

response = httpx.post("http://localhost:8000/api/v1/upload", json=payload)
print(response.status_code, response.json())`;
    } else if (pipelineMode === 'upgrade') {
      return `import httpx

payload = {
    "items": [
        {
            "id": "${upgradeVectorId}",
            "new_text": """${upgradeNewText}""",
            "metadata_patch": ${upgradeMetadataPatch},
            "namespace": "${upgradeNs}",
            "merge_metadata": ${upgradeMerge ? 'True' : 'False'}
        }
    ]
}

response = httpx.put("http://localhost:8000/api/v1/upgrade", json=payload)
print(response.status_code, response.json())`;
    } else {
      return `import httpx

payload = {
    "query_text": "${retrieveQuery}",
    "namespace": "${retrieveNs}",
    "top_k": ${retrieveTopK},
    "min_score": ${retrieveMinScore}
}

response = httpx.post("http://localhost:8000/api/v1/retrieve", json=payload)
data = response.json()
for match in data.get("matches", []):
    print(f"[{match['score']:.4f}] {match['id']}: {match.get('text', '')[:80]}...")`;
    }
  };

  const getTypescriptSnippet = () => {
    if (pipelineMode === 'upload') {
      return `const res = await fetch('/api/v1/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documents: [{ text: "${uploadDocText.slice(0, 40)}...", metadata: { category: "${uploadDocCategory}" } }],
    namespace: "${uploadNs}",
    auto_chunk: ${uploadAutoChunk}
  })
});
const result = await res.json();`;
    } else if (pipelineMode === 'upgrade') {
      return `const res = await fetch('/api/v1/upgrade', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{ id: "${upgradeVectorId}", new_text: "${upgradeNewText.slice(0, 30)}...", namespace: "${upgradeNs}" }]
  })
});
const result = await res.json();`;
    } else {
      return `const res = await fetch('/api/v1/retrieve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query_text: "${retrieveQuery}",
    namespace: "${retrieveNs}",
    top_k: ${retrieveTopK}
  })
});
const result = await res.json();`;
    }
  };

  const activeSnippet =
    codeLanguage === 'curl'
      ? getCurlSnippet()
      : codeLanguage === 'python'
      ? getPythonSnippet()
      : getTypescriptSnippet();

  return (
    <div className="space-y-6">
      {/* Pipeline Navigation Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Upload API Card */}
        <button
          onClick={() => setPipelineMode('upload')}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            pipelineMode === 'upload'
              ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div
            className={`p-2.5 rounded-lg ${
              pipelineMode === 'upload' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 text-sm">Upload Pipeline</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                POST /upload
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Document ingestion, semantic sentence chunking, dense embeddings & Pinecone upsert.
            </p>
          </div>
          {pipelineMode === 'upload' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>

        {/* Upgrade API Card */}
        <button
          onClick={() => setPipelineMode('upgrade')}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            pipelineMode === 'upgrade'
              ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/20'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div
            className={`p-2.5 rounded-lg ${
              pipelineMode === 'upgrade' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 text-sm">Upgrade Pipeline</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                PUT /upgrade
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Metadata patching, vector replacement & automated text re-embedding.
            </p>
          </div>
          {pipelineMode === 'upgrade' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
          )}
        </button>

        {/* Retrieve API Card */}
        <button
          onClick={() => setPipelineMode('retrieve')}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            pipelineMode === 'retrieve'
              ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div
            className={`p-2.5 rounded-lg ${
              pipelineMode === 'retrieve' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 text-sm">Retrieve Pipeline</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                POST /retrieve
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Natural language vector search, cosine nearest-neighbor & metadata filtering.
            </p>
          </div>
          {pipelineMode === 'retrieve' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Main Split Console: Left Form / Right Response & Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Parameter Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            {/* Header with endpoint badge & Preset buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  {pipelineMode === 'upload' && 'POST /api/v1/upload'}
                  {pipelineMode === 'upgrade' && 'PUT /api/v1/upgrade'}
                  {pipelineMode === 'retrieve' && 'POST /api/v1/retrieve'}
                </span>
                <span className="text-xs text-slate-400">Isolated Pipeline</span>
              </div>

              {pipelineMode === 'upload' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 text-[11px]">Sample Presets:</span>
                  <button
                    onClick={() => applyUploadPreset('ai')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                  >
                    AI Theory
                  </button>
                  <button
                    onClick={() => applyUploadPreset('support')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                  >
                    FAQ
                  </button>
                  <button
                    onClick={() => applyUploadPreset('ecommerce')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                  >
                    Tech Spec
                  </button>
                </div>
              )}
            </div>

            {/* FORM BODY: 1. UPLOAD */}
            {pipelineMode === 'upload' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Target Namespace
                    </label>
                    <select
                      value={uploadNs}
                      onChange={(e) => setUploadNs(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {availableNamespaces.map((ns) => (
                        <option key={ns} value={ns}>
                          {ns}
                        </option>
                      ))}
                      <option value="custom-ingest">custom-ingest (new)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Document Category Tag
                    </label>
                    <input
                      type="text"
                      value={uploadDocCategory}
                      onChange={(e) => setUploadDocCategory(e.target.value)}
                      placeholder="e.g. engineering, faq, finance"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Document Raw Text Content
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {uploadDocText.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={uploadDocText}
                    onChange={(e) => setUploadDocText(e.target.value)}
                    placeholder="Enter document text to chunk, embed and store in Pinecone..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Chunking Settings */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Semantic Chunking Engine
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={uploadAutoChunk}
                        onChange={(e) => setUploadAutoChunk(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
                      />
                      Auto-Chunk Text
                    </label>
                  </div>

                  {uploadAutoChunk && (
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Chunk Size:</span>
                          <span className="font-mono text-emerald-400">{uploadChunkSize} chars</span>
                        </div>
                        <input
                          type="range"
                          min={150}
                          max={1500}
                          step={50}
                          value={uploadChunkSize}
                          onChange={(e) => setUploadChunkSize(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Chunk Overlap:</span>
                          <span className="font-mono text-emerald-400">{uploadChunkOverlap} chars</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={10}
                          value={uploadChunkOverlap}
                          onChange={(e) => setUploadChunkOverlap(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={executeUpload}
                  disabled={isLoading || !uploadDocText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Processing Ingestion Pipeline...' : 'Execute Upload Pipeline (POST)'}
                </button>
              </div>
            )}

            {/* FORM BODY: 2. UPGRADE */}
            {pipelineMode === 'upgrade' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Target Vector ID to Upgrade
                    </label>
                    <input
                      type="text"
                      value={upgradeVectorId}
                      onChange={(e) => setUpgradeVectorId(e.target.value)}
                      placeholder="e.g. doc_pinecone_ann_01"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Namespace
                    </label>
                    <select
                      value={upgradeNs}
                      onChange={(e) => setUpgradeNs(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {availableNamespaces.map((ns) => (
                        <option key={ns} value={ns}>
                          {ns}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Revised Text Content (Triggers Automated Re-Embedding)
                    </label>
                    <span className="text-[11px] text-slate-500">Optional</span>
                  </div>
                  <textarea
                    rows={3}
                    value={upgradeNewText}
                    onChange={(e) => setUpgradeNewText(e.target.value)}
                    placeholder="Enter revised text to automatically generate fresh 768-dim embeddings..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Metadata Patch (JSON)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={upgradeMerge}
                        onChange={(e) => setUpgradeMerge(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900"
                      />
                      Merge with Existing Metadata
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={upgradeMetadataPatch}
                    onChange={(e) => setUpgradeMetadataPatch(e.target.value)}
                    placeholder='{"status": "reviewed", "version": "2.0"}'
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                  />
                </div>

                <button
                  onClick={executeUpgrade}
                  disabled={isLoading || !upgradeVectorId.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Updating Vector...' : 'Execute Upgrade Pipeline (PUT)'}
                </button>
              </div>
            )}

            {/* FORM BODY: 3. RETRIEVE */}
            {pipelineMode === 'retrieve' && (
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    Natural Language Search Query
                  </label>
                  <input
                    type="text"
                    value={retrieveQuery}
                    onChange={(e) => setRetrieveQuery(e.target.value)}
                    placeholder="Enter semantic query e.g. How does approximate nearest neighbor search work?"
                    className="w-full px-3 py-2.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Namespace Scoping
                    </label>
                    <select
                      value={retrieveNs}
                      onChange={(e) => setRetrieveNs(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {availableNamespaces.map((ns) => (
                        <option key={ns} value={ns}>
                          {ns}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Distance Metric
                    </label>
                    <select
                      value={retrieveMetric}
                      onChange={(e) => setRetrieveMetric(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="cosine">Cosine Similarity</option>
                      <option value="dotproduct">Dot Product</option>
                      <option value="euclidean">Euclidean Distance</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                      <span>Top-K Results</span>
                      <span className="font-mono text-indigo-400">{retrieveTopK}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={retrieveTopK}
                      onChange={(e) => setRetrieveTopK(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer mt-1"
                    />
                  </div>
                </div>

                {/* Advanced Metadata Pre-Filtering */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Metadata Pre-Filter ($eq condition)
                    </span>
                    <span className="text-[11px] text-slate-500">Optional</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Key (e.g. category)"
                      value={retrieveFilterKey}
                      onChange={(e) => setRetrieveFilterKey(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. engineering)"
                      value={retrieveFilterVal}
                      onChange={(e) => setRetrieveFilterVal(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={executeRetrieve}
                  disabled={isLoading || !retrieveQuery.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Search className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Vectorizing & Searching...' : 'Execute Retrieve Pipeline (POST)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Live Response & Dynamic Code Snippet */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Response Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Execution Response</span>
              </div>
              <div className="flex items-center gap-2">
                {((pipelineMode === 'upload' && uploadResponse) ||
                  (pipelineMode === 'upgrade' && upgradeResponse) ||
                  (pipelineMode === 'retrieve' && retrieveResponse)) && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Clock className="w-3 h-3" />
                    {pipelineMode === 'upload' && `${uploadResponse?.execution_time_ms}ms`}
                    {pipelineMode === 'upgrade' && `${upgradeResponse?.execution_time_ms}ms`}
                    {pipelineMode === 'retrieve' && `${retrieveResponse?.execution_time_ms}ms`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300">
              {pipelineMode === 'upload' && (
                uploadResponse ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(uploadResponse, null, 2)}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <Upload className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                    <span>Upload pipeline is ready. Click execute to ingest text and generate Pinecone vectors.</span>
                  </div>
                )
              )}

              {pipelineMode === 'upgrade' && (
                upgradeResponse ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(upgradeResponse, null, 2)}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <ArrowUpCircle className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                    <span>Upgrade pipeline is ready. Click execute to patch metadata or re-embed vector.</span>
                  </div>
                )
              )}

              {pipelineMode === 'retrieve' && (
                retrieveResponse ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(retrieveResponse, null, 2)}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <Search className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                    <span>Retrieve pipeline is ready. Enter a query and execute semantic search.</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Dynamic Code Generator Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Integration Client Snippet</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(['curl', 'python', 'ts'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition ${
                      codeLanguage === lang
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => handleCopy(activeSnippet)}
                  title="Copy code snippet"
                  className="p-1 rounded text-slate-400 hover:text-white transition ml-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-[160px] scrollbar-thin">
              <pre className="whitespace-pre">{activeSnippet}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
