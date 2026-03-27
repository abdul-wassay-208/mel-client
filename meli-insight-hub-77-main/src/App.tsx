import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { MainLayout } from "@/layouts/MainLayout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProjectWizard from "./pages/admin/ProjectWizard";
import ProjectDetails from "./pages/admin/ProjectDetails";
import ReportDetails from "./pages/admin/ReportDetails";
import EditRequests from "./pages/admin/EditRequests";
import AuditLog from "./pages/admin/AuditLog";
import Analytics from "./pages/admin/Analytics";
import UserManagement from "./pages/admin/UserManagement";
import InviteAccept from "./pages/InviteAccept";
import LeadDashboard from "./pages/lead/LeadDashboard";
import ReportingInterface from "./pages/lead/ReportingInterface";
import LearningModule from "./pages/lead/LearningModule";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import MELConfigBuilder from "./pages/superadmin/MELConfigBuilder";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/lead" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function LeadRoute({ children }: { children: React.ReactNode }) {
  const { user, isLead, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isLead) return <Navigate to="/admin" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/superadmin/mel-config" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/lead'} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              <Route path="/" element={<RootRedirect />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/projects/new" element={<AdminRoute><ProjectWizard /></AdminRoute>} />
              <Route path="/admin/projects/:projectId" element={<AdminRoute><ProjectDetails /></AdminRoute>} />
              <Route path="/admin/reports/:reportId" element={<AdminRoute><ReportDetails /></AdminRoute>} />
              <Route path="/admin/edit-requests" element={<AdminRoute><EditRequests /></AdminRoute>} />
              <Route path="/admin/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />

              {/* Super Admin Routes */}
              <Route path="/superadmin/mel-config" element={<SuperAdminRoute><MELConfigBuilder /></SuperAdminRoute>} />

              {/* Project Lead Routes */}
              <Route path="/lead" element={<LeadRoute><LeadDashboard /></LeadRoute>} />
              <Route path="/lead/report/:projectId/:reportId" element={<LeadRoute><ReportingInterface /></LeadRoute>} />
              <Route path="/lead/learning" element={<LeadRoute><LearningModule /></LeadRoute>} />

              {/* Shared Routes */}
              <Route path="/notifications" element={<AuthRoute><Notifications /></AuthRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
