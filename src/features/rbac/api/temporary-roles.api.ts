import { apiClient } from '@/services/api/apiClient';

export interface TemporaryRoleDto {
  id: string;
  userId: string;
  userEmail: string;
  userFullName?: string;
  role: string;
  durationHours: number;
  reason: string;
  grantedBy: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING' | 'REJECTED';
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  targetProject?: string;
}

type UserRef = string | { _id?: string; id?: string; fullName?: string; email?: string } | undefined;

/** A temporary role as the backend stores it (user fields are populated on list calls). */
interface ServerTemporaryRole {
  id?: string;
  _id?: string;
  userId?: UserRef;
  roleId: string;
  grantedBy?: UserRef;
  grantedAt?: string;
  createdAt?: string;
  expiresAt?: string;
  durationHours: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  requestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  revokedAt?: string;
  revokedBy?: UserRef;
  revocationReason?: string;
  projectId?: string;
}

const refId = (ref: UserRef): string => (typeof ref === 'string' ? ref : (ref?._id ?? ref?.id ?? ''));
const refName = (ref: UserRef): string =>
  typeof ref === 'string' ? ref : (ref?.fullName ?? ref?.email ?? '');

/** Turns a stored record into what the page shows. The backend keeps requests and grants in
 * one collection: a request waiting for review is requestStatus PENDING, a refused one REJECTED. */
export function toTemporaryRole(doc: ServerTemporaryRole, now = Date.now()): TemporaryRoleDto {
  let status: TemporaryRoleDto['status'] = doc.status;
  if (doc.requestStatus === 'PENDING') status = 'PENDING';
  else if (doc.requestStatus === 'REJECTED') status = 'REJECTED';
  // An elevation past its end time has no effect, even before the expiry job marks it.
  else if (status === 'ACTIVE' && doc.expiresAt && new Date(doc.expiresAt).getTime() <= now) status = 'EXPIRED';

  const user = typeof doc.userId === 'string' ? undefined : doc.userId;
  return {
    id: doc.id ?? doc._id ?? '',
    userId: refId(doc.userId),
    userEmail: user?.email ?? '',
    userFullName: user?.fullName,
    role: doc.roleId,
    durationHours: doc.durationHours,
    reason: doc.reason,
    grantedBy: refName(doc.grantedBy),
    status,
    expiresAt: status === 'PENDING' ? '' : (doc.expiresAt ?? ''),
    createdAt: doc.createdAt ?? doc.grantedAt ?? '',
    revokedAt: doc.revokedAt,
    revokedBy: doc.revokedBy ? refName(doc.revokedBy) : undefined,
    revokeReason: doc.revocationReason,
    targetProject: doc.projectId,
  };
}

const BASE = '/rbac/temporary-roles';

export const temporaryRolesApi = {
  /** Elevations that are running now. */
  getActiveRoles: async (): Promise<TemporaryRoleDto[]> => {
    const docs = await apiClient.get<ServerTemporaryRole[]>(BASE, { params: { status: 'ACTIVE' } });
    return (Array.isArray(docs) ? docs : []).map((d) => toTemporaryRole(d)).filter((r) => r.status === 'ACTIVE');
  },

  /** Every record, newest first: running, ended, revoked and requests. */
  getHistory: async (): Promise<TemporaryRoleDto[]> => {
    const docs = await apiClient.get<ServerTemporaryRole[]>(`${BASE}/history`);
    return (Array.isArray(docs) ? docs : []).map((d) => toTemporaryRole(d));
  },

  exportHistoryCsv: async (): Promise<string> => {
    return apiClient.get<string>(`${BASE}/history/export`);
  },

  grantRole: async (data: {
    targetUserId: string;
    role: string;
    durationHours: number;
    reason: string;
    /** Project the elevation is for, when one was chosen. */
    projectId?: string;
  }): Promise<TemporaryRoleDto> => {
    const doc = await apiClient.post<ServerTemporaryRole>(BASE, {
      targetUserId: data.targetUserId,
      roleId: data.role,
      durationHours: data.durationHours,
      reason: data.reason,
      ...(data.projectId ? { projectId: data.projectId } : {}),
    });
    return toTemporaryRole(doc);
  },

  requestRole: async (data: { role: string; durationHours: number; reason: string }): Promise<TemporaryRoleDto> => {
    const doc = await apiClient.post<ServerTemporaryRole>(`${BASE}/request`, {
      roleId: data.role,
      durationHours: data.durationHours,
      reason: data.reason,
    });
    return toTemporaryRole(doc);
  },

  approveRequest: async (data: {
    requestId: string;
    approved: boolean;
    rejectionReason?: string;
  }): Promise<TemporaryRoleDto> => {
    const doc = await apiClient.post<ServerTemporaryRole>(`${BASE}/requests/${data.requestId}/review`, {
      approved: data.approved,
      ...(data.rejectionReason ? { reason: data.rejectionReason } : {}),
    });
    return toTemporaryRole(doc);
  },

  revokeRole: async (data: { assignmentId: string; reason: string }): Promise<TemporaryRoleDto> => {
    const doc = await apiClient.post<ServerTemporaryRole>(`${BASE}/${data.assignmentId}/revoke`, {
      reason: data.reason,
    });
    return toTemporaryRole(doc);
  },
};
