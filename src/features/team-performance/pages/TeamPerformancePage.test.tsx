import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TeamPerformancePage from './TeamPerformancePage';

describe('TeamPerformancePage', () => {
  it.each([
    ['/team-performance', 'Team Performance', 'Overview'],
    ['/team-performance/monitor', 'Monitor Team Performance', 'Monitoring'],
    ['/organisations/teams', 'Team Performance', 'Overview'],
  ])('reports unavailable capabilities at %s without fabricated metrics', (path, title, current) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <TeamPerformancePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Team performance unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No team metrics have been loaded');
    expect(screen.getByRole('status')).toHaveTextContent('live monitoring are unavailable');
    expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'View conversion queue' })).toHaveAttribute('href', '/queue');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    if (path.endsWith('/monitor')) {
      expect(screen.getByRole('heading', { name: 'Conversion workload unavailable' })).toBeInTheDocument();
      expect(screen.getByText(/Job creators do not establish assignments/)).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Sales reporting unavailable' })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('heading', { name: 'Sales reporting unavailable' })).toBeInTheDocument();
      expect(screen.getByText(/Individual lead counts require persisted salesperson assignments/)).toBeInTheDocument();
      expect(screen.getByText(/Sales conversion rates require assigned leads and verified customer-conversion outcomes/)).toBeInTheDocument();
      expect(screen.getByText(/Revenue generated requires confirmed revenue linked to each salesperson/)).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Conversion workload unavailable' })).not.toBeInTheDocument();
    }
  });
});
