import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ApiStudioTab } from './components/ApiStudioTab';
import { SemanticSearchTab } from './components/SemanticSearchTab';
import { VectorExplorerTab } from './components/VectorExplorerTab';
import { FastApiExplorerTab } from './components/FastApiExplorerTab';
import { IndexStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'api-studio' | 'semantic-search' | 'vectors' | 'codebase'>('api-studio');
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/v1/reset', { method: 'POST' });
      if (res.ok) {
        await fetchStats();
        showNotification('Pinecone vector index reseeded successfully!');
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const availableNamespaces = stats?.namespaces
    ? Object.keys(stats.namespaces)
    : ['knowledge-base', 'faq-support', 'engineering-docs', 'default'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs shadow-2xl shadow-emerald-500/30 animate-bounce">
          {notification}
        </div>
      )}

      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'api-studio' && (
          <ApiStudioTab
            onRefreshData={fetchStats}
            availableNamespaces={availableNamespaces}
          />
        )}

        {activeTab === 'semantic-search' && (
          <SemanticSearchTab availableNamespaces={availableNamespaces} />
        )}

        {activeTab === 'vectors' && (
          <VectorExplorerTab
            availableNamespaces={availableNamespaces}
            onRefreshData={fetchStats}
          />
        )}

        {activeTab === 'codebase' && <FastApiExplorerTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            PineVector • Modular FastAPI & Pinecone REST API Service with 768d Vector Embeddings
          </span>
          <span className="font-mono text-slate-600">
            Isolated Pipelines: /upload • /upgrade • /retrieve
          </span>
        </div>
      </footer>
    </div>
  );
}
