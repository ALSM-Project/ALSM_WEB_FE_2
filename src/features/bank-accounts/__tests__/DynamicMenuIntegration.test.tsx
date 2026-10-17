import { describe, expect, it } from 'vitest';
import {
  resolveNavigationContext,
  VALID_NAVIGABLE_ROUTES,
} from '@/shared/navigation/breadcrumbUtils';
import { findActiveMenuItemId } from '@/components/Sidebar/Sidebar';
import { MenuItem } from '@/features/menus/types/menu';

describe('Dynamic Menu & Breadcrumb Integration for Bank Accounts', () => {
  const dynamicMenuTree: MenuItem[] = [
    {
      id: 'web2_group_dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      order: 1,
      isVisible: true,
      children: [
        {
          id: 'web2_dashboard',
          label: 'Dashboard',
          icon: 'LayoutDashboard',
          path: '/dashboard',
          order: 1,
          isVisible: true,
          permissions: [],
        },
      ],
    },
    {
      id: 'web2_group_administration',
      label: 'Administration',
      icon: 'Settings2',
      order: 6,
      isVisible: true,
      children: [
        {
          id: 'web2_organizations',
          label: 'Organisations',
          icon: 'Globe',
          path: '/admin/organizations',
          order: 1,
          isVisible: true,
          permissions: ['organizations.view'],
        },
        {
          id: 'web2_admin_finance_group',
          label: 'Finance & Payments',
          icon: 'CreditCard',
          order: 8.5,
          isVisible: true,
          permissions: ['bank_accounts.view'],
          children: [
            {
              id: 'web2_admin_bank_accounts',
              label: 'Bank Accounts',
              icon: 'Landmark',
              path: '/administration/finance/bank-accounts',
              order: 1,
              isVisible: true,
              permissions: ['bank_accounts.view'],
            },
          ],
        },
      ],
    },
  ];

  it('registers route in VALID_NAVIGABLE_ROUTES to prevent broken 404 links', () => {
    expect(VALID_NAVIGABLE_ROUTES.has('/administration/finance/bank-accounts')).toBe(true);
    expect(VALID_NAVIGABLE_ROUTES.has('/admin/finance/bank-accounts')).toBe(true);
  });

  it('correctly resolves breadcrumb hierarchy: Administration > Finance & Payments > Bank Accounts', () => {
    const navResult = resolveNavigationContext(
      dynamicMenuTree,
      '/administration/finance/bank-accounts',
    );

    expect(navResult.sectionTitle).toBe('Administration');
    expect(navResult.pageTitle).toBe('Bank Accounts');
    expect(navResult.breadcrumbs).toHaveLength(3);
    expect(navResult.breadcrumbs[0].label).toBe('Administration');
    expect(navResult.breadcrumbs[1].label).toBe('Finance & Payments');
    expect(navResult.breadcrumbs[2].label).toBe('Bank Accounts');
  });

  it('activates the bank account menu item on route match using findActiveMenuItemId', () => {
    const activeId = findActiveMenuItemId(
      dynamicMenuTree,
      '/administration/finance/bank-accounts',
    );
    expect(activeId).toBe('web2_admin_bank_accounts');
  });

  it('hides Bank Accounts and Finance & Payments group for unauthorized users', () => {
    const userPermissions = ['organizations.view']; // Lacks 'bank_accounts.view'

    const filterTree = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter((item) => {
          if (!item.permissions || item.permissions.length === 0) return true;
          return item.permissions.some((p) => userPermissions.includes(p));
        })
        .map((item) => {
          if (item.children && item.children.length > 0) {
            return { ...item, children: filterTree(item.children) };
          }
          return item;
        })
        .filter((item) => {
          if (!item.path) {
            return Boolean(item.children && item.children.length > 0);
          }
          return true;
        });
    };

    const authorizedTree = filterTree(dynamicMenuTree);
    const adminGroup = authorizedTree.find((g) => g.id === 'web2_group_administration');
    expect(adminGroup).toBeDefined();

    const hasFinance = adminGroup?.children?.some((c) => c.id === 'web2_admin_finance_group');
    const hasBankAccounts = adminGroup?.children?.some((c) =>
      c.children?.some((child) => child.id === 'web2_admin_bank_accounts'),
    );

    expect(hasFinance).toBe(false);
    expect(hasBankAccounts).toBe(false);
  });

  it('displays Bank Accounts and Finance & Payments group for authorized admin users', () => {
    const userPermissions = ['bank_accounts.view', 'organizations.view'];

    const filterTree = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter((item) => {
          if (!item.permissions || item.permissions.length === 0) return true;
          return item.permissions.some((p) => userPermissions.includes(p));
        })
        .map((item) => {
          if (item.children && item.children.length > 0) {
            return { ...item, children: filterTree(item.children) };
          }
          return item;
        })
        .filter((item) => {
          if (!item.path) {
            return Boolean(item.children && item.children.length > 0);
          }
          return true;
        });
    };

    const authorizedTree = filterTree(dynamicMenuTree);
    const adminGroup = authorizedTree.find((g) => g.id === 'web2_group_administration');
    expect(adminGroup).toBeDefined();

    const financeGroup = adminGroup?.children?.find((c) => c.id === 'web2_admin_finance_group');
    expect(financeGroup).toBeDefined();
    expect(financeGroup?.children?.[0]?.id).toBe('web2_admin_bank_accounts');
    expect(financeGroup?.children?.[0]?.path).toBe('/administration/finance/bank-accounts');
  });
});
