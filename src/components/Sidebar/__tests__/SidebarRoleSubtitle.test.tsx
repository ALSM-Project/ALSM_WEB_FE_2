import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { Sidebar, resolveUserRoleLabel } from '../Sidebar';
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
];

vi.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => ({
    sidebarNav: mockMenuItems,
    loading: false,
    error: null,
    refreshNavigation: vi.fn(),
  }),
}));

describe('Sidebar Dynamic Role-Based Brand Subtitle', () => {
  afterEach(() => {
    cleanup();
  });

  describe('resolveUserRoleLabel Unit Tests', () => {
    it('returns PLATFORM USER when user is undefined or null', () => {
      expect(resolveUserRoleLabel(undefined)).toBe('PLATFORM USER');
      expect(resolveUserRoleLabel(null)).toBe('PLATFORM USER');
    });

    it('returns PLATFORM ADMIN when user is platform admin with no explicit roles', () => {
      expect(resolveUserRoleLabel({ isPlatformAdmin: true, roles: [] })).toBe('PLATFORM ADMIN');
    });

    it('returns PLATFORM ADMIN when user has ADMIN or SYSTEM_ADMIN role', () => {
      expect(resolveUserRoleLabel({ roles: ['ADMIN'] })).toBe('PLATFORM ADMIN');
      expect(resolveUserRoleLabel({ roles: ['SYSTEM_ADMIN'] })).toBe('PLATFORM ADMIN');
      expect(resolveUserRoleLabel({ roles: ['PLATFORM_ADMIN'] })).toBe('PLATFORM ADMIN');
    });

    it('resolves standard mapped roles accurately', () => {
      expect(resolveUserRoleLabel({ roles: ['TEAM_LEAD'] })).toBe('TEAM LEAD');
      expect(resolveUserRoleLabel({ roles: ['CONVERSION_STAFF'] })).toBe('CONVERSION STAFF');
      expect(resolveUserRoleLabel({ roles: ['SALES_MANAGER'] })).toBe('SALES MANAGER');
      expect(resolveUserRoleLabel({ roles: ['INTERNAL_SUPPORT'] })).toBe('INTERNAL SUPPORT');
      expect(resolveUserRoleLabel({ roles: ['PARTNER'] })).toBe('PARTNER USER');
    });

    it('prioritizes primary role when user holds multiple roles based on authorization hierarchy', () => {
      // Admin takes precedence
      expect(
        resolveUserRoleLabel({
          roles: ['CONVERSION_STAFF', 'TEAM_LEAD', 'ADMIN'],
        })
      ).toBe('PLATFORM ADMIN');

      // Team Lead takes precedence over conversion staff
      expect(
        resolveUserRoleLabel({
          roles: ['CONVERSION_STAFF', 'TEAM_LEAD'],
        })
      ).toBe('TEAM LEAD');

      // Sales Manager takes precedence over internal sales
      expect(
        resolveUserRoleLabel({
          roles: ['INTERNAL_SALES', 'SALES_MANAGER'],
        })
      ).toBe('SALES MANAGER');
    });

    it('dynamically formats custom non-standard roles without hardcoding', () => {
      expect(resolveUserRoleLabel({ roles: ['FINANCE_DIRECTOR'] })).toBe('FINANCE DIRECTOR');
      expect(resolveUserRoleLabel({ roles: ['quality-assurance-specialist'] })).toBe(
        'QUALITY ASSURANCE SPECIALIST'
      );
    });

    it('resolves role object with explicit name or label', () => {
      expect(
        resolveUserRoleLabel({
          roles: [{ id: 'CUSTOM_01', name: 'Senior Solutions Architect' }],
        })
      ).toBe('SENIOR SOLUTIONS ARCHITECT');
    });

    it('returns PLATFORM USER for empty role array when user is not platform admin', () => {
      expect(resolveUserRoleLabel({ roles: [], isPlatformAdmin: false })).toBe('PLATFORM USER');
    });
  });

  describe('Sidebar Component Integration Rendering', () => {
    it('preserves ALSM logo and brand title while replacing subtitle with user role label', () => {
      render(
        <MemoryRouter>
          <Sidebar
            user={{
              fullName: 'Nguyen Van A',
              roles: ['ADMIN'],
              isPlatformAdmin: true,
            }}
          />
        </MemoryRouter>
      );

      // ALSM Logo is preserved
      const logo = screen.getByAltText('ALSM');
      expect(logo).toBeInTheDocument();

      // Brand title ALSM is preserved
      expect(screen.getByText('ALSM')).toBeInTheDocument();

      // Subtitle dynamically displays PLATFORM ADMIN
      expect(screen.getByText('PLATFORM ADMIN')).toBeInTheDocument();

      // Old static text ENTERPRISE OPERATIONS is strictly removed
      expect(screen.queryByText(/ENTERPRISE OPERATIONS/i)).not.toBeInTheDocument();
    });

    it('displays TEAM LEAD for Team Lead user in sidebar header', () => {
      render(
        <MemoryRouter>
          <Sidebar
            user={{
              fullName: 'Team Leader',
              roles: ['TEAM_LEAD'],
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('TEAM LEAD')).toBeInTheDocument();
      expect(screen.queryByText(/ENTERPRISE OPERATIONS/i)).not.toBeInTheDocument();
    });

    it('displays CONVERSION STAFF for Conversion Staff user in sidebar header', () => {
      render(
        <MemoryRouter>
          <Sidebar
            user={{
              fullName: 'Staff Member',
              roles: ['CONVERSION_STAFF'],
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('CONVERSION STAFF')).toBeInTheDocument();
    });

    it('displays PLATFORM USER fallback when user is unavailable', () => {
      render(
        <MemoryRouter>
          <Sidebar user={null} />
        </MemoryRouter>
      );

      expect(screen.getByText('PLATFORM USER')).toBeInTheDocument();
      expect(screen.getByText('ALSM')).toBeInTheDocument();
    });

    it('renders truncated container with accessible tooltip for long role titles', () => {
      render(
        <MemoryRouter>
          <Sidebar
            user={{
              fullName: 'Architect',
              roles: ['CHIEF_ENTERPRISE_SYSTEMS_AND_MODERNIZATION_OFFICER'],
            }}
          />
        </MemoryRouter>
      );

      const subtitleEl = screen.getByText('CHIEF ENTERPRISE SYSTEMS AND MODERNIZATION OFFICER');
      expect(subtitleEl).toBeInTheDocument();
      expect(subtitleEl).toHaveClass('truncate');
      expect(subtitleEl).toHaveClass('max-w-[145px]');
      expect(subtitleEl).toHaveAttribute(
        'title',
        'CHIEF ENTERPRISE SYSTEMS AND MODERNIZATION OFFICER'
      );
    });
  });
});
