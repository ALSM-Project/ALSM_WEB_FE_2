import { vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';

/** A project that exists on the server (24-hex id), as the page tests' stand-in backend. */
export const SERVER_PROJECT_ID = '6650aa00aa00aa00aa00aa01';
export const SCREEN_INQ_ID = '6650bb00bb00bb00bb00bb0a';
export const SCREEN_REG_ID = '6650bb00bb00bb00bb00bb0b';
export const PARTNER_ID = '6650cc00cc00cc00cc00cc01';

export const serverPartner = {
  id: PARTNER_ID,
  name: 'Fintech Nexus International',
  contactEmail: 'm.vance@fintechnexus.io',
  contactName: 'Marcus Vance',
  primaryDomain: 'fintechnexus.io',
  engagementType: 'Dedicated Modernization',
  status: 'ACTIVE',
  completedExportCount: 0,
  createdAt: '2026-10-22T03:00:00.000Z',
  updatedAt: '2026-10-22T03:00:00.000Z',
};

export const serverProject = {
  id: SERVER_PROJECT_ID,
  name: 'Core Banking Customer Portal',
  organizationId: 'org-1',
  conversionType: 'BMS_DSPF_TO_FRONTEND',
  status: 'ACTIVE',
  assignedStaffId: 'staff-01',
  assignedStaffName: 'Marcus Vance',
  createdAt: '2026-10-22T03:00:00.000Z',
  updatedAt: '2026-10-22T03:00:00.000Z',
};

export const serverScreens = [
  {
    id: SCREEN_INQ_ID,
    projectId: SERVER_PROJECT_ID,
    name: 'CUSTINQ.bms',
    sourceType: 'BMS',
    updatedAt: '2026-10-22T04:00:00.000Z',
  },
  {
    id: SCREEN_REG_ID,
    projectId: SERVER_PROJECT_ID,
    name: 'CUSTREG.bms',
    sourceType: 'BMS',
    updatedAt: '2026-10-22T04:00:00.000Z',
  },
];

export const serverJobs = [
  {
    id: 'job-inq',
    screenId: SCREEN_INQ_ID,
    status: 'COMPLETED',
    attemptCount: 1,
    maxAttempts: 3,
    createdAt: '2026-10-22T05:00:00.000Z',
    updatedAt: '2026-10-22T05:05:00.000Z',
  },
];

export const serverStaff = [
  { id: 'u-lead', fullName: 'Lena Lead', email: 'lena@alsm.io', roles: ['TEAM_LEAD'] },
  { id: 'u-staff', fullName: 'Sam Staff', email: 'sam@alsm.io', roles: ['CONVERSION_STAFF'] },
];

export interface ServerData {
  partners?: unknown[];
  projects?: unknown[];
  screens?: unknown[];
  jobs?: unknown[];
  bundles?: unknown[];
  users?: unknown[];
}

/** Makes the mocked apiClient answer GETs like a backend holding exactly this data. */
export function mockServer(data: ServerData = {}): void {
  const partners = data.partners ?? [serverPartner];
  const projects = data.projects ?? [serverProject];
  const screens = data.screens ?? serverScreens;
  const jobs = data.jobs ?? serverJobs;
  const bundles = data.bundles ?? [];
  const users = data.users ?? serverStaff;
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === '/partners') return partners;
    if (url === '/projects') return projects;
    if (url === '/users') return users;
    const project = /^\/projects\/([^/]+)(\/.*)?$/.exec(url);
    if (project) {
      const [, id, rest] = project;
      if (!rest) {
        const found = (projects as { id: string }[]).find((p) => p.id === id);
        if (found) return found;
        throw Object.assign(new Error('HTTP 404'), { response: { status: 404, data: {} } });
      }
      if (rest === '/screens') return screens;
      if (rest === '/conversions') return jobs;
      if (rest === '/partner-export/bundles') return bundles;
    }
    throw new Error(`unmocked GET ${url}`);
  });
}

/** Remembers, in this browser, which partner a server project belongs to. */
export function linkProjectToPartner(projectId = SERVER_PROJECT_ID, partnerId = PARTNER_ID): void {
  localStorage.setItem(
    'alsm_partner_project_links_v1',
    JSON.stringify({ [projectId]: { partnerId, partnerName: serverPartner.name } }),
  );
}
