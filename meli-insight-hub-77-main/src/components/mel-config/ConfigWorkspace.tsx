import { useMELConfig } from '@/contexts/MELConfigContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Target, GitBranch, BarChart3, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfigWorkspace() {
  const {
    selectedNode,
    setSelectedNode,
    getSelectedObjective,
    getSelectedOutcome,
    getSelectedIndicator,
    updateObjective,
    updateOutcome,
    updateIndicator,
    addOutcome,
    addIndicator,
    addField,
    deleteIndicator,
  } = useMELConfig();

  const obj = getSelectedObjective();
  const oc = getSelectedOutcome();
  const ind = getSelectedIndicator();

  if (!selectedNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-[14px] px-6 text-center">
        <div>
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-foreground">Create your first Objective</p>
          <p className="text-[13px] mt-1">Click the <span className="font-medium text-primary">+</span> button in the Hierarchy panel to add an Objective, then configure it here.</p>
        </div>
      </div>
    );
  }

  const currentName = selectedNode.type === 'indicator' && ind
    ? (ind.code ? `${ind.code} – ${ind.title}` : ind.title)
    : selectedNode.type === 'outcome' && oc
      ? oc.title
      : obj?.title || '';

  const NodeIcon = selectedNode.type === 'objective' ? Target : selectedNode.type === 'outcome' ? GitBranch : BarChart3;
  const iconColor = selectedNode.type === 'objective' ? 'text-primary' : selectedNode.type === 'outcome' ? 'text-accent' : 'text-warning';

  return (
    <>
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <NodeIcon className={cn('h-3 w-3 shrink-0', iconColor)} />
          <span>Editing:</span>
          <span className="font-medium truncate">{currentName}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 pt-4 pb-5 space-y-6">
        {selectedNode.type === 'objective' && obj && (
          <ObjectiveEditor obj={obj} onUpdate={updateObjective} onAddOutcome={() => addOutcome(obj.id)} setSelectedNode={setSelectedNode} />
        )}
        {selectedNode.type === 'outcome' && obj && oc && (
          <OutcomeEditor
            obj={obj}
            oc={oc}
            onUpdate={(u: any) => updateOutcome(obj.id, oc.id, u)}
            onAddIndicator={() => addIndicator(obj.id, oc.id)}
            setSelectedNode={setSelectedNode}
            onDeleteIndicator={(indId: string) => deleteIndicator(obj.id, oc.id, indId)}
          />
        )}
        {selectedNode.type === 'indicator' && obj && oc && ind && (
          <IndicatorEditor
            ind={ind}
            onUpdate={(u: any) => updateIndicator(obj.id, oc.id, ind.id, u)}
            onAddField={() => addField(obj.id, oc.id, ind.id)}
          />
        )}
      </div>
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ObjectiveEditor({ obj, onUpdate, onAddOutcome, setSelectedNode }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Strategic Objective</h2>
      </div>

      <SectionCard title="Basic Info">
        <div className="space-y-2">
          <Label className="field-label">Title</Label>
          <Input value={obj.title} onChange={(e) => onUpdate(obj.id, { title: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Description">
        <Textarea value={obj.description} onChange={(e) => onUpdate(obj.id, { description: e.target.value })} rows={3} placeholder="Describe this objective..." />
      </SectionCard>

      <SectionCard title="Outcomes">
        {obj.outcomes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-[13px] border border-dashed border-border rounded-lg">
            <p>No outcomes yet. Add your first outcome to get started.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {obj.outcomes.map((oc: any) => (
              <div
                key={oc.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 cursor-pointer transition-all group"
                onClick={() => setSelectedNode({ type: 'outcome', id: oc.id, objectiveId: obj.id })}
              >
                <GitBranch className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[13px] font-medium flex-1 truncate">{oc.title}</span>
                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {oc.indicators.length} indicator{oc.indicators.length !== 1 ? 's' : ''}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onAddOutcome} className="mt-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Outcome
        </Button>
      </SectionCard>
    </div>
  );
}

function OutcomeEditor({ obj, oc, onUpdate, onAddIndicator, setSelectedNode, onDeleteIndicator }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold">Outcome</h2>
      </div>

      <SectionCard title="Basic Info">
        <div className="space-y-2">
          <Label className="field-label">Title</Label>
          <Input value={oc.title} onChange={(e) => onUpdate({ title: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Description">
        <Textarea value={oc.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={3} placeholder="Describe this outcome..." />
      </SectionCard>

      <SectionCard title="Indicators">
        {oc.indicators.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-[13px] border border-dashed border-border rounded-lg">
            <p>No indicators yet. Create your first indicator to begin.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {oc.indicators.map((ind: any) => (
              <div
                key={ind.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 cursor-pointer transition-all group"
                onClick={() => setSelectedNode({ type: 'indicator', id: ind.id, outcomeId: oc.id, objectiveId: obj.id })}
              >
                <BarChart3 className="h-3.5 w-3.5 text-warning shrink-0" />
                <span className="text-[13px] font-medium flex-1 truncate">
                  {ind.code ? `${ind.code} – ` : ''}{ind.title}
                </span>
                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {ind.fields.length} field{ind.fields.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteIndicator(ind.id); }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onAddIndicator} className="mt-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Indicator
        </Button>
      </SectionCard>
    </div>
  );
}

function IndicatorEditor({ ind, onUpdate, onAddField }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-warning" />
        <h2 className="text-lg font-semibold">Indicator</h2>
      </div>

      <SectionCard title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="field-label">Code</Label>
            <Input value={ind.code} onChange={(e) => onUpdate({ code: e.target.value })} placeholder="e.g. 1.1.1" />
          </div>
          <div className="space-y-2">
            <Label className="field-label">Type</Label>
            <Select value={ind.indicatorType} onValueChange={(v) => onUpdate({ indicatorType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Count (#)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="text">Text-based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="field-label">Title</Label>
          <Input value={ind.title} onChange={(e) => onUpdate({ title: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Settings">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <Switch checked={ind.multiRowEnabled} onCheckedChange={(v) => onUpdate({ multiRowEnabled: v })} />
          <div>
            <Label className="text-[13px] font-medium">Multi-row entries</Label>
            <p className="text-[12px] text-muted-foreground">Allow multiple disaggregation rows per indicator</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Disaggregation Fields">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">{ind.fields.length} field{ind.fields.length !== 1 ? 's' : ''} defined</p>
          <Button variant="outline" size="sm" onClick={onAddField}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
          </Button>
        </div>
        {ind.fields.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-[13px] border border-dashed border-border rounded-lg">
            <p>No fields defined. Add fields here or use the Field Builder panel →</p>
          </div>
        ) : (
          <div className="space-y-1">
            {ind.fields.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">{f.type}{f.required ? ' · required' : ''}</p>
                </div>
                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">{f.type}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

