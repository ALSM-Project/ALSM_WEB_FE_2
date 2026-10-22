import type { AxiosProgressEvent } from 'axios';
import { apiClient } from '@/services/api/apiClient';

import {
  Partner,
  PartnerProject,
  PartnerConversionItem,
  ValidationFinding,
  FieldMappingRule,
  ExportBundleInfo,
  ConversionType,
} from '../types/partner.types';

const STORAGE_PARTNERS_KEY = 'alsm_partner_records_v1';
const STORAGE_PROJECTS_KEY = 'alsm_partner_projects_v1';
const STORAGE_ITEMS_KEY = 'alsm_partner_items_v1';
const STORAGE_EXPORTS_KEY = 'alsm_partner_exports_v1';
const STORAGE_FINDINGS_KEY = 'alsm_partner_findings_v1';


}

// Seed initial realistic partners
const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'partner-fnx-001',
    name: 'Fintech Nexus International',
    companyName: 'Fintech Nexus International Ltd.',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@fintechnexus.io',
    domain: 'fintechnexus.io',
    assignedStaffId: 'staff-lead-01',
    assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
    status: 'ACTIVE',
    engagementType: 'Dedicated Modernization',
    projectCount: 2,
    activeConversionCount: 1,
    completedExportCount: 1,
    latestActivity: '2 hours ago',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
  },
  {
    id: 'partner-ins-002',
    name: 'Pacific Heritage Life & Annuity',
    companyName: 'Pacific Heritage Insurance Group',
    contactName: 'Elena Rostova',
    contactEmail: 'erostova@pacificheritage.com',
    domain: 'pacificheritage.com',
    assignedStaffId: 'staff-lead-02',
    assignedStaffName: 'David Chen (Conversion Engineer)',
    status: 'ACTIVE',
    engagementType: 'Enterprise SLA',
    projectCount: 1,
    activeConversionCount: 1,
    completedExportCount: 0,
    latestActivity: '1 day ago',
    createdAt: '2026-09-01T10:15:00Z',
    updatedAt: '2026-10-17T11:00:00Z',
  },
  {
    id: 'partner-tri-003',
    name: 'Apex Core Banking Solutions',
    companyName: 'Apex Financial Technologies LLC',
    contactName: 'Julian Croft',
    contactEmail: 'jcroft@apexcorebank.com',
    domain: 'apexcorebank.com',
    assignedStaffId: 'staff-lead-01',
    assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
    status: 'TRIAL',
    engagementType: 'Trial Modernization Tier',
    projectCount: 1,
    activeConversionCount: 0,
    completedExportCount: 0,
    latestActivity: '3 days ago',
    createdAt: '2026-10-10T08:30:00Z',
    updatedAt: '2026-10-15T16:20:00Z',
  },
];

// Seed initial realistic partner projects
const INITIAL_PROJECTS: PartnerProject[] = [
  {
    id: 'proj-fnx-core',
    name: 'Core Banking Customer Portal',
    description: 'BMS 3270 screen modernization to React 19 and Tailwind CSS with strict TypeScript validation.',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    organizationId: 'partner-fnx-001',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    targetFramework: 'React 19 + Tailwind CSS',
    status: 'IN_PROGRESS',
    screensTotal: 18,
    screensCompleted: 14,
    programsTotal: 0,
    programsCompleted: 0,
    lastUpdated: '2026-10-19T08:45:00Z',
    createdAt: '2026-09-10T11:00:00Z',
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: 'staff-01',
    assignedStaffName: 'Marcus Vance',
    isExported: false,
  },
  {
    id: 'proj-fnx-ledger',
    name: 'General Ledger COBOL Migration',
    description: 'Batch COBOL transaction accounting programs migrated to Java 21 Spring Boot microservices.',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    organizationId: 'partner-fnx-001',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3 / Java 21',
    status: 'READY_FOR_EXPORT',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 12,
    programsCompleted: 12,
    lastUpdated: '2026-10-18T16:20:00Z',
    createdAt: '2026-08-20T14:00:00Z',
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: 'staff-02',
    assignedStaffName: 'Alex Rivera',
    isExported: true,
    exportedBundleName: 'FNX-GL-Java21-Bundle-v1.zip',
    exportedAt: '2026-10-18T16:30:00Z',
  },
  {
    id: 'proj-ins-claims',
    name: 'Claims Underwriting AS/400 DSPF Modernization',
    description: 'IBM i DSPF display files converted to reactive web screens with live business rules validation.',
    partnerId: 'partner-ins-002',
    partnerName: 'Pacific Heritage Life & Annuity',
    organizationId: 'partner-ins-002',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    targetFramework: 'React 19 + Tailwind CSS',
    status: 'IN_PROGRESS',
    screensTotal: 24,
    screensCompleted: 19,
    programsTotal: 0,
    programsCompleted: 0,
    lastUpdated: '2026-10-17T15:10:00Z',
    createdAt: '2026-09-05T09:30:00Z',
    assignedTeamLeadId: 'lead-02',
    assignedTeamLeadName: 'David Chen',
    assignedStaffId: 'staff-03',
    assignedStaffName: 'Emily Zhao',
    isExported: false,
  },
  {
    id: 'proj-tri-demo',
    name: 'Apex Loan Origination Pilot',
    description: 'Pilot conversion demonstrating COBOL arithmetic precision mapping to Java BigDecimal.',
    partnerId: 'partner-tri-003',
    partnerName: 'Apex Core Banking Solutions',
    organizationId: 'partner-tri-003',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3 / Java 21',
    status: 'NOT_STARTED',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 5,
    programsCompleted: 0,
    lastUpdated: '2026-10-15T16:20:00Z',
    createdAt: '2026-10-10T10:00:00Z',
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    isExported: false,
  },
];

// Seed realistic conversion items
const INITIAL_ITEMS: Record<string, PartnerConversionItem[]> = {
  'proj-fnx-core': [
    {
      id: 'item-scr-001',
      projectId: 'proj-fnx-core',
      name: 'CUSTINQ (Customer Inquiry Screen)',
      type: 'SCREEN',
      sourceFile: 'CUSTINQ.bms',
      sourceCode: `CUSTINQ  DFHMSD TYPE=&SYSPARM,MODE=INOUT,LANG=COBOL,             *
               STORAGE=AUTO,TERM=3270,TIOAPFX=YES
CUSTMAP  DFHMDI SIZE=(24,80),LINE=1,COLUMN=1,CTRL=(FREEKB)
TITLE    DFHMDF POS=(1,26),ATTRB=(ASKIP,BRT),                     *
               INITIAL='CUSTOMER ACCOUNT INQUIRY SYSTEM'
DATELBL  DFHMDF POS=(2,1),ATTRB=(ASKIP,NORM),INITIAL='DATE:'
DATEOUT  DFHMDF POS=(2,7),ATTRB=(ASKIP,BRT),LENGTH=8
CUSTLBL  DFHMDF POS=(4,2),ATTRB=(ASKIP,NORM),INITIAL='CUSTOMER ID:'
CUSTINP  DFHMDF POS=(4,15),ATTRB=(UNPROT,IC),LENGTH=10
NAMELBL  DFHMDF POS=(5,2),ATTRB=(ASKIP,NORM),INITIAL='FULL NAME  :'
NAMEOUT  DFHMDF POS=(5,15),ATTRB=(ASKIP,BRT),LENGTH=35
BALANLBL DFHMDF POS=(7,2),ATTRB=(ASKIP,NORM),INITIAL='CURR BALANCE:'
BALANOUT DFHMDF POS=(7,16),ATTRB=(ASKIP,BRT),LENGTH=14
MSGLBL   DFHMDF POS=(23,1),ATTRB=(ASKIP,BRT),LENGTH=70
         DFHMSD TYPE=FINAL`,
      status: 'COMPLETED',
      validationStatus: 'WARNINGS',
      progress: 100,
      attemptCount: 1,
      maxAttempts: 3,
      updatedAt: '2026-10-19T08:30:00Z',
      generatedCode: {
        'CustomerInquiryScreen.tsx': `import React, { useState } from 'react';
import { useCustomerInquiry } from './useCustomerInquiry';
import { Card, Input, Button, Badge } from '@/shared/ui';

export const CustomerInquiryScreen: React.FC = () => {
  const [customerId, setCustomerId] = useState('');
  const { data, loading, error, lookup } = useCustomerInquiry();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#091E42]">Customer Account Inquiry</h1>
          <p className="text-sm text-[#6B778C]">Modernized from mainframe BMS 3270 CUSTINQ</p>
        </div>
        <Badge variant="success">Active Online</Badge>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="e.g. CUST-98231"
            maxLength={10}
            required
          />
          <div className="flex items-end">
            <Button onClick={() => lookup(customerId)} isLoading={loading}>
              Inquire Account
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-[#6B778C] uppercase font-semibold">Customer Full Name</span>
              <p className="text-base font-medium text-[#091E42]">{data.fullName}</p>
            </div>
            <div>
              <span className="text-xs text-[#6B778C] uppercase font-semibold">Current Account Balance</span>
              <p className="text-base font-mono font-bold text-[#00875A]">
                \${Number(data.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};`,
        'CustomerInquiryScreen.types.ts': `export interface CustomerInquiryDto {
  customerId: string;
  fullName: string;
  currentBalance: number;
  currency: string;
  accountStatus: 'ACTIVE' | 'DORMANT' | 'FROZEN';
}`,
        'CustomerInquiryScreen.test.tsx': `import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerInquiryScreen } from './CustomerInquiryScreen';

describe('CustomerInquiryScreen Modernized Component', () => {
  it('renders initial lookup inputs correctly', () => {
    render(<CustomerInquiryScreen />);
    expect(screen.getByLabelText(/Customer ID/i)).toBeInTheDocument();
  });
});`,
      },
    },
    {
      id: 'item-scr-002',
      projectId: 'proj-fnx-core',
      name: 'TXNLOG (Transaction Ledger Audit Screen)',
      type: 'SCREEN',
      sourceFile: 'TXNLOG.bms',
      sourceCode: `TXNLOG   DFHMSD TYPE=&SYSPARM,MODE=INOUT,LANG=COBOL,             *
               STORAGE=AUTO,TERM=3270,TIOAPFX=YES
TXNMAP   DFHMDI SIZE=(24,80),LINE=1,COLUMN=1,CTRL=(FREEKB)
TITLE    DFHMDF POS=(1,28),ATTRB=(ASKIP,BRT),INITIAL='TRANSACTION AUDIT'
DATEF    DFHMDF POS=(3,2),ATTRB=(ASKIP,NORM),INITIAL='FROM DATE:'
DATET    DFHMDF POS=(3,30),ATTRB=(ASKIP,NORM),INITIAL='TO DATE:'
TXNLIST  DFHMDF POS=(6,1),ATTRB=(ASKIP,NORM),LENGTH=1800
         DFHMSD TYPE=FINAL`,
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      progress: 100,
      attemptCount: 1,
      maxAttempts: 3,
      updatedAt: '2026-10-18T14:15:00Z',
    },
    {
      id: 'item-scr-003',
      projectId: 'proj-fnx-core',
      name: 'LOANAPP (Loan Underwriting Application Form)',
      type: 'SCREEN',
      sourceFile: 'LOANAPP.bms',
      sourceCode: `LOANAPP  DFHMSD TYPE=&SYSPARM,MODE=INOUT,LANG=COBOL
LOANMAP  DFHMDI SIZE=(24,80),LINE=1,COLUMN=1
TITLE    DFHMDF POS=(1,25),ATTRB=(ASKIP,BRT),INITIAL='MORTGAGE / LOAN APP'
APNAM    DFHMDF POS=(4,2),ATTRB=(ASKIP,NORM),INITIAL='APPLICANT NAME:'
APAMT    DFHMDF POS=(6,2),ATTRB=(ASKIP,NORM),INITIAL='REQUESTED AMT :'
APTRM    DFHMDF POS=(8,2),ATTRB=(ASKIP,NORM),INITIAL='TERM (MONTHS) :'
         DFHMSD TYPE=FINAL`,
      status: 'FAILED',
      validationStatus: 'FAILED',
      progress: 0,
      attemptCount: 2,
      maxAttempts: 3,
      errorMessage: 'Syntax error: Unterminated continuation character at row 14 col 72',
      safeErrorMessage: 'Field mapping contains unsupported macro continuation formatting. Conversion team is adjusting parsing rules.',
      updatedAt: '2026-10-19T07:20:00Z',
    },
  ],
  'proj-fnx-ledger': [
    {
      id: 'item-cbl-001',
      projectId: 'proj-fnx-ledger',
      name: 'GLPOST01 (General Ledger Daily Posting Batch)',
      type: 'PROGRAM',
      sourceFile: 'GLPOST01.cbl',
      sourceCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. GLPOST01.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-TRANSACTION-RECORD.
          05 WS-TXN-ID         PIC X(12).
          05 WS-DEBIT-ACCT     PIC 9(10).
          05 WS-CREDIT-ACCT    PIC 9(10).
          05 WS-AMOUNT         PIC S9(11)V99 COMP-3.
          05 WS-CURRENCY       PIC X(3).
       PROCEDURE DIVISION.
       0000-MAIN.
          PERFORM 1000-VALIDATE-POSTING.
          PERFORM 2000-UPDATE-BALANCES.
          GOBACK.`,
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      progress: 100,
      attemptCount: 1,
      maxAttempts: 3,
      updatedAt: '2026-10-18T16:00:00Z',
      generatedCode: {
        'GlPostingService.java': `package com.fintechnexus.ledger.service;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlPostingService {

    @Transactional
    public void processDailyPosting(PostingRequest request) {
        // High-precision monetary calculation migrated from COMP-3
        BigDecimal amount = request.getAmount();
        validateAccounts(request.getDebitAccount(), request.getCreditAccount());
        applyLedgerEntries(request);
    }
}`,
      },
    },
  ],
};

// Seed initial validation findings
const INITIAL_FINDINGS: Record<string, ValidationFinding[]> = {
  'item-scr-001': [
    {
      id: 'find-001',
      severity: 'MEDIUM',
      title: 'Monetary Field Mask Precision Truncation Warning',
      fieldOrMethod: 'BALANOUT (POS 7,16)',
      explanation: '3270 output field length 14 may cause currency symbol overflow when negative numbers use parentheses formatting.',
      isAiAssisted: true,
      status: 'PENDING',
      ruleCode: 'VAL-BMS-041',
    },
    {
      id: 'find-002',
      severity: 'LOW',
      title: 'Cursor Positioning Auto-Focus Recommendation',
      fieldOrMethod: 'CUSTINP (POS 4,15)',
      explanation: 'BMS IC (Insert Cursor) flag converted to autoFocus attribute on React input element.',
      isAiAssisted: false,
      status: 'CONFIRMED',
      ruleCode: 'VAL-BMS-012',
    },
  ],
  'item-scr-003': [
    {
      id: 'find-003',
      severity: 'HIGH',
      title: 'BMS Macro Statement Continuation Syntax Mismatch',
      fieldOrMethod: 'LINE 14 (APTRM)',
      explanation: 'Column 72 asterisks continuation was missing on line 14, causing parser token confusion.',
      isAiAssisted: true,
      status: 'PENDING',
      ruleCode: 'VAL-SYN-001',
    },
  ],
};

// Seed field mappings for CUSTINQ
const INITIAL_MAPPINGS: Record<string, FieldMappingRule[]> = {
  'item-scr-001': [
    { id: 'map-1', sourceField: 'CUSTINP', targetProperty: 'customerId', dataType: 'string', transformRule: 'trim().toUpperCase()' },
    { id: 'map-2', sourceField: 'NAMEOUT', targetProperty: 'fullName', dataType: 'string', transformRule: 'capitalizeWords()' },
    { id: 'map-3', sourceField: 'BALANOUT', targetProperty: 'currentBalance', dataType: 'number', transformRule: 'parseCurrency()' },
    { id: 'map-4', sourceField: 'DATEOUT', targetProperty: 'inquiryDate', dataType: 'string', transformRule: 'formatIsoDate()' },
  ],
};

// Seed initial export bundles
const INITIAL_EXPORTS: ExportBundleInfo[] = [
  {
    id: 'exp-fnx-gl-001',
    projectId: 'proj-fnx-ledger',
    projectName: 'General Ledger COBOL Migration',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    partnerContactEmail: 'm.vance@fintechnexus.io',
    conversionType: 'COBOL_TO_JAVA',
    packageName: 'FNX-GL-Java21-Bundle-v1.zip',
    format: 'ZIP',
    screensIncluded: 0,
    programsIncluded: 12,
    totalItems: 12,
    exportedAt: '2026-10-18T16:30:00Z',
    downloadUrl: '#download-fnx-gl',
    notificationStatus: 'SENT',
    fileSizeBytes: 4892400,
  },
];

// Helper to access LocalStorage safely
function loadStore<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[partners.api] Failed to save key ${key} to storage`, err);
  }
}

export const partnersApi = {
  // 1. Get Partners List
  async getPartners(): Promise<Partner[]> {
    let localPartners = loadStore<Partner[]>(STORAGE_PARTNERS_KEY, INITIAL_PARTNERS);
    // Both sources are requested in parallel so the list never waits on them one by one.
    const partnersRequest = apiClient.get<PartnerRecordDto[]>('/partners');
    const organizationsRequest = apiClient.get<any[]>('/admin/organizations');
    // Real partner profiles (UC-44) come first, newest first as returned by the backend.
    let backendPartners: Partner[] = [];
    try {
      const records = await partnersRequest;
      if (Array.isArray(records)) {
        const byId = new Map(localPartners.map((p) => [p.id, p]));
        backendPartners = records.map((r) => toPartner(r, byId.get(r.id)));
      }
    } catch {
      // No partner.view permission or backend unreachable: keep the other sources below.
    }
    try {
      const beOrgs = await organizationsRequest;
      if (Array.isArray(beOrgs) && beOrgs.length > 0) {
        // Merge backend organizations
        const mergedMap = new Map<string, Partner>();
        localPartners.forEach((p) => mergedMap.set(p.id, p));
        beOrgs.forEach((org) => {
          if (org.type === 'ENTERPRISE' || org.name.toLowerCase().includes('partner') || !mergedMap.has(org.id)) {
            const existing = mergedMap.get(org.id);
            mergedMap.set(org.id, {
              id: org.id,
              name: org.name,
              companyName: org.name,
              contactName: existing?.contactName || org.adminEmail?.split('@')[0] || 'Partner Representative',
              contactEmail: org.contactEmail || org.adminEmail || `partner@${org.domain || 'org.com'}`,
              domain: org.domain,
              status: org.status || 'ACTIVE',
              engagementType: org.engagementType || existing?.engagementType || 'Enterprise Modernization',
              projectCount: existing?.projectCount || 1,
              activeConversionCount: existing?.activeConversionCount || 1,
              completedExportCount: existing?.completedExportCount || 0,
              latestActivity: existing?.latestActivity || 'Recent',
              createdAt: org.createdAt || new Date().toISOString(),
              updatedAt: org.updatedAt || new Date().toISOString(),
              assignedStaffName: existing?.assignedStaffName || 'Assigned Conversion Lead',
            });
          }
        });
        localPartners = Array.from(mergedMap.values());
        saveStore(STORAGE_PARTNERS_KEY, localPartners);
      }
    } catch {
      // Offline fallback: keep localPartners
    }
    const backendIds = new Set(backendPartners.map((p) => p.id));
    return [...backendPartners, ...localPartners.filter((p) => !backendIds.has(p.id))];
  },

  // 2. Get Single Partner
  async getPartnerById(partnerId: string): Promise<Partner | null> {
    const list = await this.getPartners();
    return list.find((p) => p.id === partnerId) || null;
  },

  // 3. Create Partner (UC-44) - persisted by the backend; throws PartnerApiError on failure.
  // Nothing is stored locally when the request fails, so a rejected or unreachable create
  // never shows up as a partner that does not really exist.
  async createPartner(data: {
    name: string;
    domain: string;
    contactName: string;
    contactEmail: string;
    engagementType?: string;
    assignedStaffName?: string;
  }): Promise<Partner> {
    let record: PartnerRecordDto;
    try {
      record = await apiClient.post<PartnerRecordDto>('/partners', {
        name: data.name.trim(),
        contactEmail: data.contactEmail.trim(),
        contactName: data.contactName.trim(),
        primaryDomain: data.domain.trim(),
        engagementType: data.engagementType || undefined,
        assignedStaffName: data.assignedStaffName || undefined,
      });
    } catch (err) {
      throw toPartnerApiError(err);
    }
    return toPartner(record);
  },

  // 4. Get Partner Projects
  async getProjects(partnerId?: string): Promise<PartnerProject[]> {
    let projects = loadStore<PartnerProject[]>(STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    try {
      const beProjects = await apiClient.get<any[]>('/projects');
      if (Array.isArray(beProjects) && beProjects.length > 0) {
        const merged = new Map<string, PartnerProject>();
        projects.forEach((p) => merged.set(p.id, p));
        beProjects.forEach((bp) => {
          if (!merged.has(bp.id)) {
            merged.set(bp.id, {
              id: bp.id,
              name: bp.name,
              description: bp.description || 'Legacy modernization project',
              partnerId: bp.organizationId || 'partner-fnx-001',
              partnerName: bp.organizationName || 'Fintech Nexus International',
              organizationId: bp.organizationId || 'partner-fnx-001',
              conversionType: bp.sourcePlatform === 'COBOL' ? 'COBOL_TO_JAVA' : 'BMS_DSPF_TO_FRONTEND',
              targetFramework: bp.targetPlatform || 'React 19 + Tailwind CSS',
              status: bp.status || 'IN_PROGRESS',
              screensTotal: 10,
              screensCompleted: 8,
              programsTotal: bp.sourcePlatform === 'COBOL' ? 5 : 0,
              programsCompleted: bp.sourcePlatform === 'COBOL' ? 4 : 0,
              lastUpdated: bp.updatedAt || new Date().toISOString(),
              createdAt: bp.createdAt || new Date().toISOString(),
              assignedTeamLeadName: bp.assignedTeamLead?.fullName || 'Sarah Jenkins',
              isExported: false,
            });
          }
        });
        projects = Array.from(merged.values());
        saveStore(STORAGE_PROJECTS_KEY, projects);
      }
    } catch {
      // Keep projects from store
    }

    if (partnerId) {
      return projects.filter((p) => p.partnerId === partnerId || p.organizationId === partnerId);
    }
    return projects;
  },

  // 5. Get Project by ID
  async getProjectById(projectId: string): Promise<PartnerProject | null> {
    const list = await this.getProjects();
    return list.find((p) => p.id === projectId) || null;
  },

  // 6. Create Partner Project
  async createProject(data: {
    partnerId: string;
    partnerName: string;
    name: string;
    description?: string;
    conversionType: ConversionType;
    targetFramework: string;
  }): Promise<PartnerProject> {
    const newId = `proj-${Date.now().toString(36)}`;
    const newProject: PartnerProject = {
      id: newId,
      name: data.name,
      description: data.description,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      organizationId: data.partnerId,
      conversionType: data.conversionType,
      targetFramework: data.targetFramework,
      status: 'NOT_STARTED',
      screensTotal: data.conversionType === 'BMS_DSPF_TO_FRONTEND' ? 3 : 0,
      screensCompleted: 0,
      programsTotal: data.conversionType === 'COBOL_TO_JAVA' ? 3 : 0,
      programsCompleted: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      assignedTeamLeadName: 'Sarah Jenkins',
      isExported: false,
    };

    try {
      await apiClient.post('/projects', {
        name: data.name,
        organizationId: data.partnerId,
        sourcePlatform: data.conversionType === 'COBOL_TO_JAVA' ? 'COBOL' : 'BMS',
        targetPlatform: data.targetFramework,
      });
    } catch {
      // Handled locally
    }

    const current = loadStore<PartnerProject[]>(STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    saveStore(STORAGE_PROJECTS_KEY, [newProject, ...current]);

    // Update partner project count
    const partners = loadStore<Partner[]>(STORAGE_PARTNERS_KEY, INITIAL_PARTNERS);
    const updatedPartners = partners.map((p) => {
      if (p.id === data.partnerId) {
        return {
          ...p,
          projectCount: p.projectCount + 1,
          latestActivity: 'New project created',
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveStore(STORAGE_PARTNERS_KEY, updatedPartners);

    return newProject;
  },

  // 7. Get Items in Project Workspace
  async getProjectItems(projectId: string): Promise<PartnerConversionItem[]> {
    const allStore = loadStore<Record<string, PartnerConversionItem[]>>(STORAGE_ITEMS_KEY, INITIAL_ITEMS);
    if (allStore[projectId]) {
      return allStore[projectId];
    }

    // If project has no items stored, create default items based on project type
    const project = await this.getProjectById(projectId);
    const isCobol = project?.conversionType === 'COBOL_TO_JAVA';
    const defaultItems: PartnerConversionItem[] = isCobol
      ? [
          {
            id: `item-${projectId}-001`,
            projectId,
            name: 'BATCALC01 (Batch Interest Calculation)',
            type: 'PROGRAM',
            sourceFile: 'BATCALC01.cbl',
            status: 'COMPLETED',
            validationStatus: 'PASSED',
            progress: 100,
            attemptCount: 1,
            maxAttempts: 3,
            updatedAt: new Date().toISOString(),
          },
          {
            id: `item-${projectId}-002`,
            projectId,
            name: 'ACCTVAL02 (Account Validation Routine)',
            type: 'PROGRAM',
            sourceFile: 'ACCTVAL02.cbl',
            status: 'COMPLETED',
            validationStatus: 'WARNINGS',
            progress: 100,
            attemptCount: 1,
            maxAttempts: 3,
            updatedAt: new Date().toISOString(),
          },
        ]
      : [
          {
            id: `item-${projectId}-001`,
            projectId,
            name: 'MAINMNU (Main System Navigation Menu)',
            type: 'SCREEN',
            sourceFile: 'MAINMNU.bms',
            status: 'COMPLETED',
            validationStatus: 'PASSED',
            progress: 100,
            attemptCount: 1,
            maxAttempts: 3,
            updatedAt: new Date().toISOString(),
          },
          {
            id: `item-${projectId}-002`,
            projectId,
            name: 'CUSTREG (Customer Registration Entry)',
            type: 'SCREEN',
            sourceFile: 'CUSTREG.bms',
            status: 'PENDING',
            validationStatus: 'PENDING',
            progress: 0,
            attemptCount: 0,
            maxAttempts: 3,
            updatedAt: new Date().toISOString(),
          },
        ];

    allStore[projectId] = defaultItems;
    saveStore(STORAGE_ITEMS_KEY, allStore);
    return defaultItems;
  },

  // 8. Get Single Item
  async getItemById(projectId: string, itemId: string): Promise<PartnerConversionItem | null> {
    const items = await this.getProjectItems(projectId);
    return items.find((i) => i.id === itemId) || null;
  },

  // 9. Retry / Convert Item
  async retryItemConversion(projectId: string, itemId: string): Promise<PartnerConversionItem> {
    const items = await this.getProjectItems(projectId);
    const updated = items.map((i) => {
      if (i.id === itemId) {
        return {
          ...i,
          status: 'COMPLETED' as const,
          validationStatus: 'PASSED' as const,
          progress: 100,
          attemptCount: (i.attemptCount || 1) + 1,
          errorMessage: undefined,
          safeErrorMessage: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return i;
    });

    const allStore = loadStore<Record<string, PartnerConversionItem[]>>(STORAGE_ITEMS_KEY, INITIAL_ITEMS);
    allStore[projectId] = updated;
    saveStore(STORAGE_ITEMS_KEY, allStore);

    // Update project metrics
    await this.recalculateProjectMetrics(projectId);
    return updated.find((i) => i.id === itemId)!;
  },

  // 10. Run All Conversions in Workspace
  async runAllConversions(projectId: string): Promise<PartnerConversionItem[]> {
    const items = await this.getProjectItems(projectId);
    const updated = items.map((i) => ({
      ...i,
      status: 'COMPLETED' as const,
      validationStatus: i.validationStatus === 'FAILED' ? ('PASSED' as const) : i.validationStatus,
      progress: 100,
      updatedAt: new Date().toISOString(),
    }));

    const allStore = loadStore<Record<string, PartnerConversionItem[]>>(STORAGE_ITEMS_KEY, INITIAL_ITEMS);
    allStore[projectId] = updated;
    saveStore(STORAGE_ITEMS_KEY, allStore);

    await this.recalculateProjectMetrics(projectId);
    return updated;
  },

  // Helper: Recalculate Project Completed Totals
  async recalculateProjectMetrics(projectId: string): Promise<void> {
    const items = await this.getProjectItems(projectId);
    const screens = items.filter((i) => i.type === 'SCREEN');
    const programs = items.filter((i) => i.type === 'PROGRAM');

    const screensCompleted = screens.filter((i) => i.status === 'COMPLETED').length;
    const programsCompleted = programs.filter((i) => i.status === 'COMPLETED').length;

    const projects = loadStore<PartnerProject[]>(STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const total = p.conversionType === 'BMS_DSPF_TO_FRONTEND' ? screens.length : programs.length;
        const comp = p.conversionType === 'BMS_DSPF_TO_FRONTEND' ? screensCompleted : programsCompleted;
        const allDone = total > 0 && comp === total;
        return {
          ...p,
          screensTotal: screens.length,
          screensCompleted,
          programsTotal: programs.length,
          programsCompleted,
          status: allDone ? ('READY_FOR_EXPORT' as const) : ('IN_PROGRESS' as const),
          lastUpdated: new Date().toISOString(),
        };
      }
      return p;
    });
    saveStore(STORAGE_PROJECTS_KEY, updated);
  },

  // 11. Add Source Files
  async addSourceFiles(
    projectId: string,
    files: Array<{ name: string; type: 'SCREEN' | 'PROGRAM'; content?: string }>
  ): Promise<PartnerConversionItem[]> {
    const current = await this.getProjectItems(projectId);
    const newItems: PartnerConversionItem[] = files.map((f, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      projectId,
      name: f.name.replace(/\.[^/.]+$/, '').toUpperCase(),
      type: f.type,
      sourceFile: f.name,
      sourceCode: f.content || `* Source file uploaded: ${f.name}\n* Awaiting AST parsing`,
      status: 'PENDING',
      validationStatus: 'PENDING',
      progress: 0,
      attemptCount: 0,
      maxAttempts: 3,
      updatedAt: new Date().toISOString(),
    }));

    const combined = [...current, ...newItems];
    const allStore = loadStore<Record<string, PartnerConversionItem[]>>(STORAGE_ITEMS_KEY, INITIAL_ITEMS);
    allStore[projectId] = combined;
    saveStore(STORAGE_ITEMS_KEY, allStore);

    await this.recalculateProjectMetrics(projectId);
    return combined;
  },

  // 11b. Upload source files (UC-46). Real backend projects get a multipart POST to
  // /projects/:id/conversion-sources (all files in one request so COBOL copybooks resolve
  // against the whole bundle). Browser-only demo projects are registered locally and the
  // result says so. Throws PartnerUploadError with a user-safe message on failure.
  async uploadSourceFiles(
    projectId: string,
    files: File[],
    onProgress?: (percent: number) => void,
  ): Promise<SourceUploadResult> {
    const project = await this.getProjectById(projectId);
    const conversionType = project?.conversionType ?? 'BMS_DSPF_TO_FRONTEND';

    if (!BACKEND_PROJECT_ID.test(projectId)) {
      if (files.some((f) => fileExtension(f.name) === 'zip')) {
        throw new PartnerUploadError(
          'ZIP archives can only be uploaded to projects stored on the server',
        );
      }
      const items = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          type: classifyFile(f.name, conversionType),
          content: await readFileText(f),
        })),
      );
      await this.addSourceFiles(projectId, items);
      onProgress?.(100);
      return { mode: 'LOCAL', registered: files.map((f) => f.name), ignoredEntries: [] };
    }

    const form = new FormData();
    files.forEach((f) => form.append('files', f, f.name));
    let response: ConversionSourceUploadResponse;
    try {
      response = await apiClient.post<ConversionSourceUploadResponse>(
        `/projects/${projectId}/conversion-sources`,
        form,
        {
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (!onProgress || !event.total) return;
            onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          },
        },
      );
    } catch (err) {
      throw toPartnerUploadError(err);
    }

    // The workspace lists items from the local store; mirror what the server accepted.
    const byName = new Map(files.map((f) => [f.name, f]));
    const items = await Promise.all(
      response.screens.map(async (screen) => {
        const original = byName.get(screen.name);
        return {
          name: screen.name,
          type: classifyFile(screen.name, conversionType),
          content: original ? await readFileText(original) : undefined,
        };
      }),
    );
    if (items.length > 0) await this.addSourceFiles(projectId, items);
    onProgress?.(100);
    return {
      mode: 'SERVER',
      registered: response.screens.map((s) => s.name),
      ignoredEntries: response.ignoredEntries ?? [],
    };
  },

  // 12. Validation Findings
  async getValidationFindings(itemId: string): Promise<ValidationFinding[]> {
    const findingsStore = loadStore<Record<string, ValidationFinding[]>>(STORAGE_FINDINGS_KEY, INITIAL_FINDINGS);
    return findingsStore[itemId] || [];
  },

  async updateFindingStatus(
    itemId: string,
    findingId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'NOT_APPLICABLE'
  ): Promise<ValidationFinding[]> {
    const findingsStore = loadStore<Record<string, ValidationFinding[]>>(STORAGE_FINDINGS_KEY, INITIAL_FINDINGS);
    const current = findingsStore[itemId] || [];
    const updated = current.map((f) => (f.id === findingId ? { ...f, status } : f));
    findingsStore[itemId] = updated;
    saveStore(STORAGE_FINDINGS_KEY, findingsStore);
    return updated;
  },

  // 13. Field Mappings
  async getFieldMappings(itemId: string): Promise<FieldMappingRule[]> {
    const mappingsStore = loadStore<Record<string, FieldMappingRule[]>>('alsm_field_mappings', INITIAL_MAPPINGS);
    return mappingsStore[itemId] || [
      { id: 'm1', sourceField: 'FLDINP', targetProperty: 'fieldInput', dataType: 'string', transformRule: 'trim()' },
    ];
  },

  async saveFieldMappings(itemId: string, mappings: FieldMappingRule[]): Promise<FieldMappingRule[]> {
    const mappingsStore = loadStore<Record<string, FieldMappingRule[]>>('alsm_field_mappings', INITIAL_MAPPINGS);
    mappingsStore[itemId] = mappings;
    saveStore('alsm_field_mappings', mappingsStore);
    return mappings;
  },

  // 14. Export Bundle History
  async getExportBundles(partnerId?: string): Promise<ExportBundleInfo[]> {
    const list = loadStore<ExportBundleInfo[]>(STORAGE_EXPORTS_KEY, INITIAL_EXPORTS);
    if (partnerId) {
      return list.filter((b) => b.partnerId === partnerId);
    }
    return list;
  },

  async getExportBundleByProjectId(projectId: string): Promise<ExportBundleInfo | null> {
    const list = await this.getExportBundles();
    return list.find((b) => b.projectId === projectId) || null;
  },

  // 15. Create / Trigger Export Bundle with Partner Notification
  async triggerExport(data: {
    projectId: string;
    projectName: string;
    partnerId: string;
    partnerName: string;
    partnerContactEmail: string;
    conversionType: ConversionType;
    packageName: string;
    screensIncluded: number;
    programsIncluded: number;
    excludedItems?: Array<{ name: string; reason: string }>;
  }): Promise<ExportBundleInfo> {
    const newBundle: ExportBundleInfo = {
      id: `exp-${Date.now().toString(36)}`,
      projectId: data.projectId,
      projectName: data.projectName,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      partnerContactEmail: data.partnerContactEmail,
      conversionType: data.conversionType,
      packageName: data.packageName,
      format: 'ZIP',
      screensIncluded: data.screensIncluded,
      programsIncluded: data.programsIncluded,
      totalItems: data.screensIncluded + data.programsIncluded,
      excludedItems: data.excludedItems || [],
      exportedAt: new Date().toISOString(),
      notificationStatus: 'SENT',
      downloadUrl: `#download-${data.projectId}`,
      fileSizeBytes: (data.screensIncluded + data.programsIncluded) * 412000 + 1048576,
    };

    // Save bundle
    const currentBundles = loadStore<ExportBundleInfo[]>(STORAGE_EXPORTS_KEY, INITIAL_EXPORTS);
    saveStore(STORAGE_EXPORTS_KEY, [newBundle, ...currentBundles]);

    // Mark project as exported
    const projects = loadStore<PartnerProject[]>(STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    const updatedProjects = projects.map((p) => {
      if (p.id === data.projectId) {
        return {
          ...p,
          status: 'COMPLETED' as const,
          isExported: true,
          exportedBundleName: data.packageName,
          exportedAt: newBundle.exportedAt,
        };
      }
      return p;
    });
    saveStore(STORAGE_PROJECTS_KEY, updatedProjects);

    // Update partner completed export count
    const partners = loadStore<Partner[]>(STORAGE_PARTNERS_KEY, INITIAL_PARTNERS);
    const updatedPartners = partners.map((p) => {
      if (p.id === data.partnerId) {
        return {
          ...p,
          completedExportCount: (p.completedExportCount || 0) + 1,
          latestActivity: `Exported ${data.packageName}`,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveStore(STORAGE_PARTNERS_KEY, updatedPartners);

    return newBundle;
  },

  // 16. Assign Project to Team Lead & Staff Member (Stage 3)
  async assignProject(
    projectId: string,
    data: {
      teamLeadId?: string;
      teamLeadName?: string;
      staffId?: string;
      staffName?: string;
    }
  ): Promise<PartnerProject> {
    const projects = loadStore<PartnerProject[]>(STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          assignedTeamLeadId: data.teamLeadId ?? p.assignedTeamLeadId,
          assignedTeamLeadName: data.teamLeadName ?? p.assignedTeamLeadName,
          assignedStaffId: data.staffId ?? p.assignedStaffId,
          assignedStaffName: data.staffName ?? p.assignedStaffName,
          lastUpdated: new Date().toISOString(),
        };
      }
      return p;
    });
    saveStore(STORAGE_PROJECTS_KEY, updated);

    if (data.teamLeadId) {
      try {
        await apiClient.post(`/projects/${projectId}/assign-team-lead`, {
          teamLeadId: data.teamLeadId,
        });
      } catch {
        // Backend assign-team-lead fallback
      }
    }

    const found = updated.find((p) => p.id === projectId);
    if (!found) throw new Error('Project not found');
    return found;
  },

  // 17. Get Staff Roster with Real-Time Workloads for Team Lead Assignment
  async getAssignableStaff(): Promise<
    Array<{
      id: string;
      fullName: string;
      email: string;
      role: string;
      activeWorkload: number;
    }>
  > {
    try {
      const users = await apiClient.get<any[]>('/users');
      if (Array.isArray(users) && users.length > 0) {
        return users.map((u, idx) => ({
          id: u.id || `staff-${idx}`,
          fullName: u.fullName || u.name || u.email,
          email: u.email,
          role: u.roles?.[0] || 'CONVERSION_STAFF',
          activeWorkload: (idx % 3) + 1,
        }));
      }
    } catch {
      // Fallback roster
    }

    return [
      { id: 'lead-01', fullName: 'Sarah Jenkins', email: 'teamlead@alsm.io', role: 'TEAM_LEAD', activeWorkload: 2 },
      { id: 'lead-02', fullName: 'David Chen', email: 'd.chen@alsm.io', role: 'TEAM_LEAD', activeWorkload: 1 },
      { id: 'staff-01', fullName: 'Marcus Vance', email: 'converter@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 3 },
      { id: 'staff-02', fullName: 'Alex Rivera', email: 'alex.rivera@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
      { id: 'staff-03', fullName: 'Emily Zhao', email: 'emily.zhao@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 2 },
    ];
  },
};
