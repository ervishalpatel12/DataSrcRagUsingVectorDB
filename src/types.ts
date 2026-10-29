export interface VectorRecord {
  id: string;
  values_preview?: number[];
  values?: number[];
  dimension: number;
  metadata: {
    text?: string;
    doc_id?: string;
    chunk_index?: number;
    total_chunks?: number;
    category?: string;
    source?: string;
    tags?: string[];
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
  };
  namespace?: string;
  updated_at?: number;
}

export interface IndexStats {
  index_name: string;
  dimension: number;
  metric: string;
  total_vector_count: number;
  namespaces: Record<string, { vector_count: number }>;
  index_fullness: number;
  embedding_provider: string;
}

export interface ScoredMatch {
  id: string;
  score: number;
  text?: string;
  metadata: Record<string, any>;
  values?: number[];
  namespace: string;
}

export interface RetrieveResponse {
  status: string;
  query: string;
  namespace: string;
  total_matches: number;
  metric: string;
  matches: ScoredMatch[];
  execution_time_ms: number;
}

export interface UploadResponse {
  status: string;
  message: string;
  total_documents: number;
  total_chunks_indexed: number;
  vector_ids: string[];
  namespace: string;
  dimension: number;
  execution_time_ms: number;
}

export interface UpgradeResponse {
  status: string;
  message: string;
  updated_count: number;
  vector_ids: string[];
  namespace: string;
  re_embedded_count: number;
  execution_time_ms: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  ext?: string;
  isMarkdown?: boolean;
  children?: FileTreeNode[];
}
