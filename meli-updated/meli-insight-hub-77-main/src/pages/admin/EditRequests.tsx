import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, FileEdit, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function EditRequests() {
  const { editRequests, approveEditRequest, rejectEditRequest } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();

  const pending = editRequests.filter(r => r.status === 'pending');
  const resolved = editRequests.filter(r => r.status !== 'pending');

  const handleApprove = (id: string) => {
    approveEditRequest(id, user!.id);
    toast({ title: 'Edit Request Approved', description: 'The report has been unlocked for editing.' });
  };

  const handleReject = (id: string) => {
    rejectEditRequest(id, user!.id);
    toast({ title: 'Edit Request Rejected', description: 'The report remains locked.' });
  };

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">Edit Requests</h1>
        <p className="page-subtitle">Review and manage report edit requests</p>
      </div>

      {/* Pending */}
      <div className="card-elevated animate-in-delay-1">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="section-title">Pending Requests</h2>
          <span className="text-[13px] text-muted-foreground font-medium">{pending.length} pending</span>
        </div>
        {pending.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileEdit className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[15px] text-muted-foreground font-medium">No pending requests</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">All edit requests have been resolved</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pending.map(req => (
              <div key={req.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{req.projectName}</p>
                    <p className="text-[13px] text-muted-foreground mt-1">Indicator: <span className="font-medium text-foreground">{req.indicatorName}</span></p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {req.fieldsToEdit.map(f => (
                        <span key={f} className="text-[12px] px-2.5 py-1 rounded-md bg-primary/8 text-primary font-medium border border-primary/15">{f}</span>
                      ))}
                    </div>
                    <div className="mt-3 bg-secondary/60 rounded-xl p-4">
                      <p className="text-[13px]"><span className="font-medium text-muted-foreground">Reason:</span> {req.reason}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[12px] text-muted-foreground">By <span className="font-medium">{req.requestedByName}</span></span>
                      <span className="text-[12px] text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{format(new Date(req.requestedAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button variant="outline" className="h-10" onClick={() => handleReject(req.id)}>
                      <X className="h-4 w-4 mr-1.5" />Reject
                    </Button>
                    <Button className="h-10" onClick={() => handleApprove(req.id)}>
                      <Check className="h-4 w-4 mr-1.5" />Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="card-elevated animate-in-delay-2">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="section-title">Resolved ({resolved.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {resolved.map(req => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium">{req.projectName} — {req.indicatorName}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{format(new Date(req.requestedAt), 'MMM d, yyyy')} · {req.requestedByName}</p>
                </div>
                <span className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border ${req.status === 'approved' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                  {req.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
