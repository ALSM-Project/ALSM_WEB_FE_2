import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvertConversationToLeadModal } from '../ConvertConversationToLeadModal';
import { conversationsApi, CrmConversationItem } from '../../api/conversations.api';

vi.mock('../../api/conversations.api', () => ({
  conversationsApi: {
    checkLeadStatus: vi.fn(),
    convertToLead: vi.fn(),
  },
}));

describe('ConvertConversationToLeadModal', () => {
  const mockConversation: CrmConversationItem = {
    id: 'conv-12345',
    title: 'Modernizing 30 Legacy screens',
    status: 'OPEN',
    channel: 'PORTAL',
    customerName: 'Nguyen Van A',
    customerEmail: 'nguyenvana@techcorp.vn',
    customerPhone: '0912345678',
    companyName: 'TechCorp Vietnam',
    unreadCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pre-filled customer details and creates a new CRM Lead', async () => {
    vi.mocked(conversationsApi.convertToLead).mockResolvedValue({
      success: true,
      leadId: 'lead-99999',
      leadTitle: 'TechCorp Vietnam - Modernization Deal',
      stage: 'NEW',
      dealValue: 120000000,
      contactEmail: 'nguyenvana@techcorp.vn',
      contactName: 'Nguyen Van A',
      company: 'TechCorp Vietnam',
      conversationId: 'conv-12345',
      isExistingLinked: false,
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConvertConversationToLeadModal
        conversation={mockConversation}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Verify modal title
    expect(screen.getByText('Convert Conversation to CRM Lead')).toBeInTheDocument();

    // Verify prefilled data
    expect(screen.getByText('TechCorp Vietnam')).toBeInTheDocument();
    expect(screen.getByText('nguyenvana@techcorp.vn')).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Confirm & Create CRM Lead/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(conversationsApi.convertToLead).toHaveBeenCalledWith(
        'conv-12345',
        expect.objectContaining({
          companyName: 'TechCorp Vietnam',
          businessRequirements: 'Modernizing 30 Legacy screens',
          estimatedScreens: 20,
          estimatedPrograms: 5,
        })
      );
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          leadId: 'lead-99999',
        })
      );
    });
  });
});
