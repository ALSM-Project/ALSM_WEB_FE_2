import React, { useEffect, useRef } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { tokenStore } from '@/services/api/tokenStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[FE2 AuthCallbackPage] Received tokens, accepting tokens...');
      void tokenStore.acceptTokens({ accessToken, refreshToken })
        .then(() => {
          console.log('[FE2 AuthCallbackPage] Tokens accepted successfully! Navigating to /dashboard');
          window.location.href = '/dashboard';
        })
        .catch((err) => {
          console.error('[FE2 AuthCallbackPage] tokenStore.acceptTokens failed:', err);
          const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
          window.location.href = `${loginUrl}/login`;
        });
    } else {
      console.warn('[FE2 AuthCallbackPage] Missing accessToken or refreshToken in URL, bouncing back to FE1 login');
      const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
      window.location.href = `${loginUrl}/login`;
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
};

export const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, error } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    console.warn('[FE2 ProtectedRoute] No user found (error:', error, '), redirecting to login');
    const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
    const staffUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';
    window.location.href = `${loginUrl}/login?returnTo=${encodeURIComponent(`${staffUrl}/auth/callback`)}`;
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PermissionGuard = ({ permission, children, platformAdminOnly = false }: { permission: string; children?: React.ReactNode; platformAdminOnly?: boolean }) => {
  const { user, hasPermission } = useAuth();

  // Presentation only: the backend independently checks persisted authority.
  if ((platformAdminOnly && user?.isPlatformAdmin !== true) || !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-red-500 text-6xl">🔒</div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-500">You do not have permission to view this page.</p>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
