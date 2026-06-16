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
import AdminLmsContent   from './pages/admin/LmsContent';
import AdminAssignments  from './pages/admin/Assignments';
import AdminRegistrations from './pages/admin/Registrations';
import AdminPrograms     from './pages/admin/Programs';
import AdminUsers        from './pages/admin/Users';
import AdminSettings     from './pages/admin/Settings';
import AdminReports      from './pages/admin/Reports';
import AdminSupport      from './pages/admin/Support';
import AdminPipeline from './pages/admin/Pipeline';
import AdminInterviews from './pages/admin/Interviews';
import BatchDetails from './pages/admin/BatchDetails';


import Courses from './pages/admin/Courses';
import Profile from './pages/admin/Profilepage';
import CourseDetail from './pages/admin/CourseDetail';
import CourseCurriculumEditor from './pages/admin/CourseCurriculumEditor';
import CourseSegment from './pages/trainee/CourseSegment';
import LessonPlayer from './pages/trainee/LessonPlayer';
import CourseTopic from './pages/trainee/CourseTopic';



import WhatsAppButton from "./pages/WhatsAppButton";




import TrainerDashboard  from './pages/trainer/Dashboard';
import TrainerSessions   from './pages/trainer/Sessions';
import TrainerAttendance from './pages/trainer/Attendance';
import TrainerAssignments from './pages/trainer/Assignments';
import TrainerSettings from './pages/trainer/Settings';
import SessionDetail from './pages/trainer/SessionDetail';



import TraineeDashboard  from './pages/trainee/Dashboard';
import TraineeSessions   from './pages/trainee/Sessions';
import TraineeAssignments from './pages/trainee/Assignments';
import TraineeSettings from './pages/trainee/Settings';
import Trainee_Courses from './pages/trainee/Trainee_Courses';
import Trainee_CourseDetail from './pages/trainee/Trainee_CourseDetail';




import HRDashboard   from './pages/hr/Dashboard';
import HRInterviews  from './pages/hr/Interviews';
import HRPipeline    from './pages/hr/Pipeline';
import HREvaluation  from './pages/hr/Evaluation';
import HREvaluationsList from './pages/hr/EvaluationsList';
import HRSettings from './pages/hr/Settings';

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
            <Route path="lms"           element={<AdminLmsContent />} />
            <Route path="assignments"  element={<AdminAssignments />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="programs"      element={<AdminPrograms />} />
            <Route path="users"         element={<AdminUsers />} />
            <Route path="courses"         element={<Courses />} />
            <Route path="pipeline"        element={<AdminPipeline />} />
            <Route path="interviews"      element={<AdminInterviews />} />
            <Route path="settings"     element={<AdminSettings />} />
            <Route path="reports"      element={<AdminReports />} />
            <Route path="support"      element={<AdminSupport />} />
            <Route path="profile" element={<Profile />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="courses/:id/edit" element={<CourseCurriculumEditor/>} />
           <Route path="batches/view/:id" element={<BatchDetails />} />
            <Route index element={<Navigate to="dashboard" replace />} />


          </Route>

        </Route>

        {/* Trainer */}
        <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route path="dashboard"   element={<TrainerDashboard />} />
              <Route path="batches"       element={<AdminBatches />} />
            <Route path="sessions"    element={<TrainerSessions />} />
            <Route path="attendance"  element={<TrainerAttendance />} />
            <Route path="assignments" element={<TrainerAssignments />} />
            <Route path="settings"     element={<TrainerSettings />} />

               
            <Route path="sessions/new"      element={<SessionDetail mode="create" />} />
            <Route path="sessions/:id"      element={<SessionDetail mode="view" />} />
            <Route path="sessions/:id/edit" element={<SessionDetail mode="edit" />} />


            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Trainee */}
        <Route element={<ProtectedRoute allowedRoles={['trainee']} />}>
          <Route path="/trainee" element={<TraineeLayout />}>
            <Route path="dashboard"   element={<TraineeDashboard />} />
            <Route path="sessions"    element={<TraineeSessions />} />
            <Route path="assignments" element={<TraineeAssignments />} />
            <Route path="settings"    element={<TraineeSettings />} />
             <Route path="profile" element={<Profile />} />
              <Route path="courses" element={<Trainee_Courses />} />
              <Route path="coursess/:id" element={<Trainee_CourseDetail />} />

              <Route path="coursess/:courseId" element={<Trainee_CourseDetail />} />
              <Route path="coursess/:courseId/segment/:segmentId" element={<CourseSegment />} />
              <Route path="coursess/:courseId/segment/:segmentId/:topicId" element={<CourseTopic />} />
              <Route path="coursess/:courseId/segment/:segmentId/:topicId/:lessonId" element={<LessonPlayer />} />
              


              
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* HR */}
        <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
          <Route path="/hr" element={<HRLayout />}>
            <Route path="dashboard"  element={<HRDashboard />} />
            <Route path="interviews" element={<HRInterviews />} />
            <Route path="pipeline"   element={<HRPipeline />} />
            <Route path="evaluations" element={<HREvaluationsList />} />
            <Route path="evaluation/:id" element={<HREvaluation />} />
            <Route path="settings" element={<HRSettings />} />
             <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 40, fontSize: 24 }}>404 — Page Not Found</div>} />
      </Routes>


      {isAuthenticated && <WhatsAppButton />}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />


       

    </BrowserRouter>
  );
}

export default App;
