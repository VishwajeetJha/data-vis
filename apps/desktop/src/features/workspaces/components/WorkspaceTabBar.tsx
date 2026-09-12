import React from 'react';
import { Plus, Layout, X } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const WorkspaceTabBar: React.FC = () => {
  const { sheets, activeSheetId, setActiveSheet, addSheet, removeSheet } = useWorkspaceStore();

  return (
    <div className="flex items-center space-x-1.5 overflow-x-auto select-none py-1">
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        return (
          <div
            key={sheet.id}
            onClick={() => setActiveSheet(sheet.id)}
            className={`group px-3 py-1 text-xs font-ui font-medium rounded-md transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
              isActive
                ? 'bg-surface text-primary border-border font-semibold shadow-none'
                : 'text-secondary hover:text-primary hover:bg-subtle/60 border-transparent'
            }`}
          >
            <Layout className="h-3.5 w-3.5 text-accent opacity-75 shrink-0" />
            <span className="truncate max-w-[130px] tracking-tight">{sheet.name}</span>

            {sheets.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSheet(sheet.id);
                }}
                title="Close Sheet"
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-subtle rounded text-muted hover:text-red-500 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={() => addSheet()}
        title="Add New Sheet"
        className="p-1.5 text-secondary hover:text-primary hover:bg-subtle/80 rounded-md transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
