import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MenuBuilderPage } from '../pages/MenuBuilderPage';

const mockMenuNodes = [
  {
    id: 'node-dash',
    key: 'dashboard.overview',
    label: 'Dashboard Overview',
    type: 'PAGE',
    icon: 'LayoutDashboard',
    route: '/',
    order: 1,
    visibility: true,
    requiredPermissions: [],
    children: [],
  },
  {
    id: 'node-admin',
    key: 'group.admin',
    label: 'Platform Administration',
    type: 'GROUP',
    icon: 'Settings',
    route: null,
    order: 2,
    visibility: true,
    requiredPermissions: ['admin.manage'],
    children: [
      {
        id: 'node-users',
        key: 'admin.users',
        label: 'User Roles & RBAC',
        type: 'PAGE',
        icon: 'Users',
        route: '/admin/users',
        parentId: 'node-admin',
        order: 1,
        visibility: true,
        requiredPermissions: ['users.manage'],
        children: [],
      },
    ],
  },
];

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockMove = vi.fn();

const MOCK_PERMISSIONS = [
  { key: 'users.manage', label: 'Manage Users', group: 'Administration' },
  { key: 'admin.manage', label: 'Platform Administration', group: 'Administration' },
];

vi.mock('@/features/menu-builder/hooks/useMenuBuilder', () => ({
  useMenuBuilder: () => ({
    menuTree: mockMenuNodes,
    isLoading: false,
    createMenuItem: mockCreate,
    updateMenuItem: mockUpdate,
    deleteMenuItem: mockDelete,
    moveMenuItem: mockMove,
  }),
}));

vi.mock('@/features/roles/hooks/useRolesQuery', () => ({
  usePermissionsQuery: () => ({
    data: MOCK_PERMISSIONS,
    isLoading: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Dynamic Menu Builder & Permission Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 3-panel builder layout: tree panel, available pages, and live preview', () => {
    render(<MenuBuilderPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Menu Builder')).toBeInTheDocument();
    expect(screen.getByText('Navigation Tree')).toBeInTheDocument();

    expect(screen.getAllByText('Dashboard Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Platform Administration').length).toBeGreaterThan(0);

    // Verify Add Menu Item button
    expect(screen.getByRole('button', { name: /Add Menu Item/i })).toBeInTheDocument();

    // Verify Live Preview panel
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('selects an item and displays the item editor panel with permissions and attributes', async () => {
    render(<MenuBuilderPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('Dashboard Overview').length).toBeGreaterThan(0);

    // Click on Dashboard Overview item in tree
    fireEvent.click(screen.getAllByText('Dashboard Overview')[0]);

    await waitFor(() => {
      expect(screen.getByText('Menu Item Properties')).toBeInTheDocument();
    });

    // Label input populated
    expect(screen.getByDisplayValue('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/')).toBeInTheDocument();
  });

  it('calls createMenuItem when clicking Add Menu Item', async () => {
    mockCreate.mockResolvedValue({
      id: 'node-new-root',
      key: 'menu.12345',
      label: 'New Menu',
      type: 'PAGE',
      route: '/new-page',
      order: 3,
      visibility: true,
      requiredPermissions: [],
      children: [],
    });

    render(<MenuBuilderPage />, { wrapper: createWrapper() });

    const addBtn = screen.getByRole('button', { name: /Add Menu Item/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'New Menu',
          application: 'WEB_2',
        })
      );
    });
  });
});
