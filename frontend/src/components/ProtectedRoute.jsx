import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * <ProtectedRoute roles={['advisor','brokerage_admin']}><Board/></ProtectedRoute>
 *
 * This is UX only -- the real enforcement is `requireRole` on the server.
 * Hiding a button never secures an endpoint.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="center muted">Loading session...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
