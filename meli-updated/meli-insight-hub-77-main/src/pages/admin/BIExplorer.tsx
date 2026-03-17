import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { GENDER_OPTIONS, AGE_OPTIONS, ECONOMY_OPTIONS, SECTOR_OPTIONS, DISABILITY_OPTIONS, RURAL_URBAN_OPTIONS, STAKEHOLDER_OPTIONS } from '@/types';
import type { DisaggregatedData, Project } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  GripVertical, ChevronRight, ChevronDown, Download, BarChart3, PieChart as PieChartIcon,
  TrendingUp, Grid3X3, Columns, ArrowLeftRight, X, Plus, Minus, Table2, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Constants ────────────────────────────────────────────────
const CHART_COLORS = [
  'hsl(215, 65%, 52%)', 'hsl(160, 40%, 45%)', 'hsl(38, 88%, 50%)',
  'hsl(280, 55%, 50%)', 'hsl(0, 60%, 52%)', 'hsl(190, 55%, 48%)',
  'hsl(330, 55%, 52%)', 'hsl(100, 40%, 45%)', 'hsl(45, 70%, 50%)',
  'hsl(260, 45%, 55%)', 'hsl(10, 65%, 50%)', 'hsl(200, 50%, 50%)',
];

const PARTNER_TYPE_OPTIONS = ['ISP', 'Government Agency', 'NGO', 'University', 'Community Organization', 'Private Sector', 'Multilateral'];
const TECHNOLOGY_OPTIONS = ['4G LTE', '5G', 'Fiber', 'WiFi Mesh', 'Satellite', 'DSL', 'Cable', 'Fixed Wireless'];

// ─── Types ────────────────────────────────────────────────────
interface FlatRow {
  projectId: string;
  projectName: string;
  reportId: string;
  periodLabel: string;
  reportState: string;
  objectiveId: string;
  objectiveName: string;
  outcomeId: string;
  outcomeName: string;
  indicatorId: string;
  indicatorName: string;
  data: DisaggregatedData;
}

type MetricType = 'count' | 'projects' | 'cycles' | 'indicators';
type VizType = 'pivot' | 'bar' | 'stacked' | 'line' | 'donut' | 'heatmap';

interface Dimension {
  key: string;
  label: string;
  accessor: (row: FlatRow) => string;
}

const ALL_DIMENSIONS: Dimension[] = [
  { key: 'project', label: 'Project', accessor: r => r.projectName },
  { key: 'objective', label: 'Strategic Objective', accessor: r => r.objectiveName },
  { key: 'outcome', label: 'Outcome', accessor: r => r.outcomeName },
  { key: 'indicator', label: 'Indicator', accessor: r => r.indicatorName },
  { key: 'period', label: 'Reporting Cycle', accessor: r => r.periodLabel },
  { key: 'gender', label: 'Gender', accessor: r => r.data.gender || '(empty)' },
  { key: 'age', label: 'Age', accessor: r => r.data.age || '(empty)' },
  { key: 'economy', label: 'Economy', accessor: r => r.data.economy || '(empty)' },
  { key: 'sector', label: 'Sector / Org Type', accessor: r => r.data.sectorOrgType || '(empty)' },
  { key: 'disability', label: 'Disability', accessor: r => r.data.disability || '(empty)' },
  { key: 'ruralUrban', label: 'Rural / Urban', accessor: r => r.data.ruralUrban || '(empty)' },
  { key: 'stakeholder', label: 'Stakeholder Type', accessor: r => r.data.stakeholderType || '(empty)' },
  { key: 'partner', label: 'Partner Type', accessor: r => r.data.partnerType || '(empty)' },
  { key: 'technology', label: 'Technology', accessor: r => r.data.technology || '(empty)' },
];

function getDimension(key: string): Dimension {
  return ALL_DIMENSIONS.find(d => d.key === key) || ALL_DIMENSIONS[0];
}

// ─── Helpers ──────────────────────────────────────────────────
function buildFlatRows(projects: Project[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const project of projects) {
    for (const report of project.reports) {
      if (report.state !== 'published' && report.state !== 'completed' && report.state !== 're_published') continue;
      for (const d of report.data) {
        for (const obj of project.objectives) {
          for (const out of obj.outcomes) {
            for (const ind of out.indicators) {
              if (ind.id === d.indicatorId) {
                rows.push({
                  projectId: project.id, projectName: project.name,
                  reportId: report.id, periodLabel: report.periodLabel,
                  reportState: report.state,
                  objectiveId: obj.id, objectiveName: obj.name,
                  outcomeId: out.id, outcomeName: out.name,
                  indicatorId: ind.id, indicatorName: ind.name,
                  data: d,
                });
              }
            }
          }
        }
      }
    }
  }
  return rows;
}

function aggregateMetric(rows: FlatRow[], metric: MetricType): number {
  switch (metric) {
    case 'count': return rows.length;
    case 'projects': return new Set(rows.map(r => r.projectId)).size;
    case 'cycles': return new Set(rows.map(r => r.reportId)).size;
    case 'indicators': return new Set(rows.map(r => r.indicatorId)).size;
  }
}

const METRIC_LABELS: Record<MetricType, string> = {
  count: 'Total Beneficiaries',
  projects: 'Count of Projects',
  cycles: 'Count of Reporting Cycles',
  indicators: 'Count of Indicators',
};

// ─── Pivot computation ────────────────────────────────────────
interface PivotNode {
  label: string;
  depth: number;
  rows: FlatRow[];
  children: PivotNode[];
  columnValues: Record<string, number>;
  total: number;
}

function buildPivotTree(
  rows: FlatRow[],
  rowDims: string[],
  colDim: string | null,
  metric: MetricType,
  depth = 0,
): PivotNode[] {
  if (depth >= rowDims.length) return [];
  const dim = getDimension(rowDims[depth]);
  const groups = new Map<string, FlatRow[]>();
  for (const row of rows) {
    const val = dim.accessor(row);
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(row);
  }

  return Array.from(groups.entries())
    .map(([label, groupRows]) => {
      const columnValues: Record<string, number> = {};
      if (colDim) {
        const colAccessor = getDimension(colDim).accessor;
        const colGroups = new Map<string, FlatRow[]>();
        for (const r of groupRows) {
          const cv = colAccessor(r);
          if (!colGroups.has(cv)) colGroups.set(cv, []);
          colGroups.get(cv)!.push(r);
        }
        for (const [ck, cr] of colGroups) {
          columnValues[ck] = aggregateMetric(cr, metric);
        }
      }
      return {
        label,
        depth,
        rows: groupRows,
        children: buildPivotTree(groupRows, rowDims, colDim, metric, depth + 1),
        columnValues,
        total: aggregateMetric(groupRows, metric),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Main Component ──────────────────────────────────────────
export default function BIExplorer() {
  const { projects } = useApp();
  const allRows = useMemo(() => buildFlatRows(projects), [projects]);

  // State
  const [metric, setMetric] = useState<MetricType>('count');
  const [rowDims, setRowDims] = useState<string[]>(['indicator']);
  const [colDim, setColDim] = useState<string | null>('gender');
  const [vizType, setVizType] = useState<VizType>('pivot');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [drillDown, setDrillDown] = useState<{ title: string; rows: FlatRow[] } | null>(null);

  // Comparison
  const [compareMode, setCompareMode] = useState(false);
  const [compareDim, setCompareDim] = useState<string>('gender');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  // Filters
  const [filterDim, setFilterDim] = useState<string>('');
  const [filterValues, setFilterValues] = useState<string[]>([]);

  // Filtered data
  const filteredRows = useMemo(() => {
    if (!filterDim || filterValues.length === 0) return allRows;
    const accessor = getDimension(filterDim).accessor;
    return allRows.filter(r => filterValues.includes(accessor(r)));
  }, [allRows, filterDim, filterValues]);

  // Column values for header
  const columnHeaders = useMemo(() => {
    if (!colDim) return [];
    const accessor = getDimension(colDim).accessor;
    const vals = new Set<string>();
    filteredRows.forEach(r => vals.add(accessor(r)));
    return Array.from(vals).sort();
  }, [filteredRows, colDim]);

  // Pivot tree
  const pivotTree = useMemo(
    () => buildPivotTree(filteredRows, rowDims, colDim, metric),
    [filteredRows, rowDims, colDim, metric],
  );

  // Grand total
  const grandTotal = useMemo(() => aggregateMetric(filteredRows, metric), [filteredRows, metric]);
  const grandColumnTotals = useMemo(() => {
    if (!colDim) return {};
    const accessor = getDimension(colDim).accessor;
    const totals: Record<string, number> = {};
    const colGroups = new Map<string, FlatRow[]>();
    for (const r of filteredRows) {
      const cv = accessor(r);
      if (!colGroups.has(cv)) colGroups.set(cv, []);
      colGroups.get(cv)!.push(r);
    }
    for (const [k, v] of colGroups) {
      totals[k] = aggregateMetric(v, metric);
    }
    return totals;
  }, [filteredRows, colDim, metric]);

  // Flat chart data from pivot
  const chartData = useMemo(() => {
    if (rowDims.length === 0) return [];
    return pivotTree.map(node => {
      const entry: Record<string, any> = { name: node.label.length > 30 ? node.label.slice(0, 28) + '…' : node.label, fullName: node.label, total: node.total };
      if (colDim) {
        for (const [ck, cv] of Object.entries(node.columnValues)) {
          entry[ck] = cv;
        }
      }
      return entry;
    });
  }, [pivotTree, colDim, rowDims]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!compareMode || !compareA || !compareB) return null;
    const accessor = getDimension(compareDim).accessor;
    const rowsA = filteredRows.filter(r => accessor(r) === compareA);
    const rowsB = filteredRows.filter(r => accessor(r) === compareB);
    return { a: { label: compareA, value: aggregateMetric(rowsA, metric), rows: rowsA }, b: { label: compareB, value: aggregateMetric(rowsB, metric), rows: rowsB } };
  }, [compareMode, compareDim, compareA, compareB, filteredRows, metric]);

  // Available filter values
  const availableFilterValues = useMemo(() => {
    if (!filterDim) return [];
    const accessor = getDimension(filterDim).accessor;
    return Array.from(new Set(allRows.map(r => accessor(r)))).sort();
  }, [allRows, filterDim]);

  // Available comparison values
  const availableCompareValues = useMemo(() => {
    const accessor = getDimension(compareDim).accessor;
    return Array.from(new Set(filteredRows.map(r => accessor(r)))).sort();
  }, [filteredRows, compareDim]);

  // Toggle node expansion
  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Add/remove row dim
  const addRowDim = (key: string) => {
    if (!rowDims.includes(key)) setRowDims([...rowDims, key]);
  };
  const removeRowDim = (key: string) => setRowDims(rowDims.filter(d => d !== key));
  const moveRowDim = (idx: number, dir: -1 | 1) => {
    const arr = [...rowDims];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setRowDims(arr);
  };

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = [
      ...rowDims.map(d => getDimension(d).label),
      ...(colDim ? columnHeaders : ['Total']),
    ];
    const csvRows = [headers.join(',')];

    function walkTree(nodes: PivotNode[], prefix: string[]) {
      for (const node of nodes) {
        const row = [...prefix, node.label];
        if (node.children.length > 0) {
          walkTree(node.children, row);
        } else {
          const vals = colDim
            ? columnHeaders.map(h => String(node.columnValues[h] || 0))
            : [String(node.total)];
          csvRows.push([...row.map(v => `"${v}"`), ...vals].join(','));
        }
      }
    }
    walkTree(pivotTree, []);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bi-explorer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pivotTree, rowDims, colDim, columnHeaders]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ BUILDER + CONTROLS ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* ─── Left: Dimension Builder Panel ─── */}
        <div className="space-y-5">
          {/* Metric */}
          <BuilderSection title="Metric" subtitle="What to measure">
            <Select value={metric} onValueChange={v => setMetric(v as MetricType)}>
              <SelectTrigger className="h-10 text-[13px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-[13px]">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BuilderSection>

          {/* Row Grouping */}
          <BuilderSection title="Rows" subtitle="Group by (drag to reorder)">
            <div className="space-y-1.5">
              {rowDims.map((key, idx) => (
                <div key={key} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/6 border border-primary/15 text-[13px] font-medium text-primary group">
                  <GripVertical className="h-3.5 w-3.5 opacity-40 shrink-0" />
                  <span className="flex-1 truncate">{getDimension(key).label}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <button onClick={() => moveRowDim(idx, -1)} className="p-0.5 hover:bg-primary/10 rounded">
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                    )}
                    {idx < rowDims.length - 1 && (
                      <button onClick={() => moveRowDim(idx, 1)} className="p-0.5 hover:bg-primary/10 rounded">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => removeRowDim(key)} className="p-0.5 hover:bg-destructive/10 hover:text-destructive rounded">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <DimensionPicker
              exclude={[...rowDims, ...(colDim ? [colDim] : [])]}
              onSelect={addRowDim}
            />
          </BuilderSection>

          {/* Column Pivot */}
          <BuilderSection title="Columns" subtitle="Pivot by (optional)">
            <div className="flex items-center gap-2">
              <Select value={colDim || '_none'} onValueChange={v => setColDim(v === '_none' ? null : v)}>
                <SelectTrigger className="h-10 text-[13px] rounded-xl flex-1">
                  <SelectValue placeholder="No column pivot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-[13px]">No column pivot</SelectItem>
                  {ALL_DIMENSIONS.filter(d => !rowDims.includes(d.key)).map(d => (
                    <SelectItem key={d.key} value={d.key} className="text-[13px]">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {colDim && (
                <button onClick={() => setColDim(null)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </BuilderSection>

          {/* Filter */}
          <BuilderSection title="Filter" subtitle="Narrow down data">
            <Select value={filterDim || '_none'} onValueChange={v => { setFilterDim(v === '_none' ? '' : v); setFilterValues([]); }}>
              <SelectTrigger className="h-10 text-[13px] rounded-xl">
                <SelectValue placeholder="No filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="text-[13px]">No filter</SelectItem>
                {ALL_DIMENSIONS.map(d => (
                  <SelectItem key={d.key} value={d.key} className="text-[13px]">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterDim && availableFilterValues.length > 0 && (
              <ScrollArea className="max-h-40 mt-2">
                <div className="space-y-1">
                  {availableFilterValues.map(v => (
                    <label key={v} className="flex items-center gap-2 text-[12px] cursor-pointer hover:bg-secondary/60 rounded-md px-2 py-1.5 transition-colors">
                      <Checkbox
                        checked={filterValues.includes(v)}
                        onCheckedChange={checked => {
                          setFilterValues(prev => checked ? [...prev, v] : prev.filter(x => x !== v));
                        }}
                      />
                      <span className="truncate">{v}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </BuilderSection>

          {/* Compare */}
          <BuilderSection title="Compare" subtitle="Side-by-side analysis">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer mb-2">
              <Checkbox checked={compareMode} onCheckedChange={v => setCompareMode(!!v)} />
              Enable comparison mode
            </label>
            {compareMode && (
              <div className="space-y-2">
                <Select value={compareDim} onValueChange={v => { setCompareDim(v); setCompareA(''); setCompareB(''); }}>
                  <SelectTrigger className="h-9 text-[12px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_DIMENSIONS.map(d => (
                      <SelectItem key={d.key} value={d.key} className="text-[12px]">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={compareA} onValueChange={setCompareA}>
                    <SelectTrigger className="h-9 text-[12px] rounded-lg">
                      <SelectValue placeholder="Side A" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompareValues.map(v => (
                        <SelectItem key={v} value={v} className="text-[12px]">{v.length > 20 ? v.slice(0, 18) + '…' : v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={compareB} onValueChange={setCompareB}>
                    <SelectTrigger className="h-9 text-[12px] rounded-lg">
                      <SelectValue placeholder="Side B" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompareValues.filter(v => v !== compareA).map(v => (
                        <SelectItem key={v} value={v} className="text-[12px]">{v.length > 20 ? v.slice(0, 18) + '…' : v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </BuilderSection>
        </div>

        {/* ─── Right: Pivot Canvas ─── */}
        <div className="space-y-4">
          {/* Visualization Switcher + Export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl">
              {([
                ['pivot', Table2, 'Pivot'],
                ['bar', BarChart3, 'Bar'],
                ['stacked', Columns, 'Stacked'],
                ['line', TrendingUp, 'Line'],
                ['donut', PieChartIcon, 'Donut'],
                ['heatmap', LayoutGrid, 'Heat'],
              ] as [VizType, any, string][]).map(([type, Icon, label]) => (
                <button
                  key={type}
                  onClick={() => setVizType(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    vizType === type
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 text-[12px] h-8 rounded-lg">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {/* Comparison cards */}
          {compareMode && comparisonData && (
            <div className="grid grid-cols-2 gap-4">
              <ComparisonCard
                label={comparisonData.a.label}
                value={comparisonData.a.value}
                metricLabel={METRIC_LABELS[metric]}
                color="hsl(215, 65%, 52%)"
                onClick={() => setDrillDown({ title: comparisonData.a.label, rows: comparisonData.a.rows })}
              />
              <ComparisonCard
                label={comparisonData.b.label}
                value={comparisonData.b.value}
                metricLabel={METRIC_LABELS[metric]}
                color="hsl(160, 40%, 45%)"
                onClick={() => setDrillDown({ title: comparisonData.b.label, rows: comparisonData.b.rows })}
              />
            </div>
          )}

          {/* Summary bar */}
          <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-card border border-border">
            <div className="text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">{grandTotal.toLocaleString()}</span>
              {' '}{METRIC_LABELS[metric].toLowerCase()}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-[12px] text-muted-foreground">
              {filteredRows.length.toLocaleString()} data points
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-[12px] text-muted-foreground">
              Grouped by: {rowDims.map(d => getDimension(d).label).join(' → ')}
              {colDim && ` | Columns: ${getDimension(colDim).label}`}
            </div>
          </div>

          {/* ─── Visualization Area ─── */}
          {vizType === 'pivot' ? (
            <PivotTable
              tree={pivotTree}
              rowDims={rowDims}
              colDim={colDim}
              columnHeaders={columnHeaders}
              metric={metric}
              grandTotal={grandTotal}
              grandColumnTotals={grandColumnTotals}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onDrillDown={(title, rows) => setDrillDown({ title, rows })}
            />
          ) : vizType === 'heatmap' ? (
            <HeatmapView data={chartData} columnHeaders={columnHeaders} colDim={colDim} />
          ) : (
            <ChartView
              type={vizType}
              data={chartData}
              columnHeaders={columnHeaders}
              colDim={colDim}
              metricLabel={METRIC_LABELS[metric]}
            />
          )}
        </div>
      </div>

      {/* ─── Drill-Down Panel ─── */}
      <Sheet open={!!drillDown} onOpenChange={open => { if (!open) setDrillDown(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-[18px]">{drillDown?.title}</SheetTitle>
            <SheetDescription>{drillDown?.rows.length} underlying data points</SheetDescription>
          </SheetHeader>
          {drillDown && <DrillDownPanel rows={drillDown.rows} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────

function BuilderSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

function DimensionPicker({ exclude, onSelect }: { exclude: string[]; onSelect: (key: string) => void }) {
  const available = ALL_DIMENSIONS.filter(d => !exclude.includes(d.key));
  if (available.length === 0) return null;

  return (
    <div className="mt-2">
      <Select onValueChange={onSelect}>
        <SelectTrigger className="h-9 text-[12px] rounded-lg border-dashed">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Plus className="h-3 w-3" /> Add dimension
          </div>
        </SelectTrigger>
        <SelectContent>
          {available.map(d => (
            <SelectItem key={d.key} value={d.key} className="text-[12px]">{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Pivot Table ──────────────────────────────────────────────
function PivotTable({
  tree, rowDims, colDim, columnHeaders, metric, grandTotal, grandColumnTotals,
  expandedNodes, onToggle, onDrillDown,
}: {
  tree: PivotNode[];
  rowDims: string[];
  colDim: string | null;
  columnHeaders: string[];
  metric: MetricType;
  grandTotal: number;
  grandColumnTotals: Record<string, number>;
  expandedNodes: Set<string>;
  onToggle: (path: string) => void;
  onDrillDown: (title: string, rows: FlatRow[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-secondary/30 min-w-[240px]">
                {rowDims.map(d => getDimension(d).label).join(' / ')}
              </th>
              {colDim ? (
                columnHeaders.map(h => (
                  <th key={h} className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">
                    {h}
                  </th>
                ))
              ) : null}
              <th className="text-right px-4 py-3 font-semibold text-foreground whitespace-nowrap min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {tree.map((node) => (
              <PivotRow
                key={node.label}
                node={node}
                path={node.label}
                colDim={colDim}
                columnHeaders={columnHeaders}
                hasChildren={node.children.length > 0}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onDrillDown={onDrillDown}
                grandTotal={grandTotal}
              />
            ))}
            {/* Grand total row */}
            <tr className="border-t-2 border-border bg-secondary/20 font-semibold">
              <td className="px-4 py-3 sticky left-0 bg-secondary/20 text-foreground">Grand Total</td>
              {colDim ? columnHeaders.map(h => (
                <td key={h} className="text-right px-4 py-3 text-foreground">{(grandColumnTotals[h] || 0).toLocaleString()}</td>
              )) : null}
              <td className="text-right px-4 py-3 text-foreground">{grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PivotRow({
  node, path, colDim, columnHeaders, hasChildren, expandedNodes, onToggle, onDrillDown, grandTotal,
}: {
  node: PivotNode;
  path: string;
  colDim: string | null;
  columnHeaders: string[];
  hasChildren: boolean;
  expandedNodes: Set<string>;
  onToggle: (path: string) => void;
  onDrillDown: (title: string, rows: FlatRow[]) => void;
  grandTotal: number;
}) {
  const isExpanded = expandedNodes.has(path);
  const indent = node.depth * 20;
  const pct = grandTotal > 0 ? ((node.total / grandTotal) * 100).toFixed(1) : '0';

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
        <td className="px-4 py-2.5 sticky left-0 bg-card group-hover:bg-secondary/20 transition-colors" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button onClick={() => onToggle(path)} className="p-0.5 hover:bg-secondary rounded">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            ) : <span className="w-[18px]" />}
            <button
              onClick={() => onDrillDown(node.label, node.rows)}
              className="text-left hover:text-primary transition-colors font-medium truncate max-w-[200px]"
              title={node.label}
            >
              {node.label}
            </button>
          </div>
        </td>
        {colDim ? columnHeaders.map(h => (
          <td key={h} className="text-right px-4 py-2.5 tabular-nums">
            {node.columnValues[h] ? (
              <button
                onClick={() => {
                  const accessor = getDimension(colDim).accessor;
                  const drillRows = node.rows.filter(r => accessor(r) === h);
                  onDrillDown(`${node.label} → ${h}`, drillRows);
                }}
                className="hover:text-primary transition-colors"
              >
                {node.columnValues[h].toLocaleString()}
              </button>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </td>
        )) : null}
        <td className="text-right px-4 py-2.5 font-semibold tabular-nums">
          <span>{node.total.toLocaleString()}</span>
          <span className="text-muted-foreground font-normal ml-1.5 text-[11px]">({pct}%)</span>
        </td>
      </tr>
      {isExpanded && node.children.map(child => (
        <PivotRow
          key={child.label}
          node={child}
          path={`${path}/${child.label}`}
          colDim={colDim}
          columnHeaders={columnHeaders}
          hasChildren={child.children.length > 0}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          onDrillDown={onDrillDown}
          grandTotal={grandTotal}
        />
      ))}
    </>
  );
}

// ─── Chart View ───────────────────────────────────────────────
function ChartView({
  type, data, columnHeaders, colDim, metricLabel,
}: {
  type: VizType;
  data: Record<string, any>[];
  columnHeaders: string[];
  colDim: string | null;
  metricLabel: string;
}) {
  const tooltipStyle = {
    borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px',
    boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.08)',
  };

  if (type === 'donut') {
    const donutData = data.map(d => ({ name: d.fullName || d.name, value: d.total }));
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={150} innerRadius={80} strokeWidth={0}
              label={({ name, percent }) => `${name.length > 15 ? name.slice(0, 13) + '…' : name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-[12px] text-foreground">{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            {colDim && columnHeaders.length > 0 ? (
              columnHeaders.map((h, i) => (
                <Line key={h} type="monotone" dataKey={h} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2} dot={{ r: 4 }} />
              ))
            ) : (
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            )}
            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-[12px] text-foreground">{v}</span>} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Bar or Stacked Bar
  const isStacked = type === 'stacked';
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <ResponsiveContainer width="100%" height={Math.max(400, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={180} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
          {colDim && columnHeaders.length > 0 ? (
            columnHeaders.map((h, i) => (
              <Bar key={h} dataKey={h} fill={CHART_COLORS[i % CHART_COLORS.length]}
                stackId={isStacked ? 'stack' : undefined} radius={isStacked ? undefined : [0, 6, 6, 0]} />
            ))
          ) : (
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
          )}
          <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-[12px] text-foreground">{v}</span>} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────
function HeatmapView({ data, columnHeaders, colDim }: { data: Record<string, any>[]; columnHeaders: string[]; colDim: string | null }) {
  if (!colDim || columnHeaders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-muted-foreground">Select a column pivot dimension to view heatmap.</p>
      </div>
    );
  }

  const allValues = data.flatMap(d => columnHeaders.map(h => d[h] || 0));
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-secondary/30 min-w-[200px]" />
              {columnHeaders.map(h => (
                <th key={h} className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[80px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-border/30">
                <td className="px-4 py-2.5 font-medium sticky left-0 bg-card truncate max-w-[200px]" title={row.fullName}>{row.name}</td>
                {columnHeaders.map(h => {
                  const val = row[h] || 0;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  return (
                    <td key={h} className="text-center px-3 py-2.5 tabular-nums">
                      <div
                        className="mx-auto w-full rounded-md px-2 py-1 text-[11px] font-medium"
                        style={{
                          backgroundColor: `hsl(215, 65%, 52%, ${intensity * 0.7})`,
                          color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                        }}
                      >
                        {val > 0 ? val.toLocaleString() : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Comparison Card ──────────────────────────────────────────
function ComparisonCard({ label, value, metricLabel, color, onClick }: {
  label: string; value: number; metricLabel: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card-elevated-hover p-5 text-left group">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15' }}>
          <ArrowLeftRight className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-[32px] font-bold tracking-tight leading-none mt-1">{value.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{metricLabel}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Drill-Down Panel ─────────────────────────────────────────
function DrillDownPanel({ rows }: { rows: FlatRow[] }) {
  const uniqueProjects = Array.from(new Set(rows.map(r => r.projectName)));
  const uniquePeriods = Array.from(new Set(rows.map(r => r.periodLabel)));
  const uniqueIndicators = Array.from(new Set(rows.map(r => r.indicatorName)));

  const genders: Record<string, number> = {};
  const ages: Record<string, number> = {};
  rows.forEach(r => {
    if (r.data.gender) genders[r.data.gender] = (genders[r.data.gender] || 0) + 1;
    if (r.data.age) ages[r.data.age] = (ages[r.data.age] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <DrillStat label="Data Points" value={rows.length} />
        <DrillStat label="Projects" value={uniqueProjects.length} />
        <DrillStat label="Indicators" value={uniqueIndicators.length} />
        <DrillStat label="Cycles" value={uniquePeriods.length} />
      </div>

      {Object.keys(genders).length > 0 && (
        <div>
          <p className="text-[13px] font-semibold mb-3">Gender Breakdown</p>
          <div className="space-y-2">
            {Object.entries(genders).sort((a, b) => b[1] - a[1]).map(([g, c]) => {
              const pct = Math.round((c / rows.length) * 100);
              return (
                <div key={g}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-foreground">{g}</span>
                    <span className="text-muted-foreground">{c} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(ages).length > 0 && (
        <div>
          <p className="text-[13px] font-semibold mb-3">Age Distribution</p>
          <div className="space-y-2">
            {Object.entries(ages).sort((a, b) => b[1] - a[1]).map(([a, c]) => (
              <div key={a} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
                <span className="text-[12px]">{a}</span>
                <Badge variant="secondary" className="text-[10px]">{c}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold mb-3">Contributing Projects</p>
        <div className="space-y-1.5">
          {uniqueProjects.map(p => {
            const count = rows.filter(r => r.projectName === p).length;
            return (
              <div key={p} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-[12px]">
                <span className="truncate max-w-[280px]">{p}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">{count}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold mb-3">Indicators</p>
        <div className="space-y-1.5">
          {uniqueIndicators.map(name => {
            const count = rows.filter(r => r.indicatorName === name).length;
            return (
              <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-[12px]">
                <span className="truncate max-w-[280px]">{name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">{count}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold mb-3">Reporting Cycles</p>
        <div className="flex flex-wrap gap-1.5">
          {uniquePeriods.map(p => <Badge key={p} variant="outline" className="text-[11px]">{p}</Badge>)}
        </div>
      </div>
    </div>
  );
}

function DrillStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-4">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[24px] font-bold tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}
