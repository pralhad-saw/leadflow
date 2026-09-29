// import { Navigate, useLocation } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// /**
//  * <ProtectedRoute roles={['advisor','brokerage_admin']}><Board/></ProtectedRoute>
//  *
//  * This is UX only -- the real enforcement is `requireRole` on the server.
//  * Hiding a button never secures an endpoint.
//  */
// export default function ProtectedRoute({ children, roles }) {
//   const { user, loading } = useAuth();
//   const location = useLocation();

//   if (loading) return <div className="center muted">Loading session...</div>;
//   if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
//   if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

//   return children;
// }
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import api, { TOKEN_KEY, errMsg } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);

      return {
        ok: true,
        user: data.user,
      };
    } catch (error) {
      return {
        ok: false,
        message: errMsg(error),
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}