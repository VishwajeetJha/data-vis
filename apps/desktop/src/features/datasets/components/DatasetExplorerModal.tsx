import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  BarChart3,
  ShieldCheck,
  Info,
  Sliders,
  Plus,
  Wand2,
  History,
  Trash2,
  ChevronDown,
  Filter,
  Save,
} from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { apiClient } from '@/shared/api/apiClient';

interface DatasetExplorerModalProps {
  datasetId: string;
  onClose: () => void;
  initialFilter?: { column: string; operator: string; value: any };
}

export const DatasetExplorerModal: React.FC<DatasetExplorerModalProps> = ({ datasetId, onClose, initialFilter }) => {
  const { datasets, updateDatasetColumnAlias, setDatasetColumns, addCard } = useWorkspaceStore();
  const dataset = datasets.find((d) => d.dataset_id === datasetId);

  const [activeFilter, setActiveFilter] = useState<{ column: string; operator: string; value: any } | null>(
    initialFilter || null
  );

  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDescending, setSortDescending] = useState(false);

  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [aliasValue, setAliasValue] = useState('');

  // In-Cell Editing State
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [cellEditVal, setCellEditVal] = useState('');

  const [stats, setStats] = useState<any>(null);
  const [inspectedColName, setInspectedColName] = useState<string | null>(null);

  // Transform Modal & Drawer State
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [calcColName, setCalcColName] = useState('');
  const [calcFormula, setCalcFormula] = useState('');

  const [showCleanMenu, setShowCleanMenu] = useState(false);
  const [cleanCol, setCleanCol] = useState('');
  const [cleanOperation, setCleanOperation] = useState<string>('trim');

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [transforms, setTransforms] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dark-mode safe select style
  const modalSelectStyle =
    'w-full appearance-none bg-surface text-primary border border-border rounded-md px-3 py-2 pr-8 text-xs font-ui focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer dark:bg-[#1a1816] dark:text-[#f5f2eb] [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-[#1a1816] dark:[&>option]:text-[#f5f2eb]';

  // Fetch full dataset stats & transforms
  const refreshStatsAndTransforms = () => {
    if (!datasetId) return;
    apiClient
      .getDatasetStats(datasetId)
      .then((res) => setStats(res.profile))
      .catch(() => null);

    apiClient
      .listTransforms(datasetId)
      .then((res) => setTransforms(res.transforms || []))
      .catch(() => null);
  };

  useEffect(() => {
    refreshStatsAndTransforms();
  }, [datasetId]);

  // Fetch paginated slice from analytical query engine
  const fetchTableData = () => {
    if (!datasetId) return;
    setIsLoading(true);

    const sortRules = sortColumn
      ? [{ column: sortColumn, descending: sortDescending }]
      : [];

    const filterRules = activeFilter
      ? [{ column: activeFilter.column, operator: activeFilter.operator as any, value: activeFilter.value }]
      : [];

    apiClient
      .query({
        dataset_id: datasetId,
        search_term: searchTerm.trim() || undefined,
        filters: filterRules,
        sort: sortRules,
        limit: pageSize,
        offset: page * pageSize,
      })
      .then((res) => {
        setTableData(res.data);
        setTotalRows(res.total_matching_rows);
      })
      .catch(() => {
        setTableData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTableData();
  }, [datasetId, page, pageSize, searchTerm, sortColumn, sortDescending, dataset, activeFilter]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (!sortDescending) {
        setSortDescending(true);
      } else {
        setSortColumn(null);
        setSortDescending(false);
      }
    } else {
      setSortColumn(colName);
      setSortDescending(false);
    }
    setPage(0);
  };

  const handleSaveAlias = (origName: string) => {
    if (aliasValue.trim() && aliasValue !== origName) {
      updateDatasetColumnAlias(datasetId, origName, aliasValue.trim());
    }
    setEditingColumn(null);
  };

  const handleApplyCalculatedColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcColName.trim() || !calcFormula.trim()) return;

    try {
      const res = await apiClient.applyTransform(datasetId, {
        action: 'calculated_column',
        name: calcColName.trim(),
        formula: calcFormula.trim(),
      });
      if (res.columns) {
        setDatasetColumns(datasetId, res.columns);
      }
      setCalcColName('');
      setCalcFormula('');
      setShowCalcModal(false);
      refreshStatsAndTransforms();
      fetchTableData();
    } catch {
      // Graceful fallback
    }
  };

  const handleApplyCleanData = async () => {
    if (!cleanCol) return;
    try {
      if (cleanOperation.startsWith('string_')) {
        const mode = cleanOperation.replace('string_', '');
        await apiClient.applyTransform(datasetId, {
          action: 'string_case',
          column: cleanCol,
          mode: mode,
        });
      } else if (cleanOperation.startsWith('impute_')) {
        const strategy = cleanOperation.replace('impute_', '');
        await apiClient.applyTransform(datasetId, {
          action: 'impute_nulls',
          column: cleanCol,
          strategy: strategy,
        });
      } else if (cleanOperation === 'round_2') {
        await apiClient.applyTransform(datasetId, {
          action: 'numeric_precision',
          column: cleanCol,
          precision: 2,
        });
      } else if (cleanOperation === 'round_0') {
        await apiClient.applyTransform(datasetId, {
          action: 'numeric_precision',
          column: cleanCol,
          precision: 0,
        });
      } else if (cleanOperation === 'clamp_outliers') {
        await apiClient.applyTransform(datasetId, {
          action: 'clamp_outliers',
          column: cleanCol,
        });
      } else if (cleanOperation === 'split_and_unnest') {
        await apiClient.applyTransform(datasetId, {
          action: 'split_and_unnest',
          column: cleanCol,
          delimiter: ',',
        });
      }

      setShowCleanMenu(false);
      refreshStatsAndTransforms();
      fetchTableData();
    } catch {
      // Graceful fallback
    }
  };

  const handleDeleteTransform = async (transformId: string) => {
    try {
      await apiClient.deleteTransform(datasetId, transformId);
      refreshStatsAndTransforms();
      fetchTableData();
    } catch {
      // Graceful fallback
    }
  };

  const handleSaveCellEdit = (rowIdx: number, colName: string) => {
    const updated = [...tableData];
    if (updated[rowIdx]) {
      updated[rowIdx][colName] = cellEditVal;
      setTableData(updated);
    }
    setEditingCell(null);
  };

  if (!dataset) return null;

  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  // Calculate Data Quality Score
  let qualityScore = 100;
  if (stats && stats.columns && dataset.row_count > 0) {
    const avgNullPct =
      stats.columns.reduce((acc: number, c: any) => acc + (c.null_percentage || 0), 0) /
      (stats.columns.length || 1);
    const dupPct = ((stats.duplicate_count || 0) / dataset.row_count) * 100;
    qualityScore = Math.max(0, Math.round(100 - avgNullPct - dupPct * 0.5));
  }

  const inspectedColumnStats = stats?.columns?.find((c: any) => c.name === inspectedColName);
  const selectedTargetCol = dataset.columns.find((c) => c.name === cleanCol);
  const isTargetNumeric = selectedTargetCol && (selectedTargetCol.data_type.includes('Int') || selectedTargetCol.data_type.includes('Float') || selectedTargetCol.data_type.includes('UInt'));
  const isTargetString = selectedTargetCol && (selectedTargetCol.data_type.includes('String') || selectedTargetCol.data_type.includes('Utf8') || selectedTargetCol.data_type.includes('Categorical'));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150 relative">
        {/* Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between bg-subtle/30 shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-reading font-semibold text-primary">{dataset.file_name}</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-subtle text-secondary rounded uppercase">
                  {dataset.file_format}
                </span>
              </div>
              <p className="text-[11px] font-ui text-muted">
                Source: <span className="font-mono">{dataset.file_path}</span> (Immutable on disk)
              </p>
            </div>
          </div>

          {/* Health Profiling Badges */}
          <div className="flex items-center space-x-3 text-xs">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] ${
                qualityScore >= 90
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : qualityScore >= 70
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
              title="Overall Data Quality Index (Completeness and Deduplication)"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{qualityScore}% Quality</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-subtle rounded-md border border-border font-mono text-[11px]">
              <Layers className="h-3.5 w-3.5 text-secondary" />
              <span>{dataset.row_count.toLocaleString()} rows</span>
              <span className="text-muted">|</span>
              <span>{dataset.column_count} cols</span>
            </div>

            {stats && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-subtle rounded-md border border-border font-mono text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Duplicates: {stats.duplicate_count ?? 0}</span>
              </div>
            )}

            <button
              onClick={() => addCard(dataset.dataset_id, 'bar')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-ui font-medium transition-colors cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>New Chart</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-primary hover:bg-subtle rounded-md transition-colors cursor-pointer"
              title="Close Explorer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action Controls & Option C Workbench Toolbar */}
        <div className="h-12 border-b border-border px-5 flex items-center justify-between bg-surface shrink-0 gap-3">
          <div className="flex items-center space-x-2 flex-1">
            {/* Search */}
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                placeholder="Search table values..."
                className="w-full bg-subtle border border-border rounded-md pl-8 pr-3 py-1.5 text-xs font-ui text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>

            {/* Transform Actions (Option C) */}
            <div className="h-5 w-px bg-border mx-1" />

            <button
              onClick={() => setShowCalcModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-subtle hover:bg-border text-primary border border-border rounded-md text-xs font-ui font-medium transition-colors cursor-pointer"
              title="Add Calculated / Derived Column"
            >
              <Plus className="h-3.5 w-3.5 text-accent" />
              <span>Calculated Column</span>
            </button>

            <button
              onClick={() => {
                setShowCleanMenu(!showCleanMenu);
                if (!cleanCol && dataset.columns[0]) {
                  setCleanCol(dataset.columns[0].name);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-subtle hover:bg-border text-primary border border-border rounded-md text-xs font-ui font-medium transition-colors cursor-pointer"
              title="Data Cleaning Presets"
            >
              <Wand2 className="h-3.5 w-3.5 text-amber-500" />
              <span>Clean Data</span>
            </button>

            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs font-ui font-medium transition-colors cursor-pointer ${
                transforms.length > 0
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-subtle hover:bg-border text-secondary border-border'
              }`}
              title="View Transformation Audit Log"
            >
              <History className="h-3.5 w-3.5" />
              <span>Transforms ({transforms.length})</span>
            </button>

            <button
              onClick={() => {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2500);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-md text-xs font-ui font-medium transition-colors cursor-pointer"
              title="Save all calculated columns and cleaning transformations to active session (source file remains untouched)"
            >
              {saveSuccess ? <Check className="h-3.5 w-3.5 text-white" /> : <Save className="h-3.5 w-3.5 text-white" />}
              <span>{saveSuccess ? 'Saved to Session!' : 'Save Modifications'}</span>
            </button>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-3 text-xs font-ui text-secondary shrink-0">
            <span className="font-mono text-[11px]">
              Showing {totalRows > 0 ? page * pageSize + 1 : 0} -{' '}
              {Math.min((page + 1) * pageSize, totalRows)} of {totalRows.toLocaleString()}
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="p-1 border border-border rounded hover:bg-subtle disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoading}
                className="p-1 border border-border rounded hover:bg-subtle disabled:opacity-40 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabular Spreadsheet Grid */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeFilter && (
            <div className="bg-accent/15 border-b border-accent/30 text-accent px-5 py-2 flex items-center justify-between text-xs font-ui shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Drill-Down Filter Active: <b>{activeFilter.column}</b> = <b>"{String(activeFilter.value)}"</b> ({totalRows.toLocaleString()} rows matching)
                </span>
              </div>
              <button
                onClick={() => setActiveFilter(null)}
                className="px-2 py-0.5 bg-accent/20 hover:bg-accent/30 text-accent font-semibold rounded text-[11px] transition-colors cursor-pointer"
              >
                Clear Filter (Show All)
              </button>
            </div>
          )}

          <div className="flex-1 overflow-auto bg-background">
            {isLoading && tableData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-ui text-muted">
                Loading spreadsheet records...
              </div>
            ) : tableData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-reading text-muted italic">
                No matching records found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse font-ui">
                <thead className="sticky top-0 bg-surface border-b border-border z-10 select-none shadow-sm">
                  <tr>
                    <th className="w-12 px-3 py-2 text-[10px] font-mono text-muted text-center border-r border-border/40">
                      #
                    </th>
                    {dataset.columns.map((col) => {
                      const isSorted = sortColumn === col.name;
                      const isEditing = editingColumn === col.name;

                      return (
                        <th
                          key={col.name}
                          className="px-3.5 py-2 border-r border-border/40 text-primary font-medium hover:bg-subtle/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={aliasValue}
                                  onChange={(e) => setAliasValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAlias(col.name)}
                                  autoFocus
                                  className="bg-background border border-accent rounded px-1.5 py-0.5 text-xs text-primary font-ui"
                                />
                                <button
                                  onClick={() => handleSaveAlias(col.name)}
                                  className="p-0.5 text-emerald-500 hover:bg-subtle rounded"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleSort(col.name)}
                                className="flex items-center gap-1.5 cursor-pointer flex-1 truncate"
                                title={`Click to sort by ${col.name}`}
                              >
                                <span className="truncate font-semibold">{col.name}</span>
                                {(() => {
                                  const colMeta = stats?.columns?.find((c: any) => c.name === col.name);
                                  const semType = colMeta?.semantic_type;
                                  if (!semType) {
                                    return (
                                      <span className="text-[9px] font-mono px-1 bg-subtle/80 text-muted rounded">
                                        {col.data_type}
                                      </span>
                                    );
                                  }
                                  const badgeClass =
                                    semType === 'Identifier'
                                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                      : semType === 'Category'
                                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                      : semType === 'Numeric'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : semType === 'Temporal'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                      : semType === 'Location'
                                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                                      : 'bg-subtle text-muted border-border';
                                  return (
                                    <span
                                      className={`text-[9px] font-mono px-1 py-0.5 rounded border uppercase tracking-wider ${badgeClass}`}
                                      title={`Semantic Type: ${semType} (${col.data_type})`}
                                    >
                                      {semType}
                                    </span>
                                  );
                                })()}
                                {isSorted ? (
                                  sortDescending ? (
                                    <ArrowDown className="h-3 w-3 text-accent shrink-0" />
                                  ) : (
                                    <ArrowUp className="h-3 w-3 text-accent shrink-0" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-2.5 w-2.5 text-muted opacity-40 shrink-0" />
                                )}
                              </div>
                            )}

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedColName(inspectedColName === col.name ? null : col.name);
                                }}
                                title={`Inspect column profile for ${col.name}`}
                                className={`p-0.5 rounded transition-colors ${
                                  inspectedColName === col.name
                                    ? 'text-accent bg-accent/15'
                                    : 'text-secondary hover:text-primary opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                <Info className="h-3 w-3" />
                              </button>

                              {!isEditing && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingColumn(col.name);
                                    setAliasValue(col.name);
                                  }}
                                  title="Rename column display alias (app-only)"
                                  className="opacity-0 group-hover:opacity-100 text-secondary hover:text-accent p-0.5 transition-opacity"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-subtle/40 transition-colors">
                      <td className="px-3 py-1.5 text-center text-muted border-r border-border/40 select-none bg-surface/30">
                        {page * pageSize + idx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined || val === '';
                        const isEditingThisCell =
                          editingCell?.rowIdx === idx && editingCell?.colName === col.name;

                        return (
                          <td
                            key={col.name}
                            onDoubleClick={() => {
                              setEditingCell({ rowIdx: idx, colName: col.name });
                              setCellEditVal(val !== null && val !== undefined ? String(val) : '');
                            }}
                            className={`px-3.5 py-1.5 border-r border-border/40 truncate max-w-xs cursor-text ${
                              isNull ? 'text-muted italic' : 'text-primary'
                            }`}
                            title="Double-click to edit cell value"
                          >
                            {isEditingThisCell ? (
                              <input
                                type="text"
                                value={cellEditVal}
                                onChange={(e) => setCellEditVal(e.target.value)}
                                onBlur={() => handleSaveCellEdit(idx, col.name)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(idx, col.name)}
                                autoFocus
                                className="w-full bg-background border border-accent rounded px-1 text-xs font-mono text-primary"
                              />
                            ) : isNull ? (
                              'null'
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Transformation Audit History Log Drawer */}
          {showHistoryDrawer && (
            <div className="w-80 border-l border-border bg-surface flex flex-col shrink-0 p-4 space-y-3 overflow-y-auto animate-in slide-in-from-right duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center space-x-1.5">
                  <History className="h-4 w-4 text-accent" />
                  <span className="font-ui font-semibold text-xs text-primary">Transformation Log</span>
                </div>
                <button onClick={() => setShowHistoryDrawer(false)} className="p-1 hover:bg-subtle rounded text-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {transforms.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted font-reading italic">
                  No transformations applied yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {transforms.map((t, i) => (
                    <div key={t.id || i} className="border border-border bg-subtle/40 p-2.5 rounded-md text-xs font-ui space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary capitalize">
                          {t.action.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleDeleteTransform(t.id)}
                          className="p-1 text-muted hover:text-red-500 rounded transition-colors"
                          title="Revert this transformation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {t.name && (
                        <div className="text-[11px] font-mono text-secondary">
                          Column: <span className="text-accent">{t.name}</span> = {t.formula}
                        </div>
                      )}
                      {t.column && (
                        <div className="text-[11px] font-mono text-secondary">
                          Column: {t.column} ({t.mode || t.strategy || (t.precision !== undefined ? `precision ${t.precision}` : '')})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Column Profile Inspector Drawer */}
          {inspectedColumnStats && !showHistoryDrawer && (
            <div className="w-80 border-l border-border bg-surface flex flex-col shrink-0 p-4 space-y-4 overflow-y-auto animate-in slide-in-from-right duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center space-x-1.5">
                  <Sliders className="h-4 w-4 text-accent" />
                  <span className="font-ui font-semibold text-xs text-primary truncate max-w-[180px]">
                    {inspectedColumnStats.name}
                  </span>
                </div>
                <button
                  onClick={() => setInspectedColName(null)}
                  className="p-1 hover:bg-subtle rounded text-muted hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Data Type & Completeness */}
              <div className="space-y-2 text-xs font-ui">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Physical Type:</span>
                  <span className="font-mono text-primary font-semibold">{inspectedColumnStats.data_type}</span>
                </div>
                {inspectedColumnStats.semantic_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Semantic Role:</span>
                    <span className="font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                      {inspectedColumnStats.semantic_type}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-secondary">Cardinality (Distinct):</span>
                  <span className="font-mono text-primary font-semibold">{inspectedColumnStats.distinct_count.toLocaleString()}</span>
                </div>
                {inspectedColumnStats.uniqueness_ratio !== undefined && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-secondary">Uniqueness Ratio:</span>
                    <span className="font-mono text-muted">
                      {Math.round(inspectedColumnStats.uniqueness_ratio * 100)}% unique
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-secondary">Missing Values:</span>
                    <span className="font-mono text-muted">
                      {inspectedColumnStats.null_count} ({inspectedColumnStats.null_percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        inspectedColumnStats.null_percentage > 10 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, inspectedColumnStats.null_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Semantic Advisor Warning */}
              {inspectedColumnStats.semantic_warning && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] text-amber-600 dark:text-amber-400 font-ui leading-tight flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{inspectedColumnStats.semantic_warning}</span>
                </div>
              )}

              {/* Numeric Metrics */}
              {inspectedColumnStats.mean !== null && (
                <div className="border border-border bg-subtle/30 rounded-md p-3 space-y-1.5 text-xs font-ui">
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider block">
                    Distribution Metrics
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-muted block text-[10px]">Min</span>
                      <span className="text-primary font-semibold">{inspectedColumnStats.min}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Max</span>
                      <span className="text-primary font-semibold">{inspectedColumnStats.max}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Mean</span>
                      <span className="text-primary font-semibold">{inspectedColumnStats.mean}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Median</span>
                      <span className="text-primary font-semibold">{inspectedColumnStats.median}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Frequent Values */}
              {inspectedColumnStats.top_values && inspectedColumnStats.top_values.length > 0 && (
                <div className="space-y-2 text-xs font-ui">
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider block">
                    Top Frequent Values
                  </span>
                  <div className="space-y-1.5">
                    {inspectedColumnStats.top_values.map((item: any, i: number) => {
                      const pct = Math.round((item.count / (dataset.row_count || 1)) * 100);
                      return (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-primary truncate max-w-[140px]">{item.value}</span>
                            <span className="text-muted">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-subtle h-1 rounded-full overflow-hidden">
                            <div className="bg-accent h-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Action Button */}
              <button
                onClick={() => {
                  addCard(dataset.dataset_id, 'bar', {
                    xAxis: inspectedColumnStats.name,
                    yAxis: inspectedColumnStats.name,
                    title: `${inspectedColumnStats.name} Distribution`,
                  });
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-ui font-medium transition-colors cursor-pointer"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Create Chart from Column</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL: Calculated Column Dialog */}
        {showCalcModal && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <form
              onSubmit={handleApplyCalculatedColumn}
              className="bg-surface border border-border rounded-lg p-5 w-full max-w-md space-y-4 shadow-xl animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-reading font-semibold text-primary">New Calculated Column</h3>
                <button onClick={() => setShowCalcModal(false)} className="text-muted hover:text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
                  New Column Name
                </label>
                <input
                  type="text"
                  value={calcColName}
                  onChange={(e) => setCalcColName(e.target.value)}
                  placeholder="e.g. Annual_Salary"
                  required
                  className="w-full bg-subtle border border-border rounded-md px-3 py-1.5 text-xs text-primary font-ui focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
                  Formula Expression
                </label>
                <input
                  type="text"
                  value={calcFormula}
                  onChange={(e) => setCalcFormula(e.target.value)}
                  placeholder="e.g. Salary * 12 or Revenue - Cost"
                  required
                  className="w-full bg-subtle border border-border rounded-md px-3 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-accent"
                />
                <p className="text-[10px] text-muted font-reading italic">
                  Available columns: {dataset.columns.map((c) => c.name).join(', ')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCalcModal(false)}
                  className="px-3 py-1.5 border border-border rounded-md text-xs text-secondary hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-medium cursor-pointer"
                >
                  Apply Formula
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Data Cleaning Presets (High-Contrast & Type-Adaptive) */}
        {showCleanMenu && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-md space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-reading font-semibold text-primary">Clean Data Presets</h3>
                <button onClick={() => setShowCleanMenu(false)} className="text-muted hover:text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Target Column Selection with High-Contrast Theme */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
                  Target Column
                </label>
                <div className="relative">
                  <select
                    value={cleanCol}
                    onChange={(e) => {
                      const colName = e.target.value;
                      setCleanCol(colName);
                      const target = dataset.columns.find((c) => c.name === colName);
                      if (target && (target.data_type.includes('Int') || target.data_type.includes('Float'))) {
                        setCleanOperation('round_2');
                      } else {
                        setCleanOperation('string_trim');
                      }
                    }}
                    className={modalSelectStyle}
                  >
                    <option value="">Select column...</option>
                    {dataset.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Context-Aware Cleaning Operations based on Data Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
                  Cleaning Operation {selectedTargetCol ? `(${selectedTargetCol.data_type})` : ''}
                </label>
                <div className="relative">
                  <select
                    value={cleanOperation}
                    onChange={(e) => setCleanOperation(e.target.value)}
                    className={modalSelectStyle}
                  >
                    {isTargetNumeric ? (
                      <>
                        <optgroup label="Precision and Formatting">
                          <option value="round_2">Round Decimals to 2 Places (e.g. 3.14)</option>
                          <option value="round_0">Round to Nearest Integer (e.g. 3)</option>
                        </optgroup>
                        <optgroup label="Missing Values (Imputation)">
                          <option value="impute_mean">Fill Missing with Mean (Average)</option>
                          <option value="impute_median">Fill Missing with Median</option>
                          <option value="impute_zero">Fill Missing with 0</option>
                        </optgroup>
                        <optgroup label="Outlier Management">
                          <option value="clamp_outliers">Clamp Extreme Outliers beyond 3σ (Std Dev)</option>
                        </optgroup>
                      </>
                    ) : isTargetString ? (
                      <>
                        <optgroup label="Text Casing and Cleaning">
                          <option value="string_trim">Trim Leading and Trailing Whitespace</option>
                          <option value="string_titlecase">Convert to Title Case (Capitalize Words)</option>
                          <option value="string_uppercase">Convert to UPPERCASE</option>
                          <option value="string_lowercase">Convert to lowercase</option>
                          <option value="string_remove_special_chars">Remove Punctuation and Special Characters</option>
                        </optgroup>
                        <optgroup label="Missing Values">
                          <option value="impute_empty_unknown">Replace Empty / Null with "Unknown"</option>
                        </optgroup>
                        <optgroup label="Multi-Valued List Operations">
                          <option value="split_and_unnest">Split & Unnest by Comma (Explode list into rows)</option>
                        </optgroup>
                      </>
                    ) : (
                      <>
                        <option value="string_trim">Trim Whitespace</option>
                        <option value="impute_mean">Fill Missing with Mean</option>
                        <option value="impute_median">Fill Missing with Median</option>
                        <option value="round_2">Round to 2 Decimals</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCleanMenu(false)}
                  className="px-3 py-1.5 border border-border rounded-md text-xs text-secondary hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCleanData}
                  disabled={!cleanCol}
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md text-xs font-medium cursor-pointer"
                >
                  Execute Cleaning
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
