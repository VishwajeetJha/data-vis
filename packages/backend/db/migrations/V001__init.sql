-- V001 Initial Schema for data-vis

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    layout_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON workspaces(updated_at);

CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_format TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_datasets_workspace_fp ON datasets(workspace_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_datasets_workspace_id ON datasets(workspace_id);

CREATE TABLE IF NOT EXISTS column_metadata (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    custom_alias TEXT,
    data_type TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    format_mask TEXT,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    UNIQUE(dataset_id, original_name)
);
CREATE INDEX IF NOT EXISTS idx_col_meta_dataset ON column_metadata(dataset_id);

CREATE TABLE IF NOT EXISTS dataset_statistics (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    column_name TEXT NOT NULL,
    null_count INTEGER NOT NULL DEFAULT 0,
    distinct_count INTEGER NOT NULL DEFAULT 0,
    min_value TEXT,
    max_value TEXT,
    mean_value REAL,
    std_dev REAL,
    computed_at TEXT NOT NULL,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    UNIQUE(dataset_id, column_name)
);

CREATE TABLE IF NOT EXISTS sheets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sheets_workspace ON sheets(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS visualizations (
    id TEXT PRIMARY KEY,
    sheet_id TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    title TEXT NOT NULL,
    chart_type TEXT NOT NULL,
    query_config_json TEXT NOT NULL,
    echarts_options_json TEXT NOT NULL,
    position_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(sheet_id) REFERENCES sheets(id) ON DELETE CASCADE,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vis_sheet ON visualizations(sheet_id);

CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_files (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    last_opened_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_files_fingerprint ON recent_files(fingerprint);

CREATE TABLE IF NOT EXISTS query_cache (
    query_hash TEXT PRIMARY KEY,
    dataset_fingerprint TEXT NOT NULL,
    query_payload TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    event_type TEXT NOT NULL,
    event_payload_json TEXT,
    created_at TEXT NOT NULL
);
