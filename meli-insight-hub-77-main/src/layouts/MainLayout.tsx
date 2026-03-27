import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  '/admin': { title: 'Dashboard', breadcrumb: ['Admin', 'Dashboard'] },
  '/admin/projects/new': { title: 'Create Project', breadcrumb: ['Admin', 'Projects', 'Create'] },
  '/admin/edit-requests': { title: 'Edit Requests', breadcrumb: ['Admin', 'Edit Requests'] },
  '/admin/audit-log': { title: 'Audit Log', breadcrumb: ['Admin', 'Audit Log'] },
  '/admin/analytics': { title: 'Analytics', breadcrumb: ['Admin', 'Analytics'] },
  '/lead': { title: 'My Projects', breadcrumb: ['Projects', 'Dashboard'] },
  '/lead/learning': { title: 'Learning Module', breadcrumb: ['Projects', 'Learning'] },
  '/notifications': { title: 'Notifications', breadcrumb: ['Notifications'] },
};

export function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  const pageInfo = pageTitles[location.pathname] || { title: '', breadcrumb: [] };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5">
                {pageInfo.breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    <span className={`text-[13px] ${i === pageInfo.breadcrumb.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-[18px] min-w-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="h-8 w-px bg-border mx-1" />
              <div className="flex items-center gap-2.5 pl-1">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[13px] font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-medium leading-tight">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight capitalize">{user.role === 'admin' ? 'Administrator' : 'Project Lead'}</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 py-8 px-6 lg:px-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
