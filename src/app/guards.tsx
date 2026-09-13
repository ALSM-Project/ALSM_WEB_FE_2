import React, { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { tokenStore } from '@/services/api/tokenStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      tokenStore.setAccessToken(accessToken);
      tokenStore.setRefreshToken(refreshToken);
      // Redirect directly to admin roles management page
      window.location.href = '/admin/roles';
    } else {
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
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    tokenStore.clear();
    const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
    window.location.href = `${loginUrl}/login`;
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PermissionGuard = ({ permission, children }: { permission: string; children?: React.ReactNode }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
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
