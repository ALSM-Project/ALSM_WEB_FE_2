import { 
  LeadDto, LeadStage, LeadInteraction, LeadDemo, 
  LeadQuote, LeadContract, SalesReportsDto, PendingDiscountDto,
  SalesTeamPerformanceDto, SalesRepPerformanceDto
} from '../types/crm.types';

const STORAGE_KEY = 'alsm_crm_leads_v3';

export const INITIAL_LEADS: LeadDto[] = [
  {
    id: 'lead-apex-bank',
    company: 'Apex Commercial Bank',
    contactName: 'Jonathan Vance',
    email: 'j.vance@apexbank.com',
    phone: '+1 (555) 234-5678',
    source: 'Partner Referral',
    stage: 'PROPOSAL',
    score: 94,
    dealValue: 120000,
    region: 'North America',
    assignedTo: 'user-sales-1',
    assignedToName: 'Sarah Jenkins',
    lastContactAt: '2026-10-20T14:30:00Z',
    nextFollowUpAt: '2026-10-22T09:00:00Z',
    notes: 'Primary enterprise prospect for mainframe core banking migration (CICS COBOL to Java Spring Boot). Highly engaged.',
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-10-20T14:30:00Z',
    interactions: [
      {
        id: 'int-101',
        type: 'PHONE_CALL',
        durationMinutes: 35,
        outcome: 'Connected with Decision Maker',
        summary: 'Reviewed migration scope and received verbal agreement on Enterprise Tier 1 scope.',
        actionItems: 'Generate contractCTR-2026-APEX-001 and deliver for DocuSign execution.',
        performedBy: 'Sarah Jenkins',
        timestamp: '2026-10-18T10:15:00Z',
      },
      {
        id: 'int-102',
        type: 'DEMO',
        durationMinutes: 60,
        outcome: 'Demo Agreed',
        summary: 'Conducted live conversion simulation of CUSTINQ.bms and TRANSPROC.cbl.',
        details: 'CTO and lead architects attended. High confidence in UI rendering and AST accuracy.',
        performedBy: 'Sarah Jenkins',
        timestamp: '2026-10-12T15:00:00Z',
      },
    ],
    demos: [
      {
        id: 'demo-101',
        topic: 'Executive Modernization Architecture Walkthrough',
        scheduledAt: '2026-10-12T15:00:00Z',
        durationMinutes: 60,
        attendees: ['j.vance@apexbank.com', 'arch-lead@apexbank.com'],
        meetingLink: 'https://meet.alsm.io/room/alsm-apex-demo',
        status: 'COMPLETED',
        agenda: 'Review COBOL parsing and React UI generation.',
        createdBy: 'Sarah Jenkins',
      },
    ],
    quotes: [
      {
        id: 'quote-apex-01',
        quoteNumber: 'Q-2026-APEX-01',
        plan: 'Enterprise Tier 1',
        projectScope: '140 COBOL CICS screens & 45 Batch programs',
        basePrice: 120000,
        discountPercent: 0,
        finalPrice: 120000,
        requiresApproval: false,
        approvalStatus: 'APPROVED',
        status: 'ACCEPTED',
        createdAt: '2026-10-14T09:00:00Z',
        sentAt: '2026-10-14T11:00:00Z',
        approvedAt: '2026-10-14T11:00:00Z',
      },
    ],
    contracts: [
      {
        id: 'ctr-apex-01',
        contractNumber: 'CTR-2026-APEX-001',
        title: 'Enterprise Modernization Master Services Agreement',
        plan: 'Enterprise Tier 1',
        quoteId: 'quote-apex-01',
        annualValue: 120000,
        status: 'FULLY_SIGNED',
        effectiveDate: '2026-11-01',
        docusignEnvelopeId: 'DS-ENV-99482-APEX',
        signedAt: '2026-10-19T16:20:00Z',
        createdAt: '2026-10-18T11:00:00Z',
      },
    ],
    payment: {
      required: true,
      amount: 120000,
      status: 'CONFIRMED',
      confirmedAt: '2026-10-20T14:00:00Z',
      transactionRef: 'WIRE-APEX-20261020-0988',
    },
    provisioning: {
      status: 'NOT_STARTED',
      checklist: {
        contractSigned: true,
        paymentConfirmed: true,
        organizationCreated: false,
        adminProvisioned: false,
        subscriptionActivated: false,
        web3AccessEnabled: false,
        welcomeNotificationSent: false,
      },
    },
    stageAudit: [
      {
        id: 'aud-1',
        timestamp: '2026-09-15T08:00:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'System Inbound',
        notes: 'Inbound referral created',
      },
      {
        id: 'aud-2',
        timestamp: '2026-09-20T11:00:00Z',
        fromStage: 'NEW',
        toStage: 'CONTACTED',
        changedBy: 'Sarah Jenkins',
        notes: 'Initial discovery call conducted',
      },
      {
        id: 'aud-3',
        timestamp: '2026-10-02T10:00:00Z',
        fromStage: 'CONTACTED',
        toStage: 'QUALIFIED',
        changedBy: 'Sarah Jenkins',
        notes: 'Budget and technical feasibility confirmed',
      },
      {
        id: 'aud-4',
        timestamp: '2026-10-14T09:30:00Z',
        fromStage: 'QUALIFIED',
        toStage: 'PROPOSAL',
        changedBy: 'Sarah Jenkins',
        notes: 'Formal proposal and Enterprise Tier 1 pricing issued',
      },
    ],
  },
  {
    id: 'lead-fnx-corp',
    company: 'Fintech Nexus International',
    contactName: 'Evelyn Reed',
    email: 'evelyn.reed@fintechnexus.io',
    phone: '+44 20 7946 0912',
    source: 'Conference',
    stage: 'PROPOSAL',
    score: 87,
    dealValue: 85000,
    region: 'North America',
    assignedTo: 'user-sales-2',
    assignedToName: 'David Nguyen',
    lastContactAt: '2026-10-19T11:00:00Z',
    nextFollowUpAt: '2026-10-23T14:00:00Z',
    notes: 'International payment clearing modernization. Requested a 20% volume discount which is pending Sales Manager approval.',
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-10-19T11:00:00Z',
    interactions: [
      {
        id: 'int-201',
        type: 'PHONE_CALL',
        durationMinutes: 20,
        outcome: 'Follow-up Requested',
        summary: 'Discussed volume discount request for 80 payment processing programs.',
        performedBy: 'David Nguyen',
        timestamp: '2026-10-17T14:00:00Z',
      },
    ],
    demos: [
      {
        id: 'demo-201',
        topic: 'Payment Processing COBOL AST Modernization',
        scheduledAt: '2026-10-10T11:00:00Z',
        durationMinutes: 45,
        attendees: ['evelyn.reed@fintechnexus.io'],
        meetingLink: 'https://meet.alsm.io/room/alsm-fnx-demo',
        status: 'COMPLETED',
        createdBy: 'David Nguyen',
      },
    ],
    quotes: [
      {
        id: 'quote-fnx-01',
        quoteNumber: 'Q-2026-FNX-01',
        plan: 'Enterprise Tier 2',
        projectScope: '80 Payment settlement programs',
        basePrice: 85000,
        discountPercent: 20,
        finalPrice: 68000,
        requiresApproval: true,
        approvalStatus: 'PENDING',
        discountReason: 'Competitive bid against legacy consulting firm. Client commits to 2-year partnership.',
        status: 'SENT',
        createdAt: '2026-10-16T10:00:00Z',
        sentAt: '2026-10-16T11:30:00Z',
      },
    ],
    contracts: [
      {
        id: 'ctr-fnx-01',
        contractNumber: 'CTR-2026-FNX-001',
        title: 'Master Modernization & License Agreement',
        plan: 'Enterprise Tier 2',
        quoteId: 'quote-fnx-01',
        annualValue: 68000,
        status: 'SENT_FOR_SIGNATURE',
        effectiveDate: '2026-11-15',
        docusignEnvelopeId: 'DS-ENV-77123-FNX',
        createdAt: '2026-10-18T10:00:00Z',
      },
    ],
    payment: {
      required: true,
      amount: 68000,
      status: 'PENDING',
    },
    provisioning: {
      status: 'NOT_STARTED',
      checklist: {
        contractSigned: false,
        paymentConfirmed: false,
        organizationCreated: false,
        adminProvisioned: false,
        subscriptionActivated: false,
        web3AccessEnabled: false,
        welcomeNotificationSent: false,
      },
    },
    stageAudit: [
      {
        id: 'aud-201',
        timestamp: '2026-09-22T10:00:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'David Nguyen',
        notes: 'Lead acquired at FinTech World 2026',
      },
      {
        id: 'aud-202',
        timestamp: '2026-10-05T14:00:00Z',
        fromStage: 'NEW',
        toStage: 'QUALIFIED',
        changedBy: 'David Nguyen',
        notes: 'Technical discovery and requirement gathering completed',
      },
      {
        id: 'aud-203',
        timestamp: '2026-10-16T10:30:00Z',
        fromStage: 'QUALIFIED',
        toStage: 'PROPOSAL',
        changedBy: 'David Nguyen',
        notes: 'Proposal sent with discount',
      },
    ],
  },
  {
    id: 'lead-meridian-ins',
    company: 'Meridian Life & Casualty',
    contactName: 'Marcus Sterling',
    email: 'm.sterling@meridianlife.com',
    phone: '+1 (555) 345-6789',
    source: 'Website Inbound',
    stage: 'QUALIFIED',
    score: 76,
    dealValue: 65000,
    region: 'EMEA',
    assignedTo: 'user-sales-1',
    assignedToName: 'Sarah Jenkins',
    lastContactAt: '2026-10-19T16:00:00Z',
    nextFollowUpAt: '2026-10-22T15:00:00Z',
    notes: 'Seeking modernization for legacy policyholder management system. Technical demo scheduled for tomorrow.',
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-19T16:00:00Z',
    interactions: [
      {
        id: 'int-301',
        type: 'PHONE_CALL',
        durationMinutes: 25,
        outcome: 'Demo Agreed',
        summary: 'Discovery call on COBOL BMS mapping for insurance claims screens.',
        actionItems: 'Schedule technical deep dive with enterprise demo room link.',
        performedBy: 'Sarah Jenkins',
        timestamp: '2026-10-19T15:30:00Z',
      },
    ],
    demos: [
      {
        id: 'demo-301',
        topic: 'Claims Processing Modernization Demo',
        scheduledAt: '2026-10-22T15:00:00Z',
        durationMinutes: 45,
        attendees: ['m.sterling@meridianlife.com', 'tech-lead@meridianlife.com'],
        meetingLink: 'https://meet.alsm.io/room/alsm-meridian-demo',
        status: 'SCHEDULED',
        agenda: 'Demonstrate AST mapping and code export for claims screen forms.',
        createdBy: 'Sarah Jenkins',
      },
    ],
    quotes: [],
    contracts: [],
    payment: {
      required: true,
      amount: 65000,
      status: 'PENDING',
    },
    provisioning: {
      status: 'NOT_STARTED',
      checklist: {
        contractSigned: false,
        paymentConfirmed: false,
        organizationCreated: false,
        adminProvisioned: false,
        subscriptionActivated: false,
        web3AccessEnabled: false,
        welcomeNotificationSent: false,
      },
    },
    stageAudit: [
      {
        id: 'aud-301',
        timestamp: '2026-10-01T09:00:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'Inbound Portal',
      },
      {
        id: 'aud-302',
        timestamp: '2026-10-15T11:00:00Z',
        fromStage: 'NEW',
        toStage: 'CONTACTED',
        changedBy: 'Sarah Jenkins',
      },
      {
        id: 'aud-303',
        timestamp: '2026-10-19T16:00:00Z',
        fromStage: 'CONTACTED',
        toStage: 'QUALIFIED',
        changedBy: 'Sarah Jenkins',
        notes: 'Qualified on budget, timeline, and executive sponsorship.',
      },
    ],
  },
  {
    id: 'lead-vanguard-fin',
    company: 'Vanguard Pacific Securities',
    contactName: 'Chloe Bennett',
    email: 'cbennett@vanguardpacific.com',
    phone: '+1 (555) 456-7890',
    source: 'Outbound Sales',
    stage: 'CONTACTED',
    score: 62,
    dealValue: 45000,
    region: 'APAC',
    assignedTo: 'user-sales-3',
    assignedToName: 'Elena Rostova',
    lastContactAt: '2026-10-20T10:00:00Z',
    nextFollowUpAt: '2026-10-24T10:00:00Z',
    notes: 'Initial outreach made. Discussed mainframe modernization timeline for upcoming fiscal year.',
    createdAt: '2026-10-10T11:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    interactions: [
      {
        id: 'int-401',
        type: 'PHONE_CALL',
        durationMinutes: 15,
        outcome: 'Connected with Decision Maker',
        summary: 'Brief overview of ALSM platform capabilities for securities trading legacy code.',
        actionItems: 'Send architecture whitepaper and follow up next week.',
        performedBy: 'Elena Rostova',
        timestamp: '2026-10-20T10:00:00Z',
      },
    ],
    demos: [],
    quotes: [],
    contracts: [],
    payment: {
      required: true,
      amount: 45000,
      status: 'PENDING',
    },
    provisioning: {
      status: 'NOT_STARTED',
      checklist: {
        contractSigned: false,
        paymentConfirmed: false,
        organizationCreated: false,
        adminProvisioned: false,
        subscriptionActivated: false,
        web3AccessEnabled: false,
        welcomeNotificationSent: false,
      },
    },
    stageAudit: [
      {
        id: 'aud-401',
        timestamp: '2026-10-10T11:00:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'Elena Rostova',
      },
      {
        id: 'aud-402',
        timestamp: '2026-10-20T10:00:00Z',
        fromStage: 'NEW',
        toStage: 'CONTACTED',
        changedBy: 'Elena Rostova',
      },
    ],
  },
  {
    id: 'lead-nordic-pay',
    company: 'Nordic Merchant Clearing',
    contactName: 'Henrik Lindqvist',
    email: 'henrik.l@nordicpay.se',
    phone: '+46 8 123 4567',
    source: 'Website Inbound',
    stage: 'NEW',
    score: 55,
    dealValue: 50000,
    region: 'EMEA',
    assignedTo: 'user-sales-2',
    assignedToName: 'David Nguyen',
    lastContactAt: undefined,
    nextFollowUpAt: '2026-10-22T10:00:00Z',
    notes: 'New website inquiry requesting product evaluation for retail banking clearing batch routines.',
    createdAt: '2026-10-21T07:30:00Z',
    updatedAt: '2026-10-21T07:30:00Z',
    interactions: [],
    demos: [],
    quotes: [],
    contracts: [],
    payment: {
      required: true,
      amount: 50000,
      status: 'PENDING',
    },
    provisioning: {
      status: 'NOT_STARTED',
      checklist: {
        contractSigned: false,
        paymentConfirmed: false,
        organizationCreated: false,
        adminProvisioned: false,
        subscriptionActivated: false,
        web3AccessEnabled: false,
        welcomeNotificationSent: false,
      },
    },
    stageAudit: [
      {
        id: 'aud-501',
        timestamp: '2026-10-21T07:30:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'Inbound Portal',
        notes: 'Inbound web lead created',
      },
    ],
  },
  {
    id: 'lead-atlas-capital',
    company: 'Atlas Capital Holdings',
    contactName: 'David Cross',
    email: 'dcross@atlascapital.com',
    phone: '+1 (555) 567-8901',
    source: 'Executive Sponsor',
    stage: 'LOST',
    score: 30,
    dealValue: 70000,
    region: 'North America',
    assignedTo: 'user-sales-3',
    assignedToName: 'Elena Rostova',
    lastContactAt: '2026-10-15T09:00:00Z',
    notes: 'Client decided to postpone modernization initiative until Q3 2027 due to internal budget reallocation.',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
    interactions: [
      {
        id: 'int-601',
        type: 'PHONE_CALL',
        durationMinutes: 15,
        outcome: 'Gatekeeper Refusal',
        summary: 'Received notice that funding was frozen for legacy re-engineering projects.',
        performedBy: 'Elena Rostova',
        timestamp: '2026-10-15T09:00:00Z',
      },
    ],
    demos: [],
    quotes: [],
    contracts: [],
    stageAudit: [
      {
        id: 'aud-601',
        timestamp: '2026-09-01T10:00:00Z',
        fromStage: 'NEW',
        toStage: 'NEW',
        changedBy: 'System',
      },
      {
        id: 'aud-602',
        timestamp: '2026-10-15T09:00:00Z',
        fromStage: 'QUALIFIED',
        toStage: 'LOST',
        changedBy: 'Elena Rostova',
        notes: 'Budget postponed to FY2027',
      },
    ],
  },
  {
    id: 'lead-global-transit',
    company: 'Global Transit Logistics',
    contactName: 'Rachel Green',
    email: 'rgreen@globaltransit.com',
    phone: '+1 (555) 678-9012',
    source: 'Partner Referral',
    stage: 'WON',
    score: 98,
    dealValue: 150000,
    region: 'North America',
    assignedTo: 'user-sales-1',
    assignedToName: 'Sarah Jenkins',
    lastContactAt: '2026-10-18T16:00:00Z',
    notes: 'Closed Won account. Successfully converted from lead to active enterprise customer.',
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-10-18T16:00:00Z',
    convertedAt: '2026-10-18T16:00:00Z',
    convertedOrganizationId: 'org-gtl-prod',
    interactions: [],
    demos: [],
    quotes: [
      {
        id: 'quote-gtl-01',
        quoteNumber: 'Q-2026-GTL-01',
        plan: 'Enterprise Tier 2',
        basePrice: 150000,
        discountPercent: 0,
        finalPrice: 150000,
        requiresApproval: false,
        approvalStatus: 'APPROVED',
        status: 'ACCEPTED',
        createdAt: '2026-10-10T09:00:00Z',
      },
    ],
    contracts: [
      {
        id: 'ctr-gtl-01',
        contractNumber: 'CTR-2026-GTL-001',
        title: 'Enterprise Modernization Master Agreement',
        plan: 'Enterprise Tier 2',
        annualValue: 150000,
        status: 'FULLY_SIGNED',
        effectiveDate: '2026-10-18',
        signedAt: '2026-10-18T15:30:00Z',
        createdAt: '2026-10-12T10:00:00Z',
      },
    ],
    payment: {
      required: true,
      amount: 150000,
      status: 'CONFIRMED',
      confirmedAt: '2026-10-18T15:45:00Z',
      transactionRef: 'WIRE-GTL-20261018-8831',
    },
    provisioning: {
      status: 'COMPLETED',
      organizationId: 'org-gtl-prod',
      organizationName: 'Global Transit Logistics',
      domain: 'globaltransit.com',
      adminEmail: 'rgreen@globaltransit.com',
      engagementType: 'ENTERPRISE_T2',
      web3AccessUrl: 'https://web3.alsm.io/tenant/org-gtl-prod',
      completedAt: '2026-10-18T16:00:00Z',
      checklist: {
        contractSigned: true,
        paymentConfirmed: true,
        organizationCreated: true,
        adminProvisioned: true,
        subscriptionActivated: true,
        web3AccessEnabled: true,
        welcomeNotificationSent: true,
      },
    },
    stageAudit: [
      {
        id: 'aud-701',
        timestamp: '2026-10-18T16:00:00Z',
        fromStage: 'PROPOSAL',
        toStage: 'WON',
        changedBy: 'System Automation',
        notes: 'Automated activation completed upon contract execution and payment confirmation',
      },
    ],
  },
  {
    id: 'lead-titan-cloud',
    company: 'Titan Cloud Infrastructures',
    contactName: 'Kenji Sato',
    email: 'kenji.sato@titancloud.io',
    phone: '+81 3 5555 0192',
    source: 'Outbound Sales',
    stage: 'PROPOSAL',
    score: 82,
    dealValue: 180000,
    region: 'APAC',
    assignedTo: 'user-sales-3',
    assignedToName: 'Elena Rostova',
    lastContactAt: '2026-10-21T04:15:00Z',
    notes: 'Large Tokyo data center migrating batch processing. Requested aggressive 25% discount to close before fiscal quarter.',
    createdAt: '2026-09-20T03:00:00Z',
    updatedAt: '2026-10-21T04:15:00Z',
    interactions: [
      {
        id: 'int-801',
        type: 'PHONE_CALL',
        durationMinutes: 40,
        outcome: 'Price Negotiation',
        summary: 'VP of Procurement requested 25% discount to sign immediately.',
        actionItems: 'Submit quote for executive discount approval.',
        performedBy: 'Elena Rostova',
        timestamp: '2026-10-21T04:15:00Z',
      },
    ],
    demos: [],
    quotes: [
      {
        id: 'quote-titan-01',
        quoteNumber: 'Q-2026-TITAN-001',
        plan: 'Enterprise Tier 2',
        projectScope: '450 COBOL modules, 200 batch scripts, multi-region replication',
        basePrice: 200000,
        discountPercent: 25,
        finalPrice: 150000,
        requiresApproval: true,
        approvalStatus: 'REQUIRES_HIGHER_APPROVAL',
        discountReason: 'Competitive defense against NTT Data. Client promises multi-year migration commitment if 25% discount is authorized.',
        status: 'DRAFT',
        createdAt: '2026-10-21T05:00:00Z',
      },
    ],
    contracts: [],
    payment: { required: true, amount: 150000, status: 'PENDING' },
    provisioning: { status: 'NOT_STARTED', checklist: { contractSigned: false, paymentConfirmed: false, organizationCreated: false, adminProvisioned: false, subscriptionActivated: false, web3AccessEnabled: false, welcomeNotificationSent: false } },
    stageAudit: [
      { id: 'aud-801', timestamp: '2026-10-21T05:00:00Z', fromStage: 'PROPOSAL', toStage: 'PROPOSAL', changedBy: 'Elena Rostova', notes: 'Quote Q-2026-TITAN-001 created with 25% discount; flagged as requiring VP of Sales higher authorization.' }
    ]
  },
];

class CrmStore {
  private leads: LeadDto[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LeadDto[];
        this.leads = parsed.map((lead) => {
          if (!lead.provisioning) return lead;
          const provisioning = { ...lead.provisioning } as LeadDto['provisioning'] & { adminTempPassword?: string };
          if ('adminTempPassword' in provisioning) {
            delete provisioning.adminTempPassword;
            return { ...lead, provisioning };
          }
          return lead;
        });
        if (stored !== JSON.stringify(this.leads)) this.saveToStorage();
      } else {
        this.leads = [...INITIAL_LEADS];
        this.saveToStorage();
      }
    } catch {
      this.leads = [...INITIAL_LEADS];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leads));
    } catch {
      // Ignore quota error in tests
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  resetToDefaults() {
    this.leads = JSON.parse(JSON.stringify(INITIAL_LEADS));
    this.saveToStorage();
  }

  getLeads(params?: { stage?: string; search?: string; assignedTo?: string }): LeadDto[] {
    let result = [...this.leads];

    if (params?.stage && params.stage !== 'ALL') {
      result = result.filter((l) => l.stage === params.stage);
    }

    if (params?.assignedTo) {
      result = result.filter((l) => l.assignedTo === params.assignedTo);
    }

    if (params?.search) {
      const term = params.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(term) ||
          l.contactName.toLowerCase().includes(term) ||
          l.email.toLowerCase().includes(term)
      );
    }

    // Default sort by lead score descending
    result.sort((a, b) => b.score - a.score);
    return result;
  }

  getLeadById(id: string): LeadDto | null {
    const lead = this.leads.find((l) => l.id === id);
    return lead ? JSON.parse(JSON.stringify(lead)) : null;
  }

  getLead(id: string): LeadDto | null {
    return this.getLeadById(id);
  }

  createLead(data: {
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
  }): LeadDto {
    const trimmedEmail = data.email.trim().toLowerCase();
    
    // Simulate unique email validation
    const existing = this.leads.find((l) => l.email.toLowerCase() === trimmedEmail);
    if (existing) {
      throw new Error(`A lead with work email "${data.email}" already exists (${existing.company}).`);
    }

    const newLead: LeadDto = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      company: data.company.trim(),
      contactName: data.contactName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      source: data.source || 'Website Inbound',
      stage: 'NEW',
      score: data.score ?? 50,
      dealValue: data.dealValue ?? 25000,
      assignedTo: data.assignedTo || 'user-sales-1',
      assignedToName: data.assignedToName || 'Sarah Jenkins',
      notes: data.notes?.trim() || undefined,
      interactions: [],
      demos: [],
      quotes: [],
      contracts: [],
      payment: {
        required: true,
        amount: data.dealValue ?? 25000,
        status: 'PENDING',
      },
      provisioning: {
        status: 'NOT_STARTED',
        checklist: {
          contractSigned: false,
          paymentConfirmed: false,
          organizationCreated: false,
          adminProvisioned: false,
          subscriptionActivated: false,
          web3AccessEnabled: false,
          welcomeNotificationSent: false,
        },
      },
      stageAudit: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          fromStage: 'NEW',
          toStage: 'NEW',
          changedBy: 'Current User',
          notes: 'Lead created in CRM',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.leads.unshift(newLead);
    this.saveToStorage();
    return newLead;
  }

  updateLeadStage(
    id: string,
    newStage: LeadStage,
    notes?: string,
    nextFollowUpAt?: string
  ): LeadDto {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead with ID "${id}" not found.`);

    // Strict Business Rule: Won is system-controlled!
    if (newStage === 'WON') {
      throw new Error(
        'Closed Won cannot be selected manually. Complete quote acceptance, contract execution (Fully Signed), and payment confirmation in the Lead-to-Customer Activation Workflow.'
      );
    }

    const prevStage = lead.stage;
    lead.stage = newStage;
    lead.updatedAt = new Date().toISOString();
    if (nextFollowUpAt) lead.nextFollowUpAt = nextFollowUpAt;

    if (!lead.stageAudit) lead.stageAudit = [];
    lead.stageAudit.push({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromStage: prevStage,
      toStage: newStage,
      changedBy: 'Current User',
      notes: notes?.trim() || `Stage changed from ${prevStage} to ${newStage}`,
    });

    this.saveToStorage();
    return JSON.parse(JSON.stringify(lead));
  }

  logInteraction(
    leadId: string,
    data: {
      type: LeadInteraction['type'];
      durationMinutes?: number;
      outcome?: string;
      summary: string;
      actionItems?: string;
      details?: string;
    }
  ): LeadInteraction {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const newInteraction: LeadInteraction = {
      id: `int-${Date.now()}`,
      type: data.type,
      durationMinutes: data.durationMinutes,
      outcome: data.outcome,
      summary: data.summary.trim(),
      actionItems: data.actionItems?.trim() || undefined,
      details: data.details?.trim() || undefined,
      performedBy: 'Current User',
      timestamp: new Date().toISOString(),
    };

    lead.interactions.unshift(newInteraction);
    lead.lastContactAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();

    // If still in NEW stage, auto-transition to CONTACTED
    if (lead.stage === 'NEW') {
      lead.stage = 'CONTACTED';
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: 'NEW',
        toStage: 'CONTACTED',
        changedBy: 'System Automation',
        notes: `Stage updated to CONTACTED upon logging ${data.type}`,
      });
    }

    this.saveToStorage();
    return newInteraction;
  }

  scheduleDemo(
    leadId: string,
    data: {
      topic: string;
      scheduledAt: string;
      durationMinutes?: number;
      attendees?: string[];
      agenda?: string;
      notes?: string;
    }
  ): LeadDemo {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const roomSlug = Math.random().toString(36).substr(2, 7);
    const newDemo: LeadDemo = {
      id: `demo-${Date.now()}`,
      topic: data.topic.trim(),
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes || 45,
      attendees: data.attendees && data.attendees.length > 0 ? data.attendees : [lead.email],
      meetingLink: `https://meet.alsm.io/room/alsm-demo-${roomSlug}`,
      status: 'SCHEDULED',
      agenda: data.agenda?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdBy: 'Current User',
    };

    lead.demos.unshift(newDemo);
    lead.lastContactAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();

    // Auto-advance to QUALIFIED if in CONTACTED
    if (lead.stage === 'CONTACTED') {
      lead.stage = 'QUALIFIED';
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: 'CONTACTED',
        toStage: 'QUALIFIED',
        changedBy: 'System Automation',
        notes: `Stage updated to QUALIFIED upon scheduling demo "${data.topic}"`,
      });
    }

    this.saveToStorage();
    return newDemo;
  }

  createQuote(
    leadId: string,
    data: {
      plan: string;
      projectScope?: string;
      basePrice: number;
      discountPercent?: number;
      discountReason?: string;
    }
  ): LeadQuote {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const discountPercent = data.discountPercent || 0;
    const finalPrice = Math.round(data.basePrice * (1 - discountPercent / 100));
    const requiresApproval = discountPercent > 15;

    const quoteCount = lead.quotes.length + 1;
    const quoteNumber = `Q-${new Date().getFullYear()}-${lead.company.substring(0, 4).toUpperCase()}-0${quoteCount}`;

    const newQuote: LeadQuote = {
      id: `quote-${Date.now()}`,
      quoteNumber,
      plan: data.plan,
      projectScope: data.projectScope || 'Enterprise AST Code Modernization Scope',
      basePrice: data.basePrice,
      discountPercent,
      finalPrice,
      requiresApproval,
      approvalStatus: requiresApproval ? 'PENDING' : 'APPROVED',
      discountReason: data.discountReason?.trim() || undefined,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      approvedAt: requiresApproval ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    lead.quotes.unshift(newQuote);
    lead.dealValue = finalPrice;
    lead.updatedAt = new Date().toISOString();

    // Transition to PROPOSAL if currently in QUALIFIED
    if (lead.stage === 'QUALIFIED') {
      lead.stage = 'PROPOSAL';
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: 'QUALIFIED',
        toStage: 'PROPOSAL',
        changedBy: 'System Automation',
        notes: `Stage transitioned to PROPOSAL upon issuing quote ${quoteNumber}`,
      });
    }

    this.saveToStorage();
    return newQuote;
  }

  acceptQuote(leadId: string, quoteId: string): LeadQuote {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const quote = lead.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error(`Quote "${quoteId}" not found.`);

    quote.status = 'ACCEPTED';
    lead.updatedAt = new Date().toISOString();

    this.saveToStorage();
    return quote;
  }

  createContract(
    leadId: string,
    data: {
      title: string;
      plan: string;
      quoteId?: string;
      annualValue: number;
      effectiveDate?: string;
    }
  ): LeadContract {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const contractCount = lead.contracts.length + 1;
    const contractNumber = `CTR-${new Date().getFullYear()}-${lead.company.substring(0, 4).toUpperCase()}-00${contractCount}`;

    const newContract: LeadContract = {
      id: `ctr-${Date.now()}`,
      contractNumber,
      title: data.title.trim(),
      plan: data.plan,
      quoteId: data.quoteId,
      annualValue: data.annualValue,
      status: 'DRAFT',
      effectiveDate: data.effectiveDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    lead.contracts.unshift(newContract);
    lead.updatedAt = new Date().toISOString();

    this.saveToStorage();
    return newContract;
  }

  sendContractForSignature(leadId: string, contractId: string): LeadContract {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const contract = lead.contracts.find((c) => c.id === contractId);
    if (!contract) throw new Error(`Contract "${contractId}" not found.`);

    contract.status = 'SENT_FOR_SIGNATURE';
    contract.docusignEnvelopeId = `DS-ENV-${Math.floor(10000 + Math.random() * 90000)}-${lead.company.substring(0, 4).toUpperCase()}`;
    lead.updatedAt = new Date().toISOString();

    this.saveToStorage();
    return contract;
  }

  simulateSignContract(leadId: string, contractId: string): LeadContract {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    const contract = lead.contracts.find((c) => c.id === contractId);
    if (!contract) throw new Error(`Contract "${contractId}" not found.`);

    contract.status = 'FULLY_SIGNED';
    contract.signedAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();

    if (lead.provisioning?.checklist) {
      lead.provisioning.checklist.contractSigned = true;
    }

    this.saveToStorage();
    return contract;
  }

  confirmPayment(leadId: string, transactionRef?: string): LeadDto {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    if (!lead.payment) {
      lead.payment = {
        required: true,
        amount: lead.dealValue || 50000,
        status: 'CONFIRMED',
      };
    }

    lead.payment.status = 'CONFIRMED';
    lead.payment.confirmedAt = new Date().toISOString();
    lead.payment.transactionRef = transactionRef || `SETTLE-${Date.now()}`;

    if (lead.provisioning?.checklist) {
      lead.provisioning.checklist.paymentConfirmed = true;
    }

    lead.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return JSON.parse(JSON.stringify(lead));
  }

  setPaymentPolicy(leadId: string, required: boolean): LeadDto {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    if (!lead.payment) {
      lead.payment = {
        required,
        amount: lead.dealValue || 50000,
        status: required ? 'PENDING' : 'WAIVED',
      };
    } else {
      lead.payment.required = required;
      if (!required) {
        lead.payment.status = 'WAIVED';
      }
    }

    lead.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return JSON.parse(JSON.stringify(lead));
  }

  activateCustomer(
    leadId: string,
    options?: {
      paymentRequired?: boolean;
      simulateFailure?: boolean;
    }
  ): {
    lead: LeadDto;
    organizationId: string;
    adminEmail: string;
    web3Url: string;
  } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead with ID "${leadId}" not found.`);

    // Check 1: Contract must be fully signed
    const hasSignedContract = lead.contracts.some((c) => c.status === 'FULLY_SIGNED');
    if (!hasSignedContract) {
      throw new Error(
        'Customer activation requires a fully executed and signed contract. Please send and execute the contract first.'
      );
    }

    // Check 2: Payment confirmation (if required by commercial policy)
    const paymentRequired = options?.paymentRequired ?? lead.payment?.required ?? true;
    if (paymentRequired && lead.payment?.status !== 'CONFIRMED' && lead.payment?.status !== 'WAIVED') {
      throw new Error(
        'Commercial policy requires confirmed payment prior to customer provisioning and Web 3 activation.'
      );
    }

    // Handle simulated failure test case
    if (options?.simulateFailure) {
      if (!lead.provisioning) {
        lead.provisioning = {
          status: 'FAILED',
          failureReason: 'Identity service connection timeout during organization administrator provisioning.',
          checklist: {
            contractSigned: true,
            paymentConfirmed: !paymentRequired || lead.payment?.status === 'CONFIRMED',
            organizationCreated: true,
            adminProvisioned: false,
            subscriptionActivated: false,
            web3AccessEnabled: false,
            welcomeNotificationSent: false,
          },
        };
      } else {
        lead.provisioning.status = 'FAILED';
        lead.provisioning.failureReason =
          'Identity service connection timeout during organization administrator provisioning.';
      }
      lead.updatedAt = new Date().toISOString();
      this.saveToStorage();
      throw new Error(lead.provisioning.failureReason);
    }

    // SUCCESSFUL ACTIVATION:
    const orgSlug = lead.company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 18);
    const orgId = `org-${orgSlug}-prod`;
    const web3Url = `https://web3.alsm.io/tenant/${orgId}`;

    lead.provisioning = {
      status: 'COMPLETED',
      organizationId: orgId,
      organizationName: lead.company,
      domain: lead.email.split('@')[1] || `${orgSlug}.com`,
      adminEmail: lead.email,
      engagementType: lead.contracts[0]?.plan || 'Enterprise Tier 1',
      web3AccessUrl: web3Url,
      completedAt: new Date().toISOString(),
      checklist: {
        contractSigned: true,
        paymentConfirmed: true,
        organizationCreated: true,
        adminProvisioned: true,
        subscriptionActivated: true,
        web3AccessEnabled: true,
        welcomeNotificationSent: true,
      },
    };

    const prevStage = lead.stage;
    lead.stage = 'WON';
    lead.convertedAt = new Date().toISOString();
    lead.convertedOrganizationId = orgId;
    lead.updatedAt = new Date().toISOString();

    if (!lead.stageAudit) lead.stageAudit = [];
    lead.stageAudit.push({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromStage: prevStage,
      toStage: 'WON',
      changedBy: 'System Automation',
      notes: `Lead successfully activated as Customer (${orgId}). Web 3 access provisioned.`,
    });

    this.saveToStorage();
    return {
      lead: JSON.parse(JSON.stringify(lead)),
      organizationId: orgId,
      adminEmail: lead.email,
      web3Url,
    };
  }

  getPendingDiscounts(): PendingDiscountDto[] {
    const list: PendingDiscountDto[] = [];
    this.leads.forEach((l) => {
      l.quotes.forEach((q) => {
        if (q.requiresApproval) {
          const discountAmt = Math.round(q.basePrice * (q.discountPercent / 100));
          list.push({
            requestId: `REQ-DISC-${q.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '101'}`,
            leadId: l.id,
            leadCompany: l.company,
            leadContact: l.contactName,
            assignedTo: l.assignedTo,
            assignedToName: l.assignedToName || 'Sarah Jenkins',
            quote: q,
            quoteId: q.id,
            quoteNumber: q.quoteNumber,
            originalPrice: q.basePrice,
            discountPercent: q.discountPercent,
            discountAmount: discountAmt,
            proposedFinalPrice: q.finalPrice,
            justification: q.discountReason || 'Standard competitive market pricing alignment.',
            submittedAt: q.createdAt,
            status: q.approvalStatus,
            requiresHigherApproval: q.discountPercent > 20,
            managerLimitPercent: 20,
            rejectionReason: q.rejectionReason,
            reviewedBy: q.approvedBy,
            reviewedAt: q.approvedAt,
          });
        }
      });
    });
    return list;
  }

  reviewDiscount(
    leadIdOrData: string | { leadId: string; quoteId: string; approved: boolean; rejectionReason?: string; escalateToVP?: boolean; reviewer?: string },
    quoteIdArg?: string,
    approvedArg?: boolean,
    rejectionReasonArg?: string,
    escalateToVPArg?: boolean,
    reviewerArg?: string
  ): { quote: LeadQuote; status: string } {
    let leadId: string;
    let quoteId: string;
    let approved: boolean;
    let rejectionReason: string | undefined;
    let escalateToVP: boolean | undefined;
    let reviewer: string = 'Alex Mercer';

    if (typeof leadIdOrData === 'object' && leadIdOrData !== null) {
      leadId = leadIdOrData.leadId;
      quoteId = leadIdOrData.quoteId;
      approved = leadIdOrData.approved;
      rejectionReason = leadIdOrData.rejectionReason;
      escalateToVP = leadIdOrData.escalateToVP;
      reviewer = leadIdOrData.reviewer || 'Alex Mercer';
    } else {
      leadId = leadIdOrData;
      quoteId = quoteIdArg!;
      approved = approvedArg!;
      rejectionReason = rejectionReasonArg;
      escalateToVP = escalateToVPArg;
      reviewer = reviewerArg || 'Alex Mercer';
    }

    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead "${leadId}" not found.`);

    const quote = lead.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error(`Quote "${quoteId}" not found.`);

    if (escalateToVP) {
      quote.approvalStatus = 'REQUIRES_HIGHER_APPROVAL';
      lead.updatedAt = new Date().toISOString();
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: lead.stage,
        toStage: lead.stage,
        changedBy: reviewer,
        notes: `Quote ${quote.quoteNumber} discount of ${quote.discountPercent}% escalated to VP of Commercial Sales for executive authorization (exceeds 20% manager limit).`,
      });
      this.saveToStorage();
      return { quote, status: 'ESCALATED' };
    }

    if (approved) {
      if (quote.discountPercent > 20 && reviewer !== 'VP_OF_SALES') {
        throw new Error(`Discount of ${quote.discountPercent}% exceeds Manager approval authority limit (20%). Please escalate to VP of Sales.`);
      }
      quote.approvalStatus = 'APPROVED';
      quote.discountApproved = true;
      quote.approvedAt = new Date().toISOString();
      quote.approvedBy = reviewer;
      quote.rejectionReason = undefined;

      lead.updatedAt = new Date().toISOString();
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: lead.stage,
        toStage: lead.stage,
        changedBy: reviewer,
        notes: `Commercial discount of ${quote.discountPercent}% approved by ${reviewer} for ${quote.quoteNumber}. Quote is now eligible for customer delivery.`,
      });
      this.saveToStorage();
      return { quote, status: 'APPROVED' };
    } else {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('Rejection reason is required when declining a discount request.');
      }
      quote.approvalStatus = 'REJECTED';
      quote.status = 'REJECTED';
      quote.discountApproved = false;
      quote.approvedAt = new Date().toISOString();
      quote.approvedBy = reviewer;
      quote.rejectionReason = rejectionReason.trim();

      lead.updatedAt = new Date().toISOString();
      if (!lead.stageAudit) lead.stageAudit = [];
      lead.stageAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStage: lead.stage,
        toStage: lead.stage,
        changedBy: reviewer,
        notes: `Commercial discount of ${quote.discountPercent}% rejected for ${quote.quoteNumber} by ${reviewer}. Reason: ${rejectionReason.trim()}`,
      });
      this.saveToStorage();
      return { quote, status: 'REJECTED' };
    }
  }

  getReports(filters?: { dateRange?: string; teamMember?: string; region?: string }): SalesReportsDto {
    let filtered = [...this.leads];

    if (filters?.teamMember && filters.teamMember !== 'ALL') {
      filtered = filtered.filter((l) => l.assignedToName === filters.teamMember);
    }
    if (filters?.region && filters.region !== 'ALL') {
      filtered = filtered.filter((l) => l.region === filters.region);
    }
    if (filters?.dateRange && filters.dateRange !== 'ALL') {
      const now = new Date('2026-10-21T23:00:00Z').getTime();
      const days = filters.dateRange === '30D' ? 30 : filters.dateRange === '90D' ? 90 : 365;
      const cutoff = now - days * 86400000;
      filtered = filtered.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
    }

    const totalLeads = filtered.length;
    const wonLeadsList = filtered.filter((l) => l.stage === 'WON');
    const wonLeads = wonLeadsList.length;

    // Realised revenue strictly only from WON deals (contracts signed & activated)
    const totalRevenue = wonLeadsList.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    const monthlyRevenue = totalRevenue;

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const averageDealSize = wonLeads > 0 ? Math.round(totalRevenue / wonLeads) : 0;

    const stageDistribution: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL: 0,
      WON: 0,
      LOST: 0,
    };
    const sourceDistribution: Record<string, number> = {};

    filtered.forEach((l) => {
      stageDistribution[l.stage] = (stageDistribution[l.stage] || 0) + 1;
      const src = l.source || 'Website Inbound';
      sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
    });

    const revenueOverTime = [
      { period: 'May 2026', revenue: 45000, dealsCount: 1 },
      { period: 'Jun 2026', revenue: 70000, dealsCount: 1 },
      { period: 'Jul 2026', revenue: 95000, dealsCount: 1 },
      { period: 'Aug 2026', revenue: 110000, dealsCount: 1 },
      { period: 'Sep 2026', revenue: 135000, dealsCount: 1 },
      { period: 'Oct 2026', revenue: totalRevenue, dealsCount: wonLeads },
    ];

    const recentWonDeals = wonLeadsList.map((l) => ({
      id: l.id,
      company: l.company,
      repName: l.assignedToName || 'Unassigned',
      dealValue: l.dealValue || 0,
      convertedAt: l.convertedAt || l.updatedAt,
      region: l.region || 'North America',
    }));

    return {
      totalLeads,
      wonLeads,
      monthlyRevenue,
      totalRevenue,
      averageDealSize,
      avgDealSize: averageDealSize,
      conversionRate,
      stageDistribution,
      pipelineBreakdown: stageDistribution,
      sourceDistribution,
      leadSources: sourceDistribution,
      revenueOverTime,
      recentWonDeals,
    };
  }

  getTeamPerformance(filters?: {
    dateRange?: string;
    teamMember?: string;
    region?: string;
    userRole?: string;
    userEmail?: string;
  }): SalesTeamPerformanceDto {
    const reps = [
      { id: 'user-sales-1', name: 'Sarah Jenkins', email: 'sarah.jenkins@alsm.io', region: 'North America', avgResponse: 1.8 },
      { id: 'user-sales-2', name: 'David Nguyen', email: 'david.nguyen@alsm.io', region: 'EMEA', avgResponse: 2.4 },
      { id: 'user-sales-3', name: 'Elena Rostova', email: 'elena.rostova@alsm.io', region: 'APAC', avgResponse: 2.1 },
    ];

    let filteredReps = reps;
    if (filters?.teamMember && filters.teamMember !== 'ALL') {
      filteredReps = reps.filter((r) => r.name === filters.teamMember);
    }
    if (filters?.region && filters.region !== 'ALL') {
      filteredReps = reps.filter((r) => r.region === filters.region);
    }

    const members: SalesRepPerformanceDto[] = filteredReps.map((rep) => {
      let repLeads = this.leads.filter((l) => l.assignedToName === rep.name);
      if (filters?.region && filters.region !== 'ALL') {
        repLeads = repLeads.filter((l) => l.region === filters.region);
      }
      if (filters?.dateRange && filters.dateRange !== 'ALL') {
        const now = new Date('2026-10-21T23:00:00Z').getTime();
        const days = filters.dateRange === '30D' ? 30 : filters.dateRange === '90D' ? 90 : 365;
        const cutoff = now - days * 86400000;
        repLeads = repLeads.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
      }

      const leadsAssigned = repLeads.length;
      const qualifiedLeads = repLeads.filter((l) => ['QUALIFIED', 'PROPOSAL', 'WON'].includes(l.stage)).length;
      const wonDeals = repLeads.filter((l) => l.stage === 'WON').length;
      const revenueGenerated = repLeads
        .filter((l) => l.stage === 'WON')
        .reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const conversionRate = leadsAssigned > 0 ? Math.round((wonDeals / leadsAssigned) * 100) : 0;
      const averageDealSize = wonDeals > 0 ? Math.round(revenueGenerated / wonDeals) : 0;

      return {
        repId: rep.id,
        repName: rep.name,
        repEmail: rep.email,
        region: rep.region,
        leadsAssigned,
        qualifiedLeads,
        wonDeals,
        conversionRate,
        revenueGenerated,
        averageDealSize,
        avgResponseTimeHours: rep.avgResponse,
        diffFromTeamAvgPercent: 0,
      };
    });

    const teamTotalLeads = members.reduce((sum, m) => sum + m.leadsAssigned, 0);
    const teamWonDeals = members.reduce((sum, m) => sum + m.wonDeals, 0);
    const teamTotalRevenue = members.reduce((sum, m) => sum + m.revenueGenerated, 0);
    const teamConversionRate = teamTotalLeads > 0 ? Math.round((teamWonDeals / teamTotalLeads) * 100) : 0;
    const teamAvgDealSize = teamWonDeals > 0 ? Math.round(teamTotalRevenue / teamWonDeals) : 0;
    const teamAvgResponseTimeHours = members.length > 0
      ? Number((members.reduce((sum, m) => sum + m.avgResponseTimeHours, 0) / members.length).toFixed(1))
      : 2.0;

    members.forEach((m) => {
      m.diffFromTeamAvgPercent = m.conversionRate - teamConversionRate;
    });

    return {
      teamName: 'Enterprise Modernization Commercial Team',
      managerId: 'usr-mgr-1',
      managerName: 'Alex Mercer (Sales Manager)',
      periodDays: filters?.dateRange === '30D' ? 30 : filters?.dateRange === '90D' ? 90 : 365,
      teamTotalLeads,
      teamWonDeals,
      teamConversionRate,
      teamTotalRevenue,
      teamAvgDealSize,
      teamAvgResponseTimeHours,
      members,
    };
  }

  exportReportsCsv(filters?: { dateRange?: string; teamMember?: string; region?: string }): string {
    const reports = this.getReports(filters);
    const leads = this.leads.filter((l) => {
      if (filters?.teamMember && filters.teamMember !== 'ALL' && l.assignedToName !== filters.teamMember) return false;
      if (filters?.region && filters.region !== 'ALL' && l.region !== filters.region) return false;
      return true;
    });

    const summaryRows = [
      ['ALSM ENTERPRISE SALES & REVENUE REPORT'],
      ['Generated At', new Date().toISOString()],
      ['Filtered By Date Range', filters?.dateRange || 'ALL'],
      ['Filtered By Representative', filters?.teamMember || 'ALL'],
      ['Filtered By Region', filters?.region || 'ALL'],
      [''],
      ['KEY METRIC', 'VALUE'],
      ['Monthly Realised Revenue (VND)', reports.monthlyRevenue],
      ['Total Leads in Scope', reports.totalLeads],
      ['Won Deals (Activated Customers)', reports.wonLeads],
      ['Lead-to-Customer Conversion Rate', `${reports.conversionRate}%`],
      ['Average Deal Size (VND)', reports.averageDealSize],
      [''],
      ['LEAD DOSSIER BREAKDOWN'],
      ['ID', 'Company', 'Contact', 'Email', 'Region', 'Stage', 'Deal Value ($)', 'Assigned Rep', 'Last Contact'],
      ...leads.map((l) => [
        l.id,
        `"${l.company}"`,
        `"${l.contactName}"`,
        l.email,
        `"${l.region || 'North America'}"`,
        l.stage,
        l.dealValue || 0,
        `"${l.assignedToName || 'Unassigned'}"`,
        l.lastContactAt || '',
      ]),
    ];
    return summaryRows.map((r) => r.join(',')).join('\n');
  }
}

export const crmStore = new CrmStore();
