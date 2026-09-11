import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { SocketProvider } from './realtime/SocketProvider';
import { AppShell } from './components/layout/AppShell';
import { Loading } from './components/ui/Feedback';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { UsersPage } from './pages/UsersPage';
import { ClientsPage } from './pages/ClientsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import type { Role } from './types';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading label="Restoring your session" />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <SocketProvider>{children}</SocketProvider>;
};

// Navigation guard only. The API enforces the same rules on every call, so
// hiding a route is a convenience and never the actual protection.
const RequireRole = ({ roles, children }: { roles: Role[]; children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return null;
  return roles.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
};

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />

    <Route
      element={
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      }
    >
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="projects/:id" element={<ProjectDetailPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="tasks/:id" element={<TaskDetailPage />} />
      <Route path="activity" element={<ActivityPage />} />
      <Route
        path="clients"
        element={
          <RequireRole roles={['ADMIN']}>
            <ClientsPage />
          </RequireRole>
        }
      />
      <Route
        path="users"
        element={
          <RequireRole roles={['ADMIN']}>
            <UsersPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
