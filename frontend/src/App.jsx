// src/App.jsx
// FIX: Routes were unprotected — any URL worked without login.
// Added <ProtectedRoute> that checks auth state before rendering.
// Added role-based redirect after login.
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { fetchCurrentUser, selectIsAuthenticated, selectUserRole } from './features/auth/authSlice';

// ── Layouts ───────────────────────────────────────────────────────────────
import AdminLayout   from './components/admin/AdminLayout';
import TrainerLayout from './components/trainer/TrainerLayout';
import TraineeLayout from './components/trainee/TraineeLayout';
import HRLayout      from './components/hr/HRLayout';

// ── Pages ─────────────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import AdminDashboard    from './pages/admin/Dashboard';
import AdminTrainees     from './pages/admin/Trainees';
import AdminTrainers     from './pages/admin/Trainers';
import AdminBatches      from './pages/admin/Batches';
import AdminSessions     from './pages/admin/Sessions';
import AdminRegistrations from './pages/admin/Registrations';

import TrainerDashboard  from './pages/trainer/Dashboard';
import TrainerSessions   from './pages/trainer/Sessions';
import TrainerAttendance from './pages/trainer/Attendance';
import TrainerAssignments from './pages/trainer/Assignments';

import TraineeDashboard  from './pages/trainee/Dashboard';
import TraineeSessions   from './pages/trainee/Sessions';
import TraineeAssignments from './pages/trainee/Assignments';

import HRDashboard   from './pages/hr/Dashboard';
import HRTrainees    from './pages/hr/Trainees';
import HRInterviews  from './pages/hr/Interviews';
import HRPipeline    from './pages/hr/Pipeline';

// ── Protected Route ───────────────────────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role            = useAppSelector(selectUserRole);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// ── Role redirect after login ─────────────────────────────────────────────
function RoleRedirect() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role            = useAppSelector(selectUserRole);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const map = { admin: '/admin/dashboard', trainer: '/trainer/dashboard', trainee: '/trainee/dashboard', hr: '/hr/dashboard' };
  return <Navigate to={map[role] || '/login'} replace />;
}

// ── App ───────────────────────────────────────────────────────────────────
function App() {
  const dispatch        = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Re-hydrate user on page reload
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCurrentUser());
  }, []); // eslint-disable-line

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot_password" element={<ForgotPasswordPage />} />
        <Route path="/"      element={<RoleRedirect />} />

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard"     element={<AdminDashboard />} />
            <Route path="trainees"      element={<AdminTrainees />} />
            <Route path="trainers"      element={<AdminTrainers />} />
            <Route path="batches"       element={<AdminBatches />} />
            <Route path="sessions"      element={<AdminSessions />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Trainer */}
        <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route path="dashboard"   element={<TrainerDashboard />} />
            <Route path="sessions"    element={<TrainerSessions />} />
            <Route path="attendance"  element={<TrainerAttendance />} />
            <Route path="assignments" element={<TrainerAssignments />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Trainee */}
        <Route element={<ProtectedRoute allowedRoles={['trainee']} />}>
          <Route path="/trainee" element={<TraineeLayout />}>
            <Route path="dashboard"   element={<TraineeDashboard />} />
            <Route path="sessions"    element={<TraineeSessions />} />
            <Route path="assignments" element={<TraineeAssignments />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* HR */}
        <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
          <Route path="/hr" element={<HRLayout />}>
            <Route path="dashboard"  element={<HRDashboard />} />
            <Route path="trainees"   element={<HRTrainees />} />
            <Route path="interviews" element={<HRInterviews />} />
            <Route path="pipeline"   element={<HRPipeline />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 40, fontSize: 24 }}>404 — Page Not Found</div>} />
      </Routes>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}

export default App;
