import { useState, useMemo, useEffect } from 'react';
import {
  Users, ShieldCheck, UserCheck, UserPlus, Clock, Search, ChevronDown,
  MoreHorizontal, Mail, Ban, RotateCcw, Edit2, Eye, X, Check, Upload,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { apiGetUsers, apiCreateUser, apiUpdateUser, apiResendInvite, ApiUserRecord } from '@/lib/api';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

// ── Types ──
type UserStatus = 'active' | 'invited' | 'disabled';
interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'project_lead';
  status: UserStatus;
  projectIds: string[];
  createdAt: string;
  lastLogin: string | null;
  inviteToken?: string;
  inviteExpiry?: string;
}

// ── Initial state (no static users; to be loaded from backend later) ──
const initialUsers: ManagedUser[] = [];

const CURRENT_ADMIN_ID = '';

// ── Helpers ──
const statusConfig: Record<UserStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Active', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  invited: { label: 'Invited', bg: 'bg-warning/10', text: 'text-warning-foreground', dot: 'bg-warning' },
  disabled: { label: 'Disabled', bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

function StatusPill({ status }: { status: UserStatus }) {
  const c = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border border-transparent ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function RolePill({ role }: { role: 'super_admin' | 'admin' | 'project_lead' }) {
  if (role === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-warning/15 text-warning-foreground">
        <ShieldCheck className="h-3 w-3" /> Super Admin
      </span>
    );
  }
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary">
      <ShieldCheck className="h-3 w-3" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent/10 text-accent">
      <UserCheck className="h-3 w-3" /> Project Lead
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── KPI Card ──
function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="card-elevated rounded-2xl p-5 flex items-center gap-4 animate-in">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[26px] font-semibold tracking-tight text-foreground leading-none">{value}</p>
        <p className="text-[12px] text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── FilterChip ──
function FilterChip({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" style={{ zIndex: open ? 60 : 'auto' }}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border ${
          value ? 'bg-primary/8 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
        }`}
      >
        {selected ? selected.label : label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-[80] bg-popover border border-border rounded-xl shadow-lg min-w-[180px] animate-in">
            <div className="p-1">
              <button onClick={() => { onChange(''); setOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                All {label}
              </button>
              {options.map(o => (
                <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors ${value === o.value ? 'bg-primary/8 text-primary font-medium' : 'hover:bg-secondary'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════
export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: ManagedUser; action: 'disable' | 'reactivate' | 'resend' } | null>(null);

  // Add form state
  const [addingUser, setAddingUser] = useState(false);

  // Edit form state
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirm action loading
  const [executingAction, setExecutingAction] = useState(false);

  // Load users from backend
  useEffect(() => {
    (async () => {
      try {
        const apiUsers = await apiGetUsers();
        const mapped: ManagedUser[] = apiUsers.map((u: ApiUserRecord) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role === 'SUPER_ADMIN' ? 'super_admin' : (u.role === 'ADMIN' ? 'admin' : 'project_lead'),
          status: !u.isActive && u.inviteToken ? 'invited' : u.isActive ? 'active' : 'disabled',
          projectIds: [],
          createdAt: u.createdAt,
          lastLogin: null,
        }));
        setUsers(mapped);
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Failed to load users', description: err?.message || 'Unknown error', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // ── Computed ──
  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const totalAdmins = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const totalLeads = users.filter(u => u.role === 'project_lead').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const pendingInvites = users.filter(u => u.status === 'invited').length;

  const activeFilters = [
    roleFilter && { key: 'role', label: `Role: ${roleFilter === 'admin' ? 'Admin' : roleFilter === 'super_admin' ? 'Super Admin' : 'Project Lead'}` },
    statusFilter && { key: 'status', label: `Status: ${statusConfig[statusFilter as UserStatus]?.label}` },
  ].filter(Boolean) as { key: string; label: string }[];

  // ── Handlers ──
  const addUserSchema = useMemo(() => z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
    role: z.enum(['super_admin', 'admin', 'project_lead']),
  }).superRefine((val, ctx) => {
    const exists = users.some(u => u.email.toLowerCase() === val.email.toLowerCase());
    if (exists) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email already exists' });
  }), [users]);

  type AddUserValues = z.infer<typeof addUserSchema>;

  const addForm = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { name: '', email: '', role: 'project_lead' },
  });

  const editUserSchema = useMemo(() => z.object({
    name: z.string().trim().min(1, 'Name is required'),
    role: z.enum(['super_admin', 'admin', 'project_lead']),
  }), []);

  type EditUserValues = z.infer<typeof editUserSchema>;

  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { name: '', role: 'project_lead' },
  });

  async function handleAddUser(values: AddUserValues) {
    setAddingUser(true);
    try {
      const created = await apiCreateUser({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        role: values.role === 'super_admin' ? 'SUPER_ADMIN' : (values.role === 'admin' ? 'ADMIN' : 'PROJECT_LEAD'),
      });
      const mapped: ManagedUser = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role === 'SUPER_ADMIN' ? 'super_admin' : (created.role === 'ADMIN' ? 'admin' : 'project_lead'),
        status: created.isActive ? 'active' : 'disabled',
        projectIds: [],
        createdAt: created.createdAt,
        lastLogin: null,
      };
      setUsers(prev => [mapped, ...prev]);
      setAddOpen(false);
      addForm.reset({ name: '', email: '', role: 'project_lead' });
      toast({
        title: 'User created',
        description: `${mapped.name} has been created as ${values.role === 'super_admin' ? 'Super Admin' : values.role === 'admin' ? 'Admin' : 'Project Lead'}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to create user', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setAddingUser(false);
    }
  }

  function openEdit(u: ManagedUser) {
    setEditUser(u);
    editForm.reset({ name: u.name, role: u.role });
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    const ok = await editForm.trigger(undefined, { shouldFocus: true });
    if (!ok) return;
    const values = editForm.getValues();
    setSavingEdit(true);
    try {
      const updated = await apiUpdateUser(editUser.id, {
        name: values.name,
        role: values.role === 'super_admin' ? 'SUPER_ADMIN' : (values.role === 'admin' ? 'ADMIN' : 'PROJECT_LEAD'),
      });
      setUsers(prev =>
        prev.map(u =>
          u.id === editUser.id
            ? {
                ...u,
                name: updated.name,
                role: updated.role === 'SUPER_ADMIN' ? 'super_admin' : (updated.role === 'ADMIN' ? 'admin' : 'project_lead'),
              }
            : u
        )
      );
      setEditUser(null);
      toast({ title: 'User updated', description: `${values.name}'s details have been saved.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to update user', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  }

  async function executeAction() {
    if (!confirmAction) return;
    const { user, action } = confirmAction;
    if (action === 'disable') {
      if (String(user.id) === CURRENT_ADMIN_ID) { toast({ title: 'Cannot disable yourself', variant: 'destructive' }); setConfirmAction(null); return; }
      if (user.role === 'admin' && totalAdmins <= 1) { toast({ title: 'Cannot disable', description: 'At least one admin must remain active.', variant: 'destructive' }); setConfirmAction(null); return; }
    }
    setExecutingAction(true);
    try {
      if (action === 'disable') {
        await apiUpdateUser(user.id, { isActive: false });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'disabled' as UserStatus } : u));
        toast({ title: 'User disabled', description: `${user.name} can no longer access the system.` });
      } else if (action === 'reactivate') {
        await apiUpdateUser(user.id, { isActive: true });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'active' as UserStatus } : u));
        toast({ title: 'User reactivated', description: `${user.name} can now access the system.` });
      } else if (action === 'resend') {
        const res = await apiResendInvite(user.id);
        toast({
          title: 'Invitation resent',
          description: res?.inviteLink ? `Invite link: ${res.inviteLink}` : `A new invitation was generated for ${user.email}.`,
        });
      }
      setConfirmAction(null);
    } catch (err: any) {
      console.error(err);
      const titles: Record<string, string> = { disable: 'Failed to disable user', reactivate: 'Failed to reactivate user', resend: 'Failed to resend invite' };
      toast({ title: titles[action] || 'Action failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setExecutingAction(false);
    }
  }

  function toggleProject(pid: string, setter: (fn: (prev: string[]) => string[]) => void) {
    setter(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
  }

  const projectMap: Record<string, string> = {};

  return (
    <div className="page-container py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users, roles, and access permissions.</p>
        </div>
        <Button
          onClick={() => {
            addForm.reset({ name: '', email: '', role: 'project_lead' });
            setAddOpen(true);
          }}
          className="gap-2 rounded-xl shadow-sm"
        >
          <UserPlus className="h-4 w-4" /> Add New User
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Total Users" value={users.length} accent="bg-primary/10 text-primary" />
        <KpiCard icon={ShieldCheck} label="Admins" value={totalAdmins} accent="bg-info/10 text-info" />
        <KpiCard icon={UserCheck} label="Project Leads" value={totalLeads} accent="bg-accent/10 text-accent" />
        <KpiCard icon={Users} label="Active Users" value={activeUsers} accent="bg-success/10 text-success" />
        <KpiCard icon={Clock} label="Pending Invites" value={0} accent="bg-warning/10 text-warning-foreground" />
      </div>

      {/* ── Filters & Search ── */}
      <div className="card-elevated rounded-2xl p-5 space-y-4 animate-in-delay-1">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip label="Role" value={roleFilter} onChange={v => { setRoleFilter(v); setPage(1); }}
              options={[
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'admin', label: 'Admin' },
                { value: 'project_lead', label: 'Project Lead' },
              ]} />
            <FilterChip label="Status" value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }}
              options={[{ value: 'active', label: 'Active' }, { value: 'invited', label: 'Invited' }, { value: 'disabled', label: 'Disabled' }]} />
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 rounded-xl border-border"
            />
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.map(f => (
              <span key={f.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-primary/8 text-primary border border-primary/15">
                {f.label}
                <button onClick={() => { if (f.key === 'role') setRoleFilter(''); if (f.key === 'status') setStatusFilter(''); setPage(1); }}
                  className="hover:bg-primary/10 rounded-full p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); setPage(1); }}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-muted-foreground py-3 px-3">User</th>
                <th className="text-left font-semibold text-muted-foreground py-3 px-3">Role</th>
                <th className="text-left font-semibold text-muted-foreground py-3 px-3">Status</th>
                <th className="text-left font-semibold text-muted-foreground py-3 px-3 hidden lg:table-cell">Projects</th>
                <th className="text-left font-semibold text-muted-foreground py-3 px-3 hidden md:table-cell">Created</th>
                <th className="text-left font-semibold text-muted-foreground py-3 px-3 hidden md:table-cell">Last Login</th>
                <th className="text-right font-semibold text-muted-foreground py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No users found</p>
                  <p className="text-[12px] mt-1">Try adjusting your filters or search query.</p>
                </td></tr>
              )}
              {paginated.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors group">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/8 flex items-center justify-center text-primary text-[12px] font-semibold shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">{u.name}</p>
                        <p className="text-[12px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3"><RolePill role={u.role} /></td>
                  <td className="py-3.5 px-3"><StatusPill status={u.status} /></td>
                  <td className="py-3.5 px-3 hidden lg:table-cell">
                    {u.role === 'project_lead' && u.projectIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.projectIds.slice(0, 2).map(pid => (
                          <span key={pid} className="text-[11px] bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">{projectMap[pid] || pid}</span>
                        ))}
                        {u.projectIds.length > 2 && <span className="text-[11px] text-muted-foreground">+{u.projectIds.length - 2}</span>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{formatRelative(u.lastLogin)}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewUser(u)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {u.status === 'invited' && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'resend' })} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Resend invite">
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                      {u.status === 'active' && String(u.id) !== String(CURRENT_ADMIN_ID) && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'disable' })} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Disable">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {u.status === 'disabled' && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'reactivate' })} className="p-1.5 rounded-lg hover:bg-success/10 transition-colors text-muted-foreground hover:text-success" title="Reactivate">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[12px] text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? 's' : ''} total</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg text-[12px]">Previous</Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-colors ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
                  {i + 1}
                </button>
              ))}
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg text-[12px]">Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ADD USER MODAL */}
      {/* ══════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) addForm.reset({ name: '', email: '', role: 'project_lead' }); setAddOpen(v); }}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add New User</DialogTitle>
            <DialogDescription>Send an invitation to join the MEL Platform.</DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddUser)} className="space-y-4 py-2">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="field-label">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Jane Doe" className={cn("rounded-xl", fieldState.error && "border-destructive focus-visible:ring-destructive")} disabled={addingUser} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="field-label">Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="jane@example.org" className={cn("rounded-xl", fieldState.error && "border-destructive focus-visible:ring-destructive")} disabled={addingUser} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="field-label">Role</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {(['super_admin', 'admin', 'project_lead'] as const).map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => field.onChange(r)}
                            disabled={addingUser}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                              field.value === r ? 'bg-primary/8 text-primary border-primary/25 shadow-sm' : 'bg-card text-muted-foreground border-border hover:border-primary/20'
                            }`}
                          >
                            {r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Admin' : 'Project Lead'}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {addForm.watch('role') === 'project_lead' && (
                <div className="space-y-1.5">
                  <FormLabel className="field-label">Assign Projects</FormLabel>
                  <p className="text-[12px] text-muted-foreground">
                    Project assignment will be wired to live backend data later.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddOpen(false)} disabled={addingUser} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={addingUser} className="rounded-xl gap-2">
                  <Mail className="h-4 w-4" />{addingUser ? 'Sending…' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════ */}
      {/* EDIT USER MODAL */}
      {/* ══════════════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={v => { if (!v) setEditUser(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Edit User</DialogTitle>
            <DialogDescription>Update user details and permissions.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <Form {...editForm}>
              <div className="space-y-4 py-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="field-label">Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} className={cn("rounded-xl", fieldState.error && "border-destructive focus-visible:ring-destructive")} disabled={savingEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <FormLabel className="field-label">Email</FormLabel>
                  <Input value={editUser.email} disabled className="rounded-xl bg-muted" />
                </div>

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="field-label">Role</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          {(['super_admin', 'admin', 'project_lead'] as const).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => field.onChange(r)}
                              disabled={savingEdit}
                              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                                field.value === r ? 'bg-primary/8 text-primary border-primary/25 shadow-sm' : 'bg-card text-muted-foreground border-border hover:border-primary/20'
                              }`}
                            >
                              {r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Admin' : 'Project Lead'}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editForm.watch('role') === 'project_lead' && (
                  <div className="space-y-1.5">
                    <FormLabel className="field-label">Assign Projects</FormLabel>
                    <p className="text-[12px] text-muted-foreground">
                      Project assignment will be wired to live backend data later.
                    </p>
                  </div>
                )}
              </div>
            </Form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={savingEdit} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="rounded-xl">
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════ */}
      {/* VIEW USER PANEL */}
      {/* ══════════════════════════════════════════ */}
      <Sheet open={!!viewUser} onOpenChange={v => { if (!v) setViewUser(null); }}>
        <SheetContent className="sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
          </SheetHeader>
          {viewUser && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center text-primary text-lg font-semibold">
                  {viewUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-foreground">{viewUser.name}</p>
                  <p className="text-[13px] text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card-elevated rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Role</p>
                  <RolePill role={viewUser.role} />
                </div>
                <div className="card-elevated rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Status</p>
                  <StatusPill status={viewUser.status} />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Created</p>
                  <p className="text-[14px] text-foreground">{formatDate(viewUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Last Login</p>
                  <p className="text-[14px] text-foreground">{viewUser.lastLogin ? formatDate(viewUser.lastLogin) : 'Never'}</p>
                </div>
                {viewUser.inviteExpiry && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Invite Expires</p>
                    <p className="text-[14px] text-foreground">{formatDate(viewUser.inviteExpiry)}</p>
                  </div>
                )}
              </div>
              {viewUser.role === 'project_lead' && viewUser.projectIds.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Assigned Projects</p>
                  <div className="space-y-1.5">
                    {viewUser.projectIds.map(pid => (
                      <div key={pid} className="px-3 py-2.5 rounded-xl bg-secondary text-[13px] font-medium text-secondary-foreground">
                        {projectMap[pid] || pid}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="rounded-xl flex-1 gap-2" onClick={() => { setViewUser(null); openEdit(viewUser); }}>
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
                {viewUser.status === 'active' && String(viewUser.id) !== String(CURRENT_ADMIN_ID) && (
                  <Button variant="outline" className="rounded-xl flex-1 gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => { setViewUser(null); setConfirmAction({ user: viewUser, action: 'disable' }); }}>
                    <Ban className="h-4 w-4" /> Disable
                  </Button>
                )}
                {viewUser.status === 'disabled' && (
                  <Button variant="outline" className="rounded-xl flex-1 gap-2 text-success border-success/20 hover:bg-success/10"
                    onClick={() => { setViewUser(null); setConfirmAction({ user: viewUser, action: 'reactivate' }); }}>
                    <RotateCcw className="h-4 w-4" /> Reactivate
                  </Button>
                )}
                {viewUser.status === 'invited' && (
                  <Button variant="outline" className="rounded-xl flex-1 gap-2"
                    onClick={() => { setViewUser(null); setConfirmAction({ user: viewUser, action: 'resend' }); }}>
                    <Mail className="h-4 w-4" /> Resend
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════ */}
      {/* CONFIRM ACTION DIALOG */}
      {/* ══════════════════════════════════════════ */}
      <AlertDialog open={!!confirmAction} onOpenChange={v => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'disable' && 'Disable User'}
              {confirmAction?.action === 'reactivate' && 'Reactivate User'}
              {confirmAction?.action === 'resend' && 'Resend Invitation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'disable' && `${confirmAction.user.name} will no longer be able to access the platform. This action can be reversed.`}
              {confirmAction?.action === 'reactivate' && `${confirmAction?.user.name} will regain access to the platform with their previous permissions.`}
              {confirmAction?.action === 'resend' && `A new invitation email will be sent to ${confirmAction?.user.email}. The previous link will be invalidated.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={executingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={executingAction}
              className={`rounded-xl ${confirmAction?.action === 'disable' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}>
              {executingAction ? 'Processing…' : (
                <>
                  {confirmAction?.action === 'disable' && 'Disable User'}
                  {confirmAction?.action === 'reactivate' && 'Reactivate'}
                  {confirmAction?.action === 'resend' && 'Resend Invitation'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
