import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Clock,
  Tag,
  Hash,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { RetrieveResponse, ScoredMatch } from '../types';

interface SemanticSearchTabProps {
  availableNamespaces: string[];
}

export const SemanticSearchTab: React.FC<SemanticSearchTabProps> = ({ availableNamespaces }) => {
  const [query, setQuery] = useState('How does vector embedding enable semantic search?');
  const [namespace, setNamespace] = useState('knowledge-base');
  const [metric, setMetric] = useState('cosine');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.4);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RetrieveResponse | null>(null);
  const [expandedVectorId, setExpandedVectorId] = useState<string | null>(null);

  const sampleQueries = [
    'How do dense vectors and HNSW graphs work for ANN search?',
    'What is the recommended chunk size for semantic search?',
    'How does Pinecone handle metadata pre-filtering?',
    'What are Gemini embedding model dimensions?',
    'Explain hybrid search combining dense vectors with BM25',
  ];

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_text: searchQuery,
          namespace,
          top_k: topK,
          metric,
          min_score: minScore,
          include_metadata: true,
          include_values: true,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error('Semantic search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on first load
  useEffect(() => {
    handleSearch(query);
  }, [namespace, metric]);

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 0.70) return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    if (score >= 0.55) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner & Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Semantic Search & Nearest Neighbor Scoring
            </h2>
            <p className="text-xs text-slate-400">
              Converts queries into real-time 768-dim embeddings and evaluates cosine distance against Pinecone vectors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Namespace:</span>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {availableNamespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Type your natural language semantic search query..."
            className="w-full pl-12 pr-28 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
          />
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Quick query chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-500">Try Queries:</span>
          {sampleQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Parameter Sliders Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Similarity Metric:</span>
              <span className="font-mono text-emerald-400 capitalize">{metric}</span>
            </div>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="cosine">Cosine Similarity</option>
              <option value="dotproduct">Dot Product</option>
              <option value="euclidean">Euclidean Distance</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Top-K Limit:</span>
              <span className="font-mono text-emerald-400">{topK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Min Score Gate:</span>
              <span className="font-mono text-emerald-400">{(minScore * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.05}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Semantic Matches</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
            {results?.total_matches ?? 0} matches
          </span>
        </div>

        {results && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Latency:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {results.execution_time_ms}ms
            </span>
          </div>
        )}
      </div>

      {/* Results List */}
      {results && results.matches.length > 0 ? (
        <div className="space-y-3">
          {results.matches.map((match, index) => {
            const isExpanded = expandedVectorId === match.id;
            const scorePercent = (match.score * 100).toFixed(1);

            return (
              <div
                key={match.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3"
              >
                {/* Header row: ID, score pill, namespace */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-xs text-slate-200 font-semibold">
                      {match.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {match.namespace}
                    </span>
                  </div>

                  {/* Similarity Score Pill */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${getScoreColor(
                      match.score
                    )}`}
                  >
                    <span>{scorePercent}%</span>
                    <span className="text-[10px] font-normal opacity-70">
                      ({match.score.toFixed(4)})
                    </span>
                  </div>
                </div>

                {/* Text Passage Highlight */}
                {match.text && (
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 font-sans">
                    {match.text}
                  </p>
                )}

                {/* Metadata Tags */}
                {match.metadata && Object.keys(match.metadata).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {Object.entries(match.metadata)
                      .filter(([key]) => key !== 'text' && key !== 'summary')
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] border border-slate-700 font-mono"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-slate-400">{key}:</span>
                          <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </span>
                      ))}
                  </div>
                )}

                {/* Expandable High-Dimensional Vector Inspection */}
                <div className="pt-2 border-t border-slate-850">
                  <button
                    onClick={() => setExpandedVectorId(isExpanded ? null : match.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isExpanded ? 'Hide Dense Vector Values' : 'Inspect 768-dim Vector Float Coordinates'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && match.values && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] space-y-2">
                      <div className="flex justify-between text-slate-400 pb-1 border-b border-slate-850">
                        <span>Dense Embedding Vector (Dimension: {match.values.length})</span>
                        <span className="text-cyan-400">Normalized L2</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-slate-300 leading-relaxed scrollbar-thin">
                        [{match.values.map((v) => v.toFixed(5)).join(', ')}]
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-500" />
          <p className="text-sm font-medium text-slate-300">No matching vectors found</p>
          <p className="text-xs text-slate-500">
            Try lowering the Min Score Gate slider or checking a different namespace.
          </p>
        </div>
      )}
    </div>
  );
};
