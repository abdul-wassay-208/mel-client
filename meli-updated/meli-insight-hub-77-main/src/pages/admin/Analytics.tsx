import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GENERAL_CATEGORIES, GENDER_OPTIONS, AGE_OPTIONS, ECONOMY_OPTIONS, SECTOR_OPTIONS, DISABILITY_OPTIONS, RURAL_URBAN_OPTIONS, STAKEHOLDER_OPTIONS } from '@/types';
import type { DisaggregatedData, Project } from '@/types';
import { INDICATOR_CONFIGS } from '@/config/indicatorFieldMappings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Search, X, Download, ChevronDown, ChevronUp, Users, Activity, TrendingUp, Layers, FileText, Target, BarChart3, Lightbulb, TableIcon, Sparkles, Eye, EyeOff, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import BIExplorer from './BIExplorer';
import AIReportingAssistant from './AIReportingAssistant';

// ─── Constants ────────────────────────────────────────────────
const CHART_COLORS = [
  'hsl(215, 65%, 52%)', 'hsl(160, 40%, 45%)', 'hsl(38, 88%, 50%)',
  'hsl(280, 55%, 50%)', 'hsl(0, 60%, 52%)', 'hsl(190, 55%, 48%)',
  'hsl(330, 55%, 52%)', 'hsl(100, 40%, 45%)',
];

const STRATEGIC_OBJECTIVES: Record<string, string> = {
  '1': 'Objective 1 – Enhance technical capability of more than 100,000 people',
  '2': 'Objective 2 – Enhance digital inclusion for 1 million people',
  '3': 'Objective 3 – Influence techno policy transformation in at least 10 economies',
};

const PARTNER_TYPE_OPTIONS = ['ISP', 'Government Agency', 'NGO', 'University', 'Community Organization', 'Private Sector', 'Multilateral'];
const TECHNOLOGY_OPTIONS = ['4G LTE', '5G', 'Fiber', 'WiFi Mesh', 'Satellite', 'DSL', 'Cable', 'Fixed Wireless'];
const TOPIC_OPTIONS = ['Digital Inclusion', 'Cybersecurity', 'Data Governance', 'AI Policy', 'Spectrum Management', 'Universal Access', 'Digital Rights'];

const ROWS_PER_PAGE = 15;

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

interface DrillDownData {
  type: 'project' | 'indicator' | 'objective' | 'kpi';
  title: string;
  subtitle?: string;
  rows: FlatRow[];
}

// ─── Helper: Build flat rows from projects ────────────────────
function buildFlatRows(projects: Project[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const project of projects) {
    for (const report of project.reports) {
      for (const d of report.data) {
        for (const obj of project.objectives) {
          for (const out of obj.outcomes) {
            for (const ind of out.indicators) {
              if (ind.id === d.indicatorId) {
                rows.push({
                  projectId: project.id,
                  projectName: project.name,
                  reportId: report.id,
                  periodLabel: report.periodLabel,
                  reportState: report.state,
                  objectiveId: obj.id,
                  objectiveName: obj.name,
                  outcomeId: out.id,
                  outcomeName: out.name,
                  indicatorId: ind.id,
                  indicatorName: ind.name,
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

// ─── Helper: detect SO prefix from objective name ─────────────
function getSOPrefix(objectiveName: string): string | null {
  for (const key of Object.keys(STRATEGIC_OBJECTIVES)) {
    if (objectiveName.toLowerCase().includes(`objective ${key}`) || objectiveName.startsWith(STRATEGIC_OBJECTIVES[key].substring(0, 12))) {
      return key;
    }
  }
  return null;
}

// ─── Disaggregation filter options ────────────────────────────
const DISAGG_FILTERS: { key: keyof DisaggregatedData; label: string; options: string[] }[] = [
  { key: 'gender', label: 'Gender', options: GENDER_OPTIONS },
  { key: 'age', label: 'Age Range', options: AGE_OPTIONS },
  { key: 'economy', label: 'Economy', options: ECONOMY_OPTIONS },
  { key: 'sectorOrgType', label: 'Sector / Org Type', options: SECTOR_OPTIONS },
  { key: 'disability', label: 'Disability', options: DISABILITY_OPTIONS },
  { key: 'ruralUrban', label: 'Rural / Urban', options: RURAL_URBAN_OPTIONS },
  { key: 'stakeholderType', label: 'Stakeholder Type', options: STAKEHOLDER_OPTIONS },
  { key: 'partnerType', label: 'Partner Type', options: PARTNER_TYPE_OPTIONS },
  { key: 'technology', label: 'Technology', options: TECHNOLOGY_OPTIONS },
  { key: 'topic', label: 'Topic', options: TOPIC_OPTIONS },
];

// ─── Search query parser ──────────────────────────────────────
function parseInsightQuery(query: string, projects: Project[], allIndicators: [string, string][], allOutcomes: [string, string][]) {
  const q = query.toLowerCase().trim();
  const filters: Record<string, string> = {};

  // Match project
  for (const p of projects) {
    if (q.includes(p.name.toLowerCase())) {
      filters.project = p.id;
      break;
    }
  }

  // Match indicator code
  const indMatch = q.match(/indicator\s*(\d+\.\d+\.\d+)/i);
  if (indMatch) {
    const code = indMatch[1];
    const found = allIndicators.find(([, name]) => name.includes(code));
    if (found) filters.indicator = found[0];
  }

  // Match outcome code
  const outMatch = q.match(/outcome\s*(\d+\.\d+)/i);
  if (outMatch) {
    const code = outMatch[1];
    const found = allOutcomes.find(([, name]) => name.includes(code));
    if (found) filters.outcome = found[0];
  }

  // Match objective
  const objMatch = q.match(/objective\s*(\d)/i);
  if (objMatch) filters.objective = objMatch[1];

  // Match gender
  if (q.includes('male') && !q.includes('female')) filters.gender = 'Male';
  else if (q.includes('female')) filters.gender = 'Female';

  // Match age
  const ageMatch = q.match(/(\d{2})\s*[-–]\s*(\d{2})/);
  if (ageMatch) {
    const ageStr = `${ageMatch[1]}-${ageMatch[2]}`;
    const matched = AGE_OPTIONS.find(a => a.includes(ageStr));
    if (matched) filters.age = matched;
  }

  return filters;
}

// ─── Animated Counter ─────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ─── Main Component ──────────────────────────────────────────
export default function Analytics() {
  const { projects } = useApp();

  // Search
  const [insightQuery, setInsightQuery] = useState('');

  // Scope filters
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('published');
  const [catFilter, setCatFilter] = useState('all');

  // Hierarchy filters
  const [soFilter, setSOFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [indicatorFilter, setIndicatorFilter] = useState('all');

  // Disaggregation filters
  const [disaggFilters, setDisaggFilters] = useState<Record<string, string>>({});
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Table state
  const [tablePage, setTablePage] = useState(1);
  const [tableSearch, setTableSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('projectName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    projectName: true, periodLabel: true, objectiveName: true, outcomeName: true,
    indicatorName: true, gender: true, age: true, economy: true, ruralUrban: false,
    disability: false, sectorOrgType: false, stakeholderType: false, partnerType: false,
    technology: false, topic: false,
  });
  const [showColToggle, setShowColToggle] = useState(false);

  // Drill-down
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);

  // Main view tab
  const [mainTab, setMainTab] = useState<'insights' | 'data' | 'bi' | 'ai'>('insights');

  // Collect reference data
  const allPeriods = useMemo(() => {
    const s = new Set<string>();
    projects.forEach(p => p.reports.forEach(r => s.add(r.periodLabel)));
    return Array.from(s).sort();
  }, [projects]);

  const allIndicators = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => p.objectives.forEach(o => o.outcomes.forEach(ou => ou.indicators.forEach(ind => {
      map.set(ind.id, ind.name);
    }))));
    return Array.from(map.entries());
  }, [projects]);

  const allOutcomes = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => p.objectives.forEach(o => o.outcomes.forEach(ou => {
      map.set(ou.id, ou.name);
    })));
    return Array.from(map.entries());
  }, [projects]);

  // Build flat rows
  const allRows = useMemo(() => buildFlatRows(projects), [projects]);

  // Search-driven filter application
  const handleInsightSearch = useCallback(() => {
    if (!insightQuery.trim()) return;
    const parsed = parseInsightQuery(insightQuery, projects, allIndicators, allOutcomes);
    if (parsed.project) setSelectedProjects([parsed.project]);
    if (parsed.indicator) setIndicatorFilter(parsed.indicator);
    if (parsed.outcome) setOutcomeFilter(parsed.outcome);
    if (parsed.objective) setSOFilter(parsed.objective);
    if (parsed.gender) setDisaggFilters(prev => ({ ...prev, gender: parsed.gender! }));
    if (parsed.age) setDisaggFilters(prev => ({ ...prev, age: parsed.age! }));
    setTablePage(1);
  }, [insightQuery, projects, allIndicators, allOutcomes]);

  // Apply all filters
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (statusFilter !== 'all' && row.reportState !== statusFilter) return false;
      if (selectedProjects.length > 0 && !selectedProjects.includes(row.projectId)) return false;
      const proj = projects.find(p => p.id === row.projectId);
      if (catFilter !== 'all' && proj?.generalCategory !== catFilter) return false;
      if (selectedPeriods.length > 0 && !selectedPeriods.includes(row.periodLabel)) return false;
      if (soFilter !== 'all') {
        const prefix = getSOPrefix(row.objectiveName);
        if (prefix !== soFilter) return false;
      }
      if (outcomeFilter !== 'all' && row.outcomeId !== outcomeFilter) return false;
      if (indicatorFilter !== 'all' && row.indicatorId !== indicatorFilter) return false;
      for (const [key, val] of Object.entries(disaggFilters)) {
        if (val && val !== 'all') {
          const dataVal = (row.data as any)[key];
          if (dataVal !== val) return false;
        }
      }
      return true;
    });
  }, [allRows, statusFilter, selectedProjects, catFilter, selectedPeriods, soFilter, outcomeFilter, indicatorFilter, disaggFilters, projects]);

  // ─── KPI Computations ──────────────────────────────────────
  const kpis = useMemo(() => {
    const uniqueProjects = new Set(filteredRows.map(r => r.projectId));
    const uniqueReports = new Set(filteredRows.map(r => r.reportId));
    const uniqueIndicators = new Set(filteredRows.map(r => r.indicatorId));
    const genderCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    filteredRows.forEach(r => {
      if (r.data.gender) genderCounts[r.data.gender] = (genderCounts[r.data.gender] || 0) + 1;
      if (r.data.age) ageCounts[r.data.age] = (ageCounts[r.data.age] || 0) + 1;
    });
    const total = filteredRows.length;
    const maleCount = genderCounts['Male'] || 0;
    const femaleCount = genderCounts['Female'] || 0;
    const malePct = total > 0 ? Math.round((maleCount / total) * 100) : 0;
    const femalePct = total > 0 ? Math.round((femaleCount / total) * 100) : 0;
    // Youth 18-25
    const youthCount = (ageCounts['18-25'] || 0);
    const youthPct = total > 0 ? Math.round((youthCount / total) * 100) : 0;

    return {
      totalBeneficiaries: total,
      totalProjects: uniqueProjects.size,
      totalCycles: uniqueReports.size,
      totalIndicators: uniqueIndicators.size,
      malePct,
      femalePct,
      maleCount,
      femaleCount,
      youthPct,
      youthCount,
      genderCounts,
      ageCounts,
    };
  }, [filteredRows]);

  // ─── Chart Data ─────────────────────────────────────────────
  const beneficiariesByProject = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => { map[r.projectName] = (map[r.projectName] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filteredRows]);

  const beneficiariesByIndicator = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => { map[r.indicatorName] = (map[r.indicatorName] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name: name.length > 30 ? name.slice(0, 28) + '…' : name, fullName: name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filteredRows]);

  const genderDonut = useMemo(() => {
    return Object.entries(kpis.genderCounts).map(([name, value]) => ({ name, value }));
  }, [kpis.genderCounts]);

  const ageDistribution = useMemo(() => {
    return AGE_OPTIONS.map(age => ({ name: age, count: kpis.ageCounts[age] || 0 }));
  }, [kpis.ageCounts]);

  const ruralUrbanData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRows.forEach(r => {
      if (r.data.ruralUrban) counts[r.data.ruralUrban] = (counts[r.data.ruralUrban] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRows]);

  const outcomeAggregation = useMemo(() => {
    const map: Record<string, { name: string; indicators: Record<string, number> }> = {};
    filteredRows.forEach(r => {
      if (!map[r.outcomeId]) map[r.outcomeId] = { name: r.outcomeName.length > 25 ? r.outcomeName.slice(0, 23) + '…' : r.outcomeName, indicators: {} };
      map[r.outcomeId].indicators[r.indicatorName] = (map[r.outcomeId].indicators[r.indicatorName] || 0) + 1;
    });
    return Object.entries(map).map(([, v]) => ({
      name: v.name,
      total: Object.values(v.indicators).reduce((s, c) => s + c, 0),
    }));
  }, [filteredRows]);

  const objectiveKPIs = useMemo(() => {
    const map: Record<string, number> = { '1': 0, '2': 0, '3': 0 };
    filteredRows.forEach(r => {
      const prefix = getSOPrefix(r.objectiveName);
      if (prefix && map[prefix] !== undefined) map[prefix] += 1;
    });
    return Object.entries(STRATEGIC_OBJECTIVES).map(([key, label]) => ({
      key,
      label: `Objective ${key}`,
      fullLabel: label,
      count: map[key] || 0,
    }));
  }, [filteredRows]);

  // ─── Auto-generated Insights ────────────────────────────────
  const autoInsights = useMemo(() => {
    const insights: string[] = [];
    const total = filteredRows.length;
    if (total === 0) return ['No data matches current filters. Try adjusting your selections.'];

    // Gender insight
    if (kpis.malePct > 0 || kpis.femalePct > 0) {
      const dominant = kpis.malePct > kpis.femalePct ? 'male' : 'female';
      const pct = Math.max(kpis.malePct, kpis.femalePct);
      insights.push(`${pct}% of beneficiaries are ${dominant} across ${kpis.totalProjects} project${kpis.totalProjects !== 1 ? 's' : ''}.`);
    }

    // Youth insight
    if (kpis.youthPct > 0) {
      insights.push(`Youth (18–25) represent ${kpis.youthPct}% of total beneficiaries (${kpis.youthCount.toLocaleString()} entries).`);
    }

    // Top indicator
    if (beneficiariesByIndicator.length > 0) {
      const top = beneficiariesByIndicator[0];
      insights.push(`Top indicator: "${top.fullName || top.name}" with ${top.count.toLocaleString()} data points.`);
    }

    // Objective performance
    const topObj = objectiveKPIs.reduce((a, b) => a.count > b.count ? a : b);
    if (topObj.count > 0) {
      insights.push(`${topObj.label} drives the most impact with ${topObj.count.toLocaleString()} data points.`);
    }

    return insights;
  }, [filteredRows, kpis, beneficiariesByIndicator, objectiveKPIs]);

  // ─── Table logic ────────────────────────────────────────────
  const tableRows = useMemo(() => {
    let rows = [...filteredRows];
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter(r =>
        r.projectName.toLowerCase().includes(q) ||
        r.indicatorName.toLowerCase().includes(q) ||
        r.periodLabel.toLowerCase().includes(q) ||
        r.objectiveName.toLowerCase().includes(q) ||
        r.outcomeName.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const aVal = (a as any)[sortCol] || (a.data as any)[sortCol] || '';
      const bVal = (b as any)[sortCol] || (b.data as any)[sortCol] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filteredRows, tableSearch, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / ROWS_PER_PAGE));
  const pagedRows = tableRows.slice((tablePage - 1) * ROWS_PER_PAGE, tablePage * ROWS_PER_PAGE);

  const handleSort = useCallback((col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }, [sortCol]);

  // Active filter pills
  const activeFilters = useMemo(() => {
    const pills: { label: string; key: string; onRemove: () => void }[] = [];
    selectedProjects.forEach(id => {
      const p = projects.find(x => x.id === id);
      if (p) pills.push({ label: `Project: ${p.name}`, key: `proj-${id}`, onRemove: () => setSelectedProjects(prev => prev.filter(x => x !== id)) });
    });
    selectedPeriods.forEach(p => {
      pills.push({ label: `Period: ${p}`, key: `per-${p}`, onRemove: () => setSelectedPeriods(prev => prev.filter(x => x !== p)) });
    });
    if (statusFilter !== 'published') pills.push({ label: `Status: ${statusFilter}`, key: 'status', onRemove: () => setStatusFilter('published') });
    if (catFilter !== 'all') pills.push({ label: `Category: ${catFilter}`, key: 'cat', onRemove: () => setCatFilter('all') });
    if (soFilter !== 'all') pills.push({ label: `Objective ${soFilter}`, key: 'so', onRemove: () => { setSOFilter('all'); setOutcomeFilter('all'); setIndicatorFilter('all'); } });
    if (outcomeFilter !== 'all') {
      const o = allOutcomes.find(([id]) => id === outcomeFilter);
      pills.push({ label: `Outcome: ${o?.[1]?.slice(0, 25) || outcomeFilter}`, key: 'out', onRemove: () => setOutcomeFilter('all') });
    }
    if (indicatorFilter !== 'all') {
      const i = allIndicators.find(([id]) => id === indicatorFilter);
      pills.push({ label: `Indicator: ${i?.[1]?.slice(0, 25) || indicatorFilter}`, key: 'ind', onRemove: () => setIndicatorFilter('all') });
    }
    Object.entries(disaggFilters).forEach(([key, val]) => {
      if (val && val !== 'all') {
        const f = DISAGG_FILTERS.find(d => d.key === key);
        pills.push({ label: `${f?.label || key}: ${val}`, key: `disagg-${key}`, onRemove: () => setDisaggFilters(prev => { const n = { ...prev }; delete n[key]; return n; }) });
      }
    });
    return pills;
  }, [selectedProjects, selectedPeriods, statusFilter, catFilter, soFilter, outcomeFilter, indicatorFilter, disaggFilters, projects, allOutcomes, allIndicators]);

  const clearAllFilters = () => {
    setSelectedProjects([]);
    setSelectedPeriods([]);
    setStatusFilter('published');
    setCatFilter('all');
    setSOFilter('all');
    setOutcomeFilter('all');
    setIndicatorFilter('all');
    setDisaggFilters({});
    setTablePage(1);
    setInsightQuery('');
  };

  const exportCSV = useCallback(() => {
    const headers = ['Project', 'Period', 'Objective', 'Outcome', 'Indicator', 'Gender', 'Age', 'Economy', 'Sector', 'Rural/Urban', 'Disability', 'Stakeholder', 'Partner', 'Technology', 'Topic'];
    const csvRows = [headers.join(',')];
    tableRows.forEach(r => {
      csvRows.push([
        `"${r.projectName}"`, `"${r.periodLabel}"`, `"${r.objectiveName}"`, `"${r.outcomeName}"`, `"${r.indicatorName}"`,
        `"${r.data.gender}"`, `"${r.data.age}"`, `"${r.data.economy}"`, `"${r.data.sectorOrgType}"`, `"${r.data.ruralUrban}"`,
        `"${r.data.disability}"`, `"${r.data.stakeholderType}"`, `"${r.data.partnerType}"`, `"${r.data.technology}"`, `"${r.data.topic}"`,
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mel-impact-data-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [tableRows]);

  const toggleProject = (id: string) => {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setTablePage(1);
  };

  const togglePeriod = (p: string) => {
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    setTablePage(1);
  };

  // Drill-down handlers
  const openProjectDrill = (projectName: string) => {
    const rows = filteredRows.filter(r => r.projectName === projectName);
    setDrillDown({ type: 'project', title: projectName, subtitle: `${rows.length} data points`, rows });
  };

  const openIndicatorDrill = (indicatorName: string) => {
    const rows = filteredRows.filter(r => r.indicatorName === indicatorName || r.indicatorName.startsWith(indicatorName.replace('…', '')));
    setDrillDown({ type: 'indicator', title: indicatorName, subtitle: `${rows.length} data points`, rows });
  };

  const openObjectiveDrill = (objKey: string) => {
    const rows = filteredRows.filter(r => getSOPrefix(r.objectiveName) === objKey);
    setDrillDown({ type: 'objective', title: `Objective ${objKey}`, subtitle: STRATEGIC_OBJECTIVES[objKey]?.split(' – ')[1], rows });
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="page-container pb-12">
      {/* ═══ 1. HEADER + INSIGHT SEARCH ═══ */}
      <div className="animate-in pt-2 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Impact Intelligence</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">Decision-driven analytics across all projects</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 text-[13px] h-9 rounded-lg">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Insight Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <input
            type="text"
            value={insightQuery}
            onChange={e => setInsightQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInsightSearch()}
            placeholder="Ask your data… e.g. Male beneficiaries aged 18–25, Impact of Indicator 1.2.1"
            className="w-full h-13 pl-12 pr-24 rounded-2xl border border-border bg-card text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-card"
          />
          <Button
            size="sm"
            onClick={handleInsightSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 rounded-xl text-[13px] gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> Search
          </Button>
        </div>
      </div>

      {/* ═══ 2. SMART FILTER CHIPS ═══ */}
      <div className="animate-in-delay-1 mb-6 relative z-[120]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project chip */}
          <FilterChip label="Project" hasValue={selectedProjects.length > 0}>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-[13px] cursor-pointer hover:bg-secondary/60 rounded-md px-2 py-1.5 transition-colors">
                  <Checkbox checked={selectedProjects.includes(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </FilterChip>

          {/* Objective chip */}
          <FilterChip label="Objective" hasValue={soFilter !== 'all'}>
            <div className="p-2 space-y-0.5">
              <button onClick={() => { setSOFilter('all'); setOutcomeFilter('all'); setIndicatorFilter('all'); }} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${soFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>All Objectives</button>
              {Object.entries(STRATEGIC_OBJECTIVES).map(([k, v]) => (
                <button key={k} onClick={() => { setSOFilter(k); setOutcomeFilter('all'); setIndicatorFilter('all'); }} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${soFilter === k ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>
                  {v.length > 55 ? v.slice(0, 53) + '…' : v}
                </button>
              ))}
            </div>
          </FilterChip>

          {/* Outcome chip */}
          <FilterChip label="Outcome" hasValue={outcomeFilter !== 'all'}>
            <div className="p-2 space-y-0.5 max-h-56 overflow-y-auto">
              <button onClick={() => setOutcomeFilter('all')} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${outcomeFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>All Outcomes</button>
              {allOutcomes.map(([id, name]) => (
                <button key={id} onClick={() => setOutcomeFilter(id)} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${outcomeFilter === id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>{name}</button>
              ))}
            </div>
          </FilterChip>

          {/* Indicator chip */}
          <FilterChip label="Indicator" hasValue={indicatorFilter !== 'all'}>
            <div className="p-2 space-y-0.5 max-h-56 overflow-y-auto">
              <button onClick={() => setIndicatorFilter('all')} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${indicatorFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>All Indicators</button>
              {allIndicators.map(([id, name]) => (
                <button key={id} onClick={() => setIndicatorFilter(id)} className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${indicatorFilter === id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>{name}</button>
              ))}
            </div>
          </FilterChip>

          {/* Period chip */}
          <FilterChip label="Period" hasValue={selectedPeriods.length > 0}>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {allPeriods.map(p => (
                <label key={p} className="flex items-center gap-2 text-[13px] cursor-pointer hover:bg-secondary/60 rounded-md px-2 py-1.5 transition-colors">
                  <Checkbox checked={selectedPeriods.includes(p)} onCheckedChange={() => togglePeriod(p)} />
                  {p}
                </label>
              ))}
            </div>
          </FilterChip>

          {/* Status */}
          <FilterChip label="Status" hasValue={statusFilter !== 'published'}>
            <div className="p-2 space-y-0.5">
              {['published', 'all', 'completed', 'draft', 're_published'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`w-full text-left px-3 py-2 rounded-md text-[13px] capitalize transition-colors ${statusFilter === s ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>{s === 're_published' ? 'Re-published' : s}</button>
              ))}
            </div>
          </FilterChip>

          {/* More filters toggle */}
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {showMoreFilters ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showMoreFilters ? 'Less' : 'More filters'}
          </button>

          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} className="text-[12px] text-primary hover:text-primary/80 transition-colors font-medium ml-auto">
              Clear all
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activeFilters.map(f => (
              <Badge key={f.key} variant="secondary" className="text-[12px] gap-1.5 pr-1.5 pl-2.5 py-1 rounded-full bg-primary/8 text-primary border-0 hover:bg-primary/12 transition-colors">
                {f.label}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={f.onRemove} />
              </Badge>
            ))}
          </div>
        )}

        {/* Expanded disaggregation filters */}
        {showMoreFilters && (
          <div className="mt-4 p-4 rounded-xl bg-card border border-border animate-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {DISAGG_FILTERS.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                  <Select value={disaggFilters[f.key] || 'all'} onValueChange={v => { setDisaggFilters(prev => ({ ...prev, [f.key]: v })); setTablePage(1); }}>
                    <SelectTrigger className="h-9 text-[12px] rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {/* Category filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                <Select value={catFilter} onValueChange={v => { setCatFilter(v); setTablePage(1); }}>
                  <SelectTrigger className="h-9 text-[12px] rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {GENERAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 3. LIVE IMPACT SUMMARY KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 animate-in-delay-1 relative z-0">
        <KPICard
          label="Total Beneficiaries"
          value={kpis.totalBeneficiaries}
          icon={Users}
          onClick={() => setDrillDown({ type: 'kpi', title: 'All Beneficiaries', subtitle: `${kpis.totalBeneficiaries} total data points`, rows: filteredRows })}
        />
        <KPICard
          label="Projects"
          value={kpis.totalProjects}
          icon={Layers}
        />
        <KPICard
          label="Report Cycles"
          value={kpis.totalCycles}
          icon={FileText}
        />
        <KPICard
          label="Active Indicators"
          value={kpis.totalIndicators}
          icon={Activity}
        />
        <KPICard
          label="Male %"
          value={kpis.malePct}
          suffix="%"
          secondaryText={`${kpis.maleCount} entries`}
          icon={TrendingUp}
        />
        <KPICard
          label="Youth (18–25)"
          value={kpis.youthPct}
          suffix="%"
          secondaryText={`${kpis.youthCount} entries`}
          icon={TrendingUp}
        />
      </div>

      {/* ═══ OBJECTIVE-LEVEL CARDS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 animate-in-delay-2">
        {objectiveKPIs.map(obj => (
          <button
            key={obj.key}
            onClick={() => openObjectiveDrill(obj.key)}
            className="card-elevated-hover p-5 text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">{obj.label}</p>
                <p className="text-[28px] font-bold tracking-tight leading-none mt-1">
                  <AnimatedNumber value={obj.count} />
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{obj.fullLabel.split(' – ')[1]}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ═══ AUTO-INSIGHTS ═══ */}
      <div className="mb-8 animate-in-delay-2">
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-primary/10 p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-foreground">Key Insights</p>
              {autoInsights.map((insight, i) => (
                <p key={i} className="text-[13px] text-muted-foreground leading-relaxed">{insight}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT TABS ═══ */}
      <Tabs value={mainTab} onValueChange={v => setMainTab(v as any)} className="animate-in-delay-3">
        <TabsList className="mb-6 bg-secondary/50 p-0.5 rounded-xl">
          <TabsTrigger value="insights" className="rounded-lg text-[13px] gap-1.5 data-[state=active]:shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Insights
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-lg text-[13px] gap-1.5 data-[state=active]:shadow-sm">
            <TableIcon className="h-3.5 w-3.5" /> Raw Data
          </TabsTrigger>
          <TabsTrigger value="bi" className="rounded-lg text-[13px] gap-1.5 data-[state=active]:shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> BI Explorer
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg text-[13px] gap-1.5 data-[state=active]:shadow-sm">
            <Bot className="h-3.5 w-3.5" /> AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* ═══ INSIGHTS TAB ═══ */}
        <TabsContent value="insights" className="space-y-8">
          {/* Section A — Impact Overview */}
          <div>
            <SectionHeader title="Impact Overview" subtitle="Beneficiary distribution across projects and indicators" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Beneficiaries by Project">
                {beneficiariesByProject.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={beneficiariesByProject} layout="vertical" margin={{ left: 10 }}
                      onClick={(data) => { if (data?.activePayload?.[0]) openProjectDrill(data.activePayload[0].payload.name); }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} width={140} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px', boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.08)' }} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="Top Indicators">
                {beneficiariesByIndicator.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={beneficiariesByIndicator} layout="vertical" margin={{ left: 10 }}
                      onClick={(data) => { if (data?.activePayload?.[0]) openIndicatorDrill(data.activePayload[0].payload.name); }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={180} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px', boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.08)' }} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>
            </div>
          </div>

          {/* Section B — Demographic Insight */}
          <div>
            <SectionHeader title="Demographic Insight" subtitle="Gender, age and geographic distribution of beneficiaries" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ChartCard title="Gender Distribution">
                {genderDonut.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={genderDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}
                        strokeWidth={0}>
                        {genderDonut.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-[12px] text-foreground">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="Age Distribution">
                {ageDistribution.some(a => a.count > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="count" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="Rural vs Urban">
                {ruralUrbanData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={ruralUrbanData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}
                        strokeWidth={0}>
                        {ruralUrbanData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-[12px] text-foreground">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>
            </div>
          </div>

          {/* Section C — Contribution Map */}
          <div>
            <SectionHeader title="Contribution Map" subtitle="Objective and outcome-level aggregation" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Objective-Level Impact">
                {objectiveKPIs.some(o => o.count > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={objectiveKPIs.map(o => ({ name: o.label, count: o.count }))}
                      onClick={(data) => { if (data?.activePayload?.[0]) { const name = data.activePayload[0].payload.name; openObjectiveDrill(name.replace('Objective ', '')); } }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="Outcome Comparison">
                {outcomeAggregation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={outcomeAggregation} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={150} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="total" fill="hsl(280, 55%, 50%)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>
            </div>
          </div>
        </TabsContent>

        {/* ═══ RAW DATA TAB ═══ */}
        <TabsContent value="data">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">Impact Data</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">{tableRows.length} records</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search…" value={tableSearch} onChange={e => { setTableSearch(e.target.value); setTablePage(1); }}
                    className="pl-8 h-9 w-52 text-[12px] rounded-lg" />
                </div>
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowColToggle(!showColToggle)} className="text-[12px] gap-1 h-9 rounded-lg">
                    Columns <ChevronDown className="h-3 w-3" />
                  </Button>
                  {showColToggle && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-elevated p-3 space-y-2 w-48">
                      {Object.entries(visibleCols).map(([col, visible]) => (
                        <label key={col} className="flex items-center gap-2 text-[12px] cursor-pointer">
                          <Checkbox checked={visible} onCheckedChange={(checked) => setVisibleCols(prev => ({ ...prev, [col]: !!checked }))} />
                          {col === 'sectorOrgType' ? 'Sector' : col === 'ruralUrban' ? 'Rural/Urban' : col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {visibleCols.projectName && <TableHead className="cursor-pointer text-[11px] whitespace-nowrap font-semibold" onClick={() => handleSort('projectName')}>Project <SortIcon col="projectName" /></TableHead>}
                    {visibleCols.periodLabel && <TableHead className="cursor-pointer text-[11px] whitespace-nowrap font-semibold" onClick={() => handleSort('periodLabel')}>Period <SortIcon col="periodLabel" /></TableHead>}
                    {visibleCols.objectiveName && <TableHead className="cursor-pointer text-[11px] whitespace-nowrap font-semibold" onClick={() => handleSort('objectiveName')}>Objective <SortIcon col="objectiveName" /></TableHead>}
                    {visibleCols.outcomeName && <TableHead className="cursor-pointer text-[11px] whitespace-nowrap font-semibold" onClick={() => handleSort('outcomeName')}>Outcome <SortIcon col="outcomeName" /></TableHead>}
                    {visibleCols.indicatorName && <TableHead className="cursor-pointer text-[11px] whitespace-nowrap font-semibold" onClick={() => handleSort('indicatorName')}>Indicator <SortIcon col="indicatorName" /></TableHead>}
                    {visibleCols.gender && <TableHead className="cursor-pointer text-[11px] font-semibold" onClick={() => handleSort('gender')}>Gender <SortIcon col="gender" /></TableHead>}
                    {visibleCols.age && <TableHead className="cursor-pointer text-[11px] font-semibold" onClick={() => handleSort('age')}>Age <SortIcon col="age" /></TableHead>}
                    {visibleCols.economy && <TableHead className="cursor-pointer text-[11px] font-semibold" onClick={() => handleSort('economy')}>Economy <SortIcon col="economy" /></TableHead>}
                    {visibleCols.ruralUrban && <TableHead className="text-[11px] font-semibold">Rural/Urban</TableHead>}
                    {visibleCols.disability && <TableHead className="text-[11px] font-semibold">Disability</TableHead>}
                    {visibleCols.sectorOrgType && <TableHead className="text-[11px] font-semibold">Sector</TableHead>}
                    {visibleCols.stakeholderType && <TableHead className="text-[11px] font-semibold">Stakeholder</TableHead>}
                    {visibleCols.partnerType && <TableHead className="text-[11px] font-semibold">Partner</TableHead>}
                    {visibleCols.technology && <TableHead className="text-[11px] font-semibold">Technology</TableHead>}
                    {visibleCols.topic && <TableHead className="text-[11px] font-semibold">Topic</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Object.values(visibleCols).filter(Boolean).length} className="text-center py-16">
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  ) : pagedRows.map((row, idx) => (
                    <TableRow key={`${row.reportId}-${row.indicatorId}-${idx}`} className="text-[12px]">
                      {visibleCols.projectName && <TableCell className="font-medium max-w-[160px] truncate">{row.projectName}</TableCell>}
                      {visibleCols.periodLabel && <TableCell>{row.periodLabel}</TableCell>}
                      {visibleCols.objectiveName && <TableCell className="max-w-[140px] truncate">{row.objectiveName}</TableCell>}
                      {visibleCols.outcomeName && <TableCell className="max-w-[140px] truncate">{row.outcomeName}</TableCell>}
                      {visibleCols.indicatorName && <TableCell className="max-w-[140px] truncate">{row.indicatorName}</TableCell>}
                      {visibleCols.gender && <TableCell>{row.data.gender || '—'}</TableCell>}
                      {visibleCols.age && <TableCell>{row.data.age || '—'}</TableCell>}
                      {visibleCols.economy && <TableCell>{row.data.economy || '—'}</TableCell>}
                      {visibleCols.ruralUrban && <TableCell>{row.data.ruralUrban || '—'}</TableCell>}
                      {visibleCols.disability && <TableCell>{row.data.disability || '—'}</TableCell>}
                      {visibleCols.sectorOrgType && <TableCell>{row.data.sectorOrgType || '—'}</TableCell>}
                      {visibleCols.stakeholderType && <TableCell>{row.data.stakeholderType || '—'}</TableCell>}
                      {visibleCols.partnerType && <TableCell>{row.data.partnerType || '—'}</TableCell>}
                      {visibleCols.technology && <TableCell>{row.data.technology || '—'}</TableCell>}
                      {visibleCols.topic && <TableCell>{row.data.topic || '—'}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-border flex items-center justify-between">
                <p className="text-[12px] text-muted-foreground">Page {tablePage} of {totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={tablePage <= 1} onClick={() => setTablePage(p => p - 1)} className="text-[12px] h-8 rounded-lg">Previous</Button>
                  <Button variant="outline" size="sm" disabled={tablePage >= totalPages} onClick={() => setTablePage(p => p + 1)} className="text-[12px] h-8 rounded-lg">Next</Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ BI EXPLORER TAB ═══ */}
        <TabsContent value="bi">
          <BIExplorer />
        </TabsContent>

        {/* ═══ AI ASSISTANT TAB ═══ */}
        <TabsContent value="ai">
          <AIReportingAssistant />
        </TabsContent>
      </Tabs>

      {/* ═══ DRILL-DOWN SLIDING PANEL ═══ */}
      <Sheet open={!!drillDown} onOpenChange={open => { if (!open) setDrillDown(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-[18px]">{drillDown?.title}</SheetTitle>
            {drillDown?.subtitle && <SheetDescription>{drillDown.subtitle}</SheetDescription>}
          </SheetHeader>

          {drillDown && (
            <div className="space-y-6">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-[11px] text-muted-foreground font-medium">Data Points</p>
                  <p className="text-[24px] font-bold tracking-tight">{drillDown.rows.length}</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-[11px] text-muted-foreground font-medium">Unique Indicators</p>
                  <p className="text-[24px] font-bold tracking-tight">{new Set(drillDown.rows.map(r => r.indicatorId)).size}</p>
                </div>
              </div>

              {/* Gender breakdown */}
              {(() => {
                const genders: Record<string, number> = {};
                drillDown.rows.forEach(r => { if (r.data.gender) genders[r.data.gender] = (genders[r.data.gender] || 0) + 1; });
                if (Object.keys(genders).length === 0) return null;
                return (
                  <div>
                    <p className="text-[13px] font-semibold mb-3">Gender Breakdown</p>
                    <div className="space-y-2">
                      {Object.entries(genders).map(([g, c]) => {
                        const pct = Math.round((c / drillDown.rows.length) * 100);
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
                );
              })()}

              {/* Indicators list */}
              <div>
                <p className="text-[13px] font-semibold mb-3">Related Indicators</p>
                <div className="space-y-1.5">
                  {Array.from(new Set(drillDown.rows.map(r => r.indicatorName))).map(name => {
                    const count = drillDown.rows.filter(r => r.indicatorName === name).length;
                    return (
                      <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-[12px]">
                        <span className="truncate max-w-[280px] text-foreground">{name}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reporting cycles */}
              <div>
                <p className="text-[13px] font-semibold mb-3">Reporting Cycles</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(drillDown.rows.map(r => r.periodLabel))).map(p => (
                    <Badge key={p} variant="outline" className="text-[11px]">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function FilterChip({ label, hasValue, children }: { label: string; hasValue: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" style={{ zIndex: open ? 1200 : 'auto' }}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border ${
          hasValue
            ? 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/12'
            : 'bg-card text-foreground border-border hover:border-primary/30 hover:bg-secondary/50'
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[1190]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-[1200] min-w-[220px] max-w-[320px] rounded-xl border border-border bg-popover shadow-xl ring-1 ring-border/50 animate-in">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, suffix = '', secondaryText, icon: Icon, onClick }: {
  label: string;
  value: number;
  suffix?: string;
  secondaryText?: string;
  icon: any;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-elevated-hover p-5 text-left group w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[28px] font-bold tracking-tight leading-none mt-1.5">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
          {secondaryText && <p className="text-[11px] text-muted-foreground mt-1">{secondaryText}</p>}
        </div>
        <div className="h-9 w-9 rounded-xl bg-primary/6 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </button>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-[14px] font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <BarChart3 className="h-8 w-8 text-muted-foreground/20" />
      <p className="text-[13px] text-muted-foreground">No data available</p>
    </div>
  );
}
