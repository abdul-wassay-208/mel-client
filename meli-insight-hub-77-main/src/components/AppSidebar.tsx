import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, FolderPlus, FileEdit, ClipboardList, BarChart3,
  Bell, BookOpen, LogOut, Activity, Users,
} from 'lucide-react';

export function AppSidebar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const adminItems = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
    { title: 'Create Project', url: '/admin/projects/new', icon: FolderPlus },
    { title: 'Edit Requests', url: '/admin/edit-requests', icon: FileEdit },
    { title: 'Audit Log', url: '/admin/audit-log', icon: ClipboardList },
    { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
    { title: 'User Management', url: '/admin/users', icon: Users },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ];

  const leadItems = [
    { title: 'Dashboard', url: '/lead', icon: LayoutDashboard },
    { title: 'Learning', url: '/lead/learning', icon: BookOpen },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ];

  const items = isAdmin ? adminItems : leadItems;

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Activity className="h-[18px] w-[18px] text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-[15px] tracking-tight text-foreground">MEL Platform</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5 tracking-wide uppercase">
              {user?.role === 'admin' ? 'Admin Portal' : 'Project Portal'}
            </p>
          </div>
        </div>
      </div>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin' || item.url === '/lead'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
                      activeClassName="bg-primary/8 text-primary font-medium shadow-sm"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User footer */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-semibold">
            {user?.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2.5 text-[13px] text-muted-foreground hover:text-foreground w-full px-2 py-2 rounded-lg hover:bg-secondary transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </Sidebar>
  );
}
