import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, X } from 'lucide-react';

interface OptionsEditorProps {
  options: string[];
  onChange: (opts: string[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [newOpt, setNewOpt] = useState('');

  const add = () => {
    if (newOpt.trim()) {
      onChange([...options, newOpt.trim()]);
      setNewOpt('');
    }
  };

  return (
    <div className="space-y-2 p-2 bg-secondary/30 rounded-lg">
      <Label className="text-[12px] font-medium">Options</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <Input
            value={opt}
            onChange={(e) => {
              const updated = [...options];
              updated[i] = e.target.value;
              onChange(updated);
            }}
            className="h-7 text-[12px] flex-1"
          />
          <button onClick={() => onChange(options.filter((_, j) => j !== i))} className="p-0.5 hover:bg-destructive/10 rounded transition-colors">
            <X className="h-3 w-3 text-destructive/60" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Input
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add option..."
          className="h-7 text-[12px] flex-1"
        />
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={add}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

