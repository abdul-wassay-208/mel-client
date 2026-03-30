import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { ClipboardList, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function AuditLog() {
  const { auditLog } = useApp();
  const [search, setSearch] = useState('');

  const filtered = auditLog.filter(entry =>
    entry.userName.toLowerCase().includes(search.toLowerCase()) ||
    entry.action.toLowerCase().includes(search.toLowerCase()) ||
    entry.entityType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">Complete history of system actions</p>
      </div>

      <div className="relative animate-in-delay-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
        <Input
          placeholder="Search by user, action, or entity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-12 h-12 text-[15px]"
        />
      </div>

      <div className="card-elevated animate-in-delay-2 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[15px] text-muted-foreground font-medium">No entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Timestamp</th>
                  <th className="text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">User</th>
                  <th className="text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Action</th>
                  <th className="text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Entity</th>
                  <th className="text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((entry, i) => (
                  <tr key={entry.id} className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground whitespace-nowrap">{format(new Date(entry.timestamp), 'MMM d, yyyy · h:mm a')}</td>
                    <td className="px-6 py-4 text-[14px] font-medium">{entry.userName}</td>
                    <td className="px-6 py-4 text-[14px]">{entry.action}</td>
                    <td className="px-6 py-4"><span className="text-[12px] bg-secondary px-2.5 py-1 rounded-md font-mono border border-border">{entry.entityType} #{entry.entityId}</span></td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground">
                      {entry.oldValue && entry.newValue ? (
                        <span><span className="line-through text-destructive/60">{entry.oldValue}</span> <span className="text-muted-foreground/50">→</span> <span className="text-success">{entry.newValue}</span></span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
