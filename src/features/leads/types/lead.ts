export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export type LeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'COLD_CALL'
  | 'EMAIL_CAMPAIGN'
  | 'SOCIAL_MEDIA'
  | 'TRADE_SHOW'
  | 'PARTNER'
  | 'OTHER';

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  jobTitle?: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  estimatedValue?: number;
  currency: string;
  notes?: string;
  assignedToUserId?: string;
  assignedToEmail?: string;
  tags: string[];
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdByUserId: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListLeadsParams {
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  assignedToUserId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListLeadsResponse {
  items: Lead[];
  total: number;
  statusCounts: Record<string, number>;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: 'Website',
  REFERRAL: 'Referral',
  COLD_CALL: 'Cold Call',
  EMAIL_CAMPAIGN: 'Email Campaign',
  SOCIAL_MEDIA: 'Social Media',
  TRADE_SHOW: 'Trade Show',
  PARTNER: 'Partner',
  OTHER: 'Other',
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};
