import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// Components
import ProtectedRoute from "../components/ProtectedRoute";

// Layouts
import StudentLayout from "../layouts/StudentLayout";
import ClerkLayout from "../layouts/ClerkLayout";
import HodLayout from "../layouts/HodLayout";
import DeanLayout from "../layouts/DeanLayout";
import AdminLayout from "../layouts/AdminLayout";

// Student Pages
import DashboardHome from "../pages/student/DashboardHome";
import Profile from "../pages/student/Profile";
import TranscriptRequest from "../pages/student/TranscriptRequest";
import Status from "../pages/student/Status";
import Payments from "../pages/student/Payments";
import Downloads from "../pages/student/Downloads";

// Clerk Pages
import ClerkDashboardHome from "../pages/clerk/ClerkDashboardHome";
import ClerkStudentVerification from "../pages/clerk/ClerkStudentVerification";
import ClerkGradeEntry from "../pages/clerk/ClerkGradeEntry";
import ClerkTranscriptRequests from "../pages/clerk/ClerkTranscriptRequests";
import ClerkReturnedRequests from "../pages/clerk/ClerkReturnedRequests";
import ClerkSettings from "../pages/clerk/ClerkSettings";

// HoD Pages
import HodDashboardHome from "../pages/hod/HodDashboardHome";
import HodPendingApprovals from "../pages/hod/HodPendingApprovals";
import HodReviewPage from "../pages/hod/HodReviewPage";

// Dean Pages
import DeanDashboardHome from "../pages/dean/DeanDashboardHome";
import DeanPendingApprovals from "../pages/dean/DeanPendingApprovals";
import DeanReviewPage from "../pages/dean/DeanReviewPage";

// Admin Pages
import AdminDashboardHome from "../pages/admin/AdminDashboardHome";
import UserManagement from "../pages/admin/UserManagement";
import RoleManagement from "../pages/admin/RoleManagement";
import FacultyManagement from "../pages/admin/FacultyManagement";
import ProgramCurriculum from "../pages/admin/ProgramCurriculum";
import GradingScheme from "../pages/admin/GradingScheme";
import TranscriptRecords from "../pages/admin/TranscriptRecords";
import PaymentsPage from "../pages/admin/PaymentsPage";
import AuditLogsPage from "../pages/admin/AuditLogsPage";
import SystemSettings from "../pages/admin/SystemSettings";

function PublicRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();
  
  if (isAuthenticated && userRole) {
    const roleRoutes = {
      Student: '/dashboard',
      Clerk: '/clerk/dashboard',
      HoD: '/hod',
      Dean: '/dean',
      Admin: '/admin/dashboard'
    };
    return <Navigate to={roleRoutes[userRole] || '/dashboard'} replace />;
  }
  
  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ---------- Public Routes ---------- */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        {/* ---------- Protected Student Dashboard ---------- */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="Student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="request" element={<TranscriptRequest />} />
          <Route path="status" element={<Status />} />
          <Route path="payments" element={<Payments />} />
          <Route path="downloads" element={<Downloads />} />
        </Route>

        {/* ---------- Protected Clerk Dashboard ---------- */}
        <Route
          path="/clerk"
          element={
            <ProtectedRoute requiredRole="Clerk">
              <ClerkLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/clerk/dashboard" replace />} />
          <Route path="dashboard" element={<ClerkDashboardHome />} />
          <Route path="verification" element={<ClerkStudentVerification />} />
          <Route path="grades" element={<ClerkGradeEntry />} />
          <Route path="requests" element={<ClerkTranscriptRequests />} />
          <Route path="requests/:id" element={<ClerkTranscriptRequests />} />
          <Route path="rejected" element={<ClerkReturnedRequests />} />
          <Route path="settings" element={<ClerkSettings />} />
        </Route>

        {/* ---------- Protected HoD Dashboard ---------- */}
        <Route
          path="/hod"
          element={
            <ProtectedRoute requiredRole="HoD">
              <HodLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HodDashboardHome />} />
          <Route path="pending" element={<HodPendingApprovals />} />
          <Route path="review/:id" element={<HodReviewPage />} />
          <Route path="approved" element={<div className="p-6"><h1 className="text-2xl font-bold">Approved Requests</h1></div>} />
          <Route path="rejected" element={<div className="p-6"><h1 className="text-2xl font-bold">Rejected Requests</h1></div>} />
          <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>} />
        </Route>

        {/* ---------- Protected Dean Dashboard ---------- */}
        <Route
          path="/dean"
          element={
            <ProtectedRoute requiredRole="Dean">
              <DeanLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DeanDashboardHome />} />
          <Route path="pending" element={<DeanPendingApprovals />} />
          <Route path="review/:id" element={<DeanReviewPage />} />
          <Route path="approved" element={<div className="p-6"><h1 className="text-2xl font-bold">Approved Transcripts</h1></div>} />
          <Route path="rejected" element={<div className="p-6"><h1 className="text-2xl font-bold">Rejected Transcripts</h1></div>} />
          <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>} />
        </Route>

        {/* ---------- Protected Admin Dashboard ---------- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="faculty" element={<FacultyManagement />} />
          <Route path="curriculum" element={<ProgramCurriculum />} />
          <Route path="grading" element={<GradingScheme />} />
          <Route path="transcripts" element={<TranscriptRecords />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        {/* ---------- 404 ---------- */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-screen text-2xl font-semibold">
              404 - Page Not Found
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
