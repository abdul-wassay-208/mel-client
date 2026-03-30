import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const typeIcons: Record<string, typeof Bell> = {
  assignment: Mail,
  publish: CheckCheck,
  edit_approval: Check,
  edit_rejection: AlertTriangle,
};

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markOneRead, markAllRead } = useNotifications();

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="h-9 text-[13px]"
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="card-elevated animate-in-delay-1 overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-16 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[14px]">Loading notifications…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="text-[15px] font-medium text-muted-foreground">No notifications</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">
              You'll be notified about important updates here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((n) => {
              const Icon = typeIcons[n.type] ?? Bell;
              return (
                <div
                  key={n.id}
                  className={`px-6 py-5 flex items-start gap-4 transition-all duration-150 cursor-pointer hover:bg-secondary/30 ${
                    !n.isRead ? 'bg-primary/3' : ''
                  }`}
                  onClick={() => !n.isRead && markOneRead(n.id)}
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.type === 'edit_rejection' ? 'bg-destructive/10' : 'bg-primary/8'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] ${
                        n.type === 'edit_rejection' ? 'text-destructive' : 'text-primary'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[14px] ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[12px] text-muted-foreground/70 mt-2 block">
                      {format(new Date(n.createdAt), 'MMM d, yyyy · h:mm a')}
                    </span>
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
