import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { LIGHT_SURFACE_PRESETS, DARK_SURFACE_PRESETS } from '../constants/surfacePresets';

export const QuickVisualModeDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isDarkMode,
    lightSurfacePreset,
    darkSurfacePreset,
    setLightSurfacePreset,
    setDarkSurfacePreset,
  } = useWorkspaceStore();

  const presets = isDarkMode ? DARK_SURFACE_PRESETS : LIGHT_SURFACE_PRESETS;
  const currentPresetId = isDarkMode ? darkSurfacePreset : lightSurfacePreset;
  const currentPreset = presets.find((p) => p.id === currentPresetId) || presets[0];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-subtle/80 hover:bg-subtle border border-border text-xs font-ui text-primary transition-all duration-150 cursor-pointer select-none"
        title="Quick Graph Surface Visual Mode"
      >
        <Palette className="h-3.5 w-3.5 text-accent shrink-0" />
        <span className="font-medium text-[11px]">{currentPreset.name}</span>
        <ChevronDown className={`h-3 w-3 text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 bg-surface border border-border-strong rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 font-ui text-xs">
          <div className="px-3 py-1.5 border-b border-border text-[10px] font-semibold text-muted uppercase tracking-wider">
            {isDarkMode ? 'Dark Graph Presets' : 'Light Graph Presets'}
          </div>

          <div className="p-1 space-y-0.5">
            {presets.map((preset) => {
              const isSelected = preset.id === currentPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (isDarkMode) {
                      setDarkSurfacePreset(preset.id);
                    } else {
                      setLightSurfacePreset(preset.id);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'hover:bg-subtle text-primary'
                  }`}
                >
                  <div>
                    <span className="block leading-tight text-[11px] font-medium">{preset.name}</span>
                    <span className="block text-[9px] text-muted font-reading mt-0.5">{preset.subtitle}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
