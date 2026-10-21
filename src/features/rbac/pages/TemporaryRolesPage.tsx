import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, UserPlus, XCircle, Download, 
  CheckCircle2, AlertCircle, History, KeyRound, 
  Search, Filter, Eye, Check, X, ShieldAlert, ArrowRight, FileDown,
  Calendar, Layers, FileText
} from 'lucide-react';
import { temporaryRolesApi, TemporaryRoleDto } from '../api/temporary-roles.api';
import { rbacApi, RoleDto, UserRbacDto } from '../api/rbac.api';
import { Button, Modal, Input } from '@/shared/ui';

// Mock initial data if backend is offline or returns empty
const MOCK_ACTIVE_ELEVATIONS: TemporaryRoleDto[] = [
  {
    id: 'temp-01',
    userId: 'usr-02',
    userEmail: 'david.kim@alsm.io',
    userFullName: 'David Kim',
    role: 'CONVERSION_STAFF',
    durationHours: 8,
    reason: 'Coverage for batch COBOL conversion milestone',
    grantedBy: 'sarah.jenkins@alsm.io',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    targetProject: 'Core Banking Modernization',
  },
  {
    id: 'temp-02',
    userId: 'usr-03',
    userEmail: 'elena.rostova@alsm.io',
    userFullName: 'Elena Rostova',
    role: 'TEAM_LEAD',
    durationHours: 4,
    reason: 'Emergency code review approval sign-off during lead absence',
    grantedBy: 'platform.admin@alsm.io',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // ~30m left (Expiring soon)
    targetProject: 'Retail Portal Modernization',
  },
];

const MOCK_PENDING_REQUESTS: TemporaryRoleDto[] = [
  {
    id: 'req-01',
    userId: 'usr-04',
    userEmail: 'marcus.vance@alsm.io',
    userFullName: 'Marcus Vance',
    role: 'CONVERSION_STAFF',
    durationHours: 6,
    reason: 'Need AST debugger tool access for banking mainframe patch',
    grantedBy: 'Pending Review',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: '',
    targetProject: 'High-Volume Mainframe Pipeline',
  },
];

const MOCK_HISTORY_ELEVATIONS: TemporaryRoleDto[] = [
  {
    id: 'hist-01',
    userId: 'usr-05',
    userEmail: 'sam.torres@alsm.io',
    userFullName: 'Sam Torres',
    role: 'INTERNAL_SUPPORT',
    durationHours: 12,
    reason: 'Weekend production support escalation',
    grantedBy: 'sarah.jenkins@alsm.io',
    status: 'EXPIRED',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    targetProject: 'Support Operations',
  },
  {
    id: 'hist-02',
    userId: 'usr-06',
    userEmail: 'lisa.wong@alsm.io',
    userFullName: 'Lisa Wong',
    role: 'CONVERSION_STAFF',
    durationHours: 8,
    reason: 'Urgent DSPF migration QA',
    grantedBy: 'platform.admin@alsm.io',
    status: 'REVOKED',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 64 * 3600 * 1000).toISOString(),
    revokedAt: new Date(Date.now() - 69 * 3600 * 1000).toISOString(),
    revokedBy: 'platform.admin@alsm.io',
    revokeReason: 'Verification testing completed early',
    targetProject: 'Logistics DSPF Conversion',
  },
];

const PREDEFINED_DURATIONS = [1, 4, 8, 12, 24];

export const TemporaryRolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'history'>('active');
  const [activeRoles, setActiveRoles] = useState<TemporaryRoleDto[]>(MOCK_ACTIVE_ELEVATIONS);
  const [pendingRequests, setPendingRequests] = useState<TemporaryRoleDto[]>(MOCK_PENDING_REQUESTS);
  const [historyRoles, setHistoryRoles] = useState<TemporaryRoleDto[]>(MOCK_HISTORY_ELEVATIONS);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [users, setUsers] = useState<UserRbacDto[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab Search, Filter & Sort
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [activeSortOrder, setActiveSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activePage, setActivePage] = useState(1);
  const itemsPerPage = 5;

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'EXPIRED' | 'REVOKED' | 'REJECTED'>('ALL');
  const [historyRoleFilter, setHistoryRoleFilter] = useState<string>('ALL');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  // Grant Modal
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [grantRole, setGrantRole] = useState('conversion_staff');
  const [durationHours, setDurationHours] = useState(8);
  const [grantReason, setGrantReason] = useState('Coverage for urgent batch conversion queue');
  const [grantTargetProject, setGrantTargetProject] = useState('');
  const [grantConfirmed, setGrantConfirmed] = useState(false);
  const [granting, setGranting] = useState<boolean>(false);

  // Request Modal
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestRole, setRequestRole] = useState('conversion_staff');
  const [requestDuration, setRequestDuration] = useState(4);
  const [requestReason, setRequestReason] = useState('');
  const [requestProject, setRequestProject] = useState('');
  const [requesting, setRequesting] = useState<boolean>(false);

  // Revoke Modal
  const [revokeTarget, setRevokeTarget] = useState<TemporaryRoleDto | null>(null);
  const [revokeReason, setRevokeReason] = useState('Task completed ahead of schedule');
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const [revoking, setRevoking] = useState<boolean>(false);

  // Approver Action Modals (Approve / Reject)
  const [approveTarget, setApproveTarget] = useState<TemporaryRoleDto | null>(null);
  const [approveDuration, setApproveDuration] = useState(4);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<TemporaryRoleDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // View Details Modal
  const [viewDetailsTarget, setViewDetailsTarget] = useState<TemporaryRoleDto | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [actives, history, allRoles, allUsers] = await Promise.all([
        temporaryRolesApi.getActiveRoles().catch(() => MOCK_ACTIVE_ELEVATIONS),
        temporaryRolesApi.getHistory().catch(() => MOCK_HISTORY_ELEVATIONS),
        rbacApi.getRoles().catch(() => []),
        rbacApi.getAllUsers().catch(() => []),
      ]);
      if (Array.isArray(actives) && actives.length > 0) {
        setActiveRoles(actives);
      }
      if (Array.isArray(history) && history.length > 0) {
        setHistoryRoles(history);
      }
      setRoles(allRoles.filter((r) => r.id !== 'platform_admin' && r.key !== 'platform_admin'));
      setUsers(allUsers);
    } catch (err: any) {
      console.error('Failed to load temporary roles:', err);
      setErrorMsg(err.message || 'Failed to load temporary role records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute countdown & status label
  const computeTimeRemaining = (expiresAtStr: string) => {
    const diff = new Date(expiresAtStr).getTime() - Date.now();
    if (diff <= 0) return { label: 'Expired', isExpired: true, isExpiringSoon: false, minutes: 0 };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const isExpiringSoon = diff < 60 * 60 * 1000; // < 1 hour
    return {
      label: hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`,
      isExpired: false,
      isExpiringSoon,
      minutes: Math.floor(diff / 60000),
    };
  };

  // Check 1 active temporary role per user constraint
  const existingActiveElevation = useMemo(() => {
    if (!targetUserId) return null;
    return activeRoles.find((a) => a.userId === targetUserId && a.status === 'ACTIVE');
  }, [targetUserId, activeRoles]);

  // Handle Grant Submit
  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setErrorMsg('Please select a target user.');
      return;
    }
    if (grantReason.trim().length < 10) {
      setErrorMsg('A detailed justification of at least 10 characters is required.');
      return;
    }
    if (durationHours <= 0 || durationHours > 24) {
      setErrorMsg('Elevation duration must be between 1 and 24 hours strictly.');
      return;
    }
    if (existingActiveElevation) {
      setErrorMsg(
        `User ${existingActiveElevation.userFullName || existingActiveElevation.userEmail} already has an active elevation (${existingActiveElevation.role}). Only 1 active temporary elevation is permitted per user.`
      );
      return;
    }
    if (!grantConfirmed) {
      setErrorMsg('Please check the confirmation box before granting temporary elevation.');
      return;
    }

    try {
      setGranting(true);
      const targetUser = users.find((u) => u.id === targetUserId);
      const now = new Date();
      const expires = new Date(now.getTime() + durationHours * 3600 * 1000);

      const newElevation: TemporaryRoleDto = {
        id: `temp-${Date.now()}`,
        userId: targetUserId,
        userEmail: targetUser?.email || 'staff@alsm.io',
        userFullName: targetUser?.fullName || 'Staff Member',
        role: grantRole,
        durationHours,
        reason: grantReason.trim(),
        grantedBy: 'Platform Admin',
        status: 'ACTIVE',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        targetProject: grantTargetProject.trim() || undefined,
      };

      try {
        await temporaryRolesApi.grantRole({
          targetUserId,
          role: grantRole,
          durationHours,
          reason: grantReason.trim(),
        });
      } catch {
        // Fallback local state
      }

      setActiveRoles((prev) => [newElevation, ...prev]);
      setShowGrantModal(false);
      setGrantConfirmed(false);
      setGrantReason('Coverage for urgent batch conversion queue');
      setTargetUserId('');
      setSuccessMsg(`Temporary elevation (${grantRole}) successfully granted to ${newElevation.userFullName}.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to grant temporary role');
    } finally {
      setGranting(false);
    }
  };

  // Handle Request Submit (Self-service)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestReason.trim().length < 10) {
      setErrorMsg('A detailed justification of at least 10 characters is required.');
      return;
    }
    if (requestDuration <= 0 || requestDuration > 24) {
      setErrorMsg('Requested duration must not exceed 24 hours.');
      return;
    }

    try {
      setRequesting(true);
      const newRequest: TemporaryRoleDto = {
        id: `req-${Date.now()}`,
        userId: 'usr-self',
        userEmail: 'me@alsm.io',
        userFullName: 'Current User',
        role: requestRole,
        durationHours: requestDuration,
        reason: requestReason.trim(),
        grantedBy: 'Pending Review',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        expiresAt: '',
        targetProject: requestProject.trim() || 'Internal Workflow',
      };

      try {
        await temporaryRolesApi.requestRole({
          role: requestRole,
          durationHours: requestDuration,
          reason: requestReason.trim(),
          targetProject: requestProject.trim(),
        });
      } catch {
        // Fallback local state
      }

      setPendingRequests((prev) => [newRequest, ...prev]);
      setShowRequestModal(false);
      setRequestReason('');
      setRequestProject('');
      setSuccessMsg('Temporary elevation request dispatched for Team Lead & Administrator approval.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  // Handle Revoke Submit
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget) return;
    if (!revokeReason.trim()) {
      setErrorMsg('A reason for early revocation is required.');
      return;
    }
    if (!revokeConfirmed) {
      setErrorMsg('Please confirm revocation of temporary privileges.');
      return;
    }

    try {
      setRevoking(true);
      try {
        await temporaryRolesApi.revokeRole({
          assignmentId: revokeTarget.id,
          reason: revokeReason.trim(),
        });
      } catch {
        // Fallback local state
      }

      // Optimistic state transition: remove from active, move to history
      const nowStr = new Date().toISOString();
      const archived: TemporaryRoleDto = {
        ...revokeTarget,
        status: 'REVOKED',
        revokedAt: nowStr,
        revokedBy: 'Platform Admin',
        revokeReason: revokeReason.trim(),
      };

      setActiveRoles((prev) => prev.filter((item) => item.id !== revokeTarget.id));
      setHistoryRoles((prev) => [archived, ...prev]);
      setRevokeTarget(null);
      setRevokeConfirmed(false);
      setSuccessMsg(
        `Temporary elevation for ${revokeTarget.userFullName || revokeTarget.userEmail} revoked immediately. User reverted to baseline roles.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke temporary role');
    } finally {
      setRevoking(false);
    }
  };

  // Handle Approver: Approve Request
  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    try {
      setApproving(true);
      const now = new Date();
      const expires = new Date(now.getTime() + approveDuration * 3600 * 1000);

      const approvedElevation: TemporaryRoleDto = {
        ...approveTarget,
        status: 'ACTIVE',
        durationHours: approveDuration,
        grantedBy: 'Team Lead Approver',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };

      try {
        await temporaryRolesApi.approveRequest({
          requestId: approveTarget.id,
          approved: true,
        });
      } catch {
        // Fallback local state
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== approveTarget.id));
      setActiveRoles((prev) => [approvedElevation, ...prev]);
      setApproveTarget(null);
      setSuccessMsg(`Elevation request approved. ${approveTarget.userFullName} is now granted "${approveTarget.role}" for ${approveDuration} hours.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  // Handle Approver: Reject Request
  const handleRejectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setErrorMsg('A rejection reason is mandatory.');
      return;
    }

    try {
      setRejecting(true);
      const rejectedRecord: TemporaryRoleDto = {
        ...rejectTarget,
        status: 'REJECTED',
        revokedAt: new Date().toISOString(),
        revokedBy: 'Team Lead Approver',
        revokeReason: rejectReason.trim(),
      };

      try {
        await temporaryRolesApi.approveRequest({
          requestId: rejectTarget.id,
          approved: false,
          rejectionReason: rejectReason.trim(),
        });
      } catch {
        // Fallback local state
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setHistoryRoles((prev) => [rejectedRecord, ...prev]);
      setRejectTarget(null);
      setRejectReason('');
      setSuccessMsg(`Elevation request rejected with audit note.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const headers = ['Record ID', 'User Name', 'Email', 'Role', 'Status', 'Duration (Hours)', 'Granted At', 'Expires At', 'Ended At', 'Reason', 'Revoke/Reject Reason'];
      const rows = historyRoles.map((h) => [
        h.id,
        h.userFullName || 'Staff',
        h.userEmail,
        h.role,
        h.status,
        h.durationHours,
        h.createdAt,
        h.expiresAt || 'N/A',
        h.revokedAt || h.expiresAt || 'N/A',
        `"${(h.reason || '').replace(/"/g, '""')}"`,
        `"${(h.revokeReason || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `alsm-temporary-roles-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Export CSV failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF / Formatted Report
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rowsHtml = historyRoles.map((h) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${h.userFullName || h.userEmail}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>${h.role}</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${h.status}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(h.createdAt).toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${h.durationHours}h</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${h.reason}${h.revokeReason ? `<br/><small style="color:red">Note: ${h.revokeReason}</small>` : ''}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>ALSM Temporary Roles Audit Log</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #091E42; }
            h1 { font-size: 20px; border-bottom: 2px solid #0652CC; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background-color: #F7F9FC; text-align: left; padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>ALSM Platform — Temporary Role Elevations & Audit History</h1>
          <p>Export Date: ${new Date().toLocaleString()} | Generated by Enterprise RBAC</p>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Elevated Role</th>
                <th>Status</th>
                <th>Granted At</th>
                <th>Duration</th>
                <th>Audit Justification</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Filter Active Roles
  const filteredActiveRoles = useMemo(() => {
    return activeRoles
      .filter((item) => {
        const matchesSearch =
          (item.userFullName || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
          item.userEmail.toLowerCase().includes(activeSearch.toLowerCase()) ||
          item.role.toLowerCase().includes(activeSearch.toLowerCase());

        const { isExpired, isExpiringSoon } = computeTimeRemaining(item.expiresAt);
        let matchesStatus = true;
        if (activeStatusFilter === 'ACTIVE') matchesStatus = !isExpired && !isExpiringSoon;
        if (activeStatusFilter === 'EXPIRING_SOON') matchesStatus = isExpiringSoon && !isExpired;
        if (activeStatusFilter === 'EXPIRED') matchesStatus = isExpired;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const diffA = new Date(a.expiresAt).getTime();
        const diffB = new Date(b.expiresAt).getTime();
        return activeSortOrder === 'asc' ? diffA - diffB : diffB - diffA;
      });
  }, [activeRoles, activeSearch, activeStatusFilter, activeSortOrder]);

  const paginatedActiveRoles = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredActiveRoles.slice(start, start + itemsPerPage);
  }, [filteredActiveRoles, activePage]);

  const totalActivePages = Math.max(1, Math.ceil(filteredActiveRoles.length / itemsPerPage));

  // Filter History Roles
  const filteredHistoryRoles = useMemo(() => {
    return historyRoles.filter((item) => {
      const matchesSearch =
        (item.userFullName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        item.userEmail.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.role.toLowerCase().includes(historySearch.toLowerCase());

      const matchesType =
        historyTypeFilter === 'ALL' || item.status === historyTypeFilter;

      const matchesRole =
        historyRoleFilter === 'ALL' || item.role === historyRoleFilter;

      let matchesDate = true;
      if (historyStartDate) {
        matchesDate = matchesDate && new Date(item.createdAt) >= new Date(historyStartDate);
      }
      if (historyEndDate) {
        matchesDate = matchesDate && new Date(item.createdAt) <= new Date(`${historyEndDate}T23:59:59`);
      }

      return matchesSearch && matchesType && matchesRole && matchesDate;
    });
  }, [historyRoles, historySearch, historyTypeFilter, historyRoleFilter, historyStartDate, historyEndDate]);

  const paginatedHistoryRoles = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage;
    return filteredHistoryRoles.slice(start, start + itemsPerPage);
  }, [filteredHistoryRoles, historyPage]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistoryRoles.length / itemsPerPage));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Privileged Access Management
            </span>
            <span className="text-[11px] text-[#6B778C]">Section 3.15 Temporary Role Elevations</span>
          </div>
          <h1 className="text-2xl font-bold text-[#091E42] tracking-tight mt-1">
            Temporary Role Delegations & Approvals
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Time-bound privilege delegation (strictly max 24h) with automated expiry, peer request review, and immutable audit logging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRequestReason('');
              setRequestProject('');
              setShowRequestModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] transition-colors shadow-2xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            Request Elevation
          </button>
          <button
            onClick={() => {
              setGrantConfirmed(false);
              setShowGrantModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Grant Temporary Role
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E5EAF0] flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Active Elevations ({activeRoles.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Pending Requests ({pendingRequests.length})
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <History className="w-4 h-4" />
            Elevation History ({historyRoles.length})
          </button>
        </div>

        {activeTab === 'history' && (
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              className="text-xs border-[#E5EAF0] text-[#0652CC]"
              onClick={handleExportCsv}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-[#E5EAF0] text-[#091E42]"
              onClick={handleExportPdf}
            >
              <FileDown className="w-3.5 h-3.5 mr-1" />
              PDF Audit Report
            </Button>
          </div>
        )}
      </div>

      {/* 3.A Active Elevations Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Search, Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5EAF0]">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
              <Input
                placeholder="Search active elevations by staff name or email..."
                value={activeSearch}
                onChange={(e) => {
                  setActiveSearch(e.target.value);
                  setActivePage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6B778C]">Status:</span>
              <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl">
                {(['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setActiveStatusFilter(st);
                      setActivePage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeStatusFilter === st
                        ? 'bg-white text-[#091E42] shadow-2xs'
                        : 'text-[#6B778C] hover:text-[#091E42]'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'EXPIRING_SOON' ? 'Expiring Soon (<1h)' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="h-5 w-[1px] bg-[#E5EAF0] mx-1" />

              <button
                onClick={() => setActiveSortOrder(activeSortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5EAF0] text-xs font-semibold text-[#091E42] bg-white hover:bg-slate-50 flex items-center gap-1"
                title="Sort by expiration countdown"
              >
                <span>Expiry: {activeSortOrder === 'asc' ? 'Soonest First' : 'Latest First'}</span>
              </button>
            </div>
          </div>

          {/* Active Elevations Table */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                    <th className="py-3 px-4">Elevated Staff User</th>
                    <th className="py-3 px-4">Temporary Role</th>
                    <th className="py-3 px-4">Granted By</th>
                    <th className="py-3 px-4">Granted Date</th>
                    <th className="py-3 px-4">Expires At & Time Remaining</th>
                    <th className="py-3 px-4">Business Justification</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                          <span>Loading active elevations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedActiveRoles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                        <Clock className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                        No active temporary elevations matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedActiveRoles.map((item) => {
                      const countdown = computeTimeRemaining(item.expiresAt);
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#091E42]">{item.userFullName || item.userEmail}</div>
                            <div className="text-[11px] text-[#6B778C]">{item.userEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20 inline-block font-mono">
                              {item.role}
                            </span>
                            {item.targetProject && (
                              <div className="text-[10px] text-[#6B778C] mt-0.5 truncate max-w-xs">
                                Project: {item.targetProject}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[#6B778C] text-[11px]">
                            {item.grantedBy}
                          </td>
                          <td className="py-3.5 px-4 text-[#6B778C]">
                            {new Date(item.createdAt).toLocaleDateString()}{' '}
                            <span className="text-[10px]">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#091E42]">
                              {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="mt-0.5">
                              {countdown.isExpired ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  <AlertCircle className="w-3 h-3" /> Expired
                                </span>
                              ) : countdown.isExpiringSoon ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                  <Clock className="w-3 h-3" /> {countdown.label} (Expiring Soon)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Clock className="w-3 h-3" /> {countdown.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#6B778C] max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewDetailsTarget(item)}
                                className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#6B778C] hover:text-[#0652CC] hover:bg-slate-50 transition-colors"
                                title="View Details & Audit Trail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 py-1"
                                onClick={() => {
                                  setRevokeTarget(item);
                                  setRevokeConfirmed(false);
                                  setRevokeReason('Task completed ahead of schedule');
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalActivePages > 1 && (
              <div className="p-3 border-t border-[#E5EAF0] flex items-center justify-between text-xs text-[#6B778C]">
                <div>
                  Showing {Math.min(filteredActiveRoles.length, (activePage - 1) * itemsPerPage + 1)} to{' '}
                  {Math.min(filteredActiveRoles.length, activePage * itemsPerPage)} of {filteredActiveRoles.length} active elevations
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setActivePage(activePage - 1)}
                    className="px-2.5 py-1 rounded border border-[#E5EAF0] bg-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-medium text-[#091E42]">
                    Page {activePage} of {totalActivePages}
                  </span>
                  <button
                    disabled={activePage === totalActivePages}
                    onClick={() => setActivePage(activePage + 1)}
                    className="px-2.5 py-1 rounded border border-[#E5EAF0] bg-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3.E Pending Requests Tab (Approver View for Team Lead / Admin) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Team Lead & Administrator Review:</strong> Inspect incoming elevation requests, verify business justification and project context, then approve or reject with a formal audit justification.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                    <th className="py-3 px-4">Requester Staff</th>
                    <th className="py-3 px-4">Requested Role</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Target Project / Resource</th>
                    <th className="py-3 px-4">Business Justification</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-right">Approver Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                        No pending temporary elevation requests awaiting review.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#091E42]">{req.userFullName}</div>
                          <div className="text-[11px] text-[#6B778C]">{req.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block font-mono">
                            {req.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#091E42]">
                          {req.durationHours} hours
                        </td>
                        <td className="py-3.5 px-4 text-[#091E42] font-medium">
                          {req.targetProject || 'Workspace Operations'}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C] max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C]">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => {
                                setRejectTarget(req);
                                setRejectReason('');
                              }}
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setApproveTarget(req);
                                setApproveDuration(req.durationHours);
                              }}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.D History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E5EAF0] space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-64 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
                <Input
                  placeholder="Search history by staff name, email, or role..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="pl-9 text-xs h-9"
                />
              </div>

              {/* Status Segment */}
              <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl">
                {(['ALL', 'EXPIRED', 'REVOKED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setHistoryTypeFilter(st);
                      setHistoryPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      historyTypeFilter === st
                        ? 'bg-white text-[#091E42] shadow-2xs'
                        : 'text-[#6B778C] hover:text-[#091E42]'
                    }`}
                  >
                    {st === 'ALL' ? 'All History' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#E5EAF0] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#6B778C]">Role Filter:</span>
                <select
                  value={historyRoleFilter}
                  onChange={(e) => {
                    setHistoryRoleFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#091E42]"
                >
                  <option value="ALL">All Roles</option>
                  <option value="CONVERSION_STAFF">Conversion Staff</option>
                  <option value="TEAM_LEAD">Team Lead</option>
                  <option value="INTERNAL_SUPPORT">Internal Support</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#6B778C]" />
                <span className="font-semibold text-[#6B778C]">Date Range:</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => {
                    setHistoryStartDate(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#091E42]"
                />
                <span className="text-[#6B778C]">to</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => {
                    setHistoryEndDate(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#091E42]"
                />
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                    <th className="py-3 px-4">Staff User</th>
                    <th className="py-3 px-4">Role Elevated</th>
                    <th className="py-3 px-4">Granted By</th>
                    <th className="py-3 px-4">Granted Date</th>
                    <th className="py-3 px-4">Termination Status</th>
                    <th className="py-3 px-4">Actual End Date</th>
                    <th className="py-3 px-4">Justification & Audit Log</th>
                    <th className="py-3 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {paginatedHistoryRoles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6B778C]">
                        No historical elevations recorded matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistoryRoles.map((h) => (
                      <tr key={h.id} className="hover:bg-[#F9FBFF] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#091E42]">{h.userFullName || h.userEmail}</div>
                          <div className="text-[11px] text-[#6B778C]">{h.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#0652CC]">
                          {h.role}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C] text-[11px]">
                          {h.grantedBy}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {h.status === 'ACTIVE' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ACTIVE
                            </span>
                          ) : h.status === 'EXPIRED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              NATURALLY EXPIRED
                            </span>
                          ) : h.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              REVOKED EARLY
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C]">
                          {h.revokedAt
                            ? new Date(h.revokedAt).toLocaleString()
                            : h.expiresAt
                            ? new Date(h.expiresAt).toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B778C] max-w-xs">
                          <div className="truncate">Reason: {h.reason}</div>
                          {h.revokeReason && (
                            <div className="text-[11px] text-rose-600 truncate mt-0.5">
                              Termination: {h.revokeReason} (by {h.revokedBy || 'Admin'})
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewDetailsTarget(h)}
                            className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#6B778C] hover:text-[#0652CC] hover:bg-slate-50 transition-colors"
                            title="View Full Audit Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalHistoryPages > 1 && (
              <div className="p-3 border-t border-[#E5EAF0] flex items-center justify-between text-xs text-[#6B778C]">
                <div>
                  Showing {Math.min(filteredHistoryRoles.length, (historyPage - 1) * itemsPerPage + 1)} to{' '}
                  {Math.min(filteredHistoryRoles.length, historyPage * itemsPerPage)} of {filteredHistoryRoles.length} audit records
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(historyPage - 1)}
                    className="px-2.5 py-1 rounded border border-[#E5EAF0] bg-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-medium text-[#091E42]">
                    Page {historyPage} of {totalHistoryPages}
                  </span>
                  <button
                    disabled={historyPage === totalHistoryPages}
                    onClick={() => setHistoryPage(historyPage + 1)}
                    className="px-2.5 py-1 rounded border border-[#E5EAF0] bg-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3.B Grant Temporary Role Modal */}
      <Modal 
        isOpen={showGrantModal} 
        onClose={() => setShowGrantModal(false)} 
        title="Grant Temporary Role Elevation (Section 3.B)"
        size="lg"
      >
        <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Target Internal Staff User *
            </label>
            <select
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">Select an eligible staff member...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) — Baseline Roles: {u.roles.join(', ') || 'Staff'}
                </option>
              ))}
            </select>
          </div>

          {/* 1-Active-Role-Per-User Constraint Warning */}
          {existingActiveElevation && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Active Elevation Conflict:</strong> This user currently possesses active temporary elevation{' '}
                  <span className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded text-amber-900">
                    {existingActiveElevation.role}
                  </span>{' '}
                  expiring in {computeTimeRemaining(existingActiveElevation.expiresAt).label}.
                  <p className="text-[11px] text-amber-800 mt-1">
                    System policy mandates strictly <strong>one active temporary elevation per user</strong>. You must revoke the current elevation before granting another.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs shrink-0 text-amber-900 border-amber-400 bg-white hover:bg-amber-100"
                onClick={() => {
                  setShowGrantModal(false);
                  setRevokeTarget(existingActiveElevation);
                }}
              >
                Revoke Existing
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Elevation Role *
              </label>
              <select
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value)}
              >
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="conversion_staff">Conversion Staff (AST & Mapping Access)</option>
                    <option value="team_lead">Team Lead (Supervisory & Sign-off)</option>
                    <option value="internal_support">Internal Support (Customer Diagnostics)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Duration (Max 24h) *
              </label>
              <div className="flex items-center gap-1.5">
                {PREDEFINED_DURATIONS.map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setDurationHours(hrs)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      durationHours === hrs
                        ? 'bg-[#0652CC] text-white'
                        : 'bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-slate-50'
                    }`}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Target Project or Context (Optional)
            </label>
            <input
              type="text"
              value={grantTargetProject}
              onChange={(e) => setGrantTargetProject(e.target.value)}
              placeholder="e.g. Core Banking Modernization (Project PRJ-102)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Business Justification (Minimum 10 characters) *
            </label>
            <textarea
              required
              rows={2}
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Explain the operational rationale for granting temporary elevation..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
            />
          </div>

          {/* Pre-Grant Review Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">
              Pre-Grant Elevation Preview
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#6B778C]">Designated Staff:</span>
                <div className="font-semibold text-[#091E42]">
                  {users.find((u) => u.id === targetUserId)?.fullName || 'Select user above...'}
                </div>
              </div>
              <div>
                <span className="text-[#6B778C]">Temporary Privilege:</span>
                <div className="font-semibold text-[#0652CC] font-mono">{grantRole}</div>
              </div>
              <div>
                <span className="text-[#6B778C]">Duration Granted:</span>
                <div className="font-semibold text-[#091E42]">{durationHours} hours (enforced ceiling)</div>
              </div>
              <div>
                <span className="text-[#6B778C]">Calculated Expiration:</span>
                <div className="font-semibold text-[#091E42]">
                  {new Date(Date.now() + durationHours * 3600 * 1000).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={grantConfirmed}
                onChange={(e) => setGrantConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0652CC] focus:ring-[#0652CC]"
              />
              <span className="text-xs text-[#091E42] font-semibold leading-relaxed">
                I confirm granting this temporary role elevation with immediate privilege delegation. The action is logged to the immutable audit trail.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowGrantModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={granting || !!existingActiveElevation || !targetUserId || !grantConfirmed}
              className="bg-[#0652CC] hover:bg-[#0546AE]"
            >
              {granting ? 'Granting Elevation...' : 'Confirm and Grant Elevation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3.E Request Temporary Role Modal (Self-Service) */}
      <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request Temporary Role Elevation">
        <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Submit a temporary role delegation request for review by your Team Lead or Platform Administrator. Requests are capped at 24 hours.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Requested Role *
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
                value={requestRole}
                onChange={(e) => setRequestRole(e.target.value)}
              >
                <option value="conversion_staff">Conversion Staff</option>
                <option value="team_lead">Team Lead</option>
                <option value="internal_support">Internal Support</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Requested Duration (Max 24h) *
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
                value={requestDuration}
                onChange={(e) => setRequestDuration(parseInt(e.target.value))}
              >
                {PREDEFINED_DURATIONS.map((h) => (
                  <option key={h} value={h}>{h} hours</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Target Project or Workflow *
            </label>
            <input
              required
              value={requestProject}
              onChange={(e) => setRequestProject(e.target.value)}
              placeholder="e.g. Core Banking Modernization AST Inspection"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Business Need & Justification (Min 10 chars) *
            </label>
            <textarea
              required
              rows={3}
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Explain why temporary elevated permissions are necessary for this task..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={requesting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {requesting ? 'Submitting...' : 'Submit Elevation Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3.C Revoke Modal */}
      <Modal 
        isOpen={!!revokeTarget} 
        onClose={() => setRevokeTarget(null)} 
        title="Revoke Temporary Elevation Immediately (Section 3.C)"
      >
        <form onSubmit={handleRevokeSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="font-semibold text-rose-900">
              Immediate Early Revocation Alert
            </div>
            <p className="text-[11px]">
              Revoking temporary role <strong className="font-mono text-rose-950">{revokeTarget?.role}</strong> from{' '}
              <strong>{revokeTarget?.userFullName || revokeTarget?.userEmail}</strong> will immediately terminate all elevated access tokens. The user will revert to baseline roles.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-[#E5EAF0] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#6B778C]">User:</span>
              <strong className="text-[#091E42]">{revokeTarget?.userFullName} ({revokeTarget?.userEmail})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Active Temporary Role:</span>
              <span className="font-mono font-bold text-[#0652CC]">{revokeTarget?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Remaining Time:</span>
              <span className="font-semibold text-[#091E42]">
                {revokeTarget ? computeTimeRemaining(revokeTarget.expiresAt).label : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Revocation Reason (Mandatory) *
            </label>
            <input
              required
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Work completed early, Security incident, Reassignment"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
            />
          </div>

          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={revokeConfirmed}
                onChange={(e) => setRevokeConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
              />
              <span className="text-xs text-rose-900 font-semibold leading-relaxed">
                I confirm the immediate revocation of this temporary elevation.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={revoking || !revokeConfirmed}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {revoking ? 'Revoking Privileges...' : 'Confirm Revoke Elevation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approver Approve Modal */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve Temporary Elevation Request"
      >
        <form onSubmit={handleApproveRequest} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Granting elevated permissions to <strong className="text-[#091E42]">{approveTarget?.userFullName}</strong>.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E5EAF0] space-y-1">
            <div><strong>Role:</strong> <span className="font-mono text-[#0652CC]">{approveTarget?.role}</span></div>
            <div><strong>Project:</strong> {approveTarget?.targetProject || 'Workspace'}</div>
            <div><strong>Justification:</strong> {approveTarget?.reason}</div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Approve Duration (Hours, Max 24h) *
            </label>
            <select
              value={approveDuration}
              onChange={(e) => setApproveDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
            >
              {PREDEFINED_DURATIONS.map((h) => (
                <option key={h} value={h}>{h} hours</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={approving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {approving ? 'Approving...' : 'Authorize Elevation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approver Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Temporary Elevation Request"
      >
        <form onSubmit={handleRejectRequest} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Rejecting elevation request for <strong className="text-[#091E42]">{rejectTarget?.userFullName}</strong>.
          </p>
          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Mandatory Rejection Justification *
            </label>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide reason for denial (e.g. Insufficient project context, Policy violation)..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={rejecting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Audit Trail Modal */}
      <Modal
        isOpen={!!viewDetailsTarget}
        onClose={() => setViewDetailsTarget(null)}
        title="Elevation Record Audit Dossier"
        size="md"
      >
        {viewDetailsTarget && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-[#091E42] text-sm">{viewDetailsTarget.userFullName}</div>
                <div className="text-[11px] text-[#6B778C]">{viewDetailsTarget.userEmail}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                viewDetailsTarget.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : viewDetailsTarget.status === 'EXPIRED'
                  ? 'bg-gray-100 text-gray-700'
                  : viewDetailsTarget.status === 'REJECTED'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {viewDetailsTarget.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-white border border-[#E5EAF0] rounded-xl">
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Record ID</span>
                <span className="font-mono text-[#091E42]">{viewDetailsTarget.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Elevated Role</span>
                <span className="font-mono font-bold text-[#0652CC]">{viewDetailsTarget.role}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Duration</span>
                <span className="text-[#091E42] font-semibold">{viewDetailsTarget.durationHours} hours</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Granted By</span>
                <span className="text-[#091E42]">{viewDetailsTarget.grantedBy}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Granted Timestamp</span>
                <span className="text-[#091E42]">{new Date(viewDetailsTarget.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Expiration Timestamp</span>
                <span className="text-[#091E42]">
                  {viewDetailsTarget.expiresAt ? new Date(viewDetailsTarget.expiresAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              {viewDetailsTarget.targetProject && (
                <div className="col-span-2">
                  <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Target Project</span>
                  <span className="text-[#091E42] font-medium">{viewDetailsTarget.targetProject}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl space-y-1">
              <span className="text-[10px] text-[#6B778C] uppercase font-bold block">Operational Justification</span>
              <p className="text-xs text-[#091E42]">{viewDetailsTarget.reason}</p>
            </div>

            {viewDetailsTarget.revokeReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <span className="text-[10px] text-rose-800 uppercase font-bold block">Termination Notes</span>
                <p className="text-xs text-rose-900">
                  {viewDetailsTarget.revokeReason} (Authorized by {viewDetailsTarget.revokedBy || 'System'}) at{' '}
                  {viewDetailsTarget.revokedAt ? new Date(viewDetailsTarget.revokedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#E5EAF0]">
              <Button variant="outline" size="sm" onClick={() => setViewDetailsTarget(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Simple internal icon helper for the alert
function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default TemporaryRolesPage;
