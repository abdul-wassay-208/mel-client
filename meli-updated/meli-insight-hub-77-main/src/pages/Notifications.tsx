import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const typeIcons: Record<string, typeof Bell> = {
  assignment: Mail,
  publish: CheckCheck,
  edit_approval: Check,
  edit_rejection: AlertTriangle,
};

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, retryNotification } = useApp();

  const myNotifications = notifications
    .filter(n => n.recipientId === user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = myNotifications.filter(n => !n.read);
  const failed = myNotifications.filter(n => !n.delivered);

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">{unread.length} unread notification{unread.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Delivery failures */}
      {failed.length > 0 && (
        <div className="bg-destructive/6 border border-destructive/15 rounded-xl p-5 animate-in-delay-1">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-[13px] font-semibold text-destructive">Delivery Failures ({failed.length})</span>
          </div>
          <div className="space-y-2">
            {failed.map(n => (
              <div key={n.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13px] font-medium">{n.title}</p>
                  <p className="text-[12px] text-muted-foreground">Failed at {n.failedAt ? format(new Date(n.failedAt), 'MMM d, h:mm a') : '—'} · Retries: {n.retryCount}</p>
                </div>
                <Button variant="outline" className="h-9 text-[13px]" onClick={() => retryNotification(n.id)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="card-elevated animate-in-delay-1 overflow-hidden">
        {myNotifications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="text-[15px] font-medium text-muted-foreground">No notifications</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">You'll be notified about important updates here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {myNotifications.map(n => {
              const Icon = typeIcons[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`px-6 py-5 flex items-start gap-4 transition-all duration-150 cursor-pointer hover:bg-secondary/30 ${!n.read ? 'bg-primary/3' : ''}`}
                  onClick={() => !n.read && markNotificationRead(n.id)}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'edit_rejection' ? 'bg-destructive/10' :
                    'bg-primary/8'
                  }`}>
                    <Icon className={`h-[18px] w-[18px] ${
                      n.type === 'edit_rejection' ? 'text-destructive' :
                      'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[14px] ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[12px] text-muted-foreground/70">{format(new Date(n.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                      <span className={`text-[12px] font-medium flex items-center gap-1 ${n.delivered ? 'text-success' : 'text-destructive'}`}>
                        {n.delivered ? <><Check className="h-3 w-3" /> Delivered</> : '✗ Failed'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
