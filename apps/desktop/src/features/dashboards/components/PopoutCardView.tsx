import React, { useEffect } from 'react';
import { ArrowDownToLine, Activity } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { ChartCard } from './ChartCard';

interface PopoutCardViewProps {
  cardId: string;
}

export const PopoutCardView: React.FC<PopoutCardViewProps> = ({ cardId }) => {
  const { sheets, selectCard, isDarkMode } = useWorkspaceStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  let targetCard = null;
  for (const sheet of sheets) {
    const found = sheet.cards.find((c) => c.id === cardId);
    if (found) {
      targetCard = found;
      break;
    }
  }

  const handleDockBack = async () => {
    selectCard(cardId);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_popout_window', { cardId });
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch {
        window.close();
      }
    }
  };

  if (!targetCard) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-primary font-ui p-6 text-center">
        <h3 className="text-sm font-semibold mb-1">Chart Card Not Found</h3>
        <p className="text-xs text-muted">The requested detached chart card ({cardId}) is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-primary font-ui overflow-hidden">
      {/* Popout Header Bar */}
      <header className="h-10 border-b border-border bg-surface px-4 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <Activity className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-xs font-reading font-semibold truncate">{targetCard.title}</span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-subtle text-muted rounded">
            {targetCard.chartType}
          </span>
        </div>

        <button
          onClick={handleDockBack}
          className="flex items-center gap-1.5 px-3 py-1 bg-accent hover:bg-accent/90 text-white rounded text-xs font-ui font-medium transition-colors cursor-pointer"
          title="Close detached window and focus card in main workspace"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          <span>Re-attach to Workspace</span>
        </button>
      </header>

      {/* Full-bleed Chart Canvas */}
      <main className="flex-1 w-full h-full p-3 overflow-hidden">
        <ChartCard card={targetCard} />
      </main>
    </div>
  );
};
