import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { apiGetReport, ApiDisaggregatedRow } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

export default function ReportDetails() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    (async () => {
      try {
        const r = await apiGetReport(reportId);
        setReport(r as any);
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Failed to load report', description: e?.message || 'Unknown error', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId, toast]);

  const state = useMemo(() => {
    const status = report?.status;
    const map: Record<string, any> = {
      DRAFT: 'draft',
      SUBMITTED: 'draft',
      PUBLISHED: 'published',
      EDIT_REQUESTED: 'edit_requested',
      UNLOCKED: 'unlocked',
      RE_PUBLISHED: 're_published',
      COMPLETED: 'completed',
    };
    return map[status] ?? 'draft';
  }, [report]);

  const rows: ApiDisaggregatedRow[] = (report?.disaggregatedData ?? []) as any;

  if (loading) {
    return <div className="page-container py-10 text-[14px] text-muted-foreground">Loading…</div>;
  }

  if (!report) {
    return (
      <div className="page-container py-10 space-y-4">
        <p className="text-[15px] text-muted-foreground">Report not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="page-container py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-[13px] text-primary hover:text-primary/80 mb-1 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{report.title}</h1>
          <p className="page-subtitle">{report?.project?.name}</p>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {String(report.periodStart).slice(0, 10)} → {String(report.periodEnd).slice(0, 10)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge state={state} />
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="section-title mb-3">Disaggregated Data</h2>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No disaggregated rows saved yet.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Indicator</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Economy</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Infrastructure</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Institution</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Operator</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">City</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Users</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[13px]">{(r as any).indicator?.name ?? r.indicatorId}</TableCell>
                    <TableCell className="text-[13px]">{r.Economy ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{r.Infrastructure ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{r.Institution ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{r.Operator ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{r.City ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{r.NumberOfUsers ?? ''}</TableCell>
                    <TableCell className="text-[13px]">{(r as any).Notes ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

