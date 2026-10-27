import type { AxiosProgressEvent } from 'axios';
import { apiClient } from '@/services/api/apiClient';
import { PartnerUploadError, toPartnerUploadError } from './partnerUploadError';
import { PartnerConversionError, toPartnerConversionError } from './partnerConversionError';
import { PartnerExportError, toPartnerExportError } from './partnerExportError';
import { classifyFile } from '../utils/uploadValidation';
import { PartnerApiError } from './partnerApiError';
import {
  Partner,
  PartnerProject,
  PartnerConversionItem,
  ValidationFinding,
  FieldMappingRule,
  ExportBundleInfo,
  ConversionType,
  ItemConversionStatus,
  PartnerExportOptions,
  PartnerExportPreview,
} from '../types/partner.types';
import { saveBlob } from '../utils/saveBlob';

// Browser-only data: which partner a server project belongs to (the server has no such
// field yet) and the review notes staff type in. Everything else comes from the server.
const STORAGE_LINKS_KEY = 'alsm_partner_project_links_v1';
const STORAGE_FINDINGS_KEY = 'alsm_partner_findings_v1';
const STORAGE_MAPPINGS_KEY = 'alsm_field_mappings';

export { PartnerApiError, PartnerUploadError, PartnerConversionError, PartnerExportError };



/** Real backend projects have Mongo ObjectId ids; the demo/seed ones created in the browser do not. */
const BACKEND_PROJECT_ID = /^[a-f0-9]{24}$/i;

export function isServerProject(projectId: string): boolean {
  return BACKEND_PROJECT_ID.test(projectId);
}

const LOCAL_PROJECT_EXPORT_MESSAGE =
  'This demo project exists only in this browser, so it has no converted code to export. Exports run for projects stored on the server.';

const LOCAL_PROJECT_CONVERSION_MESSAGE =
  'This demo project exists only in this browser, so its files cannot be converted. Conversions run for projects stored on the server.';

interface ScreenDto {
  id: string;
  projectId: string;
  name: string;
  sourceType: string;
  updatedAt: string;
}

type ConversionJobStatusDto = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD' | 'CANCELLED';

interface ConversionJobDto {
  id: string;
  screenId?: string;
  status: ConversionJobStatusDto;
  attemptCount: number;
  maxAttempts: number;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface BulkStartResponse {
  jobs: ConversionJobDto[];
  skipped: { screenId: string; code: string; message: string }[];
}

/** A queued job is already in flight from the user's point of view. */
const ITEM_STATUS_BY_JOB_STATUS: Record<ConversionJobStatusDto, ItemConversionStatus> = {
  QUEUED: 'PROCESSING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  DEAD: 'DEAD_LETTER',
  CANCELLED: 'FAILED',
};

/** Job error codes mapped to user-safe text; a job's raw errorMessage can hold tool output. */
const SAFE_JOB_ERRORS: Record<string, string> = {
  COPYBOOK_DEPENDENCY_BLOCKED:
    'Missing copybooks: upload the copybooks this program uses, then retry.',
  CONVERSION_QUEUE_UNAVAILABLE: 'The conversion queue was unavailable. Please retry.',
  CONVERSION_ENGINE_UNAVAILABLE:
    'The converter could not convert this file. Check the source file, then retry.',
};

function toServerItem(
  projectId: string,
  screen: ScreenDto,
  conversionType: ConversionType,
  latest?: ConversionJobDto,
): PartnerConversionItem {
  const status: ItemConversionStatus = latest ? ITEM_STATUS_BY_JOB_STATUS[latest.status] : 'PENDING';
  const failed = status === 'FAILED' || status === 'DEAD_LETTER';
  return {
    id: screen.id,
    projectId,
    name: screen.name.replace(/\.[^/.]+$/, '').toUpperCase(),
    type: classifyFile(screen.name, conversionType),
    sourceFile: screen.name,
    status,
    validationStatus: 'PENDING',
    progress: status === 'COMPLETED' ? 100 : 0,
    attemptCount: latest?.attemptCount ?? 0,
    maxAttempts: latest?.maxAttempts ?? 3,
    safeErrorMessage: failed
      ? SAFE_JOB_ERRORS[latest?.errorCode ?? ''] ?? 'The conversion failed. Please retry.'
      : undefined,
    updatedAt: latest?.updatedAt ?? screen.updatedAt,
  };
}

/** A released bundle as returned by /projects/:id/partner-export (UC-48). */
interface ExportBundleDto {
  id: string;
  projectId: string;
  partnerId?: string;
  partnerEmail: string;
  packageName: string;
  format: 'ZIP';
  fileSizeBytes: number;
  screensIncluded: number;
  programsIncluded: number;
  excludedItems: Array<{ name: string; reason: string }>;
  customNotes?: string;
  exportedAt: string;
  notificationStatus: 'PENDING' | 'SENT' | 'FAILED';
  notificationError?: string;
  downloadUrl: string;
}

interface ExportPreviewDto {
  packageName: string;
  summary: {
    targetFramework: 'React 19' | 'Spring Boot 3.3';
    screensIncluded: number;
    programsIncluded: number;
    excludedItems: Array<{ name: string; reason: string }>;
  };
  metrics: { totalFiles: number; estimatedSizeKb: number };
}

function toExportBundleInfo(dto: ExportBundleDto, project: PartnerProject | null): ExportBundleInfo {
  return {
    id: dto.id,
    projectId: dto.projectId,
    projectName: project?.name ?? '',
    partnerId: project?.partnerId ?? dto.partnerId ?? '',
    partnerName: project?.partnerName ?? '',
    partnerContactEmail: dto.partnerEmail,
    conversionType:
      project?.conversionType ?? (dto.programsIncluded > 0 ? 'COBOL_TO_JAVA' : 'BMS_DSPF_TO_FRONTEND'),
    packageName: dto.packageName,
    format: 'ZIP',
    screensIncluded: dto.screensIncluded,
    programsIncluded: dto.programsIncluded,
    totalItems: dto.screensIncluded + dto.programsIncluded,
    excludedItems: dto.excludedItems,
    exportedAt: dto.exportedAt,
    downloadUrl: dto.downloadUrl,
    notificationStatus: dto.notificationStatus,
    notificationError: dto.notificationError,
    customNotes: dto.customNotes,
    fileSizeBytes: dto.fileSizeBytes,
  };
}

function requireServerProjectForExport(projectId: string): void {
  if (!isServerProject(projectId)) throw new PartnerExportError(LOCAL_PROJECT_EXPORT_MESSAGE);
}

export interface SourceUploadResult {
  registered: string[];
  /** ZIP entries the server skipped because they are not source files for the project. */
  ignoredEntries: string[];
}

interface ConversionSourceUploadResponse {
  inputReference: string;
  files: { name: string; sizeBytes: number }[];
  screens: { id: string; name: string; sourceType: string }[];
  ignoredEntries?: string[];
}

/** Shape returned by the backend's POST/GET /partners. */
interface PartnerRecordDto {
  id: string;
  name: string;
  contactEmail: string;
  contactName: string;
  primaryDomain: string;
  engagementType?: string;
  assignedStaffName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  completedExportCount?: number;
  latestActivity?: string;
  createdAt: string;
  updatedAt: string;
}

function toPartner(
  dto: PartnerRecordDto,
  counts: { projectCount: number; activeConversionCount: number },
): Partner {
  return {
    id: dto.id,
    name: dto.name,
    companyName: dto.name,
    contactName: dto.contactName,
    contactEmail: dto.contactEmail,
    domain: dto.primaryDomain,
    engagementType: dto.engagementType,
    assignedStaffName: dto.assignedStaffName,
    status: dto.status === 'INACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    projectCount: counts.projectCount,
    activeConversionCount: counts.activeConversionCount,
    completedExportCount: dto.completedExportCount ?? 0,
    latestActivity: dto.latestActivity,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Turns an axios error into a user-safe PartnerApiError (no stack traces or internals). */
function toPartnerApiError(err: unknown, action: 'create' | 'load' = 'create'): PartnerApiError {
  const response = (err as { response?: { status?: number; data?: { code?: string; message?: unknown } } })
    ?.response;
  if (!response) {
    return new PartnerApiError(
      action === 'load'
        ? 'Cannot reach the server. Please try again.'
        : 'Cannot reach the server. The partner was not created - please try again.',
    );
  }
  const { status } = response;
  const code = response.data?.code;
  const raw = response.data?.message;
  const serverMessage = Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : undefined;
  if (action === 'load') {
    return new PartnerApiError(
      status === 403
        ? 'You do not have permission to view partners'
        : 'The partner list could not be loaded. Please try again later.',
      status,
      code,
    );
  }
  if (status === 409) {
    return new PartnerApiError(serverMessage || 'A partner with this contact email already exists', status, code);
  }
  if (status === 400) {
    return new PartnerApiError(serverMessage || 'Some partner details are invalid', status, code);
  }
  if (status === 403) {
    return new PartnerApiError('You do not have permission to create partners', status, code);
  }
  return new PartnerApiError('The partner could not be created. Please try again later.', status, code);
}

function toPartnerProjectError(
  err: unknown,
  action: 'create' | 'load' | 'assign' = 'create',
): PartnerApiError {
  const response = (err as { response?: { status?: number; data?: { code?: string; message?: unknown } } })
    ?.response;
  if (!response) {
    return new PartnerApiError(
      action === 'create'
        ? 'Cannot reach the server. The project was not created - please try again.'
        : 'Cannot reach the server. Please try again.',
    );
  }
  const { status } = response;
  const raw = response.data?.message;
  const serverMessage = Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : undefined;
  if (status === 400) {
    return new PartnerApiError(serverMessage || 'Some project details are invalid', status, response.data?.code);
  }
  const code = response.data?.code;
  if (status === 403) {
    const what = action === 'create' ? 'create projects' : action === 'assign' ? 'assign this project' : 'view projects';
    return new PartnerApiError(`You do not have permission to ${what}`, status, code);
  }
  const failed =
    action === 'create'
      ? 'The project could not be created'
      : action === 'assign'
        ? 'The project could not be assigned'
        : 'The projects could not be loaded';
  return new PartnerApiError(`${failed}. Please try again later.`, status, code);
}

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

interface ProjectLink {
  partnerId: string;
  partnerName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedTeamLeadName?: string;
}

function loadLinks(): Record<string, ProjectLink> {
  return loadStore<Record<string, ProjectLink>>(STORAGE_LINKS_KEY, {});
}

function saveLink(projectId: string, patch: Partial<ProjectLink>): void {
  const links = loadLinks();
  const current: ProjectLink = links[projectId] ?? { partnerId: '', partnerName: '' };
  links[projectId] = { ...current, ...patch };
  saveStore(STORAGE_LINKS_KEY, links);
}

/** A project as the backend stores it (GET /projects, GET /projects/:id). */
interface ProjectDto {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  conversionType: ConversionType;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  assignedTeamLeadId?: string;
  isExported?: boolean;
  exportedAt?: string;
  exportedBundleName?: string;
  createdAt: string;
  updatedAt: string;
}

const TARGET_FRAMEWORK: Record<ConversionType, string> = {
  BMS_DSPF_TO_FRONTEND: 'React 19 + Tailwind CSS',
  COBOL_TO_JAVA: 'Spring Boot 3.3 / Java 21',
};

/** Project fields that need no extra request; item counts are filled in separately. */
function toProject(dto: ProjectDto): PartnerProject {
  const link = loadLinks()[dto.id];
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    partnerId: link?.partnerId ?? '',
    partnerName: link?.partnerName || 'Not linked to a partner',
    organizationId: dto.organizationId,
    conversionType: dto.conversionType,
    targetFramework: TARGET_FRAMEWORK[dto.conversionType],
    status: dto.status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 0,
    programsCompleted: 0,
    lastUpdated: dto.updatedAt,
    createdAt: dto.createdAt,
    assignedTeamLeadId: dto.assignedTeamLeadId,
    assignedTeamLeadName: link?.assignedTeamLeadName,
    assignedStaffId: link?.assignedStaffId,
    assignedStaffName: link?.assignedStaffName,
    isExported: dto.isExported ?? false,
    exportedAt: dto.exportedAt,
    exportedBundleName: dto.exportedBundleName,
  };
}

/** Totals and status derived from the project's real screens/programs and conversion jobs. */
function withItemCounts(project: PartnerProject, items: PartnerConversionItem[]): PartnerProject {
  const screens = items.filter((i) => i.type === 'SCREEN');
  const programs = items.filter((i) => i.type === 'PROGRAM');
  const done = (list: PartnerConversionItem[]) => list.filter((i) => i.status === 'COMPLETED').length;
  const relevant = project.conversionType === 'COBOL_TO_JAVA' ? programs : screens;
  let status = project.status;
  if (status !== 'COMPLETED') {
    if (relevant.length > 0 && done(relevant) === relevant.length) status = 'READY_FOR_EXPORT';
    else if (items.some((i) => i.status !== 'PENDING')) status = 'IN_PROGRESS';
  }
  return {
    ...project,
    status,
    screensTotal: screens.length,
    screensCompleted: done(screens),
    programsTotal: programs.length,
    programsCompleted: done(programs),
  };
}

export const partnersApi = {
  // 1. Get Partners List - the partner profiles stored by the backend (UC-44).
  async getPartners(): Promise<Partner[]> {
    let records: PartnerRecordDto[];
    try {
      records = await apiClient.get<PartnerRecordDto[]>('/partners');
    } catch (err) {
      throw toPartnerApiError(err, 'load');
    }
    const projects = await this.listProjectsWithoutCounts().catch(() => [] as PartnerProject[]);
    return records.map((r) => {
      const own = projects.filter((p) => p.partnerId === r.id);
      return toPartner(r, {
        projectCount: own.length,
        activeConversionCount: own.filter((p) => !p.isExported && p.status !== 'COMPLETED').length,
      });
    });
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
    return toPartner(record, { projectCount: 0, activeConversionCount: 0 });
  },

  // 4. Get Partner Projects - every project stored on the server, with real item counts.
  async getProjects(partnerId?: string): Promise<PartnerProject[]> {
    const projects = await this.listProjectsWithoutCounts();
    const scoped = partnerId ? projects.filter((p) => p.partnerId === partnerId) : projects;
    return Promise.all(
      scoped.map(async (p) => {
        try {
          return withItemCounts(p, await this.getServerProjectItems(p.id));
        } catch {
          return p;
        }
      }),
    );
  },

  async listProjectsWithoutCounts(): Promise<PartnerProject[]> {
    let dtos: ProjectDto[];
    try {
      dtos = await apiClient.get<ProjectDto[]>('/projects');
    } catch (err) {
      throw toPartnerProjectError(err, 'load');
    }
    return dtos.map(toProject);
  },

  // 5. Get Project by ID
  async getProjectById(projectId: string): Promise<PartnerProject | null> {
    const project = await this.fetchProject(projectId);
    if (!project) return null;
    try {
      return withItemCounts(project, await this.getServerProjectItems(projectId));
    } catch {
      return project;
    }
  },

  /** The project without item counts (also what getServerProjectItems uses, to avoid a loop). */
  async fetchProject(projectId: string): Promise<PartnerProject | null> {
    if (!isServerProject(projectId)) return null;
    try {
      return toProject(await apiClient.get<ProjectDto>(`/projects/${projectId}`));
    } catch {
      return null;
    }
  },

  // 6. Create Partner Project - created on the server; the partner link is kept in this browser.
  async createProject(data: {
    partnerId: string;
    partnerName: string;
    name: string;
    description?: string;
    conversionType: ConversionType;
    targetFramework: string;
  }): Promise<PartnerProject> {
    let created: ProjectDto;
    try {
      created = await apiClient.post<ProjectDto>('/projects', {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        conversionType: data.conversionType,
      });
    } catch (err) {
      throw toPartnerProjectError(err, 'create');
    }
    saveLink(created.id, { partnerId: data.partnerId, partnerName: data.partnerName });
    return toProject(created);
  },

  // 7. Get Items in Project Workspace - the screens/programs uploaded to the server.
  async getProjectItems(projectId: string): Promise<PartnerConversionItem[]> {
    if (!isServerProject(projectId)) return [];
    return this.getServerProjectItems(projectId);
  },

  // 8. Get Single Item
  async getItemById(projectId: string, itemId: string): Promise<PartnerConversionItem | null> {
    const items = await this.getProjectItems(projectId);
    return items.find((i) => i.id === itemId) || null;
  },

  // 9. Retry / Convert Item
  async retryItemConversion(projectId: string, itemId: string): Promise<PartnerConversionItem> {
    if (!isServerProject(projectId)) {
      throw new PartnerConversionError(LOCAL_PROJECT_CONVERSION_MESSAGE);
    }
    try {
      await apiClient.post<ConversionJobDto>(`/projects/${projectId}/conversions/jobs`, {
        screenId: itemId,
      });
    } catch (err) {
      throw toPartnerConversionError(err);
    }
    const refreshed = await this.getServerProjectItems(projectId);
    const item = refreshed.find((i) => i.id === itemId);
    if (!item) throw new PartnerConversionError('This file is no longer part of the project');
    return item;
  },

  // 10. Run All Conversions in Workspace
  async runAllConversions(projectId: string): Promise<PartnerConversionItem[]> {
    if (!isServerProject(projectId)) {
      throw new PartnerConversionError(LOCAL_PROJECT_CONVERSION_MESSAGE);
    }
    const current = await this.getServerProjectItems(projectId);
    // Completed items keep their result and running ones are already in the queue.
    const screenIds = current
      .filter((i) => i.status !== 'COMPLETED' && i.status !== 'PROCESSING')
      .map((i) => i.id);
    if (screenIds.length === 0) return current;

    let result: BulkStartResponse;
    try {
      result = await apiClient.post<BulkStartResponse>(
        `/projects/${projectId}/conversions/jobs/bulk`,
        { screenIds },
      );
    } catch (err) {
      throw toPartnerConversionError(err);
    }
    const skippedById = new Map(result.skipped.map((s) => [s.screenId, s.message]));
    const refreshed = await this.getServerProjectItems(projectId);
    return refreshed.map((i) =>
      skippedById.has(i.id) ? { ...i, lastSkipReason: skippedById.get(i.id) } : i,
    );
  },

  /** Workspace items of a server project: one per uploaded screen/program, with the status
   * and attempts of its most recent conversion job. */
  async getServerProjectItems(projectId: string): Promise<PartnerConversionItem[]> {
    let screens: ScreenDto[];
    let jobs: ConversionJobDto[];
    try {
      [screens, jobs] = await Promise.all([
        apiClient.get<ScreenDto[]>(`/projects/${projectId}/screens`),
        apiClient.get<ConversionJobDto[]>(`/projects/${projectId}/conversions`),
      ]);
    } catch (err) {
      throw toPartnerConversionError(err, 'load');
    }
    const project = await this.fetchProject(projectId);
    const conversionType = project?.conversionType ?? 'BMS_DSPF_TO_FRONTEND';
    const latestByScreen = new Map<string, ConversionJobDto>();
    for (const job of [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      if (job.screenId && !latestByScreen.has(job.screenId)) latestByScreen.set(job.screenId, job);
    }
    return screens.map((screen) =>
      toServerItem(projectId, screen, conversionType, latestByScreen.get(screen.id)),
    );
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
    if (!isServerProject(projectId)) {
      throw new PartnerUploadError(
        'This project is not stored on the server, so files cannot be uploaded to it. Create a new project and upload there.',
      );
    }

    const form = new FormData();
    files.forEach((f) => form.append('files', f, f.name));
    let response: ConversionSourceUploadResponse;
    try {
      response = await apiClient.post<ConversionSourceUploadResponse>(
        `/projects/${projectId}/conversion-sources`,
        form,
        {
          // apiClient defaults to application/json, and axios then serializes a FormData
          // body to JSON - the files vanish and the server sees none. Declaring multipart
          // keeps the body intact; the browser adds the boundary itself.
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (!onProgress || !event.total) return;
            onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          },
        },
      );
    } catch (err) {
      throw toPartnerUploadError(err);
    }

    // Server projects list their items straight from the backend (getServerProjectItems).
    onProgress?.(100);
    return {
      registered: response.screens.map((s) => s.name),
      ignoredEntries: response.ignoredEntries ?? [],
    };
  },

  // 12. Validation Findings
  async getValidationFindings(itemId: string): Promise<ValidationFinding[]> {
    const findingsStore = loadStore<Record<string, ValidationFinding[]>>(STORAGE_FINDINGS_KEY, {});
    return findingsStore[itemId] || [];
  },

  async updateFindingStatus(
    itemId: string,
    findingId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'NOT_APPLICABLE'
  ): Promise<ValidationFinding[]> {
    const findingsStore = loadStore<Record<string, ValidationFinding[]>>(STORAGE_FINDINGS_KEY, {});
    const current = findingsStore[itemId] || [];
    const updated = current.map((f) => (f.id === findingId ? { ...f, status } : f));
    findingsStore[itemId] = updated;
    saveStore(STORAGE_FINDINGS_KEY, findingsStore);
    return updated;
  },

  // 13. Field Mappings
  async getFieldMappings(itemId: string): Promise<FieldMappingRule[]> {
    const mappingsStore = loadStore<Record<string, FieldMappingRule[]>>(STORAGE_MAPPINGS_KEY, {});
    return mappingsStore[itemId] || [];
  },

  async saveFieldMappings(itemId: string, mappings: FieldMappingRule[]): Promise<FieldMappingRule[]> {
    const mappingsStore = loadStore<Record<string, FieldMappingRule[]>>(STORAGE_MAPPINGS_KEY, {});
    mappingsStore[itemId] = mappings;
    saveStore(STORAGE_MAPPINGS_KEY, mappingsStore);
    return mappings;
  },

  // 14. Export Bundle History - bundles released from the partner's server projects, newest first.
  async getExportBundles(partnerId?: string): Promise<ExportBundleInfo[]> {
    const projects = await this.listProjectsWithoutCounts();
    const scoped = partnerId ? projects.filter((p) => p.partnerId === partnerId) : projects;
    const lists = await Promise.all(
      scoped.map(async (project) => {
        try {
          const dtos = await apiClient.get<ExportBundleDto[]>(`/projects/${project.id}/partner-export/bundles`);
          return dtos.map((dto) => toExportBundleInfo(dto, project));
        } catch {
          return [];
        }
      }),
    );
    return lists.flat().sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
  },

  async getExportBundleByProjectId(projectId: string): Promise<ExportBundleInfo | null> {
    if (!isServerProject(projectId)) return null;
    try {
      const [latest] = await apiClient.get<ExportBundleDto[]>(`/projects/${projectId}/partner-export/bundles`);
      return latest ? toExportBundleInfo(latest, await this.fetchProject(projectId)) : null;
    } catch {
      // No conversion_result.export permission or server unreachable: no bundle to show.
      return null;
    }
  },

  // 15. Preview what the server will package (UC-48)
  async previewExport(projectId: string, options: PartnerExportOptions): Promise<PartnerExportPreview> {
    requireServerProjectForExport(projectId);
    try {
      const dto = await apiClient.post<ExportPreviewDto>(`/projects/${projectId}/partner-export/preview`, options);
      return {
        packageName: dto.packageName,
        targetFramework: dto.summary.targetFramework,
        screensIncluded: dto.summary.screensIncluded,
        programsIncluded: dto.summary.programsIncluded,
        excludedItems: dto.summary.excludedItems,
        totalFiles: dto.metrics.totalFiles,
        estimatedSizeKb: dto.metrics.estimatedSizeKb,
      };
    } catch (err) {
      throw await toPartnerExportError(err);
    }
  },

  // 16. Download the bundle ZIP to check it before releasing (nothing is published)
  async downloadExportZip(projectId: string, options: PartnerExportOptions, filename: string): Promise<void> {
    requireServerProjectForExport(projectId);
    try {
      const blob = await apiClient.post<Blob>(`/projects/${projectId}/partner-export/download`, options, {
        responseType: 'blob',
      });
      saveBlob(blob, filename);
    } catch (err) {
      throw await toPartnerExportError(err);
    }
  },

  // 17. Release the bundle and notify the partner. The server stores the ZIP, marks the project
  // exported and emails the partner; notificationStatus says whether the email really went out.
  async triggerExport(data: {
    projectId: string;
    partnerEmail: string;
    customNotes?: string;
    options: PartnerExportOptions;
  }): Promise<ExportBundleInfo> {
    requireServerProjectForExport(data.projectId);
    let dto: ExportBundleDto;
    try {
      dto = await apiClient.post<ExportBundleDto>(`/projects/${data.projectId}/partner-export/publish-and-notify`, {
        partnerEmail: data.partnerEmail.trim(),
        customNotes: data.customNotes?.trim() || undefined,
        options: data.options,
      });
    } catch (err) {
      throw await toPartnerExportError(err);
    }
    return toExportBundleInfo(dto, await this.fetchProject(data.projectId));
  },

  // 18. Re-send the notification of a released bundle
  async retryExportNotification(projectId: string, bundleId: string): Promise<ExportBundleInfo> {
    requireServerProjectForExport(projectId);
    let dto: ExportBundleDto;
    try {
      dto = await apiClient.post<ExportBundleDto>(`/projects/${projectId}/partner-export/bundles/${bundleId}/notify`);
    } catch (err) {
      throw await toPartnerExportError(err);
    }
    return toExportBundleInfo(dto, await this.fetchProject(projectId));
  },

  // 19. Download the exact ZIP that was released
  async downloadReleasedBundle(
    projectId: string,
    bundle: Pick<ExportBundleInfo, 'id' | 'packageName'>,
  ): Promise<void> {
    requireServerProjectForExport(projectId);
    try {
      const blob = await apiClient.get<Blob>(`/projects/${projectId}/partner-export/bundles/${bundle.id}/download`, {
        responseType: 'blob',
      });
      saveBlob(blob, bundle.packageName);
    } catch (err) {
      throw await toPartnerExportError(err);
    }
  },

  // 20. Assign Project to Team Lead & Staff Member. The team lead is saved on the server;
  // the staff member is kept in this browser (the server has no field for it yet).
  async assignProject(
    projectId: string,
    data: {
      teamLeadId?: string;
      teamLeadName?: string;
      staffId?: string;
      staffName?: string;
    },
  ): Promise<PartnerProject> {
    if (!isServerProject(projectId)) {
      throw new PartnerApiError('This project is not stored on the server, so it cannot be assigned.');
    }
    if (data.teamLeadId) {
      try {
        await apiClient.post(`/projects/${projectId}/assign-team-lead`, { teamLeadId: data.teamLeadId });
      } catch (err) {
        throw toPartnerProjectError(err, 'assign');
      }
    }
    saveLink(projectId, {
      ...(data.teamLeadName ? { assignedTeamLeadName: data.teamLeadName } : {}),
      ...(data.staffId ? { assignedStaffId: data.staffId, assignedStaffName: data.staffName } : {}),
    });
    const project = await this.getProjectById(projectId);
    if (!project) throw new PartnerApiError('Project not found');
    return project;
  },

  // 21. Staff roster for assignment, with the number of projects each person is assigned to.
  async getAssignableStaff(): Promise<
    Array<{
      id: string;
      fullName: string;
      email: string;
      role: string;
      activeWorkload: number;
    }>
  > {
    let users: any[];
    try {
      users = await apiClient.get<any[]>('/users');
    } catch {
      return [];
    }
    if (!Array.isArray(users)) return [];
    const projects = await this.listProjectsWithoutCounts().catch(() => [] as PartnerProject[]);
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName || u.name || u.email,
      email: u.email,
      role: u.roles?.[0] || 'CONVERSION_STAFF',
      activeWorkload: projects.filter(
        (p) => !p.isExported && (p.assignedStaffId === u.id || p.assignedTeamLeadId === u.id),
      ).length,
    }));
  },
};
