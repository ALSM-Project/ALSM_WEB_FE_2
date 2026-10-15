import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MeetingsListPage } from './MeetingsListPage';
import { meetingsApi } from '../api/meetings.api';
import type { Meeting } from '../types/meeting';

const mockNavigate = vi.fn();

vi.mock('../api/meetings.api', () => ({
  meetingsApi: {
    create: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMeetings: Meeting[] = [
  {
    id: 'meet-1',
    title: 'Q4 Architecture Review',
    description: 'Review microservices and database migrations',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    meetingCode: 'abc-defg-hij',
    hostUserId: 'user-1',
    hostEmail: 'lead@enterprise.com',
    projectId: 'proj-1',
    attendeeEmails: ['dev1@enterprise.com', 'dev2@enterprise.com'],
    scheduledStartTime: '2026-10-20T10:00:00.000Z',
    scheduledEndTime: '2026-10-20T11:00:00.000Z',
    status: 'SCHEDULED',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'meet-2',
    title: 'Client Demo — ALSM Platform',
    description: 'Demonstration of modernization pipeline',
    projectId: 'proj-2',
    meetingUrl: 'https://meet.google.com/xyz-uvwx-rst',
    meetingCode: 'xyz-uvwx-rst',
    hostUserId: 'user-2',
    hostEmail: 'sales@enterprise.com',
    attendeeEmails: ['client@corp.com'],
    scheduledStartTime: '2026-10-20T14:00:00.000Z',
    scheduledEndTime: '2026-10-20T15:00:00.000Z',
    status: 'IN_PROGRESS',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
];

describe('MeetingsListPage (UC-43 Frontend)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/enterprise/meetings']}>
          <MeetingsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(meetingsApi.list).mockReturnValue(new Promise(() => {})); // Never resolves
    renderComponent();

    expect(screen.getByText('Online Meeting Rooms')).toBeInTheDocument();
    expect(document.querySelector('#meetings-loading-skeleton')).toBeInTheDocument();
  });

  it('renders meetings grid with meeting cards and KPIs when data loaded', async () => {
    vi.mocked(meetingsApi.list).mockResolvedValue({
      items: mockMeetings,
      total: 2,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Q4 Architecture Review')).toBeInTheDocument();
    });

    expect(screen.getByText('Client Demo — ALSM Platform')).toBeInTheDocument();
    expect(screen.getByText('abc-defg-hij')).toBeInTheDocument();
    expect(screen.getByText('xyz-uvwx-rst')).toBeInTheDocument();
    expect(screen.getByText(/lead@enterprise\.com/)).toBeInTheDocument();
    expect(screen.getByText('Total Meetings')).toBeInTheDocument();
  });

  it('renders empty state when no meetings exist', async () => {
    vi.mocked(meetingsApi.list).mockResolvedValue({
      items: [],
      total: 0,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No meetings found')).toBeInTheDocument();
    });

    expect(screen.getByText('Schedule Online Meeting')).toBeInTheDocument();
  });

  it('renders error state on fetch failure and allows retry', async () => {
    vi.mocked(meetingsApi.list).mockRejectedValue(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(meetingsApi.list).mockResolvedValue({ items: mockMeetings, total: 2 });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Q4 Architecture Review')).toBeInTheDocument();
    });
  });

  it('navigates to create meeting page when create button clicked', async () => {
    vi.mocked(meetingsApi.list).mockResolvedValue({ items: [], total: 0 });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No meetings found')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create meeting room/i });
    fireEvent.click(createBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/enterprise/meetings/create');
  });

  it('filters meetings when filter tab clicked', async () => {
    vi.mocked(meetingsApi.list).mockResolvedValue({ items: mockMeetings, total: 2 });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Q4 Architecture Review')).toBeInTheDocument();
    });

    const scheduledTab = screen.getByRole('tab', { name: 'Scheduled' });
    fireEvent.click(scheduledTab);

    expect(meetingsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SCHEDULED' })
    );
  });

  it('copies meeting link to clipboard when Copy Link is clicked', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(meetingsApi.list).mockResolvedValue({ items: mockMeetings, total: 2 });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Q4 Architecture Review')).toBeInTheDocument();
    });

    const copyBtn = document.querySelector('#copy-meet-meet-1') as HTMLButtonElement;
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
  });
});
