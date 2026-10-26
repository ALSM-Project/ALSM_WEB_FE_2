export type ConsultationType =
  | 'SALES_SERVICE'
  | 'LEGACY_MODERNIZATION'
  | 'TECHNICAL'
  | 'ENTERPRISE_ARCHITECTURE'
  | 'CUSTOM_REQUIREMENTS'
  | 'CONTRACT_PACKAGE';

export interface ConsultationTypeConfig {
  key: ConsultationType;
  label: string;
  description: string;
  recommendedDurationMinutes: number;
}

export type MeetingRequestStatus =
  | 'NEW_REQUEST'
  | 'PENDING_SCHEDULING'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RESCHEDULE_REQUESTED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type MeetingPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CustomerType = 'PROSPECT' | 'EXISTING_CUSTOMER' | 'PARTNER';
export type MeetingFormat = 'GOOGLE_MEET' | 'TEAMS' | 'ZOOM' | 'PHONE' | 'IN_PERSON';

export interface ProposedSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  proposedBy: string;
  proposedAt: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED';
}

export interface MeetingInternalNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface MeetingCommunicationLog {
  id: string;
  channel: 'EMAIL' | 'PHONE' | 'SYSTEM';
  sender: string;
  recipient: string;
  subject?: string;
  content: string;
  sentAt: string;
}

export interface MeetingHistoryEntry {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface MeetingOutcome {
  summary?: string;
  qualificationScore?: number;
  nextSteps?: string;
  recordedBy?: string;
  recordedAt?: string;
}

export interface MeetingRequest {
  id: string;
  _id?: string;
  requestId: string;
  customer: {
    fullName: string;
    companyName: string;
    email: string;
    phone?: string;
    customerType: CustomerType;
    userId?: string;
    organizationId?: string;
  };
  topic: string;
  consultationType: ConsultationType;
  priority: MeetingPriority;
  status: MeetingRequestStatus;
  statusReason?: string;
  requirements: {
    serviceMode: 'ALSM_MANAGED' | 'CUSTOMER_SELF_SERVICE' | 'HYBRID';
    legacySystemType: string;
    currentTechnology?: string;
    estimatedScreens: number;
    estimatedPrograms: number;
    estimatedProjectScale: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
    businessRequirements?: string;
    technicalRequirements?: string;
    expectedTimeline?: string;
  };
  scheduling: {
    requestedDate?: string;
    requestedTime?: string;
    timezone: string;
    proposedSlots: ProposedSlot[];
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    durationMinutes: number;
    format: MeetingFormat;
    meetingUrl?: string;
    meetingCode?: string;
    calendarEventId?: string;
    calendarIntegrationStatus: 'CONNECTED' | 'UNCONFIGURED' | 'FAILED' | 'MANUAL';
  };
  assignment: {
    assignedSalesId?: string;
    assignedSalesName?: string;
    assignedSalesEmail?: string;
    assignedAt?: string;
  };
  internalNotes: MeetingInternalNote[];
  communicationHistory: MeetingCommunicationLog[];
  meetingHistory: MeetingHistoryEntry[];
  outcome?: MeetingOutcome;
  relatedLeadId?: string;
  relatedOpportunityId?: string;
  relatedQuoteId?: string;
  relatedContractId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMeetingRequestsResponse {
  items: MeetingRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<string, number>;
  calendarIntegration: {
    isEnabled: boolean;
    calendarUserEmail?: string;
  };
}

export interface CreateMeetingRequestPayload {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  customerType?: CustomerType;
  topic: string;
  consultationType?: ConsultationType;
  priority?: MeetingPriority;
  serviceMode?: 'ALSM_MANAGED' | 'CUSTOMER_SELF_SERVICE' | 'HYBRID';
  legacySystemType?: string;
  currentTechnology?: string;
  estimatedScreens?: number;
  estimatedPrograms?: number;
  estimatedProjectScale?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  businessRequirements?: string;
  technicalRequirements?: string;
  expectedTimeline?: string;
  requestedDate?: string;
  requestedTime?: string;
  timezone?: string;
  message?: string;
}
