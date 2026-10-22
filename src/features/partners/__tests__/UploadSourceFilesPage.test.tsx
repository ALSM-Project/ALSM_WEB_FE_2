import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadSourceFilesPage } from '../pages/staff/UploadSourceFilesPage';
import { partnersApi } from '../api/partners.api';
import { PartnerUploadError } from '../api/partnerUploadError';
import type { PartnerProject } from '../types/partner.types';

vi.mock('../api/partners.api', async () => {
  const actual = await vi.importActual<typeof import('../api/partners.api')>('../api/partners.api');
  return {
    ...actual,
    partnersApi: { getProjectById: vi.fn(), uploadSourceFiles: vi.fn() },
  };
});

function project(overrides: Partial<PartnerProject> = {}): PartnerProject {
  return {
    id: 'proj-bms',
    name: 'Core Banking Screens',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    organizationId: 'partner-fnx-001',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    targetFramework: 'React 19',
    status: 'NOT_STARTED',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 0,
    programsCompleted: 0,
    lastUpdated: '2026-10-22T00:00:00Z',
    createdAt: '2026-10-22T00:00:00Z',
    ...overrides,
  };
}

function makeFile(name: string, size = 1200): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/partners/projects/proj-bms/upload']}>
      <Routes>
        <Route path="/partners/projects/:projectId/upload" element={<UploadSourceFilesPage />} />
        <Route path="/partners/projects/:projectId/workspace" element={<div>Workspace Page</div>} />
        <Route path="/partners/projects/:projectId" element={<div>Project Overview Page</div>} />
        <Route path="/partners" element={<div>Partner Directory</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pickFiles(...files: File[]) {
  const input = (await screen.findByTestId('file-input')) as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe('UploadSourceFilesPage (UC-46)', () => {
  beforeEach(() => {
    vi.mocked(partnersApi.getProjectById).mockResolvedValue(project());
    vi.mocked(partnersApi.uploadSourceFiles).mockResolvedValue({
      mode: 'SERVER',
      registered: ['LOGIN.bms'],
      ignoredEntries: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the project context, workflow stepper and upload area', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /Upload Legacy Source Files/i })).toBeInTheDocument();
    const details = screen.getByLabelText('Project details');
    expect(within(details).getByText('Core Banking Screens')).toBeInTheDocument();
    expect(within(details).getByText(/Fintech Nexus International/)).toBeInTheDocument();
    expect(within(details).getByText(/partner-fnx-001/)).toBeInTheDocument();
    expect(within(details).getByText('BMS_DSPF_TO_FRONTEND')).toBeInTheDocument();
    expect(within(details).getByText('.bms, .dspf, .zip')).toBeInTheDocument();
    expect(screen.getByText('Modernization Workflow')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.bms,.dspf,.zip');
  });

  it('adds valid files to the queue with size and detected type', async () => {
    renderPage();

    await pickFiles(makeFile('LOGIN.bms', 2048), makeFile('MENU.dspf', 5 * 1024 * 1024));

    const login = screen.getByTestId('queued-LOGIN.bms');
    expect(within(login).getByText('2.0 KB')).toBeInTheDocument();
    expect(within(login).getByText('SCREEN')).toBeInTheDocument();
    expect(within(login).getByText('Ready')).toBeInTheDocument();
    expect(within(screen.getByTestId('queued-MENU.dspf')).getByText('5.0 MB')).toBeInTheDocument();
    expect(screen.getByText(/Selected Source Files \(2\)/)).toBeInTheDocument();
  });

  it('rejects files that do not match the project conversion type, are empty, too big or duplicated', async () => {
    renderPage();

    await pickFiles(
      makeFile('PROGRAM.cbl'),
      makeFile('EMPTY.bms', 0),
      makeFile('HUGE.bms', 60 * 1024 * 1024),
      makeFile('LOGIN.bms'),
      makeFile('login.BMS'),
    );

    const alert = await screen.findByText(/files were not added/i);
    const list = alert.closest('[role="alert"]') as HTMLElement;
    expect(within(list).getByText(/PROGRAM\.cbl: not allowed for this project/)).toBeInTheDocument();
    expect(within(list).getByText(/EMPTY\.bms: file is empty/)).toBeInTheDocument();
    expect(within(list).getByText(/HUGE\.bms: .* exceeds the 50\.0 MB limit/)).toBeInTheDocument();
    expect(within(list).getByText(/login\.BMS: already in the upload list/)).toBeInTheDocument();
    expect(screen.getByText(/Selected Source Files \(1\)/)).toBeInTheDocument();
    expect(screen.queryByTestId('queued-PROGRAM.cbl')).not.toBeInTheDocument();
  });

  it('accepts COBOL programs and copybooks, but not screen files, for a COBOL project', async () => {
    vi.mocked(partnersApi.getProjectById).mockResolvedValue(
      project({ id: 'proj-bms', conversionType: 'COBOL_TO_JAVA' }),
    );
    renderPage();

    await pickFiles(makeFile('PROG.cbl'), makeFile('SHARED.cpy'), makeFile('LOGIN.bms'));

    expect(screen.getByTestId('queued-PROG.cbl')).toBeInTheDocument();
    expect(within(screen.getByTestId('queued-SHARED.cpy')).getByText('PROGRAM')).toBeInTheDocument();
    expect(screen.queryByTestId('queued-LOGIN.bms')).not.toBeInTheDocument();
    expect(screen.getByText(/LOGIN\.bms: not allowed for this project/)).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.cbl,.cob,.cpy,.zip');
  });

  it('removes one file or clears the whole list', async () => {
    renderPage();
    await pickFiles(makeFile('A.bms'), makeFile('B.bms'));

    fireEvent.click(screen.getByRole('button', { name: 'Remove A.bms' }));
    expect(screen.queryByTestId('queued-A.bms')).not.toBeInTheDocument();
    expect(screen.getByTestId('queued-B.bms')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    expect(screen.queryByTestId('queued-B.bms')).not.toBeInTheDocument();
  });

  it('uploads, shows success and moves to the workspace', async () => {
    renderPage();
    const fileA = makeFile('LOGIN.bms');
    await pickFiles(fileA);

    fireEvent.click(screen.getByRole('button', { name: /Upload & Open Workspace/i }));

    await waitFor(() => expect(partnersApi.uploadSourceFiles).toHaveBeenCalledTimes(1));
    expect(partnersApi.uploadSourceFiles).toHaveBeenCalledWith('proj-bms', [fileA], expect.any(Function));
    expect(await screen.findByText(/1 source file uploaded successfully/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('queued-LOGIN.bms')).getByText('Done')).toBeInTheDocument();
    expect(await screen.findByText('Workspace Page', undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('shows per-file and overall progress and blocks a second submit while uploading', async () => {
    let finish: (value: { mode: 'SERVER'; registered: string[]; ignoredEntries: string[] }) => void = () => undefined;
    let report: (percent: number) => void = () => undefined;
    vi.mocked(partnersApi.uploadSourceFiles).mockImplementation(
      (_id, _files, onProgress) =>
        new Promise((resolve) => {
          report = onProgress ?? (() => undefined);
          finish = resolve;
        }),
    );
    renderPage();
    await pickFiles(makeFile('LOGIN.bms'));

    const submit = screen.getByRole('button', { name: /Upload & Open Workspace/i });
    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(partnersApi.uploadSourceFiles).toHaveBeenCalledTimes(1);

    report(40);
    await waitFor(() =>
      expect(screen.getByRole('progressbar', { name: 'Overall upload progress' })).toHaveAttribute('aria-valuenow', '40'),
    );
    expect(screen.getByRole('progressbar', { name: 'Upload progress for LOGIN.bms' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(screen.getByRole('button', { name: 'Remove LOGIN.bms' })).toBeDisabled();

    finish({ mode: 'SERVER', registered: ['LOGIN.bms'], ignoredEntries: [] });
    expect(await screen.findByText(/uploaded successfully/i)).toBeInTheDocument();
  });

  it('marks only the offending file as failed and keeps the valid ones ready to retry', async () => {
    vi.mocked(partnersApi.uploadSourceFiles).mockRejectedValue(
      new PartnerUploadError('File "BAD.bms" is empty (0 bytes)', 400, 'EMPTY_FILE'),
    );
    renderPage();
    await pickFiles(makeFile('GOOD.bms'), makeFile('BAD.bms'));

    fireEvent.click(screen.getByRole('button', { name: /Upload & Open Workspace/i }));

    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
    const bad = screen.getByTestId('queued-BAD.bms');
    expect(within(bad).getByText('Error')).toBeInTheDocument();
    expect(within(bad).getByText('File "BAD.bms" is empty (0 bytes)')).toBeInTheDocument();
    expect(within(screen.getByTestId('queued-GOOD.bms')).getByText('Ready')).toBeInTheDocument();
    expect(screen.queryByText('Workspace Page')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Upload/i })).toBeEnabled();
  });

  it('shows a notice when the project is stored only in this browser', async () => {
    vi.mocked(partnersApi.uploadSourceFiles).mockResolvedValue({
      mode: 'LOCAL',
      registered: ['LOGIN.bms'],
      ignoredEntries: [],
    });
    renderPage();
    await pickFiles(makeFile('LOGIN.bms'));

    fireEvent.click(screen.getByRole('button', { name: /Upload & Open Workspace/i }));

    expect(await screen.findByText(/exists only in this browser/i)).toBeInTheDocument();
  });

  it('shows Project Not Found when the project does not exist', async () => {
    vi.mocked(partnersApi.getProjectById).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText('Project Not Found')).toBeInTheDocument();
  });
});
