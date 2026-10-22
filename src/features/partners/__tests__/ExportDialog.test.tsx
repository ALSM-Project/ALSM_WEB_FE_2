import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportDialog } from '../components/ExportDialog';
import { partnersApi } from '../api/partners.api';
import { PartnerExportError } from '../api/partnerExportError';
import type {
  ExportBundleInfo,
  Partner,
  PartnerConversionItem,
  PartnerExportPreview,
  PartnerProject,
} from '../types/partner.types';

vi.mock('../api/partners.api', async () => {
  const actual = await vi.importActual<typeof import('../api/partners.api')>('../api/partners.api');
  return {
    ...actual,
    partnersApi: {
      getPartnerById: vi.fn(),
      previewExport: vi.fn(),
      downloadExportZip: vi.fn(),
      triggerExport: vi.fn(),
      retryExportNotification: vi.fn(),
      downloadReleasedBundle: vi.fn(),
    },
  };
});

const PROJECT_ID = '6650aa00aa00aa00aa00aa01';
const ALL_PERMISSIONS = ['conversion_result.export', 'conversion_result.notify_partner'];

const project: PartnerProject = {
  id: PROJECT_ID,
  name: 'Core Banking Screens',
  partnerId: 'org-1',
  partnerName: 'Pacific Banking Systems',
  organizationId: 'org-1',
  conversionType: 'BMS_DSPF_TO_FRONTEND',
  targetFramework: 'React 19',
  status: 'IN_PROGRESS',
  screensTotal: 3,
  screensCompleted: 2,
  programsTotal: 0,
  programsCompleted: 0,
  lastUpdated: '2026-10-22T00:00:00Z',
  createdAt: '2026-10-22T00:00:00Z',
};

function item(id: string, name: string): PartnerConversionItem {
  return {
    id,
    projectId: PROJECT_ID,
    name,
    type: 'SCREEN',
    sourceFile: `${name}.bms`,
    status: 'COMPLETED',
    validationStatus: 'PENDING',
    progress: 100,
    attemptCount: 1,
    maxAttempts: 3,
    updatedAt: '2026-10-22T00:00:00Z',
  };
}

const items = [item('s1', 'LOGIN'), item('s2', 'ACCT'), item('s3', 'MENU')];

const preview: PartnerExportPreview = {
  packageName: 'core-banking-screens-modernized-bundle-v1.zip',
  targetFramework: 'React 19',
  screensIncluded: 2,
  programsIncluded: 0,
  excludedItems: [{ name: 'MENU.bms', reason: 'Conversion failed (CONVERSION_ENGINE_UNAVAILABLE)' }],
  totalFiles: 14,
  estimatedSizeKb: 12,
};

const bundle: ExportBundleInfo = {
  id: '6650ee00ee00ee00ee00ee01',
  projectId: PROJECT_ID,
  projectName: project.name,
  partnerId: 'org-1',
  partnerName: project.partnerName,
  partnerContactEmail: 'jreynolds@pacificbanking.com',
  conversionType: 'BMS_DSPF_TO_FRONTEND',
  packageName: preview.packageName,
  format: 'ZIP',
  screensIncluded: 2,
  programsIncluded: 0,
  totalItems: 2,
  excludedItems: preview.excludedItems,
  exportedAt: '2026-10-22T10:00:00Z',
  notificationStatus: 'SENT',
};

function renderDialog(
  overrides: { project?: PartnerProject; permissions?: string[]; onExportSuccess?: () => void } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-staff',
    email: 'staff@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: overrides.permissions ?? ALL_PERMISSIONS,
  });
  const onExportSuccess = overrides.onExportSuccess ?? vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ExportDialog
        isOpen
        onClose={vi.fn()}
        project={overrides.project ?? project}
        items={items}
        onExportSuccess={onExportSuccess}
      />
    </QueryClientProvider>,
  );
  return { onExportSuccess };
}

describe('ExportDialog (UC-48)', () => {
  beforeEach(() => {
    vi.mocked(partnersApi.getPartnerById).mockResolvedValue({
      contactEmail: 'jreynolds@pacificbanking.com',
    } as Partner);
    vi.mocked(partnersApi.previewExport).mockResolvedValue(preview);
    vi.mocked(partnersApi.triggerExport).mockResolvedValue(bundle);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the server counts, the excluded items with reasons and the partner email', async () => {
    renderDialog();

    expect(await screen.findByTestId('included-count')).toHaveTextContent('2 items');
    expect(screen.getByTestId('excluded-count')).toHaveTextContent('1 items');
    expect(screen.getByText(/CONVERSION_ENGINE_UNAVAILABLE/)).toBeInTheDocument();
    expect(await screen.findByDisplayValue('jreynolds@pacificbanking.com')).toBeInTheDocument();
    expect(screen.getByText(preview.packageName)).toBeInTheDocument();
    expect(partnersApi.previewExport).toHaveBeenCalledWith(PROJECT_ID, expect.objectContaining({
      selectedScreenIds: ['s1', 's2', 's3'],
    }));
  });

  it('publishes with the chosen options and notes, then shows the bundle id and SENT', async () => {
    const { onExportSuccess } = renderDialog();
    await screen.findByTestId('included-count');

    fireEvent.click(screen.getByLabelText('Unit Tests (.spec / .test)'));
    fireEvent.change(screen.getByLabelText('Technical notes for the partner'), {
      target: { value: 'Use the staging API first.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate & Notify Partner/ }));

    expect(await screen.findByText('Export Bundle Published Successfully!')).toBeInTheDocument();
    expect(partnersApi.triggerExport).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      partnerEmail: 'jreynolds@pacificbanking.com',
      customNotes: 'Use the staging API first.',
      options: {
        selectedScreenIds: ['s1', 's2', 's3'],
        includeTypeScript: true,
        includeUnitTests: false,
        includeDocumentation: true,
      },
    });
    expect(screen.getByText(bundle.id)).toBeInTheDocument();
    expect(screen.getByText('SENT / DELIVERED')).toBeInTheDocument();
    expect(onExportSuccess).toHaveBeenCalledWith(bundle);
  });

  it('shows NOT SENT with the reason and lets staff retry the notification', async () => {
    vi.mocked(partnersApi.triggerExport).mockResolvedValue({
      ...bundle,
      notificationStatus: 'FAILED',
      notificationError: 'The notification email could not be delivered. Retry it from the export history',
    });
    vi.mocked(partnersApi.retryExportNotification).mockResolvedValue(bundle);
    renderDialog();
    await screen.findByTestId('included-count');

    fireEvent.click(screen.getByRole('button', { name: /Generate & Notify Partner/ }));

    expect(await screen.findByText('NOT SENT')).toBeInTheDocument();
    expect(screen.getByText(/could not be delivered/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry Notification/ }));

    expect(await screen.findByText('SENT / DELIVERED')).toBeInTheDocument();
    expect(partnersApi.retryExportNotification).toHaveBeenCalledWith(PROJECT_ID, bundle.id);
  });

  it('blocks publishing to an invalid email', async () => {
    renderDialog();
    await screen.findByDisplayValue('jreynolds@pacificbanking.com');

    fireEvent.change(screen.getByLabelText('Partner contact email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate & Notify Partner/ }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(partnersApi.triggerExport).not.toHaveBeenCalled();
  });

  it('shows the server error and stays on the form when publishing fails', async () => {
    vi.mocked(partnersApi.triggerExport).mockRejectedValue(
      new PartnerExportError('The release could not be saved, so the partner was not notified. Please try again.'),
    );
    renderDialog();
    await screen.findByTestId('included-count');

    fireEvent.click(screen.getByRole('button', { name: /Generate & Notify Partner/ }));

    expect(await screen.findByText(/could not be saved, so the partner was not notified/)).toBeInTheDocument();
    expect(screen.queryByText('Export Bundle Published Successfully!')).not.toBeInTheDocument();
  });

  it('downloads the ZIP directly without publishing', async () => {
    renderDialog();
    await screen.findByTestId('included-count');

    fireEvent.click(screen.getByRole('button', { name: /Direct ZIP/ }));

    await waitFor(() =>
      expect(partnersApi.downloadExportZip).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ selectedScreenIds: ['s1', 's2', 's3'] }),
        preview.packageName,
      ),
    );
    expect(partnersApi.triggerExport).not.toHaveBeenCalled();
  });

  it('disables both actions when nothing has a completed conversion', async () => {
    vi.mocked(partnersApi.previewExport).mockResolvedValue({
      ...preview,
      screensIncluded: 0,
      excludedItems: items.map((i) => ({ name: i.sourceFile, reason: 'Not converted yet' })),
    });
    renderDialog();

    expect(await screen.findByText(/nothing to export/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Direct ZIP/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Generate & Notify Partner/ })).toBeDisabled();
  });

  it('explains that a browser-only demo project cannot be exported and never calls the server', async () => {
    renderDialog({ project: { ...project, id: 'proj-fnx-core' } });

    expect(await screen.findByText(/exists only in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate & Notify Partner/ })).toBeDisabled();
    expect(partnersApi.previewExport).not.toHaveBeenCalled();
  });

  it('hides Generate & Notify without conversion_result.notify_partner', async () => {
    renderDialog({ permissions: ['conversion_result.export'] });
    await screen.findByTestId('included-count');

    expect(screen.queryByRole('button', { name: /Generate & Notify Partner/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Direct ZIP/ })).toBeEnabled();
  });
});
