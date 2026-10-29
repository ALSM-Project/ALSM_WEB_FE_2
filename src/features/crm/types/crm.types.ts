export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type SalesPipelineStage = LeadStage | 'NEGOTIATION' | 'UNMAPPED';

export interface SalesPipelineLeadDto {
  id: string;
  company: string;
  contactName: string;
  source: string;
  stage: SalesPipelineStage;
  score?: number;
  dealValue?: number;
  currency: 'VND';
  assignedToName?: string;
  lastContactAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesPipelineDto {
  items: SalesPipelineLeadDto[];
  total: number;
  stageCounts: Record<SalesPipelineStage, number>;
  lastUpdated: string;
}

export interface LeadInteraction {
  id: string;
  type: 'PHONE_CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'NOTE';
  durationMinutes?: number;
  outcome?: string;
  summary: string;
  actionItems?: string;
  details?: string;
  performedBy: string;
  timestamp: string;
}

export interface LeadDemo {
  id: string;
  topic: string;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[];
  meetingLink: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  agenda?: string;
  notes?: string;
  createdBy: string;
}

export interface LeadQuote {
  id: string;
  quoteNumber: string;
  plan: string;
  projectScope?: string;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_HIGHER_APPROVAL';
  discountReason?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  discountApproved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  createdAt: string;
}

export interface LeadContract {
  id: string;
  contractNumber: string;
  title: string;
  plan: string;
  quoteId?: string;
  annualValue: number;
  status: 'DRAFT' | 'SENT_FOR_SIGNATURE' | 'PARTIALLY_SIGNED' | 'FULLY_SIGNED' | 'EXPIRED';
  effectiveDate: string;
  docusignEnvelopeId?: string;
  signedAt?: string;
  createdAt: string;
}

export interface LeadPayment {
  required: boolean;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'WAIVED';
  confirmedAt?: string;
  transactionRef?: string;
}

export interface ProvisioningChecklist {
  contractSigned: boolean;
  paymentConfirmed: boolean;
  organizationCreated: boolean;
  adminProvisioned: boolean;
  subscriptionActivated: boolean;
  web3AccessEnabled: boolean;
  welcomeNotificationSent: boolean;
}

export interface LeadProvisioning {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  adminEmail?: string;
  adminTempPassword?: string;
  engagementType?: string;
  web3AccessUrl?: string;
  completedAt?: string;
  failureReason?: string;
  checklist: ProvisioningChecklist;
}

export interface StageAuditEntry {
  id: string;
  timestamp: string;
  fromStage: LeadStage;
  toStage: LeadStage;
  changedBy: string;
  notes?: string;
}

export interface LeadDto {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone?: string;
  source: string;
  stage: LeadStage;
  score: number;
  dealValue?: number;
  region?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  interactions: LeadInteraction[];
  demos: LeadDemo[];
  quotes: LeadQuote[];
  contracts: LeadContract[];
  payment?: LeadPayment;
  provisioning?: LeadProvisioning;
  stageAudit?: StageAuditEntry[];
  convertedAt?: string;
  convertedOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyRevenueTrend {
  period: string;
  revenue: number;
  dealsCount: number;
}

export interface SalesReportsDto {
  totalLeads: number;
  wonLeads: number;
  monthlyRevenue: number;
  totalRevenue: number;
  averageDealSize: number;
  avgDealSize: number;
  conversionRate: number;
  stageDistribution: Record<string, number>;
  pipelineBreakdown: Record<string, number>;
  sourceDistribution: Record<string, number>;
  leadSources: Record<string, number>;
  revenueOverTime: MonthlyRevenueTrend[];
  recentWonDeals?: {
    id: string;
    company: string;
    repName: string;
    dealValue: number;
    convertedAt: string;
    region: string;
  }[];
}

export interface SalesRepPerformanceDto {
  repId: string;
  repName: string;
  repEmail: string;
  region: string;
  leadsAssigned: number;
  qualifiedLeads: number;
  wonDeals: number;
  conversionRate: number;
  revenueGenerated: number;
  averageDealSize: number;
  avgResponseTimeHours: number;
  diffFromTeamAvgPercent: number;
}

export interface SalesTeamPerformanceDto {
  teamName: string;
  managerId?: string;
  managerName: string;
  periodDays: number;
  teamTotalLeads: number;
  teamWonDeals: number;
  teamConversionRate: number;
  teamTotalRevenue: number;
  teamAvgDealSize: number;
  teamAvgResponseTimeHours: number;
  members: SalesRepPerformanceDto[];
}

export interface PendingDiscountDto {
  requestId: string;
  leadId: string;
  leadCompany: string;
  leadContact: string;
  assignedTo?: string;
  assignedToName?: string;
  quote: LeadQuote;
  quoteId?: string;
  quoteNumber?: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  proposedFinalPrice: number;
  justification?: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_HIGHER_APPROVAL';
  requiresHigherApproval: boolean;
  managerLimitPercent: number;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
