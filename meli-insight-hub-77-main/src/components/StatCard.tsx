import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, description, trend, className = '' }: StatCardProps) {
  return (
    <div className={`card-elevated-hover p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[32px] font-semibold tracking-tight leading-none mt-2">{value}</p>
          {description && (
            <p className="text-[13px] text-muted-foreground mt-2">{description}</p>
          )}
          {trend && (
            <p className="text-[13px] text-success font-medium mt-1">{trend}</p>
          )}
        </div>
        <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
