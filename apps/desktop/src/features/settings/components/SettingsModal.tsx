import React, { useState } from 'react';
import { X, Sliders, Sun, Moon, Check, Zap, Cpu, Palette } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { LIGHT_SURFACE_PRESETS, DARK_SURFACE_PRESETS, SurfacePreset } from '@/features/visualizations/constants/surfacePresets';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'surfaces' | 'performance' | 'system'>('surfaces');
  const {
    isDarkMode,
    toggleTheme,
    lightSurfacePreset,
    darkSurfacePreset,
    setLightSurfacePreset,
    setDarkSurfacePreset,
  } = useWorkspaceStore();

  const renderPresetCard = (preset: SurfacePreset, isSelected: boolean, onSelect: () => void, isDarkTheme: boolean) => {
    return (
      <div
        key={preset.id}
        onClick={onSelect}
        className={`border rounded-lg p-3 transition-all cursor-pointer flex flex-col justify-between ${
          isSelected
            ? 'border-accent ring-2 ring-accent/60 bg-accent/5'
            : 'border-border hover:border-border-strong bg-surface'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-ui font-semibold text-primary">{preset.name}</span>
            {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
          </div>
          <div className="text-[10px] font-mono text-muted mb-2">
            <span>{preset.bg}</span> · <span>grid {preset.grid}</span>
          </div>

          {/* Mini Chart Mock Preview */}
          <div
            className="w-full h-20 rounded border border-border/50 relative overflow-hidden flex items-center justify-center p-2 mb-2"
            style={{ backgroundColor: preset.bg }}
          >
            {/* Grid Lines */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                backgroundImage: `linear-gradient(to right, ${preset.grid} 1px, transparent 1px), linear-gradient(to bottom, ${preset.grid} 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />
            {/* Mini Sparkline SVG */}
            <svg viewBox="0 0 100 40" className="w-full h-full relative z-10 overflow-visible">
              <path
                d="M 5 28 L 22 18 L 38 25 L 55 12 L 72 20 L 95 6"
                fill="none"
                stroke={isDarkTheme ? '#f59e0b' : '#b45309'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[
                [5, 28],
                [22, 18],
                [38, 25],
                [55, 12],
                [72, 20],
                [95, 6],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="2" fill={isDarkTheme ? '#f59e0b' : '#b45309'} />
              ))}
            </svg>
          </div>
        </div>

        <span className="text-[10px] font-reading text-muted italic">{preset.subtitle}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between bg-subtle/30 shrink-0 select-none">
          <div className="flex items-center space-x-2.5">
            <Sliders className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-ui font-semibold text-primary">Session & Visual Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-subtle text-secondary hover:text-primary rounded-md transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="h-10 border-b border-border px-5 flex items-center space-x-4 bg-surface shrink-0 text-xs font-ui">
          <button
            onClick={() => setActiveTab('surfaces')}
            className={`flex items-center gap-1.5 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'surfaces'
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Graph Surface Presets</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-1.5 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'performance'
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Large Dataset & Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Engine & Architecture</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'surfaces' && (
            <div className="space-y-6">
              {/* Theme Mode Toggle Banner */}
              <div className="flex items-center justify-between p-3.5 bg-subtle/40 border border-border rounded-lg">
                <div>
                  <span className="text-xs font-ui font-semibold text-primary block">Active Interface Theme</span>
                  <span className="text-[11px] font-reading text-muted">
                    Currently rendering in <b>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</b>.
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border hover:border-border-strong rounded-md text-xs font-ui text-primary transition-colors cursor-pointer"
                >
                  {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                  <span>Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>

              {/* Light Mode Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-ui font-semibold text-secondary uppercase tracking-wider">
                    LIGHT MODE PRESETS
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {LIGHT_SURFACE_PRESETS.map((p) =>
                    renderPresetCard(p, lightSurfacePreset === p.id, () => setLightSurfacePreset(p.id), false)
                  )}
                </div>
              </div>

              {/* Dark Mode Presets */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-ui font-semibold text-secondary uppercase tracking-wider">
                    DARK MODE PRESETS
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {DARK_SURFACE_PRESETS.map((p) =>
                    renderPresetCard(p, darkSurfacePreset === p.id, () => setDarkSurfacePreset(p.id), true)
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4 max-w-xl text-xs font-ui">
              <div className="border border-border bg-subtle/30 rounded-lg p-4 space-y-3">
                <span className="font-semibold text-primary block">Vectorized Polars Downsampling (LTTB)</span>
                <p className="text-muted leading-relaxed text-[11px]">
                  When raw line or scatter charts exceed 10,000 observations, the analytical engine applies Largest-Triangle-Three-Buckets (LTTB) decimation to retain perceptual extrema without GPU strain.
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span>Downsample Threshold</span>
                  <span className="font-mono font-semibold text-accent">10,000 points</span>
                </div>
              </div>

              <div className="border border-border bg-subtle/30 rounded-lg p-4 space-y-3">
                <span className="font-semibold text-primary block">Hardware Acceleration (Canvas 2D)</span>
                <p className="text-muted leading-relaxed text-[11px]">
                  Charts are rendered via high-performance HTML5 Canvas with progressive chunking enabled for 60 FPS viewport pans and zoom sweeps.
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span>Progressive Chunk Size</span>
                  <span className="font-mono font-semibold text-accent">3,000 marks / frame</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3 max-w-xl text-xs font-ui">
              <div className="border border-border bg-subtle/30 rounded-lg p-4 space-y-2">
                <span className="font-semibold text-primary block">Architecture Overview</span>
                <div className="space-y-1 text-muted text-[11px] font-mono">
                  <div>• Python Polars Engine: Zero-Copy Analytical Core</div>
                  <div>• Desktop Shell: Tauri v2 Native Rust IPC</div>
                  <div>• Graphics Core: Apache ECharts 5.5 + Canvas</div>
                  <div>• Local State: Zustand Persist LocalStorage Bridge</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
