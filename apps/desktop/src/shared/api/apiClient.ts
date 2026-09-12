export interface IngestFilePayload {
  workspace_id: string;
  file_path: string;
  sheet_name?: string;
  delimiter?: string;
}

export interface ColumnSchema {
  name: string;
  data_type: string;
  nullable: boolean;
  sample_values: any[];
  semantic_type?: string;
  custom_alias?: string;
  distinct_count?: number;
}

export interface IngestDatasetResult {
  dataset_id: string;
  workspace_id: string;
  file_name: string;
  file_path: string;
  file_format: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  fingerprint: string;
  columns: ColumnSchema[];
}

export interface FilterCondition {
  column: string;
  operator: string;
  value?: any;
}

export interface Aggregation {
  column: string;
  agg_func: string;
  alias?: string;
}

export interface SortRule {
  column: string;
  descending?: boolean;
}

export interface QueryDTO {
  dataset_id: string;
  search_term?: string;
  select_columns?: string[];
  filters?: FilterCondition[];
  group_by?: string[];
  aggregations?: Aggregation[];
  sort?: SortRule[];
  limit?: number;
  offset?: number;
  explode_dimension?: boolean;
}

export interface QueryResult {
  dataset_id: string;
  execution_time_ms: number;
  total_matching_rows: number;
  columns: string[];
  column_types: string[];
  data: Record<string, any>[];
}

class ApiClient {
  async getHealth() {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  async getSystemConfig() {
    const res = await fetch('/api/v1/system/config');
    if (!res.ok) throw new Error('Failed to fetch system config');
    return res.json();
  }

  async ingestFile(payload: IngestFilePayload): Promise<IngestDatasetResult> {
    const res = await fetch('/api/v1/ingest/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.error?.message || 'Ingestion failed');
    }
    return res.json();
  }

  async uploadFile(
    file: File,
    workspaceId: string,
    sheetName?: string,
    delimiter?: string
  ): Promise<IngestDatasetResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    if (sheetName) formData.append('sheet_name', sheetName);
    if (delimiter) formData.append('delimiter', delimiter);

    const res = await fetch('/api/v1/ingest/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.error?.message || 'Upload ingestion failed');
    }
    return res.json();
  }

  async query(payload: QueryDTO): Promise<QueryResult> {
    const res = await fetch('/api/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.error?.message || 'Query execution failed');
    }
    return res.json();
  }

  async createWorkspace(name: string, description?: string) {
    const res = await fetch('/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    return res.json();
  }

  async deleteDataset(datasetId: string): Promise<boolean> {
    const res = await fetch(`/api/v1/ingest/${datasetId}`, {
      method: 'DELETE',
    });
    return res.ok;
  }

  async getDatasetStats(datasetId: string) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/stats`);
    if (!res.ok) throw new Error('Failed to fetch dataset statistics');
    return res.json();
  }

  async updateColumnMetadata(
    datasetId: string,
    columns: Array<{ original_name: string; custom_alias: string; data_type?: string }>
  ) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns }),
    });
    if (!res.ok) throw new Error('Failed to update column metadata');
    return res.json();
  }

  async applyTransform(
    datasetId: string,
    transform: {
      action: string;
      name?: string;
      formula?: string;
      column?: string;
      strategy?: string;
      mode?: string;
      precision?: number;
      value?: any;
      delimiter?: string;
    }
  ) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/transforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transform),
    });
    if (!res.ok) throw new Error('Failed to apply dataset transformation');
    return res.json();
  }

  async listTransforms(datasetId: string) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/transforms`);
    if (!res.ok) throw new Error('Failed to list transformations');
    return res.json();
  }

  async deleteTransform(datasetId: string, transformId: string) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/transforms/${transformId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete transformation');
    return res.json();
  }

  async validatePlan(payload: {
    dataset_id: string;
    chart_type: string;
    dimension_col?: string;
    metric_col?: string;
    aggregation?: string;
  }) {
    const res = await fetch('/api/v1/advisor/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Advisor plan validation failed');
    return res.json();
  }

  async getRecommendations(datasetId: string) {
    const res = await fetch(`/api/v1/advisor/recommendations/${datasetId}`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  }

  async queryNLQ(datasetId: string, prompt: string) {
    const res = await fetch('/api/v1/ai/nlq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, prompt }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.error?.message || err.detail || 'NLQ query failed');
    }
    return res.json();
  }

  async updateColumns(datasetId: string, updates: Record<string, any>) {
    const res = await fetch(`/api/v1/datasets/${datasetId}/columns`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update columns');
    return res.json();
  }

  async listWorkspaces() {
    const res = await fetch('/api/v1/workspaces');
    if (!res.ok) throw new Error('Failed to list workspaces');
    return res.json();
  }
}

export const apiClient = new ApiClient();

