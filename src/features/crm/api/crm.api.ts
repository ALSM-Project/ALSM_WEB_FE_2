import axios from 'axios';
import { apiClient } from '@/services/api/apiClient';
import {
  LeadDto, LeadInteraction, LeadDemo,
  LeadQuote, LeadContract, LegalContractRecord, ContractInvitationRecord, SalesReportsDto, PendingDiscountDto,
  ApprovedContractTemplateVersion,
} from '../types/crm.types';
import { crmStore } from '../services/crm-store';
import type { SalesPipelineDto } from '../types/crm.types';

export * from '../types/crm.types';

export const crmApi = {
  getSalesPipeline: async (params?: { stage?: string; search?: string }): Promise<SalesPipelineDto> =>
    apiClient.get<SalesPipelineDto>('/sales/crm/pipeline', { params }),

  getLeads: async (params?: { stage?: string; search?: string; assignedTo?: string }): Promise<LeadDto[]> => {
    try {
      const data = await apiClient.get<LeadDto[]>('/sales/crm/leads', { params });
      if (Array.isArray(data)) return data;
    } catch (error) {
      // Don't mask backend validation or authorization errors with fake local leads.
      if (axios.isAxiosError(error) && error.response) throw error;
      // Keep the local demo store available when the API server is unreachable.
    }
    return crmStore.getLeads(params);
  },

  getLeadById: async (id: string): Promise<LeadDto> => {
    try {
      const data = await apiClient.get<LeadDto>(`/sales/crm/leads/${id}`);
      if (data && data.id) return data;
    } catch (error) {
      // A real API response (for example, invalid/non-persisted lead ID) must remain visible.
      if (axios.isAxiosError(error) && error.response) throw error;
      // Keep the local demo store available when the API server is unreachable.
    }
    const local = crmStore.getLeadById(id);
    if (!local) throw new Error(`Lead with ID "${id}" not found.`);
    return local;
  },

  createLead: async (data: {
    company: string;
    contactName: string;
    email: string;
    phone?: string;
    source?: string;
    score?: number;
    dealValue?: number;
    assignedTo?: string;
    assignedToName?: string;
    notes?: string;
  }): Promise<LeadDto> => {
    try {
      const created = await apiClient.post<LeadDto>('/sales/crm/leads', data);
      if (created && created.id) {
        crmStore.createLead(data); // Sync local store
        return created;
      }
    } catch {
      // Fallback to local CRM store
    }
    return crmStore.createLead(data);
  },

  adoptLegacyLead: async (leadId: string): Promise<LeadDto> =>
    apiClient.post<LeadDto>(`/sales/crm/leads/${encodeURIComponent(leadId)}/adopt`, {}),

  updateLeadStage: async (
    id: string,
    data: { stage: LeadDto['stage']; notes?: string; nextFollowUpAt?: string }
  ): Promise<LeadDto> => {
    // If user attempts to set Won manually, crmStore will reject according to business rules
    if (data.stage === 'WON') {
      return crmStore.updateLeadStage(id, data.stage, data.notes, data.nextFollowUpAt);
    }

    try {
      const res = await apiClient.patch<LeadDto>(`/sales/crm/leads/${id}/stage`, data);
      if (res && res.id) {
        crmStore.updateLeadStage(id, data.stage, data.notes, data.nextFollowUpAt);
        return res;
      }
    } catch {
      // Fallback to local CRM store
    }
    return crmStore.updateLeadStage(id, data.stage, data.notes, data.nextFollowUpAt);
  },

  logInteraction: async (
    leadId: string,
    data: {
      type: LeadInteraction['type'];
      durationMinutes?: number;
      outcome?: string;
      summary: string;
      actionItems?: string;
      details?: string;
    }
  ): Promise<LeadInteraction> => {
    try {
      const res = await apiClient.post<LeadInteraction>(`/sales/crm/leads/${leadId}/interactions`, data);
      if (res && res.id) {
        crmStore.logInteraction(leadId, data);
        return res;
      }
    } catch {
      // Fallback
    }
    return crmStore.logInteraction(leadId, data);
  },

  scheduleDemo: async (
    leadId: string,
    data: {
      topic: string;
      scheduledAt: string;
      durationMinutes?: number;
      attendees?: string[];
      agenda?: string;
      notes?: string;
    }
  ): Promise<LeadDemo> => {
    try {
      const res = await apiClient.post<LeadDemo>(`/sales/crm/leads/${leadId}/demos`, data);
      if (res && res.id) {
        crmStore.scheduleDemo(leadId, data);
        return res;
      }
    } catch {
      // Fallback
    }
    return crmStore.scheduleDemo(leadId, data);
  },

  createQuote: async (
    leadId: string,
    data: {
      plan: string;
      projectScope?: string;
      basePrice: number;
      discountPercent?: number;
      discountReason?: string;
    }
  ): Promise<LeadQuote> => {
    const lead = await apiClient.post<LeadDto>(`/sales/crm/leads/${encodeURIComponent(leadId)}/quotes`, {
      planName: data.plan,
      projectScope: data.projectScope,
      amount: data.basePrice,
      discountPercent: data.discountPercent,
      discountReason: data.discountReason,
    });
    const saved = lead.quotes?.[lead.quotes.length - 1] as unknown as ({
      id?: string;
      quoteNumber?: string;
      plan?: string;
      planName?: string;
      projectScope?: string;
      amount?: number;
      basePrice?: number;
      discountPercent?: number;
      approvalStatus?: LeadQuote['approvalStatus'];
      status: string;
      discountApproved?: boolean;
      discountReason?: string;
      approvedBy?: string;
      approvedAt?: string;
      rejectionReason?: string;
      sentAt?: string;
      createdAt?: string;
    } | undefined);
    if (!saved?.id) throw new Error('The quote was not returned by the server. Refresh the lead and try again.');
    const amount = Number(saved.amount ?? saved.basePrice ?? data.basePrice);
    const discountPercent = Number(saved.discountPercent ?? data.discountPercent ?? 0);
    return {
      ...saved,
      quoteNumber: saved.quoteNumber || saved.id,
      plan: saved.plan || saved.planName || data.plan,
      basePrice: amount,
      finalPrice: Math.round(amount * (1 - discountPercent / 100)),
      discountPercent,
      requiresApproval: saved.status === 'PENDING_APPROVAL',
      approvalStatus: saved.approvalStatus || (saved.status === 'PENDING_APPROVAL' ? 'PENDING' : 'APPROVED'),
      status: (saved.status === 'PENDING_APPROVAL' ? 'DRAFT' : saved.status) as LeadQuote['status'],
      createdAt: saved.createdAt || new Date().toISOString(),
    } as LeadQuote;
  },

  acceptQuote: async (leadId: string, quoteId: string): Promise<LeadQuote> => {
    return crmStore.acceptQuote(leadId, quoteId);
  },

  createContract: async (
    leadId: string,
    requestId: string,
    data: {
      title: string;
      plan: string;
      quoteId?: string;
      annualValue: number;
      effectiveDate?: string;
      approvedTemplateVersionId: string;
    }
  ): Promise<LeadContract> => {
    const res = await apiClient.post<LegalContractRecord>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts`,
      data,
      { headers: { 'Idempotency-Key': requestId } },
    );
    return {
      id: res.contract.id,
      contractNumber: res.contract.contractNumber,
      title: res.version.title,
      plan: res.version.plan,
      quoteId: res.version.quoteId,
      annualValue: res.version.annualValue,
      status: 'DRAFT',
      effectiveDate: res.version.effectiveDate,
      createdAt: res.contract.createdAt,
      workflowStatus: res.contract.lifecycleStatus,
      reviewStatus: res.contract.reviewStatus,
      versionId: res.version.id,
      documentAvailable: res.documentAvailable,
      signingAvailable: res.signingAvailable,
      signingBlockedReason: res.signingBlockedReason,
      signingReadiness: res.signingReadiness,
      approvedTemplateVersionId: res.version.approvedTemplateVersionId,
      approvedTemplateSnapshot: res.version.approvedTemplateSnapshot,
    };
  },

  listLegalContracts: async (leadId: string): Promise<LegalContractRecord[]> =>
    apiClient.get<LegalContractRecord[]>(`/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts`),

  downloadLegalContractReviewPdf: async (leadId: string, contractId: string): Promise<Blob> =>
    apiClient.get<Blob>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/review-pdf`,
      { responseType: 'blob' },
    ),

  downloadCanonicalContractPdf: async (leadId: string, contractId: string): Promise<Blob> =>
    apiClient.get<Blob>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/contract-pdf`,
      { responseType: 'blob' },
    ),

  listApprovedContractTemplates: async (): Promise<ApprovedContractTemplateVersion[]> =>
    apiClient.get<ApprovedContractTemplateVersion[]>('/sales/contract-templates/approved'),

  listContractTemplateVersions: async (): Promise<ApprovedContractTemplateVersion[]> =>
    apiClient.get<ApprovedContractTemplateVersion[]>('/admin/contract-templates'),

  createContractTemplateVersion: async (data: {
    templateId: string;
    title: string;
    locale: 'vi' | 'en' | 'vi-en';
    sections: Array<{ heading: string; body: string }>;
  }): Promise<ApprovedContractTemplateVersion> =>
    apiClient.post<ApprovedContractTemplateVersion>('/admin/contract-templates', data),

  createNextContractTemplateVersion: async (templateId: string, data: {
    title: string;
    locale: 'vi' | 'en' | 'vi-en';
    sections: Array<{ heading: string; body: string }>;
  }): Promise<ApprovedContractTemplateVersion> =>
    apiClient.post<ApprovedContractTemplateVersion>(`/admin/contract-templates/${encodeURIComponent(templateId)}/versions`, data),

  approveContractTemplateVersion: async (versionId: string): Promise<ApprovedContractTemplateVersion> =>
    apiClient.post<ApprovedContractTemplateVersion>(`/admin/contract-template-versions/${encodeURIComponent(versionId)}/approve`, {}),

  rejectContractTemplateVersion: async (versionId: string, reason: string): Promise<ApprovedContractTemplateVersion> =>
    apiClient.post<ApprovedContractTemplateVersion>(`/admin/contract-template-versions/${encodeURIComponent(versionId)}/reject`, { reason }),

  submitLegalContractForReview: async (leadId: string, contractId: string): Promise<LegalContractRecord> =>
    apiClient.post<LegalContractRecord>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/submit-review`,
      {},
    ),

  reviseLegalContract: async (
    leadId: string,
    contractId: string,
    requestId: string,
    data: { title: string; plan: string; quoteId?: string; annualValue: number; effectiveDate?: string; approvedTemplateVersionId: string },
  ): Promise<LegalContractRecord> =>
    apiClient.post<LegalContractRecord>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/versions`,
      data,
      { headers: { 'Idempotency-Key': requestId } },
    ),

  reviewLegalContract: async (
    leadId: string,
    contractId: string,
    action: 'APPROVE' | 'RETURN' | 'REJECT',
    reason?: string,
  ): Promise<LegalContractRecord> =>
    apiClient.post<LegalContractRecord>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/review`,
      { action, ...(reason ? { reason } : {}) },
    ),

  initiateOnlineSigning: async (leadId: string, contractId: string): Promise<{
    envelopeReference: string;
    contractId: string;
    status: string;
  }> =>
    apiClient.post(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/signing/initiate`,
      {},
    ),

  cancelOnlineSigning: async (leadId: string, contractId: string, reason: string): Promise<{ cancelled: boolean }> =>
    apiClient.post(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/legal-contracts/${encodeURIComponent(contractId)}/signing/cancel`,
      { reason },
    ),

  listContractInvitations: async (leadId: string): Promise<ContractInvitationRecord[]> =>
    apiClient.get<ContractInvitationRecord[]>(`/sales/crm/leads/${encodeURIComponent(leadId)}/contract-invitations`),

  createContractInvitation: async (leadId: string, requestId: string): Promise<ContractInvitationRecord & { message: string }> =>
    apiClient.post<ContractInvitationRecord & { message: string }>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/contract-invitations`,
      {},
      { headers: { 'Idempotency-Key': requestId } },
    ),

  resendContractInvitation: async (leadId: string, invitationId: string, requestId: string): Promise<ContractInvitationRecord & { message: string }> =>
    apiClient.post<ContractInvitationRecord & { message: string }>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/contract-invitations/${encodeURIComponent(invitationId)}/resend`,
      {},
      { headers: { 'Idempotency-Key': requestId } },
    ),

  confirmPayment: async (leadId: string, transactionRef?: string): Promise<LeadDto> => {
    return crmStore.confirmPayment(leadId, transactionRef);
  },

  setPaymentPolicy: async (leadId: string, required: boolean): Promise<LeadDto> => {
    return crmStore.setPaymentPolicy(leadId, required);
  },

  activateCustomer: async (leadId: string): Promise<{
    lead: LeadDto;
    organizationId: string;
    adminLinked: boolean;
    replayed: boolean;
  }> => {
    return apiClient.post<{
      lead: LeadDto;
      organizationId: string;
      adminLinked: boolean;
      replayed: boolean;
    }>(`/sales/crm/leads/${encodeURIComponent(leadId)}/activate`, {});
  },

  getReports: async (filters?: {
    dateRange?: string;
  }): Promise<SalesReportsDto> => {
    const raw = await apiClient.get<any>('/sales/crm/reports', { params: filters });
    return {
      totalLeads: Number(raw?.totalLeads ?? 0),
      wonLeads: Number(raw?.wonLeads ?? 0),
      monthlyRevenue: Number(raw?.monthlyRevenue ?? raw?.totalRevenue ?? 0),
      totalRevenue: Number(raw?.totalRevenue ?? raw?.monthlyRevenue ?? 0),
      averageDealSize: Number(raw?.averageDealSize ?? raw?.avgDealSize ?? 0),
      avgDealSize: Number(raw?.avgDealSize ?? raw?.averageDealSize ?? 0),
      conversionRate: Number(raw?.conversionRate ?? 0),
      stageDistribution: raw?.stageDistribution || raw?.pipelineBreakdown || {},
      pipelineBreakdown: raw?.pipelineBreakdown || raw?.stageDistribution || {},
      sourceDistribution: raw?.sourceDistribution || raw?.leadSources || {},
      leadSources: raw?.leadSources || raw?.sourceDistribution || {},
      revenueOverTime: raw?.revenueOverTime || [],
      recentWonDeals: raw?.recentWonDeals || [],
    };
  },

  getTeamPerformance: async (filters?: {
    dateRange?: string;
    teamMember?: string;
    region?: string;
    userRole?: string;
    userEmail?: string;
  }) => {
    try {
      const data = await apiClient.get<any>('/sales/crm/team-performance', { params: filters });
      if (data && data.members) return data;
    } catch {
      // Fallback
    }
    return crmStore.getTeamPerformance(filters);
  },

  exportReportsCsv: async (filters?: {
    dateRange?: string;
  }): Promise<string> => {
    return apiClient.get<string>('/sales/crm/reports/export', { params: filters });
  },

  getPendingDiscounts: async (): Promise<PendingDiscountDto[]> => {
    return apiClient.get<PendingDiscountDto[]>('/sales/crm/discounts/requests');
  },

  reviewDiscount: async (data: {
    leadId: string;
    quoteId: string;
    outcome: 'APPROVE' | 'REJECT' | 'ESCALATE';
    reason?: string;
  }): Promise<{ message: string; success: boolean; replayed: boolean }> => {
    const route = data.outcome === 'APPROVE'
      ? 'approve'
      : data.outcome === 'REJECT'
        ? 'reject'
        : 'escalate';
    return apiClient.post(`/sales/crm/discounts/${route}`, {
      leadId: data.leadId,
      quoteId: data.quoteId,
      ...(data.reason ? { reason: data.reason } : {}),
    });
  },
};
