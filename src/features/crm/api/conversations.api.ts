import { apiClient } from '@/services/api/apiClient';

export interface CrmConversationItem {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'CLOSED';
  channel: 'EMAIL' | 'PORTAL' | 'PHONE' | 'CHAT';
  leadId?: string;
  organizationId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  assignedToUserId?: string;
  assignedToEmail?: string;
  assignedToName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmConversationMessageItem {
  id: string;
  conversationId: string;
  senderUserId?: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'CUSTOMER' | 'SALES_REP' | 'STAFF' | 'SYSTEM';
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CreateConversationPayload {
  title: string;
  channel?: 'EMAIL' | 'PORTAL' | 'PHONE' | 'CHAT';
  leadId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  initialMessage?: string;
  isInternal?: boolean;
}

export interface ConvertToLeadPayload {
  companyName?: string;
  businessRequirements?: string;
  estimatedScreens?: number;
  estimatedPrograms?: number;
  estimatedValue?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expectedCloseDate?: string;
  followUpDate?: string;
  notes?: string;
  existingLeadId?: string;
}

export interface ConvertToLeadResult {
  success: boolean;
  leadId: string;
  leadTitle: string;
  stage: string;
  dealValue: number;
  contactEmail: string;
  contactName: string;
  company: string;
  conversationId: string;
  isExistingLinked: boolean;
}

export interface CheckLeadStatusResult {
  isLinked: boolean;
  leadId?: string;
  lead?: {
    id: string;
    title: string;
    stage: string;
    dealValue?: number;
    company?: string;
    contactName?: string;
    contactEmail?: string;
  };
  matchingLeads: Array<{
    id: string;
    title: string;
    stage: string;
    dealValue?: number;
    company?: string;
    contactName?: string;
    contactEmail?: string;
    createdAt?: string;
  }>;
}

export const conversationsApi = {
  list: (params?: { leadId?: string; status?: string; search?: string; channel?: string }): Promise<CrmConversationItem[]> =>
    apiClient.get<CrmConversationItem[]>('/crm/conversations', { params }),

  getById: (id: string): Promise<CrmConversationItem> =>
    apiClient.get<CrmConversationItem>(`/crm/conversations/${encodeURIComponent(id)}`),

  checkLeadStatus: (id: string): Promise<CheckLeadStatusResult> =>
    apiClient.get<CheckLeadStatusResult>(`/crm/conversations/${encodeURIComponent(id)}/check-lead`),

  convertToLead: (id: string, payload: ConvertToLeadPayload): Promise<ConvertToLeadResult> =>
    apiClient.post<ConvertToLeadResult>(`/crm/conversations/${encodeURIComponent(id)}/convert-to-lead`, payload),

  create: (data: CreateConversationPayload): Promise<CrmConversationItem> =>
    apiClient.post<CrmConversationItem>('/crm/conversations', data),

  updateStatus: (id: string, status: string): Promise<CrmConversationItem> =>
    apiClient.patch<CrmConversationItem>(`/crm/conversations/${encodeURIComponent(id)}/status`, { status }),

  listMessages: (conversationId: string): Promise<CrmConversationMessageItem[]> =>
    apiClient.get<CrmConversationMessageItem[]>(`/crm/conversations/${encodeURIComponent(conversationId)}/messages`),

  postMessage: (
    conversationId: string,
    data: { content: string; isInternal?: boolean }
  ): Promise<CrmConversationMessageItem> =>
    apiClient.post<CrmConversationMessageItem>(`/crm/conversations/${encodeURIComponent(conversationId)}/messages`, data),
};
