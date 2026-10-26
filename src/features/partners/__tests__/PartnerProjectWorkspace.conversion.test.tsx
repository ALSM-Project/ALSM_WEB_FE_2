import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerProjectWorkspacePage } from '../pages/staff/PartnerProjectWorkspacePage';
import { partnersApi } from '../api/partners.api';
import { PartnerConversionError } from '../api/partnerConversionError';
import type { PartnerConversionItem, PartnerProject } from '../types/partner.types';

vi.mock('../api/partners.api', async () => {
  const actual = await vi.importActual<typeof import('../api/partners.api')>('../api/partners.api');
  return {
    ...actual,
    partnersApi: {
      getProjectById: vi.fn(),
      getProjectItems: vi.fn(),
      retryItemConversion: vi.fn(),
      runAllConversions: vi.fn(),
      getFieldMappings: vi.fn(),
      saveFieldMappings: vi.fn(),
    },
  };
});

const PROJECT_ID = '6650aa00aa00aa00aa00aa01';

const project: PartnerProject = {
  id: PROJECT_ID,
  name: 'Core Banking Screens',
  partnerId: 'partner-fnx-001',
  partnerName: 'Fintech Nexus International',
  organizationId: 'org-1',
  conversionType: 'BMS_DSPF_TO_FRONTEND',
  targetFramework: 'React 19',
  status: 'IN_PROGRESS',
  screensTotal: 3,
  screensCompleted: 1,
  programsTotal: 0,
  programsCompleted: 0,
  lastUpdated: '2026-10-22T00:00:00Z',
  createdAt: '2026-10-22T00:00:00Z',
};

function item(id: string, sourceFile: string, overrides: Partial<PartnerConversionItem> = {}): PartnerConversionItem {
  return {
    id,
    projectId: PROJECT_ID,
    name: sourceFile.replace(/\..*$/, ''),
    type: 'SCREEN',
    sourceFile,
    status: 'PENDING',
    validationStatus: 'PENDING',
    attemptCount: 0,
    maxAttempts: 3,
    updatedAt: '2026-10-22T00:00:00Z',
    ...overrides,
  };
}

const LOGIN = item('6650bb00bb00bb00bb00bb0a', 'LOGIN.bms');
const MENU = item('6650bb00bb00bb00bb00bb0b', 'MENU.bms', {
  status: 'FAILED',
  attemptCount: 2,
  safeErrorMessage: 'The converter could not convert this file. Check the source file, then retry.',
});
const DONE = item('6650bb00bb00bb00bb00bb0c', 'DONE.bms', { status: 'COMPLETED', attemptCount: 1 });

function renderPage(permissions = ['partner_project.view', 'partner_project.start_conversion', 'conversion_result.review']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  queryClient.setQueryData(['currentUser'], {
    id: 'staff-1',
    email: 'converter@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/partners/projects/${PROJECT_ID}/workspace`]}>
        <Routes>
          <Route path="/partners/projects/:projectId/workspace" element={<PartnerProjectWorkspacePage />} />
          <Route path="/partners/projects/:projectId/items/:itemId/review" element={<div>Review Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function row(sourceFile: string): HTMLElement {
  return screen.getByText(sourceFile).closest('tr') as HTMLElement;
}

/** The conversion status of a row (the validation column has its own badge). */
function statusOf(sourceFile: string): string | null {
  return row(sourceFile).querySelector('[data-status]')?.getAttribute('data-status') ?? null;
}

describe('PartnerProjectWorkspacePage - convert on behalf of partner (UC-47)', () => {
  beforeEach(() => {
    vi.mocked(partnersApi.getProjectById).mockResolvedValue(project);
    vi.mocked(partnersApi.getProjectItems).mockResolvedValue([LOGIN, MENU, DONE]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows status badges, attempts and the context-aware Convert / Retry action', async () => {
    renderPage();

    await screen.findByText('LOGIN.bms');
    expect(statusOf('LOGIN.bms')).toBe('PENDING');
    expect(within(row('LOGIN.bms')).getByText('0 / 3')).toBeInTheDocument();
    expect(within(row('LOGIN.bms')).getByRole('button', { name: 'Convert LOGIN.bms' })).toHaveTextContent('Convert');

    expect(statusOf('MENU.bms')).toBe('FAILED');
    expect(within(row('MENU.bms')).getByText('2 / 3')).toBeInTheDocument();
    expect(within(row('MENU.bms')).getByRole('button', { name: 'Retry MENU.bms' })).toHaveTextContent('Retry');
    expect(within(row('MENU.bms')).getByText(/could not convert this file/i)).toBeInTheDocument();

    expect(statusOf('DONE.bms')).toBe('COMPLETED');
  });

  it('hides Run All and Convert / Retry without partner_project.start_conversion', async () => {
    renderPage(['partner_project.view']);

    await screen.findByText('LOGIN.bms');
    expect(screen.queryByText('Run All Conversions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convert LOGIN.bms' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry MENU.bms' })).not.toBeInTheDocument();
  });

  it('locks only the triggered row while it starts, then shows it processing and refreshes the project', async () => {
    let finish: (value: PartnerConversionItem) => void = () => undefined;
    vi.mocked(partnersApi.retryItemConversion).mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    renderPage();
    await screen.findByText('LOGIN.bms');
    const convert = within(row('LOGIN.bms')).getByRole('button', { name: 'Convert LOGIN.bms' });

    fireEvent.click(convert);
    await waitFor(() => expect(convert).toBeDisabled());
    fireEvent.click(convert);
    expect(partnersApi.retryItemConversion).toHaveBeenCalledTimes(1);
    expect(partnersApi.retryItemConversion).toHaveBeenCalledWith(PROJECT_ID, LOGIN.id);
    expect(convert.querySelector('.animate-spin')).not.toBeNull();
    expect(within(row('MENU.bms')).getByRole('button', { name: 'Retry MENU.bms' })).toBeEnabled();

    finish({ ...LOGIN, status: 'PROCESSING' });
    expect(await screen.findByText('LOGIN.bms queued for conversion.')).toBeInTheDocument();
    expect(statusOf('LOGIN.bms')).toBe('PROCESSING');
    expect(within(row('LOGIN.bms')).getByRole('button', { name: 'Convert LOGIN.bms' })).toBeDisabled();
    expect(partnersApi.getProjectById).toHaveBeenCalledTimes(2);
  });

  it('runs all conversions once, even on a double click, and reports queued and skipped items', async () => {
    let finish: (value: PartnerConversionItem[]) => void = () => undefined;
    vi.mocked(partnersApi.runAllConversions).mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    renderPage();
    await screen.findByText('LOGIN.bms');
    const runAll = screen.getByRole('button', { name: /Run All Conversions/i });

    fireEvent.click(runAll);
    await waitFor(() => expect(runAll).toBeDisabled());
    fireEvent.click(runAll);
    expect(partnersApi.runAllConversions).toHaveBeenCalledTimes(1);

    finish([
      { ...LOGIN, status: 'PROCESSING' },
      { ...MENU, lastSkipReason: '"MENU.bms" already has a conversion in progress' },
      DONE,
    ]);
    expect(
      await screen.findByText(/1 item queued for conversion; 1 skipped \("MENU\.bms" already has a conversion in progress\)/),
    ).toBeInTheDocument();
    expect(within(row('MENU.bms')).getByText('"MENU.bms" already has a conversion in progress')).toBeInTheDocument();
    expect(runAll).toBeEnabled();
  });

  it('shows a safe error banner when a conversion cannot start and keeps the workspace usable', async () => {
    vi.mocked(partnersApi.retryItemConversion).mockRejectedValue(
      new PartnerConversionError('The conversion queue is temporarily unavailable. Please try again in a moment.', 400, 'CONVERSION_QUEUE_UNAVAILABLE'),
    );
    renderPage();
    await screen.findByText('LOGIN.bms');

    fireEvent.click(within(row('LOGIN.bms')).getByRole('button', { name: 'Convert LOGIN.bms' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
    expect(within(row('LOGIN.bms')).getByRole('button', { name: 'Convert LOGIN.bms' })).toBeEnabled();
    expect(statusOf('LOGIN.bms')).toBe('PENDING');
  });

  it('keeps refreshing items while a conversion is in progress until it finishes', async () => {
    vi.mocked(partnersApi.getProjectItems)
      .mockResolvedValueOnce([{ ...LOGIN, status: 'PROCESSING' }, DONE])
      .mockResolvedValue([{ ...LOGIN, status: 'COMPLETED', attemptCount: 1 }, DONE]);
    renderPage();

    await screen.findByText('LOGIN.bms');
    expect(statusOf('LOGIN.bms')).toBe('PROCESSING');

    await waitFor(() => expect(statusOf('LOGIN.bms')).toBe('COMPLETED'), {
      timeout: 6000,
    });
    expect(partnersApi.getProjectItems).toHaveBeenCalledTimes(2);
  });
});
