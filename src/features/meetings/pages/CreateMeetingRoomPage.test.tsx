import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateMeetingRoomPage } from './CreateMeetingRoomPage';
import { meetingsApi } from '../api/meetings.api';

vi.mock('../api/meetings.api', () => ({
  meetingsApi: {
    create: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([
      { id: 'proj-acme-1', name: 'ACME Project' },
      { id: 'proj-123', name: 'Project 123' },
    ]),
    post: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('CreateMeetingRoomPage (UC-43 Strict Validations Frontend)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = (initialEntries = ['/enterprise/meetings/create']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <CreateMeetingRoomPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders meeting details form elements and required badges', () => {
    renderComponent();

    expect(screen.getByText('Create Online Meeting Room')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Sprint Review/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/What will this meeting cover/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Auto-generate link')).toBeInTheDocument();
    expect(screen.getByText('Use existing link')).toBeInTheDocument();
  });

  it('blocks submission and shows errors for ALL missing fields when only title is entered', async () => {
    renderComponent();

    const titleInput = screen.getByPlaceholderText(/e\.g\. Sprint Review/i);
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

    // User only entered title, left description, projectId, attendees blank!
    const submitBtn = screen.getByRole('button', { name: /Create Meeting Room/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Meeting description/agenda is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a related project')).toBeInTheDocument();
    expect(screen.getByText('At least one attendee email is required')).toBeInTheDocument();
    expect(meetingsApi.create).not.toHaveBeenCalled();
  });

  it('validates title length when submitted empty or short', async () => {
    renderComponent();

    const titleInput = screen.getByPlaceholderText(/e\.g\. Sprint Review/i);
    fireEvent.change(titleInput, { target: { value: 'Hi' } });

    const submitBtn = screen.getByRole('button', { name: /Create Meeting Room/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Meeting title must be at least 3 characters')).toBeInTheDocument();
  });

  it('validates custom Google Meet URL when custom mode is selected', async () => {
    renderComponent();

    const titleInput = screen.getByPlaceholderText(/e\.g\. Sprint Review/i);
    fireEvent.change(titleInput, { target: { value: 'Sales Meeting with Client' } });

    const descInput = screen.getByPlaceholderText(/What will this meeting cover/i);
    fireEvent.change(descInput, { target: { value: 'Detailed agenda and scope discussion' } });

    const projSelect = screen.getByRole('combobox');
    fireEvent.change(projSelect, { target: { value: 'proj-123' } });

    const attendeeInput = screen.getByPlaceholderText('colleague@company.com');
    fireEvent.change(attendeeInput, { target: { value: 'client@corp.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const customModeBtn = screen.getByText('Use existing link');
    fireEvent.click(customModeBtn);

    const urlInput = screen.getByPlaceholderText('https://meet.google.com/xxx-yyyy-zzz');
    fireEvent.change(urlInput, { target: { value: 'https://invalid-domain.com/123' } });

    const submitBtn = screen.getByRole('button', { name: /Create Meeting Room/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Must be a valid Google Meet link/i)).toBeInTheDocument();
    expect(meetingsApi.create).not.toHaveBeenCalled();
  });

  it('adds attendee email chip when valid email is typed and Add clicked', async () => {
    renderComponent();

    const attendeeInput = screen.getByPlaceholderText('colleague@company.com');
    fireEvent.change(attendeeInput, { target: { value: 'client@enterprise.com' } });

    const addBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addBtn);

    expect(screen.getByText('client@enterprise.com')).toBeInTheDocument();
  });

  it('submits form successfully when ALL required fields are provided', async () => {
    vi.mocked(meetingsApi.create).mockResolvedValue({
      id: 'meet-100',
      title: 'Sales Consultation',
      description: 'Review modernization scope and deliverables',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingCode: 'abc-defg-hij',
      hostUserId: 'user-sales-1',
      hostEmail: 'sales@alsm.io',
      projectId: 'proj-acme-1',
      attendeeEmails: ['client@enterprise.com'],
      scheduledStartTime: '2026-10-08T10:00:00.000Z',
      scheduledEndTime: '2026-10-08T11:00:00.000Z',
      status: 'SCHEDULED',
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-08T09:00:00.000Z',
    });

    renderComponent();

    // Wait for project options to load from async query
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    // Fill all required fields
    const titleInput = screen.getByPlaceholderText(/e\.g\. Sprint Review/i);
    fireEvent.change(titleInput, { target: { value: 'Sales Consultation' } });

    const descInput = screen.getByPlaceholderText(/What will this meeting cover/i);
    fireEvent.change(descInput, { target: { value: 'Review modernization scope and deliverables' } });

    const projSelect = screen.getByRole('combobox');
    fireEvent.change(projSelect, { target: { value: 'proj-acme-1' } });

    const attendeeInput = screen.getByPlaceholderText('colleague@company.com');
    fireEvent.change(attendeeInput, { target: { value: 'client@enterprise.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const form = document.getElementById('create-meeting-form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Meeting Room Created!')).toBeInTheDocument();
    });

    expect(screen.getByText('https://meet.google.com/abc-defg-hij')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Now/i })).toBeInTheDocument();
  });

  it('prefills title and email when query parameters email and title are passed', () => {
    renderComponent([
      '/enterprise/meetings/create?email=client%40acme.com&title=Enterprise%20Quote%20Discussion',
    ]);

    const titleInput = screen.getByPlaceholderText(/e\.g\. Sprint Review/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Enterprise Quote Discussion');
    expect(screen.getByText('client@acme.com')).toBeInTheDocument();
  });
});
