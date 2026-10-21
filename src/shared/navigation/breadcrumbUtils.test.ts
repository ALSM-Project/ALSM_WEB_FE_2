import { describe, it, expect } from 'vitest';
import { resolveNavigationContext } from './breadcrumbUtils';
import { MenuItem } from '@/features/menus/types/menu';

describe('breadcrumbUtils', () => {
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
      label: 'Partners',
      order: 2,
      isVisible: true,
      children: [
        {
          id: 'web2_partners_list',
          label: 'Partner List',
          path: '/partners',
          order: 1,
          isVisible: true,
        },
      ],
    },
  ];

  it('correctly resolves breadcrumb and page title for /enterprise/meetings', () => {
    const result = resolveNavigationContext(mockMenu, '/enterprise/meetings');
    expect(result.sectionTitle).toBe('Enterprise Collaboration');
    expect(result.pageTitle).toBe('Online Meetings');
    expect(result.breadcrumbs).toHaveLength(2);
    expect(result.breadcrumbs[1].label).toBe('Online Meetings');
  });

  it('correctly resolves breadcrumb and page title for /enterprise/meetings/create without wrongly saying Partner Details', () => {
    const result = resolveNavigationContext(mockMenu, '/enterprise/meetings/create');
    expect(result.sectionTitle).toBe('Enterprise Collaboration');
    expect(result.pageTitle).toBe('Create Online Meeting Room');
    expect(result.breadcrumbs.some((b) => b.label === 'Create Meeting Room')).toBe(true);
    expect(result.pageTitle).not.toBe('Partner Details');
  });

  it('resolves partner detail route properly', () => {
    const result = resolveNavigationContext(mockMenu, '/partners/partner-123');
    expect(result.pageTitle).toBe('Partner Details');
  });
});
