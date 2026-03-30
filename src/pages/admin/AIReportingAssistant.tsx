import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Project, DisaggregatedData } from '@/types';
import { AGE_OPTIONS, GENDER_OPTIONS } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Send, Bot, User, Trash2, Loader2, BarChart3, TrendingUp, Info,
  MessageSquare, Maximize2, Minimize2, Copy, Check, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Constants ────────────────────────────────────────────────
const CHART_COLORS = [
  'hsl(215, 65%, 52%)', 'hsl(160, 40%, 45%)', 'hsl(38, 88%, 50%)',
  'hsl(280, 55%, 50%)', 'hsl(0, 60%, 52%)', 'hsl(190, 55%, 48%)',
  'hsl(330, 55%, 52%)', 'hsl(100, 40%, 45%)',
];

const STRATEGIC_OBJECTIVES: Record<string, string> = {
  '1': 'Objective 1 – Enhance technical capability',
  '2': 'Objective 2 – Enhance digital inclusion',
  '3': 'Objective 3 – Influence techno policy transformation',
};

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

type ChartType = 'bar' | 'line' | 'donut' | 'comparison' | null;

interface ChartData {
  type: ChartType;
  data: Record<string, any>[];
  keys?: string[];
  title?: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chart?: ChartData;
  filters?: string[];
  isStreaming?: boolean;
}

interface ParsedIntent {
  type: 'count' | 'aggregation' | 'comparison' | 'trend' | 'indicator' | 'unknown';
  metric: string;
  filters: Record<string, string>;
  compareItems?: string[];
  indicatorCode?: string;
  yearFilter?: string;
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

function getSOPrefix(objectiveName: string): string | null {
  for (const key of Object.keys(STRATEGIC_OBJECTIVES)) {
    if (objectiveName.toLowerCase().includes(`objective ${key}`)) return key;
  }
  return null;
}

// ─── Intent Parser ────────────────────────────────────────────
function parseIntent(query: string, projects: Project[]): ParsedIntent {
  const q = query.toLowerCase().trim();
  const filters: Record<string, string> = {};
  let type: ParsedIntent['type'] = 'unknown';
  let metric = 'beneficiaries';
  let compareItems: string[] | undefined;
  let indicatorCode: string | undefined;
  let yearFilter: string | undefined;

  // Detect year
  const yearMatch = q.match(/\b(20\d{2})\b/);
  if (yearMatch) yearFilter = yearMatch[1];

  // Detect indicator code
  const indMatch = q.match(/(\d+\.\d+\.\d+)/);
  if (indMatch) indicatorCode = indMatch[1];

  // Detect gender
  if (q.includes('female')) filters.gender = 'Female';
  else if (q.includes('male')) filters.gender = 'Male';
  else if (q.includes('non-binary')) filters.gender = 'Non-binary';

  // Detect age
  const ageMatch = q.match(/(\d{2})\s*[-–]\s*(\d{2})/);
  if (ageMatch) {
    const ageStr = `${ageMatch[1]}-${ageMatch[2]}`;
    const matched = AGE_OPTIONS.find(a => a.includes(ageStr));
    if (matched) filters.age = matched;
  }
  if (q.includes('youth') || q.includes('young')) filters.age = '18-24';
  if (q.includes('under 18')) filters.age = 'Under 18';

  // Detect objective
  const objMatch = q.match(/objective\s*(\d)/i);
  if (objMatch) filters.objective = objMatch[1];

  // Detect outcome
  const outMatch = q.match(/outcome\s*(\d+\.\d+)/i);
  if (outMatch) filters.outcome = outMatch[1];

  // Detect project
  for (const p of projects) {
    if (q.includes(p.name.toLowerCase())) {
      filters.project = p.name;
      break;
    }
  }

  // Detect economy
  for (const e of ['developed', 'developing', 'emerging', 'least developed']) {
    if (q.includes(e)) { filters.economy = e.charAt(0).toUpperCase() + e.slice(1); break; }
  }

  // Detect rural/urban
  if (q.includes('rural')) filters.ruralUrban = 'Rural';
  if (q.includes('urban') && !q.includes('rural')) filters.ruralUrban = 'Urban';

  // Determine type
  if (q.includes('compare') || q.includes('vs') || q.includes('versus') || q.includes('side by side')) {
    type = 'comparison';
    // Try to extract comparison items
    const vsMatch = q.match(/compare\s+(.+?)\s+(?:and|vs|versus)\s+(.+?)(?:\s|$|\.)/i);
    if (vsMatch) compareItems = [vsMatch[1].trim(), vsMatch[2].trim()];
    else {
      // Try "male vs female"
      const vs2 = q.match(/(\w+)\s+vs\.?\s+(\w+)/i);
      if (vs2) compareItems = [vs2[1].trim(), vs2[2].trim()];
    }
  } else if (q.includes('trend') || q.includes('over time') || q.includes('performance')) {
    type = 'trend';
  } else if (indicatorCode) {
    type = 'indicator';
  } else if (q.includes('how many') || q.includes('count') || q.includes('total') || q.includes('number')) {
    type = 'count';
  } else if (Object.keys(filters).length > 0 || yearFilter) {
    type = 'aggregation';
  }

  // Detect metric
  if (q.includes('project')) metric = 'projects';
  else if (q.includes('indicator')) metric = 'indicators';
  else if (q.includes('cycle') || q.includes('report')) metric = 'cycles';
  else if (q.includes('beneficiar') || q.includes('trained') || q.includes('user') || q.includes('people')) metric = 'beneficiaries';

  return { type, metric, filters, compareItems, indicatorCode, yearFilter };
}

// ─── Answer Generator ─────────────────────────────────────────
function generateAnswer(
  intent: ParsedIntent,
  allRows: FlatRow[],
  projects: Project[],
): { text: string; chart?: ChartData; filters: string[] } {
  const filterLabels: string[] = [];

  // Apply filters
  let rows = [...allRows];

  if (intent.yearFilter) {
    rows = rows.filter(r => r.periodLabel.includes(intent.yearFilter!));
    filterLabels.push(`Year: ${intent.yearFilter}`);
  }

  if (intent.filters.gender) {
    rows = rows.filter(r => r.data.gender === intent.filters.gender);
    filterLabels.push(`Gender: ${intent.filters.gender}`);
  }

  if (intent.filters.age) {
    rows = rows.filter(r => r.data.age === intent.filters.age);
    filterLabels.push(`Age: ${intent.filters.age}`);
  }

  if (intent.filters.objective) {
    rows = rows.filter(r => getSOPrefix(r.objectiveName) === intent.filters.objective);
    filterLabels.push(`Objective: ${intent.filters.objective}`);
  }

  if (intent.filters.outcome) {
    rows = rows.filter(r => r.outcomeName.includes(intent.filters.outcome!));
    filterLabels.push(`Outcome: ${intent.filters.outcome}`);
  }

  if (intent.filters.project) {
    rows = rows.filter(r => r.projectName.toLowerCase() === intent.filters.project!.toLowerCase());
    filterLabels.push(`Project: ${intent.filters.project}`);
  }

  if (intent.filters.economy) {
    rows = rows.filter(r => r.data.economy === intent.filters.economy);
    filterLabels.push(`Economy: ${intent.filters.economy}`);
  }

  if (intent.filters.ruralUrban) {
    rows = rows.filter(r => r.data.ruralUrban === intent.filters.ruralUrban);
    filterLabels.push(`Location: ${intent.filters.ruralUrban}`);
  }

  if (intent.indicatorCode) {
    rows = rows.filter(r => r.indicatorName.includes(intent.indicatorCode!));
    filterLabels.push(`Indicator: ${intent.indicatorCode}`);
  }

  filterLabels.push('Status: Published / Completed');

  if (rows.length === 0) {
    return {
      text: "No data found matching your query. This could mean no published reports exist for the specified filters. Try broadening your search or removing some filter criteria.",
      filters: filterLabels,
    };
  }

  const uniqueProjects = new Set(rows.map(r => r.projectId));
  const uniqueIndicators = new Set(rows.map(r => r.indicatorId));
  const uniqueCycles = new Set(rows.map(r => r.reportId));

  switch (intent.type) {
    case 'count': {
      if (intent.metric === 'indicators') {
        const count = uniqueIndicators.size;
        const byObj: Record<string, Set<string>> = {};
        rows.forEach(r => {
          const p = getSOPrefix(r.objectiveName) || 'Other';
          if (!byObj[p]) byObj[p] = new Set();
          byObj[p].add(r.indicatorId);
        });
        const breakdown = Object.entries(byObj).map(([k, v]) => `Objective ${k}: ${v.size}`).join(', ');
        return {
          text: `**${count} unique indicators** were reported${intent.yearFilter ? ` in ${intent.yearFilter}` : ''} across **${uniqueProjects.size} projects** and **${uniqueCycles.size} reporting cycles**.\n\nBreakdown by objective: ${breakdown}.`,
          chart: {
            type: 'bar',
            title: 'Indicators by Objective',
            data: Object.entries(byObj).map(([k, v]) => ({ name: `Objective ${k}`, count: v.size })),
          },
          filters: filterLabels,
        };
      }
      if (intent.metric === 'projects') {
        return {
          text: `**${uniqueProjects.size} projects** have published data${intent.yearFilter ? ` in ${intent.yearFilter}` : ''}.\n\nProjects: ${Array.from(new Set(rows.map(r => r.projectName))).join(', ')}.`,
          filters: filterLabels,
        };
      }
      if (intent.metric === 'cycles') {
        return {
          text: `**${uniqueCycles.size} reporting cycles** were completed${intent.yearFilter ? ` in ${intent.yearFilter}` : ''} across ${uniqueProjects.size} projects.`,
          chart: {
            type: 'bar',
            title: 'Cycles by Project',
            data: Array.from(new Set(rows.map(r => r.projectName))).map(pn => ({
              name: pn.length > 20 ? pn.slice(0, 18) + '…' : pn,
              count: new Set(rows.filter(r => r.projectName === pn).map(r => r.reportId)).size,
            })),
          },
          filters: filterLabels,
        };
      }
      // beneficiaries
      return {
        text: `**${rows.length.toLocaleString()} beneficiary data points** found${intent.yearFilter ? ` in ${intent.yearFilter}` : ''} across **${uniqueProjects.size} projects** and **${uniqueIndicators.size} indicators**.`,
        chart: {
          type: 'bar',
          title: 'Beneficiaries by Project',
          data: Array.from(new Set(rows.map(r => r.projectName))).map(pn => ({
            name: pn.length > 25 ? pn.slice(0, 23) + '…' : pn,
            count: rows.filter(r => r.projectName === pn).length,
          })),
        },
        filters: filterLabels,
      };
    }

    case 'aggregation': {
      const genders: Record<string, number> = {};
      const ages: Record<string, number> = {};
      rows.forEach(r => {
        if (r.data.gender) genders[r.data.gender] = (genders[r.data.gender] || 0) + 1;
        if (r.data.age) ages[r.data.age] = (ages[r.data.age] || 0) + 1;
      });

      let breakdown = '';
      if (Object.keys(genders).length > 0) {
        breakdown += '\n\n**Gender breakdown:** ' + Object.entries(genders).map(([k, v]) => `${k}: ${v}`).join(', ');
      }
      if (Object.keys(ages).length > 0) {
        breakdown += '\n\n**Age breakdown:** ' + Object.entries(ages).map(([k, v]) => `${k}: ${v}`).join(', ');
      }

      return {
        text: `Found **${rows.length.toLocaleString()} matching data points** across **${uniqueProjects.size} projects**.${breakdown}`,
        chart: Object.keys(genders).length > 1 ? {
          type: 'donut',
          title: 'Gender Distribution',
          data: Object.entries(genders).map(([name, value]) => ({ name, value })),
        } : Object.keys(ages).length > 1 ? {
          type: 'bar',
          title: 'Age Distribution',
          data: Object.entries(ages).map(([name, count]) => ({ name, count })),
        } : undefined,
        filters: filterLabels,
      };
    }

    case 'comparison': {
      if (intent.compareItems && intent.compareItems.length === 2) {
        const [a, b] = intent.compareItems;

        // Try project comparison
        const projectA = projects.find(p => p.name.toLowerCase().includes(a.toLowerCase()));
        const projectB = projects.find(p => p.name.toLowerCase().includes(b.toLowerCase()));

        if (projectA && projectB) {
          const rowsA = rows.filter(r => r.projectId === projectA.id);
          const rowsB = rows.filter(r => r.projectId === projectB.id);
          return {
            text: `**Comparison: ${projectA.name} vs ${projectB.name}**\n\n• ${projectA.name}: **${rowsA.length}** data points, **${new Set(rowsA.map(r => r.indicatorId)).size}** indicators\n• ${projectB.name}: **${rowsB.length}** data points, **${new Set(rowsB.map(r => r.indicatorId)).size}** indicators`,
            chart: {
              type: 'comparison',
              title: 'Project Comparison',
              data: [
                { name: projectA.name.length > 20 ? projectA.name.slice(0, 18) + '…' : projectA.name, count: rowsA.length },
                { name: projectB.name.length > 20 ? projectB.name.slice(0, 18) + '…' : projectB.name, count: rowsB.length },
              ],
            },
            filters: filterLabels,
          };
        }

        // Try gender comparison
        if (a.toLowerCase().includes('male') || b.toLowerCase().includes('female')) {
          const maleRows = rows.filter(r => r.data.gender === 'Male');
          const femaleRows = rows.filter(r => r.data.gender === 'Female');
          return {
            text: `**Gender Comparison**\n\n• Male: **${maleRows.length}** data points\n• Female: **${femaleRows.length}** data points\n\nDifference: ${Math.abs(maleRows.length - femaleRows.length)} (${maleRows.length > femaleRows.length ? 'more male' : 'more female'}).`,
            chart: {
              type: 'comparison',
              title: 'Male vs Female',
              data: [
                { name: 'Male', count: maleRows.length },
                { name: 'Female', count: femaleRows.length },
              ],
            },
            filters: filterLabels,
          };
        }
      }

      // Fallback comparison
      const byProject = Array.from(new Set(rows.map(r => r.projectName))).map(pn => ({
        name: pn.length > 25 ? pn.slice(0, 23) + '…' : pn,
        count: rows.filter(r => r.projectName === pn).length,
      })).sort((a, b) => b.count - a.count);

      return {
        text: `Here's a comparison across all projects:\n\n${byProject.map(p => `• ${p.name}: **${p.count}** data points`).join('\n')}`,
        chart: { type: 'comparison', title: 'Project Comparison', data: byProject },
        filters: filterLabels,
      };
    }

    case 'trend': {
      const byPeriod: Record<string, number> = {};
      rows.forEach(r => { byPeriod[r.periodLabel] = (byPeriod[r.periodLabel] || 0) + 1; });
      const trendData = Object.entries(byPeriod)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, count]) => ({ name, count }));

      const direction = trendData.length >= 2
        ? trendData[trendData.length - 1].count > trendData[0].count ? 'upward' : 'downward'
        : 'stable';

      return {
        text: `**Trend Analysis${intent.indicatorCode ? ` for Indicator ${intent.indicatorCode}` : ''}**\n\nData spans **${trendData.length} reporting periods**. The trend shows a **${direction}** trajectory.\n\n${trendData.map(t => `• ${t.name}: ${t.count} data points`).join('\n')}`,
        chart: { type: 'line', title: 'Trend Over Time', data: trendData },
        filters: filterLabels,
      };
    }

    case 'indicator': {
      const byProject = Array.from(new Set(rows.map(r => r.projectName))).map(pn => ({
        name: pn.length > 25 ? pn.slice(0, 23) + '…' : pn,
        count: rows.filter(r => r.projectName === pn).length,
      }));

      const genders: Record<string, number> = {};
      rows.forEach(r => { if (r.data.gender) genders[r.data.gender] = (genders[r.data.gender] || 0) + 1; });
      const genderText = Object.keys(genders).length > 0
        ? '\n\n**Gender split:** ' + Object.entries(genders).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';

      return {
        text: `**Indicator ${intent.indicatorCode}** has **${rows.length} data points** across **${uniqueProjects.size} projects** and **${uniqueCycles.size} reporting cycles**.${genderText}`,
        chart: byProject.length > 0 ? {
          type: 'bar',
          title: `Indicator ${intent.indicatorCode} by Project`,
          data: byProject,
        } : undefined,
        filters: filterLabels,
      };
    }

    default:
      return {
        text: "I'm not able to interpret that question. Try asking about **indicators**, **projects**, **beneficiaries**, or **trends**.\n\nHere are some examples:\n• \"How many indicators in 2025?\"\n• \"Show male vs female beneficiaries\"\n• \"Trend of indicator 1.2.1\"\n• \"Compare Project A and Project B\"",
        filters: [],
      };
  }
}

// ─── Streaming Simulator ──────────────────────────────────────
function useStreamingText(text: string, speed = 12) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1 + Math.floor(Math.random() * 2);
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

// ─── Suggested Questions ──────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  "How many indicators were reported in 2025?",
  "Show male vs female beneficiaries",
  "Trend of all reporting over time",
  "How many projects have published data?",
  "Show performance of indicator 1.2.1",
  "Compare male and female training",
];

// ─── Main Component ──────────────────────────────────────────
export default function AIReportingAssistant() {
  const { projects } = useApp();
  const allRows = useMemo(() => buildFlatRows(projects), [projects]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedChart, setExpandedChart] = useState(false);
  const [activeChart, setActiveChart] = useState<ChartData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (question?: string) => {
    const q = question || input.trim();
    if (!q || isProcessing) return;

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const intent = parseIntent(q, projects);
    const answer = generateAnswer(intent, allRows, projects);

    const assistantMsg: AIMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: answer.text,
      timestamp: new Date(),
      chart: answer.chart,
      filters: answer.filters,
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMsg]);
    if (answer.chart) setActiveChart(answer.chart);
    setIsProcessing(false);

    // Mark streaming done after animation
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, isStreaming: false } : m));
    }, answer.text.length * 14 + 200);
  }, [input, isProcessing, projects, allRows]);

  const clearChat = () => {
    setMessages([]);
    setActiveChart(null);
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const lastAssistantChart = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].chart) return messages[i].chart;
    }
    return null;
  }, [messages]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 min-h-[600px]">
      {/* ─── Left: Chat Panel ─── */}
      <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">AI Impact Assistant</h3>
              <p className="text-[11px] text-muted-foreground">Ask questions about your MEL data</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {allRows.length} data points loaded
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">
            {messages.length === 0 ? (
              <WelcomeScreen onSelect={handleSend} />
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={copyText}
                  copied={copiedId === msg.id}
                  onViewChart={msg.chart ? () => setActiveChart(msg.chart!) : undefined}
                />
              ))
            )}

            {isProcessing && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing your data…
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your MEL data…"
                disabled={isProcessing}
                className="w-full h-11 pl-4 pr-4 rounded-xl border border-border bg-background text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all disabled:opacity-50"
              />
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className="h-11 w-11 rounded-xl p-0 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
            Frontend-only analysis using loaded reporting data. Complex queries may not be supported.
          </p>
        </div>
      </div>

      {/* ─── Right: Visualization Panel ─── */}
      <div className={`rounded-2xl border border-border bg-card overflow-hidden flex flex-col ${expandedChart ? 'fixed inset-4 z-[900]' : ''}`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Visualization</h3>
          </div>
          <button
            onClick={() => setExpandedChart(!expandedChart)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {expandedChart ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex-1 p-5 flex items-center justify-center">
          {activeChart || lastAssistantChart ? (
            <ChartRenderer chart={(activeChart || lastAssistantChart)!} expanded={expandedChart} />
          ) : (
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                <TrendingUp className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground">No chart yet</p>
                <p className="text-[11px] text-muted-foreground/60">Ask a question to see visualizations</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────

function WelcomeScreen({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <MessageSquare className="h-7 w-7 text-primary" />
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-[16px] font-semibold text-foreground">AI Impact Assistant</h3>
        <p className="text-[13px] text-muted-foreground max-w-sm">
          Ask natural language questions about your MEL data and get instant, structured answers with charts.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/3 text-[12px] text-muted-foreground hover:text-foreground transition-all group"
          >
            <span className="group-hover:text-primary transition-colors">{q}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
        <Info className="h-3 w-3" />
        Frontend-only analysis — uses already loaded reporting data
      </div>
    </div>
  );
}

function MessageBubble({
  message, onCopy, copied, onViewChart,
}: {
  message: AIMessage;
  onCopy: (id: string, text: string) => void;
  copied: boolean;
  onViewChart?: () => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-start gap-2.5 max-w-[80%]">
          <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5">
            <p className="text-[13px] leading-relaxed">{message.content}</p>
            <p className="text-[10px] opacity-60 mt-1">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 max-w-[90%]">
      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-md bg-secondary/40 px-4 py-3">
          <StreamedContent content={message.content} isStreaming={message.isStreaming} />
          <p className="text-[10px] text-muted-foreground/50 mt-2">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Filters */}
        {message.filters && message.filters.length > 0 && !message.isStreaming && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.filters.map((f, i) => (
              <Badge key={i} variant="outline" className="text-[10px] py-0 h-5 font-normal">{f}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {!message.isStreaming && (
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onViewChart && (
              <button
                onClick={onViewChart}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <BarChart3 className="h-3 w-3" />
                View Chart
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamedContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const { displayed, done } = useStreamingText(isStreaming ? content : '', 14);
  const text = isStreaming && !done ? displayed : content;

  // Simple markdown bold rendering
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className="text-[13px] leading-relaxed text-foreground space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        // Handle newlines
        const lines = part.split('\n');
        return lines.map((line, j) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < lines.length - 1 && <br />}
          </span>
        ));
      })}
      {isStreaming && !done && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />}
    </div>
  );
}

function ChartRenderer({ chart, expanded }: { chart: ChartData; expanded: boolean }) {
  const height = expanded ? 500 : 300;
  const tooltipStyle = {
    borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px',
    boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.08)',
  };

  return (
    <div className="w-full">
      {chart.title && (
        <h4 className="text-[13px] font-semibold text-foreground mb-4">{chart.title}</h4>
      )}

      {chart.type === 'donut' ? (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={expanded ? 160 : 100} innerRadius={expanded ? 80 : 50}
              strokeWidth={0}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-[12px] text-foreground">{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      ) : chart.type === 'line' ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 5, fill: 'hsl(var(--primary))' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chart.data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={160} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
            <Bar dataKey={chart.data[0]?.value !== undefined ? 'value' : 'count'} radius={[0, 8, 8, 0]}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={chart.type === 'comparison' ? CHART_COLORS[i % CHART_COLORS.length] : 'hsl(var(--primary))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
