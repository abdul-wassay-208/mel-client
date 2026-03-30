import { useState, useRef, useEffect } from 'react';
import { useMELConfig } from '@/contexts/MELConfigContext';
import { ChevronRight, ChevronDown, Plus, Target, GitBranch, BarChart3, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function HierarchyTree() {
  const {
    objectives, selectedNode, setSelectedNode,
    addObjective, deleteObjective, addOutcome, deleteOutcome,
    addIndicator, deleteIndicator,
    updateObjective, updateOutcome, updateIndicator,
  } = useMELConfig();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    objectives.forEach(o => { init[o.id] = true; });
    return init;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const isSelected = (type: string, id: string) =>
    selectedNode?.type === type && selectedNode?.id === id;

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitEdit = (type: 'objective' | 'outcome' | 'indicator', id: string, objectiveId?: string, outcomeId?: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    if (type === 'objective') updateObjective(id, { title: editValue.trim() });
    else if (type === 'outcome' && objectiveId) updateOutcome(objectiveId, id, { title: editValue.trim() });
    else if (type === 'indicator' && objectiveId && outcomeId) updateIndicator(objectiveId, outcomeId, id, { title: editValue.trim() });
    setEditingId(null);
  };

  const renderInlineEdit = (type: 'objective' | 'outcome' | 'indicator', id: string, objectiveId?: string, outcomeId?: string) => (
    <Input
      ref={editRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => commitEdit(type, id, objectiveId, outcomeId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitEdit(type, id, objectiveId, outcomeId);
        if (e.key === 'Escape') setEditingId(null);
      }}
      className="h-6 text-[13px] px-1 py-0 border-primary bg-background"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Hierarchy</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addObjective}>
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Objective</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {objectives.map((obj) => (
          <div key={obj.id}>
            {/* Objective node */}
            <div
              className={cn(
                'group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all',
                isSelected('objective', obj.id)
                  ? 'bg-primary/10 text-primary font-semibold border-l-2 border-l-primary'
                  : 'hover:bg-secondary text-foreground font-semibold border-l-2 border-l-transparent'
              )}
              onClick={() => setSelectedNode({ type: 'objective', id: obj.id })}
            >
              <button onClick={(e) => { e.stopPropagation(); toggle(obj.id); }} className="shrink-0 p-0.5 rounded hover:bg-primary/10 transition-colors">
                {expanded[obj.id] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
              {editingId === obj.id ? (
                renderInlineEdit('objective', obj.id)
              ) : (
                <span className="truncate flex-1" onDoubleClick={() => startEdit(obj.id, obj.title)}>
                  {obj.title.length > 25 ? obj.title.substring(0, 25) + '…' : obj.title}
                </span>
              )}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); startEdit(obj.id, obj.title); }} className="p-0.5 rounded hover:bg-primary/10 transition-colors">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); addOutcome(obj.id); }} className="p-0.5 rounded hover:bg-primary/10 transition-colors">
                  <Plus className="h-3 w-3 text-primary" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteObjective(obj.id); }} className="p-0.5 rounded hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>

            {/* Outcomes */}
            {expanded[obj.id] && obj.outcomes.map((oc) => (
              <div key={oc.id} className="ml-4">
                <div
                  className={cn(
                    'group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all',
                    isSelected('outcome', oc.id)
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-l-primary'
                      : 'hover:bg-secondary text-foreground font-medium border-l-2 border-l-transparent'
                  )}
                  onClick={() => setSelectedNode({ type: 'outcome', id: oc.id, objectiveId: obj.id })}
                >
                  <button onClick={(e) => { e.stopPropagation(); toggle(oc.id); }} className="shrink-0 p-0.5 rounded hover:bg-primary/10 transition-colors">
                    {expanded[oc.id] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {editingId === oc.id ? (
                    renderInlineEdit('outcome', oc.id, obj.id)
                  ) : (
                    <span className="truncate flex-1" onDoubleClick={() => startEdit(oc.id, oc.title)}>
                      {oc.title.length > 22 ? oc.title.substring(0, 22) + '…' : oc.title}
                    </span>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(oc.id, oc.title); }} className="p-0.5 rounded hover:bg-primary/10 transition-colors">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); addIndicator(obj.id, oc.id); }} className="p-0.5 rounded hover:bg-primary/10 transition-colors">
                      <Plus className="h-3 w-3 text-primary" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteOutcome(obj.id, oc.id); }} className="p-0.5 rounded hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Indicators */}
                {expanded[oc.id] && oc.indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className={cn(
                      'group flex items-center gap-1.5 ml-4 px-2 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all',
                      isSelected('indicator', ind.id)
                        ? 'bg-primary/10 text-primary font-normal border-l-2 border-l-primary'
                        : 'hover:bg-secondary text-muted-foreground border-l-2 border-l-transparent'
                    )}
                    onClick={() => setSelectedNode({ type: 'indicator', id: ind.id, outcomeId: oc.id, objectiveId: obj.id })}
                  >
                    <BarChart3 className="h-3.5 w-3.5 shrink-0 text-warning" />
                    {editingId === ind.id ? (
                      renderInlineEdit('indicator', ind.id, obj.id, oc.id)
                    ) : (
                      <span className="truncate flex-1" onDoubleClick={() => startEdit(ind.id, ind.title)}>
                        {ind.code ? `${ind.code} – ` : ''}{ind.title.length > 18 ? ind.title.substring(0, 18) + '…' : ind.title}
                      </span>
                    )}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(ind.id, ind.title); }} className="p-0.5 rounded hover:bg-primary/10 transition-colors">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteIndicator(obj.id, oc.id, ind.id); }} className="p-0.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {objectives.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground">Start by creating your first Objective</p>
            <p className="text-[12px] mt-1 mb-3">Objectives form the top level of your MEL hierarchy.</p>
            <Button variant="outline" size="sm" onClick={addObjective}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Objective
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

