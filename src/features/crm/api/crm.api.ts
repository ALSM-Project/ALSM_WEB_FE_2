import { apiClient } from '@/services/api/apiClient';
import { 
  LeadDto, LeadInteraction, LeadDemo, 
  LeadQuote, LeadContract, SalesReportsDto, PendingDiscountDto 
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
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // Fallback to local CRM store
    }
    return crmStore.getLeads(params);
  },

  getLeadById: async (id: string): Promise<LeadDto> => {
    try {
      const data = await apiClient.get<LeadDto>(`/sales/crm/leads/${id}`);
      if (data && data.id) return data;
    } catch {
      // Fallback to local CRM store
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
    try {
      const res = await apiClient.post<LeadQuote>(`/sales/crm/leads/${leadId}/quotes`, data);
      if (res && res.id) {
        crmStore.createQuote(leadId, data);
        return res;
      }
    } catch {
      // Fallback
    }
    return crmStore.createQuote(leadId, data);
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
    }
  ): Promise<LeadContract> => {
    const res = await apiClient.post<{ contract: LeadContract }>(
      `/sales/crm/leads/${encodeURIComponent(leadId)}/contracts`,
      data,
      { headers: { 'Idempotency-Key': requestId } },
    );
    return res.contract;
  },

  sendContractForSignature: async (leadId: string, contractId: string): Promise<LeadContract> => {
    return crmStore.sendContractForSignature(leadId, contractId);
  },

  simulateSignContract: async (leadId: string, contractId: string): Promise<LeadContract> => {
    return crmStore.simulateSignContract(leadId, contractId);
  },

  confirmPayment: async (leadId: string, transactionRef?: string): Promise<LeadDto> => {
    return crmStore.confirmPayment(leadId, transactionRef);
  },

  setPaymentPolicy: async (leadId: string, required: boolean): Promise<LeadDto> => {
    return crmStore.setPaymentPolicy(leadId, required);
  },

  activateCustomer: async (
    leadId: string,
    options?: {
      paymentRequired?: boolean;
      simulateFailure?: boolean;
    }
  ): Promise<{
    lead: LeadDto;
    organizationId: string;
    adminEmail: string;
    web3Url: string;
  }> => {
    return crmStore.activateCustomer(leadId, options);
  },

  // Legacy compatibility for any code that calls signContract
  signContract: async (
    leadId: string,
    contractId: string
  ): Promise<{ lead: LeadDto; organizationId: string; adminEmail: string; web3Url: string }> => {
    crmStore.simulateSignContract(leadId, contractId);
    return crmStore.activateCustomer(leadId);
  },

  getReports: async (filters?: {
    dateRange?: string;
    teamMember?: string;
    region?: string;
  }): Promise<SalesReportsDto> => {
    try {
      const raw = await apiClient.get<any>('/sales/crm/reports', { params: filters });
      if (raw && typeof raw.totalLeads === 'number') {
        return {
          totalLeads: Number(raw.totalLeads ?? 0),
          wonLeads: Number(raw.wonLeads ?? 0),
          monthlyRevenue: Number(raw.monthlyRevenue ?? raw.totalRevenue ?? 0),
          totalRevenue: Number(raw.totalRevenue ?? raw.monthlyRevenue ?? 0),
          averageDealSize: Number(raw.averageDealSize ?? raw.avgDealSize ?? 0),
          avgDealSize: Number(raw.avgDealSize ?? raw.averageDealSize ?? 0),
          conversionRate: Number(raw.conversionRate ?? 0),
          stageDistribution: raw.stageDistribution || raw.pipelineBreakdown || {},
          pipelineBreakdown: raw.pipelineBreakdown || raw.stageDistribution || {},
          sourceDistribution: raw.sourceDistribution || raw.leadSources || {},
          leadSources: raw.leadSources || raw.sourceDistribution || {},
          revenueOverTime: raw.revenueOverTime || [],
          recentWonDeals: raw.recentWonDeals || [],
        };
      }
    } catch {
      // Fallback
    }
    return crmStore.getReports(filters);
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
    teamMember?: string;
    region?: string;
  }): Promise<string> => {
    try {
      const res = await apiClient.get<string>('/sales/crm/reports/export', { params: filters });
      if (res) return res;
    } catch {
      // Fallback
    }
    return crmStore.exportReportsCsv(filters);
  },

  getPendingDiscounts: async (): Promise<PendingDiscountDto[]> => {
    try {
      const data = await apiClient.get<PendingDiscountDto[]>('/sales/crm/discounts/pending');
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }
    return crmStore.getPendingDiscounts();
  },

  reviewDiscount: async (data: {
    leadId: string;
    quoteId: string;
    approved: boolean;
    rejectionReason?: string;
    escalateToVP?: boolean;
    reviewer?: string;
  }): Promise<{ message: string }> => {
    try {
      const res = await apiClient.post<{ message: string }>('/sales/crm/discounts/review', data);
      if (res && res.message) {
        crmStore.reviewDiscount(data.leadId, data.quoteId, data.approved, data.rejectionReason, data.escalateToVP, data.reviewer);
        return res;
      }
    } catch {
      // Fallback
    }
    crmStore.reviewDiscount(data.leadId, data.quoteId, data.approved, data.rejectionReason, data.escalateToVP, data.reviewer);
    return {
      message: data.escalateToVP
        ? 'Quote discount escalated to VP of Sales for executive approval.'
        : data.approved
        ? 'Quote discount approved successfully.'
        : 'Quote discount rejected.',
    };
  },
};
