export interface Partner {
  id: string;
  name: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  domain?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  engagementType?: string;
  projectCount: number;
  activeConversionCount?: number;
  completedExportCount?: number;
  latestActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversionType = 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA';
export type ProjectOverallStatus = 'DRAFT' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'READY_FOR_EXPORT';
export type ItemConversionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER' | 'READY_FOR_EXPORT';
export type FindingSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'NOT_APPLICABLE';

export interface PartnerProject {
  id: string;
  name: string;
  description?: string;
  partnerId: string;
  partnerName: string;
  organizationId: string;
  conversionType: ConversionType;
  targetFramework: string;
  status: ProjectOverallStatus;
  screensTotal: number;
  screensCompleted: number;
  programsTotal: number;
  programsCompleted: number;
  lastUpdated: string;
  createdAt: string;
  assignedTeamLeadId?: string;
  assignedTeamLeadName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  isExported?: boolean;
  exportedBundleName?: string;
  exportedAt?: string;
  isDemo?: boolean;
}

export interface PartnerConversionItem {
  id: string;
  projectId: string;
  name: string;
  type: 'SCREEN' | 'PROGRAM';
  sourceFile: string;
  sourceCode?: string;
  status: ItemConversionStatus;
  validationStatus: 'PENDING' | 'PASSED' | 'WARNINGS' | 'FAILED';
  progress?: number;
  attemptCount?: number;
  maxAttempts?: number;
  errorMessage?: string;
  safeErrorMessage?: string;
  updatedAt: string;
  generatedCode?: Record<string, string>;
  previewUrl?: string;
  /** Why the last "Run All" did not queue this item (e.g. missing copybooks). */
  lastSkipReason?: string;
}

export interface ValidationFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  fieldOrMethod?: string;
  explanation: string;
  isAiAssisted?: boolean;
  status: FindingStatus;
  ruleCode?: string;
}

export interface FieldMappingRule {
  id?: string;
  sourceField: string;
  targetProperty: string;
  dataType: string;
  transformRule?: string;
}

export interface ExportBundleInfo {
  id: string;
  projectId: string;
  projectName: string;
  partnerId: string;
  partnerName: string;
  partnerContactEmail: string;
  conversionType: ConversionType;
  packageName: string;
  format: 'ZIP';
  screensIncluded: number;
  programsIncluded: number;
  totalItems: number;
  excludedItems?: Array<{ name: string; reason: string }>;
  exportedAt: string;
  downloadUrl?: string;
  notificationStatus: 'QUEUED' | 'SENT' | 'FAILED';
  fileSizeBytes?: number;
}
