import React, { useState } from 'react';
import { Database, BarChart2, Trash2, FileSpreadsheet } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { DatasetExplorerModal } from './DatasetExplorerModal';

export const DatasetList: React.FC = () => {
  const { datasets, selectedDatasetId, selectDataset, addCard, removeDataset } = useWorkspaceStore();
  const [activeExploreDatasetId, setActiveExploreDatasetId] = useState<string | null>(null);

  if (datasets.length === 0) {
    return (
      <div className="text-center py-6 text-xs font-reading text-muted italic">
        No datasets linked to this session.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {datasets.map((ds) => {
        const isSelected = ds.dataset_id === selectedDatasetId;
        return (
          <div
            key={ds.dataset_id}
            onClick={() => selectDataset(ds.dataset_id)}
            className={`border bg-surface rounded-md p-2.5 space-y-2 transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'border-accent ring-1 ring-accent/50'
                : 'border-border hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-1">
                <Database className="h-3.5 w-3.5 text-accent shrink-0 opacity-80" />
                <span className="text-xs font-ui font-semibold text-primary truncate" title={ds.file_name}>
                  {ds.file_name}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-subtle text-secondary rounded uppercase tracking-wider">
                  {ds.file_format}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDataset(ds.dataset_id);
                  }}
                  title="Remove Dataset from Memory"
                  className="p-1 hover:bg-subtle text-secondary hover:text-red-500 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-muted">
              <span>{ds.row_count.toLocaleString()} rows</span>
              <span>{ds.column_count} cols</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveExploreDatasetId(ds.dataset_id);
                }}
                className="flex items-center justify-center gap-1 py-1.5 bg-subtle hover:bg-border text-primary rounded-md text-[11px] font-ui font-medium border border-border transition-colors cursor-pointer"
                title="Explore spreadsheet table"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-secondary" />
                <span>Explore</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addCard(ds.dataset_id, 'bar');
                }}
                className="flex items-center justify-center gap-1 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-md text-[11px] font-ui font-medium border border-accent/30 transition-colors cursor-pointer"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>Add Chart</span>
              </button>
            </div>
          </div>
        );
      })}

      {activeExploreDatasetId && (
        <DatasetExplorerModal
          datasetId={activeExploreDatasetId}
          onClose={() => setActiveExploreDatasetId(null)}
        />
      )}
    </div>
  );
};
