# 08: API & Integration Specification

**Project Codename:** `data-vis`  
**Version:** 1.0.0-rc  
**Status:** APPROVED (Source of Truth)  
**Classification:** REST Endpoints, Pydantic DTOs, IPC Contracts & Plugin Architecture  

---

## 1. Network & Protocol Architecture

- **Host Interface**: All HTTP / REST APIs bind exclusively to `127.0.0.1` (localhost).
- **Port Allocation**: Dynamically assigned loopback port determined by the Tauri shell at launch.
- **Content Type**: `application/json` for standard metadata and query responses; `application/vnd.apache.arrow.stream` for high-volume tabular stream queries.
- **Authentication**: Local single-use bearer token or session header generated on startup to prevent local cross-process requests from unauthorized system processes.

---

## 2. Comprehensive Endpoint Matrix

| Method | Endpoint Path | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Heartbeat & service status | None | `HealthStatusResponse` |
| `GET` | `/api/v1/system/config` | Fetch app configurations & paths | None | `SystemConfigResponse` |
| `PUT` | `/api/v1/system/config` | Update application configuration | `UpdateConfigRequest` | `SystemConfigResponse` |
| `POST` | `/api/v1/ingest/file` | Ingest file from filesystem path | `IngestFileRequest` | `IngestDatasetResponse` |
| `POST` | `/api/v1/ingest/upload` | Ingest file via direct multipart upload | `multipart/form-data` | `IngestDatasetResponse` |
| `DELETE`| `/api/v1/ingest/{dataset_id}` | Remove dataset from memory and session | None | `DeleteResponse` |
| `POST` | `/api/v1/query` | Execute analytical query plan | `QueryRequest` | `QueryResponse` |
| `GET` | `/api/v1/workspaces` | List all workspaces | None | `ListWorkspacesResponse` |
| `POST` | `/api/v1/workspaces` | Create new workspace | `CreateWorkspaceRequest` | `WorkspaceResponse` |
| `GET` | `/api/v1/workspaces/{id}` | Get workspace by ID | None | `WorkspaceDetailResponse` |
| `PUT` | `/api/v1/workspaces/{id}` | Update workspace layout/state | `UpdateWorkspaceRequest` | `WorkspaceResponse` |
| `DELETE`| `/api/v1/workspaces/{id}` | Delete workspace & children | None | `DeleteResponse` |
| `GET` | `/api/v1/datasets/{id}/stats` | Get column statistical profile | None | `DatasetStatsResponse` |
| `GET` | `/api/v1/advisor/recommendations/{id}` | Generate ranked Visualization Plans | None | `AdvisorRecommendationsResponse` |
| `POST` | `/api/v1/advisor/validate` | Pre-execution 3-tier Plan Validation | `ValidatePlanRequest` | `PlanValidationResponse` |
| `POST` | `/api/v1/ai/nlq` | Compile Natural Language Query to Plan | `NLQRequest` | `NLQResponse` |
| `GET` | `/api/v1/ai/insights/{id}` | Get automated dataset takeaways | None | `DatasetInsightsResponse` |
| `POST` | `/api/v1/export/data` | Export transformed data | `ExportDataRequest` | Binary Stream / File Path |
| `POST` | `/api/v1/export/chart` | Render server-side chart image | `ExportChartRequest` | Binary Image Stream |
| `GET` | `/api/v1/plugins` | Enumerate active plugins | None | `ListPluginsResponse` |

---

## 3. Standardized Error Response & Error Codes

All API errors return a standard JSON envelope with an actionable message and diagnostic context:

```json
{
  "error": {
    "code": "SCHEMA_TYPE_CAST_ERROR",
    "message": "Cannot cast column 'transaction_date' to DateTime using format ISO-8601.",
    "details": {
      "row_sample": 142,
      "raw_value": "31/02/2024",
      "suggested_format": "%d/%m/%Y"
    }
  }
}
```

### Standard Error Code Registry
* `INVALID_PAYLOAD`: Input validation failed against Pydantic contract.
* `DATASET_NOT_FOUND`: Target data file missing or moved.
* `FILE_READ_FAILED`: File path exists but lacks read permissions.
* `DELIMITER_DETECTION_FAILED`: CSV delimiter sniffing failed.
* `QUERY_COMPILATION_ERROR`: Incompatible aggregate operation or malformed expression.
* `SCHEMA_TYPE_CAST_ERROR`: Incompatible type override applied.
* `TRANSACTION_LOCK`: Database write operations blocked.
* `PLUGIN_SECURITY_VIOLATION`: Plugin attempted unauthorized syscall or path traversal.

---

## 4. Pydantic DTO Contract Specifications

### 3.1 Health & Ingestion Contracts

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthStatusResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    polars_version: str
    active_memory_mb: float

class IngestFileRequest(BaseModel):
    workspace_id: str
    file_path: str
    sheet_name: Optional[str] = None
    delimiter: Optional[str] = None
    has_header: bool = True
    sample_rows: int = 1000

class ColumnSchemaDTO(BaseModel):
    name: str
    data_type: str  # 'Int64' | 'Float64' | 'String' | 'Boolean' | 'DateTime' | 'Categorical'
    nullable: bool = True
    null_count: int = 0
    sample_values: List[Any] = Field(default_factory=list)

class IngestDatasetResponse(BaseModel):
    dataset_id: str
    workspace_id: str
    file_name: str
    file_size_bytes: int
    row_count: int
    column_count: int
    fingerprint: str
    columns: List[ColumnSchemaDTO]
```

### 3.2 Analytical Query Contracts

```python
class FilterConditionDTO(BaseModel):
    column: str
    operator: str  # 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'is_null' | 'between'
    value: Any

class AggregationDTO(BaseModel):
    column: str
    agg_func: str  # 'sum' | 'mean' | 'median' | 'min' | 'max' | 'count' | 'count_distinct' | 'std'
    alias: Optional[str] = None

class SortDTO(BaseModel):
    column: str
    descending: bool = False
    nulls_last: bool = True

class QueryRequest(BaseModel):
    dataset_id: str
    select_columns: Optional[List[str]] = None
    filters: List[FilterConditionDTO] = Field(default_factory=list)
    group_by: List[str] = Field(default_factory=list)
    aggregations: List[AggregationDTO] = Field(default_factory=list)
    sort: List[SortDTO] = Field(default_factory=list)
    limit: Optional[int] = 10000
    offset: Optional[int] = 0

class QueryResponse(BaseModel):
    dataset_id: str
    execution_time_ms: float
    total_matching_rows: int
    columns: List[str]
    column_types: List[str]
    data: List[Dict[str, Any]]
```

---

## 4. Error Handling & Standardized Error Response

All API errors return a standard JSON envelope with an actionable message and diagnostic context:

```json
{
  "error": {
    "code": "SCHEMA_TYPE_CAST_ERROR",
    "message": "Cannot cast column 'transaction_date' to DateTime using format ISO-8601.",
    "details": {
      "row_sample": 142,
      "raw_value": "31/02/2024",
      "suggested_format": "%d/%m/%Y"
    }
  }
}
```

---

## 5. Plugin System, Manifest Schema & Extension Hooks

The analytical engine and frontend support sandboxed extensions across three hooks:
1. **Ingestion Parser Plugins**: Custom file format readers (e.g. SAS `.sas7bdat`, HDF5 `.h5`, FITS).
2. **Analytical Transformer Plugins**: Custom statistical calculations (e.g. ARIMA forecasting, LOESS smoothing).
3. **Visualization Renderer Plugins**: Custom chart renderers (e.g. Deck.gl geographic layers, Three.js 3D plots, Vega-Lite).

### 5.1 Plugin Manifest Specification (`plugin.json`)
Every plugin installed in `~/.config/data-vis/plugins/<plugin-id>/` must declare a strict manifest:

```json
{
  "$schema": "https://data-vis.app/schema/plugin-v1.json",
  "id": "org.datavis.custom-renderer-deckgl",
  "name": "Deck.gl Geospatial Map Layer",
  "version": "1.0.0",
  "author": "Community Contributor",
  "type": "visualization",
  "entrypoint": "dist/index.js",
  "permissions": {
    "network": false,
    "filesystem": "read-only-workspace",
    "webgl": true
  },
  "capabilities": {
    "chart_types": ["geospatial_heatmap", "hexbin_map"],
    "required_columns": ["latitude", "longitude"]
  }
}
```

### 5.2 Plugin Lifecycle & Sandbox Enforcement
- **Discovery**: Scanned on application boot from the local plugins directory.
- **Manifest Validation**: Checked against `plugin.json` schema and rejected if malformed.
- **Isolation**: Executed within an isolated WebWorker (Frontend) or restricted sub-process (Backend) with zero network egress.
