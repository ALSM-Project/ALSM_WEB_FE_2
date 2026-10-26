import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar, findActiveMenuItemId } from '../Sidebar';
import { MenuItem } from '@/features/menus/types/menu';

const mockMenuItems: MenuItem[] = [
  {
    id: 'web2_dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/',
    order: 1,
    isVisible: true,
  },
  {
    id: 'web2_group_partners',
    label: 'Partner Management',
    icon: 'Building2',
    order: 7,
    isVisible: true,
    children: [
      {
        id: 'web2_partner_list',
        label: 'Partner Directory',
        icon: 'Building2',
        path: '/partners',
        parentId: 'web2_group_partners',
        order: 1,
        isVisible: true,
      },
      {
        id: 'web2_partner_projects',
        label: 'Partner Projects',
        icon: 'FolderKanban',
        path: '/partners/projects',
        parentId: 'web2_group_partners',
        order: 2,
        isVisible: true,
      },
    ],
  },
];

const mocks = vi.hoisted(() => ({
  sidebarNav: [] as MenuItem[],
}));

vi.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => ({
    sidebarNav: mocks.sidebarNav.length > 0 ? mocks.sidebarNav : mockMenuItems,
    loading: false,
    error: null,
    refreshNavigation: vi.fn(),
  }),
}));

describe('Sidebar Navigation Hierarchy & Route Resolution', () => {
  afterEach(() => {
    cleanup();
  });

  describe('findActiveMenuItemId Algorithm', () => {
    it('accurately resolves Partner Directory for /partners', () => {
      const activeId = findActiveMenuItemId(mockMenuItems, '/partners');
      expect(activeId).toBe('web2_partner_list');
    });

    it('accurately resolves Partner Directory for deep sub-route /partners/new', () => {
      const activeId = findActiveMenuItemId(mockMenuItems, '/partners/new');
      expect(activeId).toBe('web2_partner_list');
    });

    it('accurately resolves Partner Directory for deep detail route /partners/partner-fnx-001', () => {
      const activeId = findActiveMenuItemId(mockMenuItems, '/partners/partner-fnx-001');
      expect(activeId).toBe('web2_partner_list');
    });

    it('accurately resolves Partner Projects for route /partners/projects', () => {
      const activeId = findActiveMenuItemId(mockMenuItems, '/partners/projects');
      expect(activeId).toBe('web2_partner_projects');
    });

    it('accurately resolves Dashboard for root route /', () => {
      const activeId = findActiveMenuItemId(mockMenuItems, '/');
      expect(activeId).toBe('web2_dashboard');
    });
  });

  describe('Sidebar Component Rendering without Separate Register Partner Sidebar Item', () => {
    it('renders Partner Management as parent with Partner Directory as child on /partners', () => {
      render(
        <MemoryRouter initialEntries={['/partners']}>
          <Sidebar />
        </MemoryRouter>
      );

      // Parent group is rendered
      expect(screen.getByText('Partner Management')).toBeInTheDocument();

      // Partner Directory is rendered
      const dirLink = screen.getByRole('link', { name: /Partner Directory/i });
      expect(dirLink).toBeInTheDocument();
      expect(dirLink).toHaveClass('bg-[#0652CC]');

      // Register Partner is strictly NOT in the sidebar
      expect(screen.queryByRole('link', { name: /Register Partner/i })).not.toBeInTheDocument();
    });

    it('renders and highlights Partner Projects on /partners/projects', () => {
      render(
        <MemoryRouter initialEntries={['/partners/projects']}>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Partner Management')).toBeInTheDocument();
      const projLink = screen.getByRole('link', { name: /Partner Projects/i });
      expect(projLink).toBeInTheDocument();
      expect(projLink).toHaveClass('bg-[#0652CC]');
    });

    it('keeps Register Partner excluded from sidebar on /partners/new while keeping Partner Directory active', () => {
      render(
        <MemoryRouter initialEntries={['/partners/new']}>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Partner Management')).toBeInTheDocument();
      const dirLink = screen.getByRole('link', { name: /Partner Directory/i });
      expect(dirLink).toBeInTheDocument();
      expect(dirLink).toHaveClass('bg-[#0652CC]');

      // Register Partner should not exist as a sidebar link
      expect(screen.queryByRole('link', { name: /Register Partner/i })).not.toBeInTheDocument();
    });
  });
  describe('Non-Admin Flat Sidebar Rendering (e.g. Conversion Staff)', () => {
    it('accurately resolves active item in flat non-admin structure', () => {
      const flatMenuItems: MenuItem[] = [
        { id: 'web2_dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/', order: 1, isVisible: true },
        { id: 'web2_my_assigned_work', label: 'My Assigned Work', icon: 'Briefcase', path: '/my-work', order: 2, isVisible: true },
        { id: 'web2_quality_review', label: 'Quality Review', icon: 'ShieldCheck', path: '/review', order: 3, isVisible: true },
      ];
      expect(findActiveMenuItemId(flatMenuItems, '/review')).toBe('web2_quality_review');
    });

    it('renders detail items directly without any parent category accordion header', () => {
      mocks.sidebarNav = [
        { id: 'web2_dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/', order: 1, isVisible: true },
        { id: 'web2_my_assigned_work', label: 'My Assigned Work', icon: 'Briefcase', path: '/my-work', order: 2, isVisible: true },
        { id: 'web2_quality_review', label: 'Quality Review', icon: 'ShieldCheck', path: '/review', order: 3, isVisible: true },
      ];

      render(
        <MemoryRouter initialEntries={['/review']}>
          <Sidebar />
        </MemoryRouter>
      );

      // Parent headers do NOT exist
      expect(screen.queryByText('Conversions')).not.toBeInTheDocument();
      expect(screen.queryByText('Operations')).not.toBeInTheDocument();

      // Detailed items exist directly at top level
      const reviewLink = screen.getByRole('link', { name: /Quality Review/i });
      expect(reviewLink).toBeInTheDocument();
      expect(reviewLink).toHaveClass('bg-[#0652CC]');
      expect(screen.getByRole('link', { name: /My Assigned Work/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    });
  });
});