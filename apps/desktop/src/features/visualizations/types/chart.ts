export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'heatmap' | 'box' | 'hist';

export interface ChartConfig {
  id: string;
  title: string;
  chartType: ChartType;
  datasetId: string;
}
