import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IngestDatasetResult, FilterCondition, Aggregation, SortRule, apiClient } from '@/shared/api/apiClient';

export interface CardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardCard {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'heatmap' | 'box' | 'hist';
  datasetId: string;
  xAxis?: string;
  yAxis?: string;
  groupCols: string[];
  aggregations: Aggregation[];
  filters: FilterCondition[];
  sortRules: SortRule[];
  layout: CardLayout;
  isDetached?: boolean;
  showDataLabels?: boolean;
  showGridLines?: boolean;
  showLegend?: boolean;
  colorPalette?: 'warm' | 'emerald' | 'cobalt' | 'crimson' | 'monochrome';
  showTrendline?: boolean;
  explodeListDimension?: boolean;
}

export interface Sheet {
  id: string;
  name: string;
  cards: DashboardCard[];
}

interface WorkspaceState {
  workspaceId: string | null;
  workspaceName: string;
  sheets: Sheet[];
  activeSheetId: string;
  datasets: IngestDatasetResult[];
  selectedDatasetId: string | null;
  selectedCardId: string | null;
  drillDownState: { datasetId: string; filter: { column: string; operator: string; value: any } } | null;

  // Visual Theme & Surface Presets
  isDarkMode: boolean;
  lightSurfacePreset: string;
  darkSurfacePreset: string;

  // Actions
  setWorkspace: (id: string, name: string) => void;
  setDrillDown: (state: { datasetId: string; filter: { column: string; operator: string; value: any } } | null) => void;
  toggleTheme: () => void;
  setLightSurfacePreset: (presetId: string) => void;
  setDarkSurfacePreset: (presetId: string) => void;
  addDataset: (dataset: IngestDatasetResult) => void;
  removeDataset: (datasetId: string) => void;
  selectDataset: (datasetId: string | null) => void;
  setActiveSheet: (sheetId: string) => void;
  addSheet: (name?: string) => void;
  removeSheet: (sheetId: string) => void;
  addCard: (datasetId: string, chartType?: DashboardCard['chartType'], overrides?: Partial<DashboardCard>) => void;
  updateDatasetColumnAlias: (datasetId: string, originalName: string, customAlias: string) => void;
  setDatasetColumns: (datasetId: string, columns: any[]) => void;
  updateCard: (cardId: string, updates: Partial<DashboardCard>) => void;
  removeCard: (cardId: string) => void;
  selectCard: (cardId: string | null) => void;
  pastStates: string[];
  futureStates: string[];
  undo: () => void;
  redo: () => void;
  updateCardLayouts: (sheetId: string, layouts: { i: string; x: number; y: number; w: number; h: number }[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaceId: 'default-ws',
      workspaceName: 'Default Analysis Session',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet 1',
          cards: [],
        },
      ],
      activeSheetId: 'sheet-1',
      datasets: [],
      selectedDatasetId: null,
      selectedCardId: null,
      drillDownState: null,

      isDarkMode: true,
      lightSurfacePreset: 'parchment',
      darkSurfacePreset: 'soft-black',

      setWorkspace: (id, name) => set({ workspaceId: id, workspaceName: name }),
      setDrillDown: (drillDownState) => set({ drillDownState }),

      toggleTheme: () => {
        const nextDark = !get().isDarkMode;
        if (nextDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ isDarkMode: nextDark });
      },

      setLightSurfacePreset: (presetId) => set({ lightSurfacePreset: presetId }),
      setDarkSurfacePreset: (presetId) => set({ darkSurfacePreset: presetId }),

      addDataset: (dataset) => {
        const existing = get().datasets.filter((d) => d.dataset_id !== dataset.dataset_id);
        set({
          datasets: [...existing, dataset],
          selectedDatasetId: dataset.dataset_id,
        });
      },

      setDatasetColumns: (datasetId, columns) => {
        const { datasets } = get();
        set({
          datasets: datasets.map((d) =>
            d.dataset_id === datasetId
              ? { ...d, columns, column_count: columns.length }
              : d
          ),
        });
      },

      updateDatasetColumnAlias: (datasetId, originalName, customAlias) => {
        const { datasets } = get();
        set({
          datasets: datasets.map((d) => {
            if (d.dataset_id !== datasetId) return d;
            return {
              ...d,
              columns: d.columns.map((c) =>
                c.name === originalName ? { ...c, custom_alias: customAlias.trim() || undefined } : c
              ),
            };
          }),
        });

        // Persist alias update to backend engine
        apiClient
          .updateColumns(datasetId, {
            [originalName]: { custom_alias: customAlias.trim() || null },
          })
          .catch((err) => console.error('Failed to sync column alias to backend:', err));
      },

      removeDataset: (datasetId) => {
        const { datasets, selectedDatasetId, sheets } = get();
        set({
          datasets: datasets.filter((d) => d.dataset_id !== datasetId),
          selectedDatasetId: selectedDatasetId === datasetId ? null : selectedDatasetId,
          sheets: sheets.map((sheet) => ({
            ...sheet,
            cards: sheet.cards.filter((card) => card.datasetId !== datasetId),
          })),
        });
      },

      selectDataset: (datasetId) => set({ selectedDatasetId: datasetId }),

      setActiveSheet: (sheetId) => set({ activeSheetId: sheetId }),

      addSheet: (name) => {
        const { sheets } = get();
        const nextNum = sheets.length + 1;
        const newSheet: Sheet = {
          id: `sheet-${Date.now()}`,
          name: name || `Sheet ${nextNum}`,
          cards: [],
        };
        set({
          sheets: [...sheets, newSheet],
          activeSheetId: newSheet.id,
        });
      },

      removeSheet: (sheetId) => {
        const { sheets, activeSheetId } = get();
        if (sheets.length <= 1) return; // Keep at least one sheet
        const filtered = sheets.filter((s) => s.id !== sheetId);
        set({
          sheets: filtered,
          activeSheetId: activeSheetId === sheetId ? filtered[0].id : activeSheetId,
        });
      },

      addCard: (datasetId, chartType = 'bar', overrides = {}) => {
        const { datasets, sheets, activeSheetId } = get();
        const dataset = datasets.find((d) => d.dataset_id === datasetId);
        if (!dataset) return;

        // Auto-select smart initial axes based on semantic types
        let initialX = dataset.columns[0]?.name;
        let initialY = dataset.columns[1]?.name || dataset.columns[0]?.name;
        let initialAgg: Aggregation[] = [{ column: initialY, agg_func: 'sum', alias: `sum_${initialY}` }];

        if (chartType === 'scatter') {
          // Restrict scatter to continuous numeric dimensions
          const numCols = dataset.columns.filter(
            (c) =>
              c.data_type.includes('Int') ||
              c.data_type.includes('Float') ||
              c.semantic_type === 'Numeric'
          );
          if (numCols.length >= 2) {
            initialX = numCols[0].name;
            initialY = numCols[1].name;
          } else if (numCols.length === 1) {
            initialX = numCols[0].name;
            initialY = numCols[0].name;
          }
          initialAgg = [];
        } else if (chartType === 'hist') {
          const numCol = dataset.columns.find(
            (c) =>
              c.data_type.includes('Int') ||
              c.data_type.includes('Float') ||
              c.semantic_type === 'Numeric'
          );
          if (numCol) {
            initialX = numCol.name;
            initialY = numCol.name;
          }
          initialAgg = [];
        } else {
          // Categorical dimension + Numeric measure
          const catCol = dataset.columns.find(
            (c) => c.semantic_type === 'Category' || c.semantic_type === 'Temporal'
          );
          const numCol = dataset.columns.find(
            (c) => c.semantic_type === 'Numeric' || c.data_type.includes('Float') || c.data_type.includes('Int')
          );

          if (catCol) initialX = catCol.name;
          if (numCol) {
            initialY = numCol.name;
            initialAgg = [{ column: numCol.name, agg_func: 'sum', alias: `sum_${numCol.name}` }];
          } else {
            // Count rows if no numeric column is present
            initialAgg = [{ column: initialX, agg_func: 'count', alias: 'count' }];
          }
        }

        const newCardId = `card-${Date.now()}`;
        const newCard: DashboardCard = {
          id: newCardId,
          title: `${dataset.file_name.replace(/\.[^/.]+$/, '')} ${chartType.toUpperCase()}`,
          chartType,
          datasetId,
          xAxis: initialX,
          yAxis: initialY,
          groupCols: initialX ? [initialX] : [],
          aggregations: initialAgg,
          filters: [],
          sortRules: [],
          layout: {
            x: (sheets.find((s) => s.id === activeSheetId)?.cards.length || 0) % 2 === 0 ? 0 : 6,
            y: Infinity, // Auto-flow to next available row
            w: 6,
            h: 4,
          },
          ...overrides,
        };

        set({
          sheets: sheets.map((sheet) =>
            sheet.id === activeSheetId ? { ...sheet, cards: [...sheet.cards, newCard] } : sheet
          ),
          selectedCardId: newCardId,
        });
      },

      updateCard: (cardId, updates) => {
        const { sheets } = get();
        set({
          sheets: sheets.map((sheet) => ({
            ...sheet,
            cards: sheet.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
          })),
        });
      },

      removeCard: (cardId) => {
        const { sheets, selectedCardId } = get();
        set({
          sheets: sheets.map((sheet) => ({
            ...sheet,
            cards: sheet.cards.filter((card) => card.id !== cardId),
          })),
          selectedCardId: selectedCardId === cardId ? null : selectedCardId,
        });
      },

      selectCard: (cardId) => set({ selectedCardId: cardId }),

      pastStates: [],
      futureStates: [],

      undo: () => {
        const { pastStates, futureStates, sheets, datasets } = get();
        if (pastStates.length === 0) return;
        const previous = JSON.parse(pastStates[pastStates.length - 1]);
        const currentSnap = JSON.stringify({ sheets, datasets });
        set({
          sheets: previous.sheets,
          datasets: previous.datasets,
          pastStates: pastStates.slice(0, -1),
          futureStates: [currentSnap, ...futureStates],
        });
      },

      redo: () => {
        const { pastStates, futureStates, sheets, datasets } = get();
        if (futureStates.length === 0) return;
        const next = JSON.parse(futureStates[0]);
        const currentSnap = JSON.stringify({ sheets, datasets });
        set({
          sheets: next.sheets,
          datasets: next.datasets,
          pastStates: [...pastStates, currentSnap],
          futureStates: futureStates.slice(1),
        });
      },

      updateCardLayouts: (sheetId, layouts) => {
        const { sheets } = get();
        set({
          sheets: sheets.map((sheet) => {
            if (sheet.id !== sheetId) return sheet;
            return {
              ...sheet,
              cards: sheet.cards.map((card) => {
                const match = layouts.find((l) => l.i === card.id);
                if (!match) return card;
                return {
                  ...card,
                  layout: { x: match.x, y: match.y, w: match.w, h: match.h },
                };
              }),
            };
          }),
        });
      },
    }),
    {
      name: 'data-vis-workspace-storage',
    }
  )
);
