import { useState, useEffect, useRef } from 'react';
import { useMELConfig, MELFieldType } from '@/contexts/MELConfigContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, GripVertical, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptionsEditor } from '@/components/mel-config/OptionsEditor';

const FIELD_TYPES: { value: MELFieldType; label: string }[] = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio', label: 'Radio Button' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

export function FieldBuilder() {
  const {
    selectedNode,
    getSelectedIndicator,
    updateField,
    deleteField,
    addField,
  } = useMELConfig();

  const ind = getSelectedIndicator();
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const lastFieldRef = useRef<HTMLDivElement>(null);
  const prevFieldCount = useRef(0);

  useEffect(() => {
    if (ind && ind.fields.length > prevFieldCount.current) {
      const lastField = ind.fields[ind.fields.length - 1];
      setActiveFieldId(lastField.id);
      setTimeout(() => lastFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
    prevFieldCount.current = ind?.fields.length ?? 0;
  }, [ind?.fields.length]);

  if (!selectedNode || selectedNode.type !== 'indicator' || !ind) {
    return (
      <>
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Disaggregation Fields</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-[14px] px-6 text-center">
          <div>
            <Settings2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Configure disaggregation fields</p>
            <p className="text-[13px] mt-2 leading-relaxed">
              To get started:<br/>
              <span className="text-foreground">1.</span> Select an indicator from the hierarchy<br/>
              <span className="text-foreground">2.</span> Edit its fields here
            </p>
          </div>
        </div>
      </>
    );
  }

  const objId = (selectedNode as any).objectiveId;
  const ocId = (selectedNode as any).outcomeId;
  const indId = selectedNode.id;

  return (
    <>
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Disaggregation Fields</h3>
          <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => addField(objId, ocId, indId)}>
            <Plus className="h-3 w-3 mr-1" /> Add Field
          </Button>
        </div>
        <p className="mt-1.5 text-[12px] text-foreground font-medium truncate">{ind.code ? `${ind.code} – ` : ''}{ind.title}</p>
      </div>
      <div className="flex-1 overflow-auto">
        {ind.fields.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px] px-6 text-center">
            <div>
              <p className="text-foreground font-medium">No fields defined yet</p>
              <p className="text-[12px] mt-1">Add disaggregation fields to define how data is collected for this indicator.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => addField(objId, ocId, indId)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add First Field
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {ind.fields.map((field, idx) => (
              <div
                key={field.id}
                ref={idx === ind.fields.length - 1 ? lastFieldRef : undefined}
                className={cn(
                  'border rounded-lg transition-all',
                  activeFieldId === field.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/30'
                )}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                  onClick={() => setActiveFieldId(activeFieldId === field.id ? null : field.id)}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-[13px] font-medium flex-1 truncate">{field.label}</span>
                  <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{field.type}</span>
                  {field.required && <span className="text-[10px] text-destructive font-bold">REQ</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteField(objId, ocId, indId, field.id); }}
                    className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive/60 hover:text-destructive" />
                  </button>
                </div>

                {activeFieldId === field.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Key</Label>
                      <Input
                        value={(field as any).key || ''}
                        onChange={(e) => updateField(objId, ocId, indId, field.id, { key: e.target.value })}
                        className="h-8 text-[13px]"
                        placeholder="e.g. numberOfUsers"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        This must match the backend field key (do not change lightly).
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(objId, ocId, indId, field.id, { label: e.target.value })}
                        className="h-8 text-[13px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Field Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(v) => updateField(objId, ocId, indId, field.id, { type: v as MELFieldType })}
                      >
                        <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(ft => (
                            <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(objId, ocId, indId, field.id, { placeholder: e.target.value })}
                        className="h-8 text-[13px]"
                        placeholder="Optional placeholder text"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Default Value</Label>
                      <Input
                        value={field.defaultValue || ''}
                        onChange={(e) => updateField(objId, ocId, indId, field.id, { defaultValue: e.target.value })}
                        className="h-8 text-[13px]"
                        placeholder="Optional default"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px]">Required</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) => updateField(objId, ocId, indId, field.id, { required: v })}
                      />
                    </div>

                    {['dropdown', 'multiselect', 'radio'].includes(field.type) && (
                      <OptionsEditor
                        options={field.options || []}
                        onChange={(opts) => updateField(objId, ocId, indId, field.id, { options: opts })}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

