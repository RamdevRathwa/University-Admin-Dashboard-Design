import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { isAuthenticated, userRole, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-10 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-slate-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">Permission Required</h2>
          <p className="text-gray-600 dark:text-slate-400">You don't have access to this module.</p>
        </div>
      </div>
    );
  }

  return children;
}
