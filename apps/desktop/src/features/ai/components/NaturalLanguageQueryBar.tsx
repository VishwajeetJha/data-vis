import React, { useState, useMemo } from 'react';
import { Sparkles, Loader2, Database, ChevronDown, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspaces/store/workspaceStore';
import { apiClient } from '@/shared/api/apiClient';

export const NaturalLanguageQueryBar: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { datasets, selectedDatasetId, selectDataset, addCard } = useWorkspaceStore();

  const activeDataset =
    datasets.find((d) => d.dataset_id === selectedDatasetId) ||
    datasets[datasets.length - 1] ||
    datasets[0];

  // Dynamic Suggestion Chips based on active dataset columns
  const suggestions: string[] = useMemo(() => {
    if (!activeDataset || !activeDataset.columns) return [];
    const cols = activeDataset.columns;
    const chips: string[] = [];

    const dateCol = cols.find((c) => /date|year|timestamp/i.test(c.name));
    const catCol = cols.find((c) => /type|category|department|status|country/i.test(c.name)) || cols[0];
    const numCol = cols.find((c) => /salary|duration|revenue|count|price|score|age/i.test(c.name)) || cols[1] || cols[0];

    if (catCol && numCol && catCol.name !== numCol.name) {
      chips.push(`Average ${numCol.name} by ${catCol.name}`);
    }
    if (dateCol) {
      chips.push(`Trend of titles by ${dateCol.name}`);
    }
    if (catCol) {
      chips.push(`Proportion share of ${catCol.name}`);
    }

    return chips.slice(0, 3);
  }, [activeDataset]);

  const handleExecute = async (inputPrompt?: string) => {
    const queryText = (inputPrompt || prompt).trim();
    if (!queryText || !activeDataset) return;

    setIsLoading(true);
    setError(null);
    setPlanResult(null);

    try {
      const res = await apiClient.queryNLQ(activeDataset.dataset_id, queryText);
      setPlanResult(res);

      const chartType = res.chart_type || 'bar';
      const xCol = res.x_axis || res.dimension;
      const yCol = res.y_axis || res.metric;
      const agg = res.aggregation || res.aggregations?.[0]?.agg_func || 'count';

      addCard(activeDataset.dataset_id, chartType as any, {
        title: queryText,
        xAxis: xCol,
        yAxis: yCol,
        groupCols: xCol ? [xCol] : [],
        aggregations: yCol ? [{ column: yCol, agg_func: agg, alias: `${agg}_${yCol}` }] : [],
        sortRules: [{ column: `${agg}_${yCol}`, descending: true }],
      });

      setPrompt('');
    } catch (err: any) {
      setError(err.message || 'Failed to compile natural language query');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleExecute();
        }}
        className="w-full flex items-center gap-2"
      >
        {/* Dataset Target Selector (if multiple datasets exist) */}
        {datasets.length > 1 && (
          <div className="relative shrink-0">
            <select
              value={activeDataset?.dataset_id || ''}
              onChange={(e) => selectDataset(e.target.value)}
              className="appearance-none bg-surface text-primary border border-border rounded-md pl-7 pr-7 py-2 text-xs font-ui focus:outline-none focus:border-accent cursor-pointer dark:bg-[#1a1816] dark:text-[#f5f2eb]"
              title="Target Dataset for NLQ"
            >
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.file_name}
                </option>
              ))}
            </select>
            <Database className="h-3.5 w-3.5 text-accent absolute left-2 top-1/2 -translate-y-1/2 opacity-75 pointer-events-none" />
            <ChevronDown className="h-3 w-3 text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <div className="relative flex-1">
          <Sparkles className="h-4 w-4 text-accent absolute left-3 top-1/2 -translate-y-1/2 opacity-80" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeDataset
                ? `Ask ${activeDataset.file_name}: "average duration by type", "trend of titles by release_year"...`
                : 'Ingest a dataset to enable Natural Language Query...'
            }
            disabled={!activeDataset || isLoading}
            className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-xs font-reading text-primary placeholder:text-muted placeholder:font-reading focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 transition-all duration-150 dark:bg-[#1a1816] dark:text-[#f5f2eb]"
          />
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || !activeDataset || isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-md text-xs font-ui font-medium transition-colors shrink-0 cursor-pointer"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          <span>{isLoading ? 'Compiling Plan...' : 'Generate Chart'}</span>
        </button>
      </form>

      {/* Suggested Prompt Chips */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-ui px-1">
          <span className="text-muted text-[10px] uppercase font-semibold tracking-wider mr-1">Suggestions:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(sug);
                handleExecute(sug);
              }}
              className="px-2.5 py-0.5 bg-subtle hover:bg-accent/15 text-secondary hover:text-accent border border-border/60 rounded-full transition-colors cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Plan Execution Result Banner */}
      {planResult && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[11px] text-emerald-600 dark:text-emerald-400 font-ui flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            Generated <b>{planResult.chart_type?.toUpperCase()}</b> chart: {planResult.explanation}
          </span>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-md text-[11px] text-rose-600 dark:text-rose-400 font-ui flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold block text-[11px] text-rose-700 dark:text-rose-300">Ungrounded Query</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};
