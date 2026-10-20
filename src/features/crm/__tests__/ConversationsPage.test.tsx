import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConversationsPage } from '../pages/ConversationsPage';
import { conversationsApi, CrmConversationItem, CrmConversationMessageItem } from '../api/conversations.api';

vi.mock('../api/conversations.api', () => ({
  conversationsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    listMessages: vi.fn(),
    postMessage: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'sales@alsm.dev', fullName: 'System Admin' },
    hasPermission: () => true,
  }),
}));

const mockConversations: CrmConversationItem[] = [
  {
    id: 'conv-1',
    title: 'AS400 Core Banking Modernization',
    status: 'IN_PROGRESS',
    channel: 'PORTAL',
    leadId: 'lead-1',
    customerName: 'Sarah Jenkins',
    customerEmail: 's.jenkins@fintechdynamics.com',
    customerPhone: '+1 (555) 234-5678',
    companyName: 'FinTech Dynamics Corp',
    assignedToEmail: 'sales@alsm.dev',
    assignedToName: 'System Admin',
    lastMessage: 'Looking forward to our tech review.',
    lastMessageAt: '2026-11-04T10:00:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conv-2',
    title: 'Urgent COBOL Migration',
    status: 'OPEN',
    channel: 'EMAIL',
    customerName: 'Dr. Michael Chang',
    customerEmail: 'mchang@apexhealth.org',
    companyName: 'Apex Health Systems',
    lastMessage: 'Requested compliance certification.',
    lastMessageAt: '2026-11-04T08:00:00.000Z',
    unreadCount: 1,
  },
];

const mockMessages: CrmConversationMessageItem[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderName: 'Sarah Jenkins',
    senderEmail: 's.jenkins@fintechdynamics.com',
    senderRole: 'CUSTOMER',
    content: 'We have 25 AS400 screens that need conversion.',
    isInternal: false,
    createdAt: '2026-11-04T09:00:00.000Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderName: 'System Admin',
    senderEmail: 'sales@alsm.dev',
    senderRole: 'STAFF',
    content: 'Internal note: Deal value approved ~120,000 USD.',
    isInternal: true,
    createdAt: '2026-11-04T09:30:00.000Z',
  },
];

describe('ConversationsPage (Customer Conversation Center)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(conversationsApi.list).mockResolvedValue(mockConversations);
    vi.mocked(conversationsApi.listMessages).mockResolvedValue(mockMessages);
  });

  const renderComponent = (initialEntries = ['/crm/conversations']) =>
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <ConversationsPage />
      </MemoryRouter>
    );

  it('renders conversation list and loads active conversation messages', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Conversations/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('FinTech Dynamics Corp').length).toBeGreaterThan(0);
      expect(screen.getByText('Apex Health Systems')).toBeInTheDocument();
    });

    // Check message contents
    await waitFor(() => {
      expect(screen.getByText('We have 25 AS400 screens that need conversion.')).toBeInTheDocument();
      expect(screen.getByText(/Internal note: Deal value approved/i)).toBeInTheDocument();
    });
  });

  it('allows posting a new customer reply', async () => {
    vi.mocked(conversationsApi.postMessage).mockResolvedValueOnce({
      id: 'msg-3',
      conversationId: 'conv-1',
      senderName: 'System Admin',
      senderEmail: 'sales@alsm.dev',
      senderRole: 'SALES_REP',
      content: 'We can schedule a walkthrough for Thursday.',
      isInternal: false,
      createdAt: '2026-11-04T10:15:00.000Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Write a message to the customer/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Write a message to the customer/i);
    fireEvent.change(textarea, { target: { value: 'We can schedule a walkthrough for Thursday.' } });

    const sendButton = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(conversationsApi.postMessage).toHaveBeenCalledWith('conv-1', {
        content: 'We can schedule a walkthrough for Thursday.',
        isInternal: false,
      });
      expect(screen.getByText('We can schedule a walkthrough for Thursday.')).toBeInTheDocument();
    });
  });

  it('allows posting an internal note with lock badge', async () => {
    vi.mocked(conversationsApi.postMessage).mockResolvedValueOnce({
      id: 'msg-4',
      conversationId: 'conv-1',
      senderName: 'System Admin',
      senderEmail: 'sales@alsm.dev',
      senderRole: 'SALES_REP',
      content: 'Private note: Check cloud IAM roles.',
      isInternal: true,
      createdAt: '2026-11-04T10:20:00.000Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Internal Note/i })).toBeInTheDocument();
    });

    // Switch to internal note mode
    fireEvent.click(screen.getByRole('button', { name: /Internal Note/i }));

    const textarea = screen.getByPlaceholderText(/Write a private internal note for the team/i);
    fireEvent.change(textarea, { target: { value: 'Private note: Check cloud IAM roles.' } });

    const saveNoteButton = screen.getByRole('button', { name: /Save Note/i });
    fireEvent.click(saveNoteButton);

    await waitFor(() => {
      expect(conversationsApi.postMessage).toHaveBeenCalledWith('conv-1', {
        content: 'Private note: Check cloud IAM roles.',
        isInternal: true,
      });
    });
  });

  it('supports updating conversation status', async () => {
    vi.mocked(conversationsApi.updateStatus).mockResolvedValueOnce({
      ...mockConversations[0],
      status: 'CLOSED',
    });

    renderComponent();

    const statusSelect = await screen.findByRole('combobox');
    expect(statusSelect).toBeInTheDocument();
    fireEvent.change(statusSelect, { target: { value: 'CLOSED' } });

    await waitFor(() => {
      expect(conversationsApi.updateStatus).toHaveBeenCalledWith('conv-1', 'CLOSED');
    });
  });
});
