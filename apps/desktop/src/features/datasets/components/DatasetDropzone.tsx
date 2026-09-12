import React, { useRef, useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { apiClient } from '@/shared/api/apiClient';

export const DatasetDropzone: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workspaceId = useWorkspaceStore((state) => state.workspaceId) || 'default-ws';
  const addDataset = useWorkspaceStore((state) => state.addDataset);

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.uploadFile(file, workspaceId);
      addDataset(result);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and ingest file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngestPath = async (filePath: string) => {
    if (!filePath) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.ingestFile({
        workspace_id: workspaceId,
        file_path: filePath,
      });
      addDataset(result);
      setManualPath('');
    } catch (err: any) {
      setError(err.message || 'Failed to ingest file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = () => setIsHovered(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleUploadFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleUploadFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.json,.jsonl,.ndjson,.parquet"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border border-dashed rounded-md p-4 text-center transition-all duration-150 cursor-pointer ${
          isHovered ? 'border-accent bg-accent/5' : 'border-border bg-subtle/40 hover:border-border-strong'
        }`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
            <span className="text-xs text-secondary font-ui font-medium">Parsing and inferring schema...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <UploadCloud className="h-5 w-5 text-accent opacity-80" />
            <p className="text-xs font-ui font-medium text-primary">Click or drop dataset file</p>
            <p className="text-[11px] font-mono text-muted">CSV, TSV, Excel, JSON, Parquet</p>
          </div>
        )}
      </div>

      {/* Path input fallback for absolute path ingestion */}
      <div className="flex gap-2">
        <input
          type="text"
          value={manualPath}
          onChange={(e) => setManualPath(e.target.value)}
          placeholder="Or paste absolute file path..."
          className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => handleIngestPath(manualPath)}
          disabled={!manualPath || isLoading}
          className="px-3 py-1.5 bg-subtle hover:bg-border disabled:opacity-40 text-primary rounded-md text-xs font-ui font-medium border border-border transition-colors shrink-0"
        >
          Ingest
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-[11px] font-ui text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};
