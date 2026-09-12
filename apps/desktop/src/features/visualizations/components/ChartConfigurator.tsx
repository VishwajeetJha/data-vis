import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import {
  BarChart2,
  LineChart,
  PieChart,
  ScatterChart,
  AreaChart,
  BarChart3,
  BoxSelect,
  Grid,
  ChevronDown,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { ChartType } from '../types/chart';
import { apiClient } from '@/shared/api/apiClient';

export const ChartConfigurator: React.FC = () => {
  const { sheets, activeSheetId, selectedCardId, datasets, updateCard } = useWorkspaceStore();
  const [statsProfile, setStatsProfile] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showRecs, setShowRecs] = useState<boolean>(false);

  const activeSheet = sheets.find((s) => s.id === activeSheetId);
  const selectedCard = activeSheet?.cards.find((c) => c.id === selectedCardId);
  const cardDataset = datasets.find((d) => d.dataset_id === selectedCard?.datasetId);

  // Fetch dataset stats
  useEffect(() => {
    if (!selectedCard?.datasetId) return;
    apiClient
      .getDatasetStats(selectedCard.datasetId)
      .then((res) => {
        setStatsProfile(res.profile);
      })
      .catch(() => setStatsProfile(null));

    apiClient
      .getRecommendations(selectedCard.datasetId)
      .then((res) => {
        setRecommendations(res.recommendations || []);
      })
      .catch(() => setRecommendations([]));
  }, [selectedCard?.datasetId]);

  // Run Plan Validator
  useEffect(() => {
    if (!selectedCard?.datasetId) return;

    const currentAgg = selectedCard.aggregations?.[0]?.agg_func || 'sum';
    apiClient
      .validatePlan({
        dataset_id: selectedCard.datasetId,
        chart_type: selectedCard.chartType,
        dimension_col: selectedCard.xAxis || undefined,
        metric_col: selectedCard.yAxis || undefined,
        aggregation: currentAgg,
      })
      .then((res) => setValidation(res))
      .catch(() => setValidation(null));
  }, [
    selectedCard?.datasetId,
    selectedCard?.chartType,
    selectedCard?.xAxis,
    selectedCard?.yAxis,
    selectedCard?.aggregations,
  ]);

  if (!selectedCard || !cardDataset) {
    return (
      <div className="p-4 text-xs font-reading text-muted text-center leading-relaxed italic">
        Select a chart card on the dashboard canvas to configure encodings, chart type, and aggregations.
      </div>
    );
  }

  const chartTypes: { type: ChartType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { type: 'bar', label: 'Bar', icon: BarChart2 },
    { type: 'line', label: 'Line', icon: LineChart },
    { type: 'pie', label: 'Pie', icon: PieChart },
    { type: 'scatter', label: 'Scatter', icon: ScatterChart },
    { type: 'area', label: 'Area', icon: AreaChart },
    { type: 'hist', label: 'Histogram', icon: BarChart3 },
    { type: 'box', label: 'Box Plot', icon: BoxSelect },
    { type: 'heatmap', label: 'Heatmap', icon: Grid },
  ];

  const selectStyle =
    'w-full appearance-none bg-surface text-primary border border-border rounded-md px-3 py-2 pr-8 text-xs font-ui focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer dark:bg-[#1a1816] dark:text-[#f5f2eb] [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-[#1a1816] dark:[&>option]:text-[#f5f2eb]';

  // Helper to format column option labels with semantic badges
  const formatColumnLabel = (colName: string, physicalType: string) => {
    const colMeta = statsProfile?.columns?.find((c: any) => c.name === colName);
    const sem = colMeta?.semantic_type;
    return sem ? `${colName} [${sem}]` : `${colName} (${physicalType})`;
  };

  const activeColStats = statsProfile?.columns?.find(
    (c: any) => c.name === (selectedCard.yAxis || selectedCard.xAxis)
  );

  const isHist = selectedCard.chartType === 'hist';
  const isBox = selectedCard.chartType === 'box';
  const isScatter = selectedCard.chartType === 'scatter';
  const isHeatmap = selectedCard.chartType === 'heatmap';
  const isPie = selectedCard.chartType === 'pie';
  const isStandard = !isHist && !isBox && !isScatter && !isHeatmap;

  // Intelligent Column Subsets based on semantic and data types
  const numericColumns = cardDataset.columns.filter(
    (c) =>
      c.data_type.includes('Int') ||
      c.data_type.includes('Float') ||
      c.data_type.includes('UInt') ||
      c.semantic_type === 'Numeric'
  );

  const dimensionColumns = cardDataset.columns.filter(
    (c) =>
      c.semantic_type === 'Category' ||
      c.semantic_type === 'Temporal' ||
      c.semantic_type === 'Location' ||
      c.data_type.includes('String') ||
      c.data_type.includes('Categorical') ||
      c.data_type.includes('Date')
  );

  const lowCardinalityColumns = cardDataset.columns.filter(
    (c) => (c.distinct_count && c.distinct_count <= 60) || c.semantic_type === 'Category'
  );

  const applyRecommendation = (rec: any) => {
    const agg = rec.aggregation || 'mean';
    updateCard(selectedCard.id, {
      title: rec.title,
      chartType: rec.chart_type,
      xAxis: rec.dimension,
      yAxis: rec.metric,
      groupCols: [rec.dimension],
      aggregations: [{ column: rec.metric, agg_func: agg, alias: `${agg}_${rec.metric}` }],
    });
    setShowRecs(false);
  };

  return (
    <div className="p-3.5 space-y-4 text-xs font-ui">
      {/* Advisor Recommendations Quick Bar */}
      {recommendations.length > 0 && (
        <div className="border border-accent/30 bg-accent/5 rounded-md p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-accent font-semibold text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Advisor Recommendations</span>
            </div>
            <button
              onClick={() => setShowRecs(!showRecs)}
              className="text-[11px] text-accent hover:underline font-medium"
            >
              {showRecs ? 'Hide' : `View (${recommendations.length})`}
            </button>
          </div>

          {showRecs && (
            <div className="space-y-2 pt-1">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2 bg-surface dark:bg-[#1a1816] border border-border/80 rounded hover:border-accent/50 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{rec.title}</span>
                    <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-subtle text-muted">
                      {rec.chart_type}
                    </span>
                  </div>
                  <p className="text-[10px] text-secondary font-reading leading-tight">
                    {rec.explanation}
                  </p>
                  <button
                    onClick={() => applyRecommendation(rec)}
                    className="mt-1 w-full py-1 bg-accent/15 hover:bg-accent text-accent hover:text-white rounded text-[10px] font-semibold transition-colors"
                  >
                    Apply Visualization Plan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan Validation Banner (Tier 2 and Tier 3 Alerts) */}
      {validation && !validation.is_valid && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs font-ui space-y-2">
          <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validation.title}</span>
          </div>
          <p className="text-[11px] text-rose-600/90 dark:text-rose-300/90 font-reading leading-tight">
            {validation.message}
          </p>
          {validation.suggestions?.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {validation.suggestions.map((sug: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (sug.action === 'change_aggregation') {
                      const currentMetric = selectedCard.yAxis || cardDataset.columns[0].name;
                      updateCard(selectedCard.id, {
                        aggregations: [
                          { column: currentMetric, agg_func: sug.value, alias: `${sug.value}_${currentMetric}` },
                        ],
                      });
                    } else if (sug.action === 'change_chart_type') {
                      updateCard(selectedCard.id, { chartType: sug.value });
                    }
                  }}
                  className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-700 dark:text-rose-200 hover:text-white rounded text-[10px] font-medium transition-colors"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {validation && validation.is_valid && validation.tier === 3 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs font-ui space-y-1.5">
          <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validation.title}</span>
          </div>
          <p className="text-[11px] text-amber-600/90 dark:text-amber-300/90 font-reading leading-tight">
            {validation.message}
          </p>
        </div>
      )}

      {/* Title Edit */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">Title</label>
        <input
          type="text"
          value={selectedCard.title}
          onChange={(e) => updateCard(selectedCard.id, { title: e.target.value })}
          className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-xs text-primary font-ui focus:outline-none focus:border-accent"
        />
      </div>

      {/* Quick Canvas Size Sizing Buttons */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
          Card Size on Canvas
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Compact', w: 4, h: 3 },
            { label: 'Half (6×4)', w: 6, h: 4 },
            { label: 'Wide (8×4)', w: 8, h: 4 },
            { label: 'Full Width', w: 12, h: 5 },
          ].map((s) => {
            const isCurrent = selectedCard.layout.w === s.w && selectedCard.layout.h === s.h;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() =>
                  updateCard(selectedCard.id, {
                    layout: { ...selectedCard.layout, w: s.w, h: s.h },
                  })
                }
                className={`px-1.5 py-1 rounded border text-[10px] font-ui font-medium transition-colors cursor-pointer text-center ${
                  isCurrent
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-subtle/50 hover:bg-subtle border-border text-secondary'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Type Picker */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">Chart Type</label>
        <div className="grid grid-cols-4 gap-1.5">
          {chartTypes.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedCard.chartType === item.type;
            return (
              <button
                key={item.type}
                onClick={() => updateCard(selectedCard.id, { chartType: item.type })}
                className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-accent bg-accent/15 text-accent font-semibold'
                    : 'border-border bg-surface text-secondary hover:text-primary hover:border-border-strong'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 mb-1" />
                <span className="text-[9px] font-ui truncate w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ADAPTIVE ENCODING FIELDS */}

      {/* 1. HISTOGRAM */}
      {isHist && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
            Numeric Column to Bin
          </label>
          <div className="relative">
            <select
              value={selectedCard.yAxis || selectedCard.xAxis || ''}
              onChange={(e) => {
                const val = e.target.value;
                updateCard(selectedCard.id, { yAxis: val, xAxis: val });
              }}
              className={selectStyle}
            >
              {(numericColumns.length > 0 ? numericColumns : cardDataset.columns).map((col) => (
                <option key={col.name} value={col.name}>
                  {formatColumnLabel(col.name, col.data_type)}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[10px] text-muted font-reading italic">
            Automatically calculates 10 continuous frequency intervals.
          </p>
        </div>
      )}

      {/* 2. BOX PLOT */}
      {isBox && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Distribution Metric (Numeric)
            </label>
            <div className="relative">
              <select
                value={selectedCard.yAxis || ''}
                onChange={(e) => updateCard(selectedCard.id, { yAxis: e.target.value })}
                className={selectStyle}
              >
                {(numericColumns.length > 0 ? numericColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Group By Category (Optional)
            </label>
            <div className="relative">
              <select
                value={selectedCard.xAxis || ''}
                onChange={(e) => updateCard(selectedCard.id, { xAxis: e.target.value })}
                className={selectStyle}
              >
                <option value="">Overall (No Grouping)</option>
                {(dimensionColumns.length > 0 ? dimensionColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </>
      )}

      {/* 3. SCATTER PLOT */}
      {isScatter && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              X-Axis Metric (Numeric)
            </label>
            <div className="relative">
              <select
                value={selectedCard.xAxis || ''}
                onChange={(e) => updateCard(selectedCard.id, { xAxis: e.target.value })}
                className={selectStyle}
              >
                {(numericColumns.length > 0 ? numericColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Y-Axis Metric (Numeric)
            </label>
            <div className="relative">
              <select
                value={selectedCard.yAxis || ''}
                onChange={(e) => updateCard(selectedCard.id, { yAxis: e.target.value })}
                className={selectStyle}
              >
                {(numericColumns.length > 0 ? numericColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </>
      )}

      {/* 4. HEATMAP */}
      {isHeatmap && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              X Dimension (Columns)
            </label>
            <div className="relative">
              <select
                value={selectedCard.xAxis || cardDataset.columns[0]?.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const otherY = selectedCard.yAxis || cardDataset.columns[1]?.name || val;
                  updateCard(selectedCard.id, {
                    xAxis: val,
                    groupCols: [val, otherY],
                    aggregations: [{ column: val, agg_func: 'count', alias: 'count' }],
                  });
                }}
                className={selectStyle}
              >
                {(lowCardinalityColumns.length > 0 ? lowCardinalityColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Y Dimension (Rows)
            </label>
            <div className="relative">
              <select
                value={selectedCard.yAxis || cardDataset.columns[1]?.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const otherX = selectedCard.xAxis || cardDataset.columns[0]?.name || val;
                  updateCard(selectedCard.id, {
                    yAxis: val,
                    groupCols: [otherX, val],
                    aggregations: [{ column: val, agg_func: 'count', alias: 'count' }],
                  });
                }}
                className={selectStyle}
              >
                {(lowCardinalityColumns.length > 0 ? lowCardinalityColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </>
      )}

      {/* 5. STANDARD BAR / LINE / AREA / PIE */}
      {(isStandard || isPie) && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              {isPie ? 'Slice Category (Dimension)' : 'X-Axis (Category / Dimension)'}
            </label>
            <div className="relative">
              <select
                value={selectedCard.xAxis || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateCard(selectedCard.id, { xAxis: val, groupCols: [val] });
                }}
                className={selectStyle}
              >
                {(dimensionColumns.length > 0 ? dimensionColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Explode Multi-Valued List Dimension Toggle */}
            <label className="flex items-start justify-between gap-2 p-2 rounded bg-subtle/50 border border-border/80 cursor-pointer hover:bg-subtle transition-colors mt-1.5">
              <div className="flex-1">
                <span className="text-[11px] font-ui font-semibold text-primary block">
                  Treat multiple values separately
                </span>
                <span className="text-[10px] text-muted font-reading leading-tight block mt-0.5">
                  Explodes comma-separated entries (e.g. <i>["Nolan", "Spielberg"]</i>) so each item is aggregated independently without altering the dataset.
                </span>
              </div>
              <input
                type="checkbox"
                checked={selectedCard.explodeListDimension ?? false}
                onChange={(e) => updateCard(selectedCard.id, { explodeListDimension: e.target.checked })}
                className="mt-0.5 rounded border-border text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              {isPie ? 'Slice Value (Metric)' : 'Y-Axis (Metric / Value)'}
            </label>
            <div className="relative">
              <select
                value={selectedCard.yAxis || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const currentAgg = selectedCard.aggregations[0]?.agg_func || 'sum';
                  updateCard(selectedCard.id, {
                    yAxis: val,
                    aggregations: [{ column: val, agg_func: currentAgg, alias: `${currentAgg}_${val}` }],
                  });
                }}
                className={selectStyle}
              >
                {(numericColumns.length > 0 ? numericColumns : cardDataset.columns).map((col) => (
                  <option key={col.name} value={col.name}>
                    {formatColumnLabel(col.name, col.data_type)}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Aggregation
            </label>
            <div className="relative">
              <select
                value={selectedCard.aggregations[0]?.agg_func || 'sum'}
                onChange={(e) => {
                  const func = e.target.value;
                  const currentMetric = selectedCard.yAxis || cardDataset.columns[0].name;
                  updateCard(selectedCard.id, {
                    aggregations: [{ column: currentMetric, agg_func: func, alias: `${func}_${currentMetric}` }],
                  });
                }}
                className={selectStyle}
              >
                <option value="sum">Sum</option>
                <option value="mean">Average (Mean)</option>
                <option value="median">Median</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
                <option value="count">Count</option>
                <option value="count_distinct">Unique Count</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider">
              Sort Order
            </label>
            <div className="relative">
              <select
                value={
                  selectedCard.sortRules?.[0]
                    ? `${selectedCard.sortRules[0].column}:${selectedCard.sortRules[0].descending}`
                    : 'default'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'default') {
                    updateCard(selectedCard.id, { sortRules: [] });
                  } else {
                    const [col, desc] = val.split(':');
                    updateCard(selectedCard.id, {
                      sortRules: [{ column: col, descending: desc === 'true' }],
                    });
                  }
                }}
                className={selectStyle}
              >
                <option value="default">Default (X-Axis Chronological / Natural)</option>
                {selectedCard.xAxis && (
                  <>
                    <option value={`${selectedCard.xAxis}:false`}>X-Axis ({selectedCard.xAxis}) Ascending ↑</option>
                    <option value={`${selectedCard.xAxis}:true`}>X-Axis ({selectedCard.xAxis}) Descending ↓</option>
                  </>
                )}
                {selectedCard.aggregations?.[0]?.alias && (
                  <>
                    <option value={`${selectedCard.aggregations[0].alias}:true`}>Metric Value (High to Low) ↓</option>
                    <option value={`${selectedCard.aggregations[0].alias}:false`}>Metric Value (Low to High) ↑</option>
                  </>
                )}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </>
      )}

      {/* Automated Statistical Insights & Outliers */}
      {activeColStats && (
        <div className="border border-border bg-subtle/40 rounded-md p-3 space-y-2 mt-4">
          <div className="flex items-center space-x-1.5 text-accent font-semibold text-[11px]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Statistical Summary ({activeColStats.name})</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            {activeColStats.mean !== null && (
              <div>
                <span className="text-muted block text-[10px]">Mean</span>
                <span className="text-primary font-semibold">{activeColStats.mean.toLocaleString()}</span>
              </div>
            )}
            {activeColStats.median !== null && (
              <div>
                <span className="text-muted block text-[10px]">Median</span>
                <span className="text-primary font-semibold">{activeColStats.median.toLocaleString()}</span>
              </div>
            )}
            {activeColStats.min !== null && (
              <div>
                <span className="text-muted block text-[10px]">Min / Max</span>
                <span className="text-primary font-semibold">
                  {activeColStats.min} - {activeColStats.max}
                </span>
              </div>
            )}
            {activeColStats.std !== null && (
              <div>
                <span className="text-muted block text-[10px]">Std Dev</span>
                <span className="text-primary font-semibold">{activeColStats.std}</span>
              </div>
            )}
            <div>
              <span className="text-muted block text-[10px]">Distinct Values</span>
              <span className="text-primary font-semibold">{activeColStats.distinct_count}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px]">Null Rate</span>
              <span className={`font-semibold ${activeColStats.null_percentage > 10 ? 'text-amber-500' : 'text-primary'}`}>
                {activeColStats.null_percentage}%
              </span>
            </div>
          </div>

          {/* Contextual Takeaways */}
          {activeColStats.std && activeColStats.max && activeColStats.mean && activeColStats.max - activeColStats.mean > 2.5 * activeColStats.std && (
            <div className="flex items-start space-x-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-600 dark:text-amber-400 font-ui leading-tight">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Significant positive skew detected. Consider a Box Plot to inspect upper outliers.</span>
            </div>
          )}
        </div>
      )}

      {/* Presentation & Visual Styling Section */}
      <div className="border border-border/80 bg-subtle/30 rounded-md p-3 space-y-3 mt-4">
        <label className="text-[11px] font-ui font-semibold text-secondary uppercase tracking-wider block">
          Presentation & Styling
        </label>

        {/* Color Palette Picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-ui font-medium text-muted">Theme Palette</label>
          <div className="grid grid-cols-5 gap-1">
            {[
              { id: 'warm', label: 'Amber', color: '#d97706' },
              { id: 'emerald', label: 'Emerald', color: '#059669' },
              { id: 'cobalt', label: 'Cobalt', color: '#2563eb' },
              { id: 'crimson', label: 'Crimson', color: '#dc2626' },
              { id: 'monochrome', label: 'Mono', color: '#78716c' },
            ].map((p) => {
              const isSelected = (selectedCard.colorPalette || 'warm') === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => updateCard(selectedCard.id, { colorPalette: p.id as any })}
                  className={`flex flex-col items-center p-1.5 rounded border transition-all cursor-pointer ${
                    isSelected ? 'border-accent bg-accent/15 ring-1 ring-accent' : 'border-border bg-surface hover:border-border-strong'
                  }`}
                  title={`${p.label} Palette`}
                >
                  <span className="h-3 w-3 rounded-full mb-1" style={{ backgroundColor: p.color }} />
                  <span className="text-[9px] font-ui text-secondary truncate w-full text-center">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Presentation Toggles */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center justify-between text-xs font-ui text-primary cursor-pointer">
            <span>Show Data Labels</span>
            <input
              type="checkbox"
              checked={selectedCard.showDataLabels ?? false}
              onChange={(e) => updateCard(selectedCard.id, { showDataLabels: e.target.checked })}
              className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-xs font-ui text-primary cursor-pointer">
            <span>Show Grid Lines</span>
            <input
              type="checkbox"
              checked={selectedCard.showGridLines ?? true}
              onChange={(e) => updateCard(selectedCard.id, { showGridLines: e.target.checked })}
              className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-xs font-ui text-primary cursor-pointer">
            <span>Show Legend</span>
            <input
              type="checkbox"
              checked={selectedCard.showLegend ?? true}
              onChange={(e) => updateCard(selectedCard.id, { showLegend: e.target.checked })}
              className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
            />
          </label>

          {isScatter && (
            <label className="flex items-center justify-between text-xs font-ui text-primary cursor-pointer pt-1 border-t border-border/40">
              <span className="font-medium text-accent">Linear Trendline (OLS)</span>
              <input
                type="checkbox"
                checked={selectedCard.showTrendline ?? false}
                onChange={(e) => updateCard(selectedCard.id, { showTrendline: e.target.checked })}
                className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
