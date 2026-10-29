import React from 'react';
import { Database, Sparkles, Layers, Terminal, Search, FolderTree, RefreshCw, Cpu } from 'lucide-react';
import { IndexStats } from '../types';

interface NavbarProps {
  activeTab: 'api-studio' | 'semantic-search' | 'vectors' | 'codebase';
  setActiveTab: (tab: 'api-studio' | 'semantic-search' | 'vectors' | 'codebase') => void;
  stats: IndexStats | null;
  onReset: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onReset,
  isResetting,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">PineVector</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  FastAPI + Pinecone
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Modular REST API for Upload, Upgrade & Semantic Retrieval
              </p>
            </div>
          </div>

          {/* Quick Metrics & Provider Status */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Total Vectors:</span>
              <span className="font-semibold text-emerald-300 font-mono">
                {stats?.total_vector_count ?? '...'}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Dim:</span>
              <span className="font-semibold text-cyan-300 font-mono">
                {stats?.dimension ?? 768}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-slate-200">
                {stats?.embedding_provider?.includes('Gemini') ? 'Gemini 768d' : 'Normalized 768d'}
              </span>
            </div>

            <button
              onClick={onReset}
              disabled={isResetting}
              title="Reset Vector DB to Default Seeds"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-900 pt-1 -mb-px overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('api-studio')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'api-studio'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            REST API Studio (Upload / Upgrade / Retrieve)
          </button>

          <button
            onClick={() => setActiveTab('semantic-search')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'semantic-search'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            Semantic Search & Scoring
          </button>

          <button
            onClick={() => setActiveTab('vectors')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'vectors'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Vector Index & 2D Projection
          </button>

          <button
            onClick={() => setActiveTab('codebase')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'codebase'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            FastAPI Code & Business Logic (.md)
          </button>
        </div>
      </div>
    </header>
  );
};
