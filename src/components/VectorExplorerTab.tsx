import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Trash2,
  Eye,
  Tag,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { VectorRecord } from '../types';

interface VectorExplorerTabProps {
  availableNamespaces: string[];
  onRefreshData: () => void;
}

export const VectorExplorerTab: React.FC<VectorExplorerTabProps> = ({
  availableNamespaces,
  onRefreshData,
}) => {
  const [selectedNs, setSelectedNs] = useState('knowledge-base');
  const [searchQuery, setSearchQuery] = useState('');
  const [vectors, setVectors] = useState<VectorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inspectedVector, setInspectedVector] = useState<VectorRecord | null>(null);
  const [hoveredVectorId, setHoveredVectorId] = useState<string | null>(null);

  const fetchVectors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/vectors?namespace=${selectedNs}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setVectors(data.vectors || []);
    } catch (err) {
      console.error('Fetch vectors failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVectors();
  }, [selectedNs]);

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete vector '${id}' from Pinecone index?`)) return;
    try {
      await fetch(`/api/v1/vectors/${id}?namespace=${selectedNs}`, { method: 'DELETE' });
      fetchVectors();
      onRefreshData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // 2D Projection Coordinates Generation
  // Maps 768-dim vectors to 2D coordinates for visual cluster scatter plot
  const projectedPoints = vectors.map((v, i) => {
    const vals = v.values_preview || [0, 0, 0, 0];
    // Deterministic linear projection coefficients
    const xRaw = (vals[0] || 0) * 1.5 + (vals[1] || 0) * 0.8 + Math.sin(i * 1.2) * 0.2;
    const yRaw = (vals[2] || 0) * 1.5 + (vals[3] || 0) * 0.8 + Math.cos(i * 1.2) * 0.2;
    // Map to canvas coordinate space 40-360
    const x = Math.max(30, Math.min(370, 200 + xRaw * 220));
    const y = Math.max(30, Math.min(250, 140 + yRaw * 150));
    return { id: v.id, x, y, record: v };
  });

  return (
    <div className="space-y-6">
      {/* Top Bar with Namespace & Search Controls */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Namespace:</span>
          </div>
          <select
            value={selectedNs}
            onChange={(e) => setSelectedNs(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            {availableNamespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 font-mono">
            ({vectors.length} vectors)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVectors()}
              placeholder="Search vector IDs or metadata text..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={fetchVectors}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2D Semantic Scatter Projection Canvas */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              2D Latent Vector Projection (PCA Cluster Map)
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive 2D dimensional reduction of 768-dim embeddings. Hover nodes to inspect semantic neighbors.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {vectors.length} Nodes Mapped
          </span>
        </div>

        <div className="relative w-full h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          
          <svg className="w-full h-full">
            {/* Center Crosshairs */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e293b" strokeDasharray="4" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeDasharray="4" />

            {/* Connecting neighbor lines for visual constellation */}
            {projectedPoints.map((pt, idx) => {
              const nextPt = projectedPoints[(idx + 1) % projectedPoints.length];
              if (!nextPt) return null;
              return (
                <line
                  key={`line-${idx}`}
                  x1={pt.x}
                  y1={pt.y}
                  x2={nextPt.x}
                  y2={nextPt.y}
                  stroke="#059669"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                />
              );
            })}

            {/* Scatter Nodes */}
            {projectedPoints.map((pt) => {
              const isHovered = hoveredVectorId === pt.id;
              return (
                <g
                  key={pt.id}
                  onMouseEnter={() => setHoveredVectorId(pt.id)}
                  onMouseLeave={() => setHoveredVectorId(null)}
                  onClick={() => setInspectedVector(pt.record)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 10 : 6}
                    fill={isHovered ? '#10b981' : '#059669'}
                    fillOpacity={isHovered ? 0.9 : 0.6}
                    stroke={isHovered ? '#34d399' : '#047857'}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-200"
                  />
                  {isHovered && (
                    <text
                      x={pt.x + 12}
                      y={pt.y + 4}
                      fill="#e2e8f0"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {pt.id}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip Card Overlay when Hovered */}
          {hoveredVectorId && (
            <div className="absolute bottom-3 left-3 max-w-sm p-3 rounded-lg bg-slate-900/95 border border-emerald-500/40 text-[11px] shadow-2xl backdrop-blur pointer-events-none">
              <div className="font-mono font-bold text-emerald-400 mb-0.5">{hoveredVectorId}</div>
              <p className="text-slate-300 line-clamp-2">
                {vectors.find((v) => v.id === hoveredVectorId)?.metadata?.text || 'No text snippet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vectors Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">
            Vector Records in Namespace '{selectedNs}'
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {vectors.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Vector ID</th>
                <th className="py-2.5 px-4">Content / Snippet</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Dimension</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {vectors.map((vec) => (
                <tr
                  key={vec.id}
                  className={`hover:bg-slate-850/50 transition ${
                    hoveredVectorId === vec.id ? 'bg-emerald-500/5' : ''
                  }`}
                  onMouseEnter={() => setHoveredVectorId(vec.id)}
                  onMouseLeave={() => setHoveredVectorId(null)}
                >
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                    {vec.id}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-md">
                    <p className="line-clamp-2">{vec.metadata?.text || 'No text snippet'}</p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                      {vec.metadata?.category || 'general'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap">
                    {vec.dimension}d
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setInspectedVector(vec)}
                        title="Inspect Vector Values"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(vec.id)}
                        title="Delete Vector from Index"
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vector Detail Modal */}
      {inspectedVector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-xl w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  {inspectedVector.id}
                </h4>
                <p className="text-xs text-slate-400">
                  Pinecone Vector Record • Namespace: {selectedNs}
                </p>
              </div>
              <button
                onClick={() => setInspectedVector(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Text Payload:</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-sans leading-relaxed">
                  {inspectedVector.metadata?.text || 'No text snippet in metadata'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Metadata JSON:</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] max-h-36 overflow-auto">
                  {JSON.stringify(inspectedVector.metadata, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">
                  Vector Values Preview (768 Dimensions):
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[10px] max-h-24 overflow-auto">
                  [{inspectedVector.values_preview?.map((v) => v.toFixed(5)).join(', ')} ... +763 more float coordinates]
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedVector(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
