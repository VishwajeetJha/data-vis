import React from 'react';
import { ColumnSchema } from '@/shared/api/apiClient';

interface SchemaViewerProps {
  columns: ColumnSchema[];
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({ columns }) => {
  if (!columns || columns.length === 0) return null;

  return (
    <div className="space-y-1.5 overflow-y-auto max-h-60 pr-1">
      {columns.map((col) => (
        <div
          key={col.name}
          className="flex items-center justify-between p-1.5 rounded bg-subtle/50 text-xs border border-border/50 hover:bg-subtle"
        >
          <span className="font-mono text-primary truncate max-w-[140px]" title={col.name}>
            {col.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-muted">
            {col.data_type}
          </span>
        </div>
      ))}
    </div>
  );
};
