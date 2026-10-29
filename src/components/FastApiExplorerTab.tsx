import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Copy,
  Check,
  Download,
  FolderTree,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { FileTreeNode } from '../types';

export const FastApiExplorerTab: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('app/api/v1/endpoints/upload.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    app: true,
    'app/core': true,
    'app/models': true,
    'app/services': true,
    'app/api': true,
    'app/api/v1': true,
    'app/api/v1/endpoints': true,
  });

  const fetchTree = async () => {
    try {
      const res = await fetch('/api/v1/codebase/files');
      const data = await res.json();
      setFileTree(data.tree || []);
    } catch (err) {
      console.error('Fetch tree error:', err);
    }
  };

  const fetchContent = async (filePath: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/codebase/content?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || '');
      setSelectedPath(filePath);
    } catch (err) {
      console.error('Fetch content error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    fetchContent('app/api/v1/endpoints/upload.md');
  }, []);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedPath.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render Directory Tree Recursively
  const renderTree = (nodes: FileTreeNode[]) => {
    return (
      <div className="space-y-0.5">
        {nodes.map((node) => {
          if (node.type === 'directory') {
            const isExpanded = !!expandedDirs[node.path];
            return (
              <div key={node.path} className="text-xs">
                <button
                  onClick={() => toggleDir(node.path)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition text-left cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono font-medium">{node.name}/</span>
                </button>
                {isExpanded && node.children && (
                  <div className="pl-4 border-l border-slate-800/80 ml-2 mt-0.5">
                    {renderTree(node.children)}
                  </div>
                )}
              </div>
            );
          }

          const isSelected = selectedPath === node.path;
          const isMd = node.isMarkdown || node.name.endsWith('.md');

          return (
            <button
              key={node.path}
              onClick={() => fetchContent(node.path)}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs transition text-left cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                  : 'hover:bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isMd ? (
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <span className="font-mono truncate">{node.name}</span>
              </div>
              {isMd && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono font-bold shrink-0">
                  Business Logic
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const isMarkdownFile = selectedPath.endsWith('.md');

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            FastAPI Clean Modular Architecture & Business Logic (.md)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated routers for Upload, Upgrade & Retrieve. Each package folder contains an accompanying .md specification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Content'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download File
          </button>
        </div>
      </div>

      {/* Split Explorer Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left File Tree Sidebar */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-y-auto max-h-[750px]">
          <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Project Structure
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">fastapi_app/</span>
          </div>

          {fileTree.length > 0 ? (
            renderTree(fileTree)
          ) : (
            <div className="text-xs text-slate-500 p-4 text-center">Loading project tree...</div>
          )}
        </div>

        {/* Right Code & Markdown Viewer */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* File Tab Header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              {isMarkdownFile ? (
                <FileText className="w-4 h-4 text-amber-400" />
              ) : (
                <FileCode className="w-4 h-4 text-cyan-400" />
              )}
              <span className="text-slate-200 font-semibold">{selectedPath}</span>
            </div>

            {isMarkdownFile && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <BookOpen className="w-3 h-3" />
                Package Business Logic
              </span>
            )}
          </div>

          {/* Content Body */}
          <div className="p-6 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed max-h-[700px] scrollbar-thin">
            {isLoading ? (
              <div className="text-slate-500 text-center py-12">Loading file contents...</div>
            ) : isMarkdownFile ? (
              <div className="font-sans space-y-4 max-w-3xl text-slate-300">
                {fileContent.split('\n\n').map((block, idx) => {
                  if (block.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="text-xl font-bold text-white border-b border-slate-800 pb-2 pt-2">
                        {block.replace('# ', '')}
                      </h1>
                    );
                  }
                  if (block.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-base font-semibold text-emerald-400 pt-3">
                        {block.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (block.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-sm font-semibold text-cyan-300 pt-1">
                        {block.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (block.startsWith('```')) {
                    const lines = block.split('\n');
                    const code = lines.slice(1, -1).join('\n');
                    return (
                      <pre key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                        {code}
                      </pre>
                    );
                  }
                  return (
                    <p key={idx} className="leading-relaxed text-xs text-slate-300">
                      {block}
                    </p>
                  );
                })}
              </div>
            ) : (
              <pre className="whitespace-pre text-slate-300 font-mono text-xs">
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
