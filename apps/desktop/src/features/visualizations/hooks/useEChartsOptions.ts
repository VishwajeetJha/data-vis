import { useMemo } from 'react';
import { QueryResult } from '@/shared/api/apiClient';
import { DashboardCard, useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { LIGHT_SURFACE_PRESETS, DARK_SURFACE_PRESETS } from '../constants/surfacePresets';

const PALETTES = {
  warm: ['#d97706', '#b45309', '#f59e0b', '#78350f', '#fbbf24', '#fde68a'],
  emerald: ['#059669', '#10b981', '#047857', '#34d399', '#065f46', '#6ee7b7'],
  cobalt: ['#2563eb', '#3b82f6', '#1d4ed8', '#60a5fa', '#1e40af', '#93c5fd'],
  crimson: ['#dc2626', '#ef4444', '#b91c1c', '#f87171', '#991b1b', '#fca5a5'],
  monochrome: ['#78716c', '#a8a29e', '#57534e', '#d6d3d1', '#44403c', '#e7e5e4'],
};

export const useEChartsOptions = (queryResult: QueryResult | undefined, card: DashboardCard) => {
  const isDarkMode = useWorkspaceStore((state) => state.isDarkMode);
  const lightPresetId = useWorkspaceStore((state) => state.lightSurfacePreset);
  const darkPresetId = useWorkspaceStore((state) => state.darkSurfacePreset);

  return useMemo(() => {
    // Resolve Semantic Graph Surface Tokens
    const activePreset = isDarkMode
      ? DARK_SURFACE_PRESETS.find((p) => p.id === darkPresetId) || DARK_SURFACE_PRESETS[0]
      : LIGHT_SURFACE_PRESETS.find((p) => p.id === lightPresetId) || LIGHT_SURFACE_PRESETS[0];

    const graphBg = activePreset.bg;
    const graphGrid = activePreset.grid;
    const textColor = isDarkMode ? '#b5ad9e' : '#57524a';
    const headingColor = isDarkMode ? '#f5f2eb' : '#1c1917';
    const tooltipBg = isDarkMode ? '#1a1816' : '#ffffff';

    // Presentation Settings
    const activePaletteKey = card.colorPalette || 'warm';
    const palette = PALETTES[activePaletteKey] || PALETTES.warm;
    const accentColor = palette[0];
    const showDataLabels = card.showDataLabels ?? false;
    const showGridLines = card.showGridLines ?? true;
    const showLegend = card.showLegend ?? true;

    if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
      return {
        backgroundColor: graphBg,
        grid: { left: 55, right: 20, top: 20, bottom: 25, containLabel: true },
      };
    }

    const { data } = queryResult;
    const xAxisKey =
      card.xAxis && queryResult.columns.includes(card.xAxis)
        ? card.xAxis
        : queryResult.columns[0];

    const yAxisKey =
      (card.aggregations[0]?.alias && queryResult.columns.includes(card.aggregations[0].alias) && card.aggregations[0].alias) ||
      (card.yAxis && queryResult.columns.includes(card.yAxis) && card.yAxis) ||
      queryResult.columns.find((c) => c !== xAxisKey) ||
      queryResult.columns[1] ||
      queryResult.columns[0];

    // --- 1. PIE CHART ---
    if (card.chartType === 'pie') {
      const pieData = data.map((d, idx) => ({
        name: String(d[xAxisKey] ?? 'N/A'),
        value: d[yAxisKey] ?? 0,
        itemStyle: { color: palette[idx % palette.length] },
      }));

      return {
        backgroundColor: graphBg,
        tooltip: { trigger: 'item', confine: true, backgroundColor: tooltipBg, borderColor: graphGrid, textStyle: { color: headingColor } },
        legend: {
          show: showLegend,
          bottom: '2%',
          textStyle: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
        },
        series: [
          {
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: tooltipBg, borderWidth: 2 },
            label: {
              show: showDataLabels,
              position: showDataLabels ? 'outside' : 'none',
              color: textColor,
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              formatter: '{b}: {c}',
            },
            data: pieData,
          },
        ],
      };
    }

    // --- 2. SCATTER PLOT (with OLS Trendline) ---
    if (card.chartType === 'scatter') {
      const rawPoints: [number, number][] = data
        .map((d) => [Number(d[xAxisKey]), Number(d[yAxisKey])] as [number, number])
        .filter(([x, y]) => !isNaN(x) && !isNaN(y));

      const seriesList: any[] = [
        {
          type: 'scatter',
          name: yAxisKey,
          symbolSize: 8,
          itemStyle: { color: accentColor },
          label: {
            show: showDataLabels,
            position: 'top',
            color: textColor,
            fontSize: 9,
          },
          data: rawPoints,
        },
      ];

      // OLS Linear Regression Trendline
      if (card.showTrendline && rawPoints.length > 1) {
        const n = rawPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        let minX = Infinity, maxX = -Infinity;

        rawPoints.forEach(([x, y]) => {
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        });

        const denom = n * sumX2 - sumX * sumX;
        if (denom !== 0) {
          const slope = (n * sumXY - sumX * sumY) / denom;
          const intercept = (sumY - slope * sumX) / n;
          const trendPoints = [
            [minX, slope * minX + intercept],
            [maxX, slope * maxX + intercept],
          ];

          seriesList.push({
            name: 'Linear Trendline',
            type: 'line',
            showSymbol: false,
            data: trendPoints,
            lineStyle: { color: isDarkMode ? '#f59e0b' : '#b45309', width: 2, type: 'dashed' },
          });
        }
      }

      return {
        backgroundColor: graphBg,
        tooltip: { trigger: 'item', confine: true, backgroundColor: tooltipBg, borderColor: graphGrid, textStyle: { color: headingColor } },
        legend: {
          show: showLegend,
          bottom: '2%',
          textStyle: { color: textColor, fontSize: 11 },
        },
        grid: { left: 55, right: 25, top: 20, bottom: 35, containLabel: true },
        xAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontFamily: 'Inter, sans-serif' },
          splitLine: { show: showGridLines, lineStyle: { color: graphGrid, type: 'dashed' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontFamily: 'Inter, sans-serif' },
          splitLine: { show: showGridLines, lineStyle: { color: graphGrid, type: 'dashed' } },
        },
        series: seriesList,
      };
    }

    // --- 3. HISTOGRAM (Binned Distribution) ---
    if (card.chartType === 'hist') {
      const rawValues = data
        .map((d) => Number(d[yAxisKey] ?? d[xAxisKey]))
        .filter((v) => !isNaN(v) && v !== null);

      if (rawValues.length === 0) {
        return { backgroundColor: graphBg, grid: { left: 55, right: 20, top: 20, bottom: 25, containLabel: true } };
      }

      const min = Math.min(...rawValues);
      const max = Math.max(...rawValues);
      const binCount = 10;
      const binWidth = (max - min) / binCount || 1;

      const bins = Array.from({ length: binCount }, (_, i) => ({
        label: `${Math.round(min + i * binWidth)} - ${Math.round(min + (i + 1) * binWidth)}`,
        count: 0,
      }));

      rawValues.forEach((val) => {
        const binIndex = Math.min(Math.floor((val - min) / binWidth), binCount - 1);
        if (binIndex >= 0 && binIndex < binCount) {
          bins[binIndex].count++;
        }
      });

      return {
        backgroundColor: graphBg,
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: tooltipBg,
          borderColor: graphGrid,
          textStyle: { color: headingColor },
          formatter: (params: any) => {
            const p = params[0];
            return `Range: <b>${p.name}</b><br/>Frequency: <b>${p.value}</b>`;
          },
        },
        grid: { left: 55, right: 25, top: 20, bottom: 40, containLabel: true },
        xAxis: {
          type: 'category',
          data: bins.map((b) => b.label),
          axisLabel: { color: textColor, fontSize: 10, fontFamily: 'Inter, sans-serif', rotate: 20 },
          axisLine: { lineStyle: { color: graphGrid } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
          splitLine: { show: showGridLines, lineStyle: { color: graphGrid, type: 'dashed' } },
        },
        series: [
          {
            name: 'Frequency',
            type: 'bar',
            itemStyle: { color: accentColor, borderRadius: [2, 2, 0, 0] },
            label: {
              show: showDataLabels,
              position: 'top',
              color: textColor,
              fontSize: 10,
            },
            data: bins.map((b) => b.count),
          },
        ],
      };
    }

    // --- 4. BOX PLOT (5-Number Summary) ---
    if (card.chartType === 'box') {
      const categories: string[] = [];
      const boxData: number[][] = [];

      const grouped: Record<string, number[]> = {};
      data.forEach((d) => {
        const cat = String(d[xAxisKey] ?? 'Overall');
        const val = Number(d[yAxisKey]);
        if (!isNaN(val)) {
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(val);
        }
      });

      Object.entries(grouped).slice(0, 15).forEach(([cat, vals]) => {
        if (vals.length > 0) {
          vals.sort((a, b) => a - b);
          const min = vals[0];
          const max = vals[vals.length - 1];
          const q1 = vals[Math.floor(vals.length * 0.25)];
          const median = vals[Math.floor(vals.length * 0.5)];
          const q3 = vals[Math.floor(vals.length * 0.75)];

          categories.push(cat);
          boxData.push([min, q1, median, q3, max]);
        }
      });

      return {
        backgroundColor: graphBg,
        tooltip: {
          trigger: 'item',
          confine: true,
          backgroundColor: tooltipBg,
          borderColor: graphGrid,
          textStyle: { color: headingColor },
          formatter: (params: any) => {
            const [min, q1, median, q3, max] = params.value.slice(1);
            return `<b>${params.name}</b><br/>Max: ${max}<br/>Q3: ${q3}<br/>Median: ${median}<br/>Q1: ${q1}<br/>Min: ${min}`;
          },
        },
        grid: { left: 55, right: 25, top: 20, bottom: 35, containLabel: true },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
          axisLine: { lineStyle: { color: graphGrid } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
          splitLine: { show: showGridLines, lineStyle: { color: graphGrid, type: 'dashed' } },
        },
        series: [
          {
            name: 'Boxplot',
            type: 'boxplot',
            itemStyle: { color: accentColor, borderColor: accentColor },
            data: boxData,
          },
        ],
      };
    }

    // --- 5. HEATMAP (2D Category Matrix) ---
    if (card.chartType === 'heatmap') {
      const xKey = card.xAxis && queryResult.columns.includes(card.xAxis) ? card.xAxis : queryResult.columns[0];
      const yKey = card.yAxis && queryResult.columns.includes(card.yAxis) ? card.yAxis : (queryResult.columns[1] || queryResult.columns[0]);

      const xCats = Array.from(new Set(data.map((d) => String(d[xKey] ?? '')))).filter(Boolean).slice(0, 25);
      const yCats = Array.from(new Set(data.map((d) => String(d[yKey] ?? '')))).filter(Boolean).slice(0, 25);

      const heatData: [number, number, number][] = [];
      let minVal = Infinity;
      let maxVal = -Infinity;

      data.forEach((d) => {
        const xIdx = xCats.indexOf(String(d[xKey] ?? ''));
        const yIdx = yCats.indexOf(String(d[yKey] ?? ''));
        const val = Number(d.count ?? d.val ?? d[yKey] ?? 1);
        if (xIdx !== -1 && yIdx !== -1) {
          heatData.push([xIdx, yIdx, val]);
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      });

      return {
        backgroundColor: graphBg,
        tooltip: {
          confine: true,
          backgroundColor: tooltipBg,
          borderColor: graphGrid,
          textStyle: { color: headingColor },
          formatter: (params: any) => {
            const [xI, yI, v] = params.value;
            return `<b>${xCats[xI]}</b> × <b>${yCats[yI]}</b><br/>Count: ${v}`;
          },
        },
        grid: { left: 65, right: 40, top: 20, bottom: 45, containLabel: true },
        xAxis: {
          type: 'category',
          data: xCats,
          axisLabel: { color: textColor, fontSize: 10, fontFamily: 'Inter, sans-serif' },
          splitArea: { show: true },
        },
        yAxis: {
          type: 'category',
          data: yCats,
          axisLabel: { color: textColor, fontSize: 10, fontFamily: 'Inter, sans-serif' },
          splitArea: { show: true },
        },
        visualMap: {
          min: minVal === Infinity ? 0 : minVal,
          max: maxVal === -Infinity ? 100 : maxVal,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '0%',
          inRange: {
            color: palette.slice(0, 3).reverse(),
          },
          textStyle: { color: textColor, fontSize: 10 },
        },
        series: [
          {
            name: 'Matrix',
            type: 'heatmap',
            data: heatData,
            label: { show: showDataLabels },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
          },
        ],
      };
    }

    // --- 6. DEFAULT BAR / LINE / AREA ---
    const xData = data.map((d) => d[xAxisKey] ?? 'N/A');
    const yData = data.map((d) => d[yAxisKey] ?? 0);

    return {
      backgroundColor: graphBg,
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: tooltipBg,
        borderColor: graphGrid,
        textStyle: { color: headingColor },
      },
      legend: {
        show: showLegend,
        bottom: '2%',
        textStyle: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
      },
      grid: { left: 55, right: 25, top: 20, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
        axisLine: { lineStyle: { color: graphGrid } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Inter, sans-serif' },
        splitLine: { show: showGridLines, lineStyle: { color: graphGrid, type: 'dashed' } },
      },
      series: [
        {
          name: yAxisKey,
          type: card.chartType === 'area' ? 'line' : card.chartType,
          areaStyle: card.chartType === 'area' ? { opacity: 0.25 } : undefined,
          smooth: true,
          large: data.length > 5000,
          sampling: 'lttb',
          itemStyle: { color: accentColor },
          label: {
            show: showDataLabels,
            position: 'top',
            color: textColor,
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
          },
          data: yData,
        },
      ],
    };
  }, [queryResult, card, isDarkMode, lightPresetId, darkPresetId]);
};
