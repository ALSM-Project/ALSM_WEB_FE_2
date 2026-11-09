import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LivePreviewPanel } from '../components/LivePreviewPanel';
import type { MenuItem } from '../types/menu';

const mockMenuItems: MenuItem[] = [
  {
    id: 'item-dash',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/',
    order: 1,
    isVisible: true,
  },
  {
    id: 'item-projects',
    label: 'Organisation Projects',
    icon: 'FolderKanban',
    path: '/organisation/projects',
    order: 2,
    isVisible: true,
  },
  {
    id: 'item-members',
    label: 'Team Members',
    icon: 'Users',
    path: '/organisation/members',
    order: 3,
    isVisible: true,
  },
  {
    id: 'item-roles',
    label: 'Roles & Permissions',
    icon: 'Shield',
    path: '/organisation/roles',
    order: 4,
    isVisible: true,
  },
];

const mockWeb2Tree: MenuItem[] = [
  {
    id: 'web2_dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/',
    order: 1,
    isVisible: true,
  },
  {
    id: 'web2_group_team_lead',
    label: 'Team Lead',
    icon: 'Users',
    order: 2,
    isVisible: true,
    children: [
      {
        id: 'web2_tl_workload',
        label: 'Team Workload & Progress',
        icon: 'Activity',
        path: '/team-lead/workload',
        order: 1,
        isVisible: true,
      },
      {
        id: 'web2_tl_allocation',
        label: 'Employee Allocation',
        icon: 'Users',
        path: '/team-lead/projects',
        order: 2,
        isVisible: true,
      },
      {
        id: 'web2_tl_meetings',
        label: 'Online Meetings',
        icon: 'Video',
        path: '/enterprise/meetings',
        order: 3,
        isVisible: true,
      },
    ],
  },
  {
    id: 'web2_group_commercial',
    label: 'CRM & Sales',
    icon: 'Zap',
    order: 3,
    isVisible: true,
    children: [
      {
        id: 'web2_sales_pipeline',
        label: 'Sales Pipeline',
        icon: 'TrendingUp',
        path: '/sales/pipeline',
        order: 1,
        isVisible: true,
      },
      {
        id: 'web2_discounts',
        label: 'Discount Approvals',
        icon: 'FileCheck',
        path: '/sales/discount-approvals',
        order: 2,
        isVisible: true,
      },
    ],
  },
  {
    id: 'web2_group_support',
    label: 'Customer Support',
    icon: 'Headphones',
    order: 4,
    isVisible: true,
    children: [
      {
        id: 'web2_support_access',
        label: 'Organisation Access',
        icon: 'Building2',
        path: '/support',
        order: 1,
        isVisible: true,
      },
    ],
  },
];

describe('LivePreviewPanel - Role-based Screen & Multi-Web Preview', () => {
  it('renders WEB_3 with correct roles and switches to role screens', () => {
    render(
      <LivePreviewPanel
        sidebarNav={mockMenuItems}
        selectedItemId="item-projects"
        selectedApp="WEB_3"
      />
    );

    // Initial role select has WEB_3 roles
    const roleSelect = screen.getByDisplayValue('All Roles');
    expect(roleSelect).toBeInTheDocument();
    expect(screen.getByText('Organization Owner')).toBeInTheDocument();
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();

    // Select Organization Owner
    fireEvent.change(roleSelect, { target: { value: 'ORGANIZATION_OWNER' } });
    expect(screen.getByText('Enterprise Organization Governance')).toBeInTheDocument();
    expect(screen.getByText('4 Active')).toBeInTheDocument();

    // Select Developer
    fireEvent.change(roleSelect, { target: { value: 'DEVELOPER' } });
    expect(screen.getByText('Modernization Studio & AST Engine')).toBeInTheDocument();
    expect(screen.getByText('48/48 Assertions')).toBeInTheDocument();

    // Select Viewer
    fireEvent.change(roleSelect, { target: { value: 'VIEWER' } });
    expect(screen.getByText('Deliverables & Reports (Read-Only)')).toBeInTheDocument();
    expect(screen.getByText(/You have read-only permissions/i)).toBeInTheDocument();
  });

  it('updates available roles and screens when switching to WEB_2 (Platform Admin)', () => {
    render(
      <LivePreviewPanel
        sidebarNav={mockMenuItems}
        selectedItemId="item-dash"
        selectedApp="WEB_2"
      />
    );

    // Check WEB_2 roles exist
    expect(screen.getByRole('option', { name: 'Platform Admin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Team Lead' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sales Manager' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Conversion Staff' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Customer Support' })).toBeInTheDocument();

    // Select Platform Admin
    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'SYSTEM_ADMIN' } });
    expect(screen.getByText('Platform Administration Console')).toBeInTheDocument();
    expect(screen.getByText('$248.5K')).toBeInTheDocument();

    // Select Sales Manager
    fireEvent.change(roleSelect, { target: { value: 'SALES_MANAGER' } });
    expect(screen.getByText('Commercial CRM & Pipeline')).toBeInTheDocument();
    expect(screen.getByText('$1.42M Weighted Pipeline')).toBeInTheDocument();
  });

  it('strictly filters sidebar items so Sales Manager cannot see Team Lead or Customer Support menus', () => {
    render(
      <LivePreviewPanel
        sidebarNav={mockWeb2Tree}
        selectedItemId="web2_dashboard"
        selectedApp="WEB_2"
      />
    );

    // With All Roles, Team Lead and CRM & Sales are both visible
    expect(screen.getByRole('button', { name: /Team Lead/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CRM & Sales/i })).toBeInTheDocument();

    // Switch to Sales Manager
    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'SALES_MANAGER' } });

    // Sales Manager should see CRM & Sales and its items
    expect(screen.getByRole('button', { name: /CRM & Sales/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sales Pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discount Approvals/i })).toBeInTheDocument();

    // Sales Manager MUST NOT see Team Lead or Customer Support
    expect(screen.queryByRole('button', { name: /Team Lead/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Employee Allocation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Team Workload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Customer Support/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Organisation Access/i })).not.toBeInTheDocument();
  });

  it('renders all Team Lead items when Team Lead role is selected and hides CRM & Sales', () => {
    render(
      <LivePreviewPanel
        sidebarNav={mockWeb2Tree}
        selectedItemId="web2_dashboard"
        selectedApp="WEB_2"
      />
    );

    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'TEAM_LEAD' } });

    // Team Lead dashboard should be displayed
    expect(screen.getByText('Team Operations & Workload')).toBeInTheDocument();
    expect(screen.getByText('David T. (Lead Dev)')).toBeInTheDocument();

    // All Team Lead items must be present in sidebar
    expect(screen.getByRole('button', { name: /Team Lead/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Team Workload & Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Employee Allocation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Online Meetings/i })).toBeInTheDocument();

    // CRM & Sales should NOT be visible to Team Lead
    expect(screen.queryByRole('button', { name: /CRM & Sales/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sales Pipeline/i })).not.toBeInTheDocument();
  });

  it('updates available roles and screens when switching to WEB_1 (PoC Customer)', () => {
    render(
      <LivePreviewPanel
        sidebarNav={mockMenuItems}
        selectedItemId="item-dash"
        selectedApp="WEB_1"
      />
    );

    expect(screen.getByText('Customer Account Owner')).toBeInTheDocument();
    expect(screen.getByText('PoC Developer')).toBeInTheDocument();

    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'DEVELOPER' } });
    expect(screen.getByText('Platform-Based Modernization Studio')).toBeInTheDocument();
  });

  it('allows clicking miniature sidebar items to preview that item screen and triggers onSelectItem', () => {
    const handleSelect = vi.fn();
    render(
      <LivePreviewPanel
        sidebarNav={mockMenuItems}
        selectedItemId="item-dash"
        selectedApp="WEB_3"
        onSelectItem={handleSelect}
      />
    );

    const projectItemBtn = screen.getByRole('button', { name: /Organisation Projects/i });
    fireEvent.click(projectItemBtn);

    expect(handleSelect).toHaveBeenCalledWith('item-projects');
    expect(screen.getByText('Core Banking Ledger')).toBeInTheDocument();
  });
});
