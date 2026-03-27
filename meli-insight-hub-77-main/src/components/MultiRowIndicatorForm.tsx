import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { IndicatorConfig, IndicatorFieldConfig } from '@/config/indicatorFieldMappings';
import { apiGetConfig, type IndicatorOverridesConfig } from '@/lib/api';
import { Plus, Trash2, Copy, AlertCircle } from 'lucide-react';

export interface IndicatorEntryRow {
  id: string;
  [key: string]: string | number;
}

interface MultiRowIndicatorFormProps {
  config: IndicatorConfig;
  rows: IndicatorEntryRow[];
  onChange: (rows: IndicatorEntryRow[]) => void;
  disabled?: boolean;
  validationErrors?: Record<string, string[]>; // rowId -> error messages
}

function generateRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRow(config: IndicatorConfig): IndicatorEntryRow {
  const row: IndicatorEntryRow = { id: generateRowId() };
  config.fields.forEach(f => {
    row[f.key] = f.type === 'number' ? 0 : '';
  });
  return row;
}

function CellField({
  field,
  value,
  onChange,
  disabled,
  hasError,
}: {
  field: IndicatorFieldConfig;
  value: string | number;
  onChange: (val: string | number) => void;
  disabled: boolean;
  hasError: boolean;
}) {
  const errorClass = hasError ? 'border-destructive focus-visible:ring-destructive' : '';

  if (field.type === 'dropdown' && field.options) {
    return (
      <Select value={(value as string) || ''} onValueChange={v => onChange(v)} disabled={disabled}>
        <SelectTrigger className={`h-10 text-[13px] min-w-[140px] ${errorClass}`}>
          <SelectValue placeholder={`Select…`} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map(o => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        onChange={e => {
          const num = parseInt(e.target.value);
          onChange(isNaN(num) || num < 0 ? 0 : num);
        }}
        placeholder="0"
        className={`h-10 text-[13px] min-w-[120px] ${errorClass}`}
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      value={(value as string) || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.label}
      className={`h-10 text-[13px] min-w-[140px] ${errorClass}`}
      disabled={disabled}
    />
  );
}

function MultiRowIndicatorForm({
  config,
  rows,
  onChange,
  disabled = false,
  validationErrors = {},
}: MultiRowIndicatorFormProps) {
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGetConfig<IndicatorOverridesConfig>('indicatorOverrides');
        if (!alive) return;
        const byIndicator = res.value?.labels?.[config.code] || null;
        setLabelOverrides(byIndicator);
      } catch {
        if (!alive) return;
        setLabelOverrides(null);
      }
    })();
    return () => { alive = false; };
  }, [config.code]);

  const fieldLabel = useCallback((field: IndicatorFieldConfig) => {
    return labelOverrides?.[field.key] || field.label;
  }, [labelOverrides]);

  const addRow = useCallback(() => {
    const newRow = createEmptyRow(config);
    onChange([...rows, newRow]);
    setHighlightedRow(newRow.id);
    setTimeout(() => setHighlightedRow(null), 1500);
  }, [rows, config, onChange]);

  const removeRow = useCallback((rowId: string) => {
    onChange(rows.filter(r => r.id !== rowId));
  }, [rows, onChange]);

  const duplicateRow = useCallback((rowId: string) => {
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx === -1) return;
    const newRow: IndicatorEntryRow = { ...rows[idx], id: generateRowId() };
    const updated = [...rows];
    updated.splice(idx + 1, 0, newRow);
    onChange(updated);
    setHighlightedRow(newRow.id);
    setTimeout(() => setHighlightedRow(null), 1500);
  }, [rows, onChange]);

  const updateRowField = useCallback((rowId: string, fieldKey: string, value: string | number) => {
    onChange(rows.map(r => r.id === rowId ? { ...r, [fieldKey]: value } : r));
  }, [rows, onChange]);

  // Ensure at least one row (must not call onChange during render)
  useEffect(() => {
    if (rows.length > 0) return;
    const initialRow = createEmptyRow(config);
    onChange([initialRow]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, config.code]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              {config.code} — {config.title}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · {config.fields.length} field{config.fields.length !== 1 ? 's' : ''} per row
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[12px] font-semibold uppercase tracking-wider w-10 text-center">#</TableHead>
                {config.fields.map(f => (
                  <TableHead key={f.key} className="text-[12px] font-semibold uppercase tracking-wider">
                    {fieldLabel(f)} {f.required && <span className="text-destructive">*</span>}
                  </TableHead>
                ))}
                {!disabled && (
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider w-24 text-center">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const rowErrors = validationErrors[row.id] || [];
                const isHighlighted = highlightedRow === row.id;
                return (
                  <TableRow
                    key={row.id}
                    className={`transition-all duration-500 ${isHighlighted ? 'bg-primary/8' : ''} ${rowErrors.length > 0 ? 'bg-destructive/5' : ''}`}
                  >
                    <TableCell className="text-center text-[13px] text-muted-foreground font-medium">{idx + 1}</TableCell>
                    {config.fields.map(field => {
                      const effectiveLabel = fieldLabel(field);
                      const fieldHasError = rowErrors.some(e => e.toLowerCase().includes(effectiveLabel.toLowerCase()));
                      return (
                        <TableCell key={field.key} className="py-2">
                          <CellField
                            field={{ ...field, label: effectiveLabel }}
                            value={row[field.key]}
                            onChange={v => updateRowField(row.id, field.key, v)}
                            disabled={disabled}
                            hasError={!!fieldHasError}
                          />
                        </TableCell>
                      );
                    })}
                    {!disabled && (
                      <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => duplicateRow(row.id)}
                                title="Duplicate Row"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate Row</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeRow(row.id)}
                                disabled={rows.length <= 1}
                                title="Remove Row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove Row</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Row-level errors */}
        {Object.entries(validationErrors).some(([, errs]) => errs.length > 0) && (
          <div className="bg-destructive/8 border border-destructive/15 rounded-xl p-3 space-y-1">
            {Object.entries(validationErrors).map(([rowId, errs]) => {
              const rowIdx = rows.findIndex(r => r.id === rowId);
              return errs.map((e, i) => (
                <p key={`${rowId}-${i}`} className="text-[13px] text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Row {rowIdx + 1}: {e}
                </p>
              ));
            })}
          </div>
        )}

        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-[13px] gap-1.5"
            onClick={addRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Entry
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

export default MultiRowIndicatorForm;

/**
 * Validate all rows for a given indicator config.
 * Returns a map of rowId -> error messages.
 */
export function validateIndicatorRows(
  config: IndicatorConfig,
  rows: IndicatorEntryRow[]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  rows.forEach(row => {
    const rowErrors: string[] = [];
    config.fields.forEach(field => {
      if (!field.required) return;
      const val = row[field.key];
      if (field.type === 'number') {
        if (val === undefined || val === null || val === '' || val === 0) {
          rowErrors.push(`${field.label} is required`);
        }
      } else {
        if (!val || val === '') {
          rowErrors.push(`${field.label} is required`);
        }
      }
    });
    if (rowErrors.length > 0) {
      errors[row.id] = rowErrors;
    }
  });
  return errors;
}

