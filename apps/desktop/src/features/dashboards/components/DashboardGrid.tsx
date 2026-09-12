import React from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { ChartCard } from './ChartCard';

const ReactGridLayout = WidthProvider(RGL);

export const DashboardGrid: React.FC = () => {
  const { sheets, activeSheetId, updateCardLayouts } = useWorkspaceStore();

  const activeSheet = sheets.find((s) => s.id === activeSheetId);
  const cards = activeSheet?.cards || [];

  if (cards.length === 0) {
    return (
      <div className="h-full w-full max-w-xl mx-auto flex flex-col items-center justify-center border border-dashed border-border/80 rounded-md p-8 text-center bg-surface/30 my-8">
        <h3 className="text-sm font-reading font-semibold text-primary mb-1">Analytical Canvas Ready</h3>
        <p className="text-xs font-reading text-muted max-w-md leading-relaxed">
          Ingest a dataset from the sidebar and click <span className="font-semibold text-accent font-ui">"Add Chart Card"</span> or ask the Natural Language Query bar above to generate chart cards.
        </p>
      </div>
    );
  }

  const layoutList: Layout[] = cards.map((c) => ({
    i: c.id,
    x: c.layout.x,
    y: c.layout.y,
    w: c.layout.w,
    h: c.layout.h,
    minW: 3,
    minH: 3,
  }));

  const handleLayoutChange = (newLayout: Layout[]) => {
    updateCardLayouts(
      activeSheetId,
      newLayout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
    );
  };

  return (
    <ReactGridLayout
      className="layout min-h-full"
      layout={layoutList}
      cols={12}
      rowHeight={90}
      draggableHandle=".cursor-move"
      onLayoutChange={handleLayoutChange}
      isBounded
    >
      {cards.map((card) => (
        <div key={card.id}>
          <ChartCard card={card} />
        </div>
      ))}
    </ReactGridLayout>
  );
};
