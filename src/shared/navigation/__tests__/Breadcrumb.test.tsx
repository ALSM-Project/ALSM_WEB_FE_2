import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from '../Breadcrumb';

const mockNavigation = vi.hoisted(() => ({
  breadcrumbs: [
    { label: 'Administration' },
    { label: 'Organizations', path: '/admin/organizations' },
    { label: 'Pacific Rim Financial' },
  ],
}));

vi.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => mockNavigation,
}));

describe('Breadcrumb Component', () => {
  it('renders customItems when provided', () => {
    const customItems = [
      { label: 'CRM & Sales' },
      { label: 'Leads', path: '/sales/leads' },
      { label: 'Apex Logistics' },
    ];

    render(
      <MemoryRouter>
        <Breadcrumb customItems={customItems} />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();

    // Module parent (no path)
    const moduleItem = screen.getByText('CRM & Sales');
    expect(moduleItem.tagName.toLowerCase()).toBe('span');

    // Intermediate parent (with path)
    const leadsLink = screen.getByRole('link', { name: 'Leads' });
    expect(leadsLink).toHaveAttribute('href', '/sales/leads');
    expect(leadsLink).toHaveAttribute('title', 'Leads');

    // Current page (active item)
    const currentItem = screen.getByText('Apex Logistics');
    expect(currentItem.tagName.toLowerCase()).toBe('span');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
    expect(currentItem).toHaveClass('font-semibold');
  });

  it('renders breadcrumbs from useNavigation context when customItems are omitted', () => {
    render(
      <MemoryRouter>
        <Breadcrumb />
      </MemoryRouter>
    );

    expect(screen.getByText('Administration')).toBeInTheDocument();
    const orgLink = screen.getByRole('link', { name: 'Organizations' });
    expect(orgLink).toHaveAttribute('href', '/admin/organizations');
    expect(screen.getByText('Pacific Rim Financial')).toHaveAttribute('aria-current', 'page');
  });

  it('renders null when items array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumb customItems={[]} />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
