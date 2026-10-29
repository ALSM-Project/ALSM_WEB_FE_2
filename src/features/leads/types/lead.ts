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
export type LeadEmailNotificationStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';

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
  quotes?: LeadQuoteItem[];
  emailNotificationStatus?: LeadEmailNotificationStatus;
  emailNotifiedAt?: string;
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

export interface CreateLeadPayload {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  jobTitle?: string;
  source: LeadSource;
  priority?: LeadPriority;
  estimatedValue?: number;
  currency?: string;
  notes?: string;
}

export interface CreateLeadResponse {
  lead: Lead;
  replayed: boolean;
  notificationSent: boolean | null;
  message: string;
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

export const ALLOWED_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'PROPOSAL', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'NEGOTIATION', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'WON', 'LOST'],
  NEGOTIATION: ['PROPOSAL', 'WON', 'LOST'],
  WON: ['NEGOTIATION', 'LOST'],
  LOST: ['NEW', 'CONTACTED', 'QUALIFIED'],
};

export function getAllowedTransitions(current: LeadStatus): LeadStatus[] {
  return ALLOWED_LEAD_STATUS_TRANSITIONS[current] ?? [];
}

export type QuoteApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface LeadQuoteItem {
  id: string;
  quoteNumber: string;
  planName: string;
  projectScope?: string;
  amount: number;
  discountPercent?: number;
  discountApproved?: boolean;
  discountReason?: string;
  status: QuoteApprovalStatus;
  recipientEmail: string;
  expiresAt: string;
  sentAt?: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface SendQuotePayload {
  planName: string;
  amount: number;
  discountPercent?: number;
  discountReason?: string;
  recipientEmail?: string;
  validityDays?: number;
  projectScope?: string;
  notes?: string;
}

export interface SendQuoteResponse {
  quote: LeadQuoteItem;
  lead: Lead;
  message: string;
}


