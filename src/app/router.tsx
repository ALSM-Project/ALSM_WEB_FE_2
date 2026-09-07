import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/shared/layouts/AppLayout';
import StaffDashboardPage from '@/features/dashboard/pages/StaffDashboardPage';
import { MenuBuilderPage } from '@/features/menus';
import RolesPage from '@/features/rbac/pages/RolesPage';
import UserRolesPage from '@/features/rbac/pages/UserRolesPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <StaffDashboardPage /> },
      { path: '/admin/menu-builder', element: <MenuBuilderPage /> },
      { path: '/admin/roles', element: <RolesPage /> },
      { path: '/admin/users', element: <UserRolesPage /> },
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
