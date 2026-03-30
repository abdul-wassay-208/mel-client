import { ReportState } from '@/types';

const stateConfig: Record<ReportState, { label: string; className: string; dot: string }> = {
  draft: { label: 'Draft', className: 'bg-secondary text-secondary-foreground border-border', dot: 'bg-muted-foreground' },
  published: { label: 'Published', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  edit_requested: { label: 'Edit Requested', className: 'bg-warning/10 text-warning-foreground border-warning/20', dot: 'bg-warning' },
  unlocked: { label: 'Unlocked', className: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  re_published: { label: 'Re-Published', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  completed: { label: 'Completed', className: 'bg-primary/8 text-primary border-primary/20', dot: 'bg-primary' },
};

const projectStatusConfig: Record<string, { label: string; className: string; dot: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  completed: { label: 'Completed', className: 'bg-primary/8 text-primary border-primary/20', dot: 'bg-primary' },
};

export function StatusBadge({ state }: { state: ReportState }) {
  const config = stateConfig[state];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: 'active' | 'completed' }) {
  const config = projectStatusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
