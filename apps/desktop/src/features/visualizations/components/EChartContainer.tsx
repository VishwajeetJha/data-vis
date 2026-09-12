import React, { useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard, useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { useEChartsOptions } from '../hooks/useEChartsOptions';
import { QueryResult } from '@/shared/api/apiClient';

interface EChartContainerProps {
  card: DashboardCard;
  queryResult?: QueryResult;
  isLoading?: boolean;
}

export const EChartContainer: React.FC<EChartContainerProps> = ({ card, queryResult, isLoading }) => {
  const chartRef = useRef<ReactECharts | null>(null);
  const options = useEChartsOptions(queryResult, card);
  const { setDrillDown } = useWorkspaceStore();

  useEffect(() => {
    if (chartRef.current) {
      const echartInstance = chartRef.current.getEchartsInstance();
      echartInstance.resize();
    }
  }, [card.layout]);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onChartClick = (params: any) => {
    if (!card.xAxis || !card.datasetId) return;
    const clickedVal = params.name || (Array.isArray(params.value) ? params.value[0] : params.value);
    if (clickedVal !== undefined && clickedVal !== null && clickedVal !== '') {
      setDrillDown({
        datasetId: card.datasetId,
        filter: {
          column: card.xAxis,
          operator: 'eq',
          value: clickedVal,
        },
      });
    }
  };

  const onEvents = {
    click: onChartClick,
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-muted font-reading italic">
        Executing analytical query...
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactECharts
        ref={chartRef}
        option={options}
        notMerge={true}
        lazyUpdate={true}
        onEvents={onEvents}
        style={{ height: '100%', width: '100%' }}
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
