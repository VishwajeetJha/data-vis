import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, ExternalLink, SlidersHorizontal, Scaling } from 'lucide-react';
import { DashboardCard, useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { apiClient } from '@/shared/api/apiClient';
import { EChartContainer } from '@/features/visualizations/components/EChartContainer';

interface ChartCardProps {
  card: DashboardCard;
}

export const ChartCard: React.FC<ChartCardProps> = ({ card }) => {
  const { selectedCardId, selectCard, removeCard } = useWorkspaceStore();
  const isSelected = selectedCardId === card.id;

  // Execute query via TanStack Query
  const { data: queryResult, isLoading, isError, error } = useQuery({
    queryKey: [
      'query',
      card.datasetId,
      card.chartType,
      card.xAxis,
      card.yAxis,
      card.aggregations,
      card.filters,
      card.sortRules,
      card.explodeListDimension,
    ],
    queryFn: async () => {
      // 1. Heatmap: Cross-tabular 2D grouping by [xAxis, yAxis]
      if (card.chartType === 'heatmap') {
        const xCol = card.xAxis;
        const yCol = card.yAxis;
        if (!xCol || !yCol) {
          return {
            dataset_id: card.datasetId,
            execution_time_ms: 0,
            total_matching_rows: 0,
            columns: [],
            column_types: [],
            data: [],
          };
        }
        return apiClient.query({
          dataset_id: card.datasetId,
          group_by: [xCol, yCol],
          aggregations: [{ column: xCol, agg_func: 'count', alias: 'count' }],
          filters: card.filters,
          limit: 2000,
        });
      }

      // 2. Scatter Plot: Raw continuous points [xAxis, yAxis]
      if (card.chartType === 'scatter') {
        const selectCols = [card.xAxis, card.yAxis].filter(Boolean) as string[];
        return apiClient.query({
          dataset_id: card.datasetId,
          select_columns: selectCols.length > 0 ? selectCols : undefined,
          filters: card.filters,
          limit: 1000,
        });
      }

      // 3. Histogram: Raw values of target column for binning
      if (card.chartType === 'hist') {
        const targetCol = card.yAxis || card.xAxis;
        return apiClient.query({
          dataset_id: card.datasetId,
          select_columns: targetCol ? [targetCol] : undefined,
          filters: card.filters,
          limit: 5000,
        });
      }

      // 4. Box Plot: Target distribution metric and optional grouping
      if (card.chartType === 'box') {
        const selectCols = [card.xAxis, card.yAxis].filter(Boolean) as string[];
        return apiClient.query({
          dataset_id: card.datasetId,
          select_columns: selectCols.length > 0 ? selectCols : undefined,
          filters: card.filters,
          limit: 5000,
        });
      }

      // 5. Standard Bar, Line, Pie, Area Charts
      return apiClient.query({
        dataset_id: card.datasetId,
        group_by: card.xAxis ? [card.xAxis] : card.groupCols,
        aggregations: card.aggregations,
        filters: card.filters,
        sort: card.sortRules,
        explode_dimension: card.explodeListDimension,
        limit: 1000,
      });
    },
    enabled: !!card.datasetId,
  });

  return (
    <div
      onClick={() => selectCard(card.id)}
      className={`h-full w-full flex flex-col bg-surface border rounded-md overflow-hidden transition-all duration-150 ${
        isSelected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-border-strong'
      }`}
    >
      {/* Header bar */}
      <div className="h-9 border-b border-border bg-subtle/30 px-3 flex items-center justify-between select-none cursor-move">
        <span className="text-xs font-reading font-semibold text-primary truncate max-w-[200px]" title={card.title}>
          {card.title}
        </span>

        {/* Action Controls (Explicitly exempted from drag interception) */}
        <div
          className="flex items-center space-x-1 relative z-20 cursor-default"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectCard(card.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Configure Inspector"
            className="p-1.5 hover:bg-subtle text-secondary hover:text-primary rounded-md transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('create_popout_window', {
                  cardId: card.id,
                  title: `${card.title || 'Chart'} - data-vis Popout`,
                });
              } catch {
                window.open(`/#/popout/${card.id}`, `popout-${card.id}`, 'width=800,height=600');
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Popout Detached Window (Multi-Monitor)"
            className="p-1.5 hover:bg-subtle text-secondary hover:text-primary rounded-md transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeCard(card.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Delete Card"
            className="p-1.5 hover:bg-subtle text-secondary hover:text-red-500 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 p-2 relative overflow-hidden">
        {isError ? (
          <div className="h-full flex items-center justify-center p-4 text-center text-xs font-ui text-red-500">
            {(error as any)?.message || 'Failed to execute query'}
          </div>
        ) : (
          <EChartContainer card={card} queryResult={queryResult} isLoading={isLoading} />
        )}
        {/* Visual Resize Corner Grip */}
        <div
          className="absolute right-0.5 bottom-0.5 p-1 pointer-events-none opacity-40 hover:opacity-100 transition-opacity select-none"
          title="Drag bottom-right corner to resize card"
        >
          <Scaling className="h-3 w-3 text-muted" />
        </div>
      </div>
    </div>
  );
};
