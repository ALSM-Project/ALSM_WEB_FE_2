import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/shared/layouts/AppLayout';
import StaffDashboardPage from '@/features/dashboard/pages/StaffDashboardPage';
import { MenuBuilderPage } from '@/features/menus';
import RolesPage from '@/features/rbac/pages/RolesPage';
import UserRolesPage from '@/features/rbac/pages/UserRolesPage';
import { AuthCallbackPage, ProtectedRoute, PermissionGuard } from './guards';

export const router = createBrowserRouter([
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <StaffDashboardPage /> },
      { 
        path: '/admin/menu-builder', 
        element: (
          <PermissionGuard permission="menu.manage">
            <MenuBuilderPage />
          </PermissionGuard>
        ) 
      },
      { 
        path: '/admin/roles', 
        element: (
          <PermissionGuard permission="roles.manage">
            <RolesPage />
          </PermissionGuard>
        ) 
      },
      { 
        path: '/admin/users', 
        element: (
          <PermissionGuard permission="users.manage">
            <UserRolesPage />
          </PermissionGuard>
        ) 
      },
      { path: '/queue', element: <StaffDashboardPage /> },
      { path: '/validation', element: <StaffDashboardPage /> },
      { path: '/review', element: <StaffDashboardPage /> },
      { path: '/organisations', element: <StaffDashboardPage /> },
      { path: '/organisations/partners', element: <StaffDashboardPage /> },
      { path: '/organisations/departments', element: <StaffDashboardPage /> },
      { path: '/organisations/teams', element: <StaffDashboardPage /> },
      { path: '/diagnostics', element: <StaffDashboardPage /> },
      { path: '/account/security/password', element: <StaffDashboardPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
