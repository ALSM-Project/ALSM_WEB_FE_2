export const ValidationRunStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ValidationRunStatus =
  (typeof ValidationRunStatus)[keyof typeof ValidationRunStatus];

export const ValidationFindingSource = {
  RULE: 'RULE',
  AI: 'AI',
  COMPILER: 'COMPILER',
  STATIC_ANALYSIS: 'STATIC_ANALYSIS',
  DIFFERENTIAL_TEST: 'DIFFERENTIAL_TEST',
} as const;

export type ValidationFindingSource =
  (typeof ValidationFindingSource)[keyof typeof ValidationFindingSource];

export const ValidationFindingCategory = {
  DATA_TYPE_MISMATCH: 'DATA_TYPE_MISMATCH',
  LOGIC_MISMATCH: 'LOGIC_MISMATCH',
  VARIABLE_MAPPING_MISMATCH: 'VARIABLE_MAPPING_MISMATCH',
  CONTROL_FLOW_MISMATCH: 'CONTROL_FLOW_MISMATCH',
  FILE_IO_MISMATCH: 'FILE_IO_MISMATCH',
  DATABASE_MISMATCH: 'DATABASE_MISMATCH',
  ENCODING_MISMATCH: 'ENCODING_MISMATCH',
  MISSING_OPERATION: 'MISSING_OPERATION',
  UNSUPPORTED_CONSTRUCT: 'UNSUPPORTED_CONSTRUCT',
  POTENTIAL_BEHAVIOR_CHANGE: 'POTENTIAL_BEHAVIOR_CHANGE',
  MISSING_FIELD: 'MISSING_FIELD',
  ATTRIBUTE_MISMATCH: 'ATTRIBUTE_MISMATCH',
  LAYOUT_DISCREPANCY: 'LAYOUT_DISCREPANCY',
  PF_KEY_MISMATCH: 'PF_KEY_MISMATCH',
  SEMANTIC_LOGIC: 'SEMANTIC_LOGIC',
  OTHER: 'OTHER',
} as const;

export type ValidationFindingCategory =
  (typeof ValidationFindingCategory)[keyof typeof ValidationFindingCategory];

export const ValidationFindingSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type ValidationFindingSeverity =
  (typeof ValidationFindingSeverity)[keyof typeof ValidationFindingSeverity];

export const ValidationFindingStatus = {
  PENDING: 'PENDING',
  NEEDS_CORRECTION: 'NEEDS_CORRECTION',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  RESOLVED: 'RESOLVED',
} as const;

export type ValidationFindingStatus =
  (typeof ValidationFindingStatus)[keyof typeof ValidationFindingStatus];

export interface CodeLocation {
  file?: string;
  startLine?: number;
  endLine?: number;
  snippet?: string;
}

export interface ValidationRun {
  id: string;
  organizationId: string;
  projectId: string;
  conversionJobId: string;
  screenId?: string;
  status: ValidationRunStatus;
  ruleValidationEnabled: boolean;
  aiValidationEnabled: boolean;
  findingCount: number;
  provider?: string;
  model?: string;
  promptVersion?: string;
  redactionCount?: number;
  selectedFileCount?: number;
  inputCharacterCount?: number;
  expectedFindingCount?: number;
  resultsPersistedAt?: string;
  failureCode?: string;
  failureMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationFinding {
  id: string;
  organizationId: string;
  projectId: string;
  conversionJobId: string;
  validationRunId: string;
  screenId?: string;
  source: ValidationFindingSource;
  category: ValidationFindingCategory;
  severity: ValidationFindingSeverity;
  status: ValidationFindingStatus;
  title: string;
  explanation: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  suggestion?: string;
  sourceLocation?: CodeLocation;
  targetLocation?: CodeLocation;
  confidence?: number;
  modelProvider?: string;
  modelName?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type HumanReviewTargetStatus = Exclude<
  ValidationFindingStatus,
  'PENDING'
>;

export interface ReviewFindingInput {
  status: HumanReviewTargetStatus;
  reviewNote?: string;
}
