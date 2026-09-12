import { useState, useEffect } from 'react';
import { Database, Sliders, ShieldCheck, Activity, PanelLeft, Download, Sun, Moon, Settings, Undo2, Redo2 } from 'lucide-react';
import { DatasetDropzone } from '@/features/datasets/components/DatasetDropzone';
import { DatasetList } from '@/features/datasets/components/DatasetList';
import { DatasetExplorerModal } from '@/features/datasets/components/DatasetExplorerModal';
import { WorkspaceTabBar } from '@/features/workspaces/components/WorkspaceTabBar';
import { DashboardGrid } from '@/features/dashboards/components/DashboardGrid';
import { ChartConfigurator } from '@/features/visualizations/components/ChartConfigurator';
import { NaturalLanguageQueryBar } from '@/features/ai/components/NaturalLanguageQueryBar';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { QuickVisualModeDropdown } from '@/features/visualizations/components/QuickVisualModeDropdown';

interface HealthStatus {
  status: string;
  version: string;
  polars_version: string;
  pid: number;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightInspector, setShowRightInspector] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const {
    workspaceName,
    datasets,
    drillDownState,
    setDrillDown,
    isDarkMode,
    toggleTheme,
    pastStates,
    futureStates,
    undo,
    redo,
  } = useWorkspaceStore();

  useEffect(() => {
    // Synchronize HTML dark class on mount/change
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    fetch('/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => null);
  }, [isDarkMode]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-primary font-ui overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface select-none shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="p-1.5 text-secondary hover:text-primary hover:bg-subtle rounded-md transition-colors cursor-pointer"
            title="Toggle Datasets Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="font-reading font-semibold text-sm tracking-tight">{workspaceName}</span>
            {/* Undo / Redo Controls */}
            <div className="flex items-center space-x-0.5 border-l border-border pl-2 ml-1">
              <button
                onClick={undo}
                disabled={pastStates.length === 0}
                className="p-1 text-secondary hover:text-primary hover:bg-subtle rounded disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={futureStates.length === 0}
                className="p-1 text-secondary hover:text-primary hover:bg-subtle rounded disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 text-xs text-secondary">
          {/* Quick Graph Visual Mode Dropdown */}
          <QuickVisualModeDropdown />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-secondary hover:text-primary hover:bg-subtle rounded-md transition-colors cursor-pointer"
            title={`Switch to ${isDarkMode ? 'Light Mode' : 'Dark Mode'}`}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-secondary hover:text-primary hover:bg-subtle rounded-md transition-colors cursor-pointer"
            title="Session & Visual Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowRightInspector(!showRightInspector)}
            className="p-1.5 text-secondary hover:text-primary hover:bg-subtle rounded-md transition-colors cursor-pointer"
            title="Toggle Inspector Sidebar"
          >
            <Sliders className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-subtle/60 border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-mono">127.0.0.1 (Zero Egress)</span>
          </div>

          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(useWorkspaceStore.getState()));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", "workspace.json");
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-md font-medium text-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Session</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Dataset Management */}
        {showLeftSidebar && (
          <aside className="w-64 border-r border-border bg-subtle/20 flex flex-col shrink-0 select-none">
            <div className="h-10 border-b border-border px-3 flex items-center justify-between">
              <span className="text-[11px] font-ui font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-accent opacity-80" /> Datasets ({datasets.length})
              </span>
            </div>
            <div className="p-3 border-b border-border bg-surface">
              <DatasetDropzone />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <DatasetList />
            </div>
          </aside>
        )}

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          <WorkspaceTabBar />
          
          {/* Natural Language Query Bar */}
          <div className="px-3 py-1.5 border-b border-border/60 bg-subtle/20 shrink-0">
            <NaturalLanguageQueryBar />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <DashboardGrid />
          </div>
        </main>

        {/* Right Sidebar: Inspector */}
        {showRightInspector && (
          <aside className="w-72 border-l border-border bg-subtle/20 flex flex-col shrink-0 select-none">
            <div className="h-10 border-b border-border px-3 flex items-center justify-between">
              <span className="text-[11px] font-ui font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-accent opacity-80" /> Inspector
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChartConfigurator />
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-7 border-t border-border bg-surface flex items-center justify-between px-4 text-[11px] font-ui text-muted shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${health ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {health ? `FastAPI Engine Connected (PID: ${health.pid})` : 'Connecting Engine...'}
          </span>
        </div>
        <div className="flex items-center space-x-4 font-mono">
          <span>Polars {health?.polars_version || '0.20+'}</span>
          <span>Memory Base: &le; 120MB</span>
        </div>
      </footer>

      {/* Drill-Down Dataset Explorer Modal */}
      {drillDownState && (
        <DatasetExplorerModal
          datasetId={drillDownState.datasetId}
          initialFilter={drillDownState.filter}
          onClose={() => setDrillDown(null)}
        />
      )}

      {/* Session & Visual Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
