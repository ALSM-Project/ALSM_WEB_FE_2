import { describe, it, expect } from 'vitest';
import {
  resolveNavigationContext,
  getBreadcrumbsFromRoute,
  isEntityId,
  isValidNavigablePath,
} from './breadcrumbUtils';
import { MenuItem } from '@/features/menus/types/menu';

describe('breadcrumbUtils & Enterprise Navigation Hierarchy', () => {
  const mockMenu: MenuItem[] = [
    {
      id: 'web2_group_enterprise',
      label: 'Enterprise Collaboration',
      order: 1,
      isVisible: true,
      children: [
        {
          id: 'web2_meetings',
          label: 'Online Meetings',
          path: '/enterprise/meetings',
          order: 1,
          isVisible: true,
          permissions: ['meetings.create'],
        },
      ],
    },
    {
      id: 'web2_group_partners',
      label: 'Partner Management',
      order: 2,
      isVisible: true,
      children: [
        {
          id: 'web2_partners_list',
          label: 'Partner Directory',
          path: '/partners',
          order: 1,
          isVisible: true,
        },
      ],
    },
  ];

  describe('Legacy & Baseline Route Tests', () => {
    it('correctly resolves breadcrumb and page title for /enterprise/meetings', () => {
      const result = resolveNavigationContext(mockMenu, '/enterprise/meetings');
      expect(result.sectionTitle).toBe('Team Lead');
      expect(result.pageTitle).toBe('Online Meetings');
      expect(result.breadcrumbs).toHaveLength(1);
      expect(result.breadcrumbs[0].label).toBe('Online Meetings');
    });

    it('correctly resolves breadcrumb and page title for /enterprise/meetings/create without wrongly saying Partner Details', () => {
      const result = resolveNavigationContext(mockMenu, '/enterprise/meetings/create');
      expect(result.sectionTitle).toBe('Team Lead');
      expect(result.pageTitle).toBe('Create Meeting Room');
      expect(result.breadcrumbs.some((b) => b.label === 'Create Meeting Room')).toBe(true);
      expect(result.pageTitle).not.toBe('Partner Details');
    });

    it('resolves partner detail route properly', () => {
      const result = resolveNavigationContext(mockMenu, '/partners/partner-123');
      expect(result.pageTitle).toBe('Partner Details');
      const crumbs = getBreadcrumbsFromRoute('/partners/partner-123', mockMenu);
      expect(crumbs).toEqual(result.breadcrumbs);
    });
  });

  describe('Full Route Inventory Audit & Verification', () => {
    it('resolves Dashboard route without redundant prefix', () => {
      const res = resolveNavigationContext(mockMenu, '/dashboard');
      expect(res.sectionTitle).toBe('Dashboard');
      expect(res.breadcrumbs).toEqual([{ label: 'Dashboard' }]);

      const rootRes = resolveNavigationContext(mockMenu, '/');
      expect(rootRes.breadcrumbs).toEqual([{ label: 'Dashboard' }]);
    });

    it('resolves Customer Support route', () => {
      const res = resolveNavigationContext(mockMenu, '/support');
      expect(res.breadcrumbs).toEqual([
        { label: 'Organisation Access' },
      ]);
    });

    it('resolves Conversions & Operations routes', () => {
      expect(resolveNavigationContext(mockMenu, '/queue').breadcrumbs).toEqual([
        { label: 'Conversion Queue' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/system/queue').breadcrumbs).toEqual([
        { label: 'Conversion Queue' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/validation').breadcrumbs).toEqual([
        { label: 'Rule & AI Validation' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/my-work').breadcrumbs).toEqual([
        { label: 'My Assigned Work' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/employee/work-queue').breadcrumbs).toEqual([
        { label: 'My Assigned Work' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/review').breadcrumbs).toEqual([
        { label: 'Quality Review' },
      ]);
    });

    it('resolves Team Lead routes', () => {
      expect(resolveNavigationContext(mockMenu, '/team-lead/projects').breadcrumbs).toEqual([
        { label: 'Employee Allocation' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-lead/resource-transfers').breadcrumbs).toEqual([
        { label: 'Transfer Approvals' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-lead/resource-transfers/new').breadcrumbs).toEqual([
        { label: 'Transfer Approvals', path: '/team-lead/resource-transfers' },
        { label: 'New Transfer Request' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-lead/resource-transfers/req-01').breadcrumbs).toEqual([
        { label: 'Transfer Approvals', path: '/team-lead/resource-transfers' },
        { label: 'Transfer Request Details' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-lead/offboarding-approvals').breadcrumbs).toEqual([
        { label: 'Offboarding Approvals' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-performance').breadcrumbs).toEqual([
        { label: 'Team Performance' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/team-performance/monitor').breadcrumbs).toEqual([
        { label: 'Team Performance', path: '/team-performance' },
        { label: 'Workload Monitor' },
      ]);
    });

    it('resolves CRM & Sales routes and aliases', () => {
      expect(resolveNavigationContext(mockMenu, '/sales/leads').breadcrumbs).toEqual([
        { label: 'Leads' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/crm/leads').breadcrumbs).toEqual([
        { label: 'Leads' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/leads').breadcrumbs).toEqual([
        { label: 'Leads' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/sales/pipeline').breadcrumbs).toEqual([
        { label: 'Sales Pipeline' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/crm/pipeline').breadcrumbs).toEqual([
        { label: 'Sales Pipeline' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/sales/reports').breadcrumbs).toEqual([
        { label: 'Sales Reports' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/reports/sales').breadcrumbs).toEqual([
        { label: 'Sales Reports' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/reports/team-performance').breadcrumbs).toEqual([
        { label: 'Team Performance' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/sales/discounts').breadcrumbs).toEqual([
        { label: 'Discount Approvals' },
      ]);
    });

    it('resolves Administration routes and aliases', () => {
      expect(resolveNavigationContext(mockMenu, '/admin/projects').breadcrumbs).toEqual([
        { label: 'Team Lead Assignment' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/organizations').breadcrumbs).toEqual([
        { label: 'Organizations' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/organisations').breadcrumbs).toEqual([
        { label: 'Organizations' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/organisations/departments').breadcrumbs).toEqual([
        { label: 'Organizations' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/engagement-types').breadcrumbs).toEqual([
        { label: 'Engagement Types' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/users').breadcrumbs).toEqual([
        { label: 'User Management' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/roles').breadcrumbs).toEqual([
        { label: 'Roles & Permissions' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/temporary-roles').breadcrumbs).toEqual([
        { label: 'Temporary Roles' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/rbac/temporary-roles').breadcrumbs).toEqual([
        { label: 'Temporary Roles' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/menu-builder').breadcrumbs).toEqual([
        { label: 'Menu Builder' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/revenue').breadcrumbs).toEqual([
        { label: 'Revenue Dashboard' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/audit-logs').breadcrumbs).toEqual([
        { label: 'Audit Logs' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/web3').breadcrumbs).toEqual([
        { label: 'Web3 Administration' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/company-profile').breadcrumbs).toEqual([
        { label: 'Company Profile' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/settings').breadcrumbs).toEqual([
        { label: 'Company Profile' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/bank-accounts').breadcrumbs).toEqual([
        { label: 'Company Profile', path: '/admin/settings' },
        { label: 'Bank Accounts' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/diagnostics').breadcrumbs).toEqual([
        { label: 'System Diagnostics' },
      ]);
    });

    it('resolves Billing routes', () => {
      expect(resolveNavigationContext(mockMenu, '/billing/invoices').breadcrumbs).toEqual([
        { label: 'Invoices' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/billing/invoices').breadcrumbs).toEqual([
        { label: 'Invoices' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/billing/usage').breadcrumbs).toEqual([
        { label: 'Service Usage & Quotas' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/billing/usage').breadcrumbs).toEqual([
        { label: 'Service Usage & Quotas' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/billing/quotes').breadcrumbs).toEqual([
        { label: 'Meeting Requests' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/admin/billing/quotes').breadcrumbs).toEqual([
        { label: 'Meeting Requests' },
      ]);
    });

    it('resolves Enterprise Meetings routes', () => {
      expect(resolveNavigationContext(mockMenu, '/enterprise/meetings').breadcrumbs).toEqual([
        { label: 'Online Meetings' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/meetings').breadcrumbs).toEqual([
        { label: 'Online Meetings' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/enterprise/meetings/create').breadcrumbs).toEqual([
        { label: 'Online Meetings', path: '/enterprise/meetings' },
        { label: 'Create Meeting Room' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/meetings/create').breadcrumbs).toEqual([
        { label: 'Online Meetings', path: '/enterprise/meetings' },
        { label: 'Create Meeting Room' },
      ]);
    });

    it('resolves Account Security and System routes', () => {
      expect(resolveNavigationContext(mockMenu, '/account/security/password').breadcrumbs).toEqual([
        { label: 'Password & Security' },
      ]);
      expect(resolveNavigationContext(mockMenu, '/forbidden').breadcrumbs).toEqual([
        { label: 'Access Restricted' },
      ]);
    });
  });

  describe('Dynamic Route Resolution & Entity Name Binding', () => {
    it('handles Organization Detail with fallback and dynamic loaded name', () => {
      // 1. Loading / Fallback state (no raw UUID)
      const fallbackRes = resolveNavigationContext(mockMenu, '/admin/organizations/67a9c12f00112233');
      expect(fallbackRes.breadcrumbs).toEqual([
        { label: 'Organizations', path: '/admin/organizations' },
        { label: 'Organization Details' },
      ]);
      expect(fallbackRes.pageTitle).toBe('Organization Details');

      // 2. Data loaded state (actual entity name)
      const loadedRes = resolveNavigationContext(
        mockMenu,
        '/admin/organizations/67a9c12f00112233',
        '',
        { '67a9c12f00112233': 'ABC Technology' }
      );
      expect(loadedRes.breadcrumbs).toEqual([
        { label: 'Organizations', path: '/admin/organizations' },
        { label: 'ABC Technology' },
      ]);
      expect(loadedRes.pageTitle).toBe('ABC Technology');
    });

    it('handles Lead Detail with fallback and dynamic loaded name', () => {
      // 1. Fallback
      const fallbackRes = resolveNavigationContext(mockMenu, '/sales/leads/lead-999');
      expect(fallbackRes.breadcrumbs).toEqual([
        { label: 'Leads', path: '/sales/leads' },
        { label: 'Lead Details' },
      ]);

      // 2. Dynamic loaded
      const loadedRes = resolveNavigationContext(
        mockMenu,
        '/sales/leads/lead-999',
        '',
        { 'lead-999': 'Apex Logistics Corp' }
      );
      expect(loadedRes.breadcrumbs).toEqual([
        { label: 'Leads', path: '/sales/leads' },
        { label: 'Apex Logistics Corp' },
      ]);
    });

    it('handles Partner Management nested dynamic routes', () => {
      // Partner Details
      const partnerRes = resolveNavigationContext(
        mockMenu,
        '/partners/pt-101',
        '',
        { 'pt-101': 'Pacific Heritage Life' }
      );
      expect(partnerRes.breadcrumbs).toEqual([
        { label: 'Partner Directory', path: '/partners' },
        { label: 'Pacific Heritage Life' },
      ]);

      // Partner Project Create from Partner
      const partnerCreateProj = resolveNavigationContext(
        mockMenu,
        '/partners/pt-101/projects/new',
        '',
        { 'pt-101': 'Pacific Heritage Life' }
      );
      expect(partnerCreateProj.breadcrumbs).toEqual([
        { label: 'Partner Directory', path: '/partners' },
        { label: 'Pacific Heritage Life', path: '/partners/pt-101' },
        { label: 'Create Project' },
      ]);

      // Partner Projects query scope=demo
      const demoRes = resolveNavigationContext(mockMenu, '/partners/projects', '?scope=demo');
      expect(demoRes.breadcrumbs).toEqual([
        { label: 'Demo Projects' },
      ]);

      // Project Overview
      const projRes = resolveNavigationContext(
        mockMenu,
        '/partners/projects/proj-55',
        '',
        { 'proj-55': 'Core Modernization Phase 1' }
      );
      expect(projRes.breadcrumbs).toEqual([
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: 'Core Modernization Phase 1' },
      ]);

      // Upload Sources
      const uploadRes = resolveNavigationContext(
        mockMenu,
        '/partners/projects/proj-55/upload',
        '',
        { 'proj-55': 'Core Modernization Phase 1' }
      );
      expect(uploadRes.breadcrumbs).toEqual([
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: 'Core Modernization Phase 1', path: '/partners/projects/proj-55' },
        { label: 'Upload Sources' },
      ]);

      // Conversion Workspace
      const wsRes = resolveNavigationContext(
        mockMenu,
        '/partners/projects/proj-55/workspace',
        '',
        { 'proj-55': 'Core Modernization Phase 1' }
      );
      expect(wsRes.breadcrumbs).toEqual([
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: 'Core Modernization Phase 1', path: '/partners/projects/proj-55' },
        { label: 'Conversion Workspace' },
      ]);

      // Item Review
      const reviewRes = resolveNavigationContext(
        mockMenu,
        '/partners/projects/proj-55/items/item-12/review',
        '',
        {
          'proj-55': 'Core Modernization Phase 1',
          'item-12': 'AP001_MENU.bms',
        }
      );
      expect(reviewRes.breadcrumbs).toEqual([
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: 'Core Modernization Phase 1', path: '/partners/projects/proj-55' },
        { label: 'Conversion Workspace', path: '/partners/projects/proj-55/workspace' },
        { label: 'AP001_MENU.bms' },
      ]);
    });

    it('handles Admin Quality Review route with dynamic job and project', () => {
      const res = resolveNavigationContext(
        mockMenu,
        '/admin/projects/proj-99/conversions/job-88/quality-review',
        '',
        {
          'proj-99': 'Oracle Migration',
          'job-88': 'Batch 01',
        }
      );
      expect(res.breadcrumbs).toEqual([
        { label: 'Team Lead Assignment', path: '/admin/projects' },
        { label: 'Oracle Migration - Batch 01' },
      ]);
    });
  });

  describe('Navigability & Safety Verification', () => {
    it('ensures no parent breadcrumb links to 404 routes (/admin, /sales, /team-lead, /billing)', () => {
      const testRoutes = [
        '/admin/organizations/67a9c12f',
        '/admin/projects/123/conversions/456/quality-review',
        '/sales/leads/123',
        '/team-lead/resource-transfers',
        '/team-performance/monitor',
        '/partners/projects/999/upload',
        '/partners/projects/999/workspace',
        '/enterprise/meetings/create',
        '/account/security/password',
      ];

      for (const route of testRoutes) {
        const { breadcrumbs } = resolveNavigationContext(mockMenu, route);
        for (const crumb of breadcrumbs) {
          if (crumb.path) {
            expect(isValidNavigablePath(crumb.path)).toBe(true);
            expect(crumb.path).not.toBe('/admin');
            expect(crumb.path).not.toBe('/sales');
            expect(crumb.path).not.toBe('/crm');
            expect(crumb.path).not.toBe('/team-lead');
            expect(crumb.path).not.toBe('/billing');
            expect(crumb.path).not.toBe('/enterprise');
          }
        }
      }
    });

    it('identifies entity IDs accurately with isEntityId', () => {
      expect(isEntityId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isEntityId('67a9c12f0011223344556677')).toBe(true);
      expect(isEntityId('12345')).toBe(true);
      expect(isEntityId('proj_abc123')).toBe(true);
      expect(isEntityId('projects')).toBe(false);
      expect(isEntityId('leads')).toBe(false);
      expect(isEntityId('create')).toBe(false);
      expect(isEntityId('workspace')).toBe(false);
    });

    it('safe fallback replaces raw UUIDs with friendly label and valid paths', () => {
      const fallback = resolveNavigationContext(mockMenu, '/custom/67a9c12f00112233/subpage');
      expect(fallback.breadcrumbs[0].label).toBe('Custom');
      expect(fallback.breadcrumbs[1].label).toBe('Details');
      expect(fallback.breadcrumbs[2].label).toBe('Subpage');
      // Neither /custom nor /custom/67a9c12f... should have broken paths
      expect(fallback.breadcrumbs[0].path).toBeUndefined();
      expect(fallback.breadcrumbs[1].path).toBeUndefined();
    });
  });
});
