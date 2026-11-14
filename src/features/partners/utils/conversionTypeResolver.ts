import type { ConversionType } from '../types/partner.types';

export type WorkspaceType = 'PROGRAMS' | 'SCREENS' | 'UNSUPPORTED';

export interface WorkspaceMetadata {
  type: WorkspaceType;
  title: string;
  description: string;
  sourceLabel: string;
  targetLabel: string;
}

export const WORKSPACE_METADATA: Record<'PROGRAMS' | 'SCREENS', WorkspaceMetadata> = {
  PROGRAMS: {
    type: 'PROGRAMS',
    title: 'Programs Workspace',
    description: 'Analyze, convert, validate, and inspect legacy COBOL business logic programs.',
    sourceLabel: 'COBOL Source',
    targetLabel: 'Java Spring Boot',
  },
  SCREENS: {
    type: 'SCREENS',
    title: 'Screens Workspace',
    description: 'Analyze, convert, validate, and inspect legacy BMS/DSPF screen maps.',
    sourceLabel: 'BMS / DSPF Source',
    targetLabel: 'React Application',
  },
};

export function resolveWorkspace(conversionType?: ConversionType | string | null): WorkspaceType {
  if (!conversionType) return 'UNSUPPORTED';
  switch (conversionType) {
    case 'COBOL_TO_JAVA':
      return 'PROGRAMS';
    case 'BMS_DSPF_TO_REACT':
    case 'BMS_DSPF_TO_FRONTEND':
      return 'SCREENS';
    default:
      return 'UNSUPPORTED';
  }
}

export function isCobolProject(conversionType?: string | null): boolean {
  return resolveWorkspace(conversionType) === 'PROGRAMS';
}

export function isScreensProject(conversionType?: string | null): boolean {
  return resolveWorkspace(conversionType) === 'SCREENS';
}
