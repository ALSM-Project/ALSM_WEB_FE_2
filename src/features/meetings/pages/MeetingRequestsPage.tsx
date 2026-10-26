import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  Video,
  Search,
  UserCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, toast } from '@/shared/ui';
import { meetingRequestsApi } from '../api/meeting-requests.api';
import type {
  CreateMeetingRequestPayload,
  MeetingFormat,
  MeetingPriority,
  MeetingRequest,
  MeetingRequestStatus,
} from '../types/meeting-request';
import { MeetingRequestDetailDrawer } from '../components/MeetingRequestDetailDrawer';
import { ProposeSlotsModal } from '../components/ProposeSlotsModal';
import { ConfirmMeetingModal } from '../components/ConfirmMeetingModal';
import { RescheduleMeetingModal } from '../components/RescheduleMeetingModal';
import { RecordOutcomeModal } from '../components/RecordOutcomeModal';
import { ConvertToOpportunityModal } from '../components/ConvertToOpportunityModal';
import { CreateEnterpriseQuoteModal } from '../components/CreateEnterpriseQuoteModal';
import { NewMeetingRequestModal } from '../components/NewMeetingRequestModal';

export const MeetingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState<MeetingRequestStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [consultationType, setConsultationType] = useState<string>('');
  const [priority, setPriority] = useState<MeetingPriority | ''>('');
  const [salesRepFilter, setSalesRepFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Selected meeting for drawer & modals
  const [activeMeeting, setActiveMeeting] = useState<MeetingRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isProposeSlotsOpen, setIsProposeSlotsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRecordOutcomeOpen, setIsRecordOutcomeOpen] = useState(false);
  const [isConvertToOpportunityOpen, setIsConvertToOpportunityOpen] = useState(false);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);

  // Data Fetching
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'meetings',
      'requests',
      selectedStatus,
      consultationType,
      priority,
      salesRepFilter,
      projectFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      limit,
      searchTerm,
    ],
    queryFn: () =>
      meetingRequestsApi.listMeetingRequests({
        status: selectedStatus,
        consultationType: consultationType || undefined,
        priority: priority || undefined,
        assignedSalesId: salesRepFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm.trim() || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    staleTime: 1000 * 30,
  });

  // Fetch consultation types
  const { data: consultationTypes = [] } = useQuery({
    queryKey: ['meetings', 'consultation-types'],
    queryFn: () => meetingRequestsApi.getConsultationTypes(),
    staleTime: 1000 * 60 * 10,
  });

  // Mutations
  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings', 'requests'] });
  };

  const createRequestMutation = useMutation({
    mutationFn: (payload: CreateMeetingRequestPayload) =>
      meetingRequestsApi.createMeetingRequest(payload),
    onSuccess: (created) => {
      invalidateList();
      setActionSuccessMessage(`Successfully created consultation request ${created.requestId}`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const assignSalesMutation = useMutation({
    mutationFn: ({ id, salesUserId, salesName }: { id: string; salesUserId: string; salesName?: string }) =>
      meetingRequestsApi.assignSales(id, { salesUserId, salesName }),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Assigned sales representative to ${updated.requestId}`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const proposeSlotsMutation = useMutation({
    mutationFn: ({
      id,
      slots,
      message,
    }: {
      id: string;
      slots: Array<{ startTime: string; endTime: string }>;
      message?: string;
    }) => meetingRequestsApi.proposeMeetingSlots(id, { slots, message }),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Proposed available consultation slots for ${updated.requestId}`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const confirmMeetingMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        scheduledStartTime: string;
        scheduledEndTime: string;
        format: MeetingFormat;
        customMeetingUrl?: string;
        createGoogleMeet: boolean;
      };
    }) => meetingRequestsApi.confirmMeeting(id, payload),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Confirmed meeting for ${updated.requestId}! Meet room is linked.`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { scheduledStartTime: string; scheduledEndTime: string; reason: string };
    }) => meetingRequestsApi.rescheduleMeeting(id, payload),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Rescheduled appointment for ${updated.requestId}`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      meetingRequestsApi.cancelMeeting(id, reason),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Cancelled consultation request ${updated.requestId}`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const recordOutcomeMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { summary: string; qualificationScore?: number; nextSteps?: string };
    }) => meetingRequestsApi.recordOutcome(id, payload),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Recorded outcome and completed consultation for ${updated.requestId}!`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const convertToOpportunityMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { title?: string; estimatedValue?: number; notes?: string };
    }) => meetingRequestsApi.convertToOpportunity(id, payload),
    onSuccess: ({ meeting: updated }) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Successfully converted ${updated.requestId} to CRM Sales Opportunity!`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const createQuoteMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        planName: string;
        amount: number;
        discountPercent?: number;
        discountReason?: string;
        projectScope?: string;
      };
    }) => meetingRequestsApi.createEnterpriseQuote(id, payload),
    onSuccess: ({ meeting: updated, quoteNumber }) => {
      invalidateList();
      setActiveMeeting(updated);
      setActionSuccessMessage(`Created Enterprise Quotation ${quoteNumber} for ${updated.customer.companyName}!`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => toast.error(`Error: ${err?.response?.data?.message || err?.message}`),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      meetingRequestsApi.addInternalNote(id, content),
    onSuccess: (updated) => {
      invalidateList();
      setActiveMeeting(updated);
    },
  });

  const handleOpenDrawer = (meeting: MeetingRequest) => {
    setActiveMeeting(meeting);
    setIsDrawerOpen(true);
  };

  const handleQuickAssign = (meeting: MeetingRequest) => {
    const salesName = prompt('Enter Sales Representative Name:', 'Alice Commercial');
    if (!salesName) return;
    assignSalesMutation.mutate({
      id: meeting.id,
      salesUserId: '6a8d90b0569ea93e27ad862c',
      salesName,
    });
  };

  const handleQuickReject = (meeting: MeetingRequest) => {
    const reason = prompt('Please provide reason for rejecting this meeting request:', 'Scheduling conflict / Not qualified');
    if (!reason) return;
    cancelMutation.mutate({ id: meeting.id, reason });
  };

  const handleClearFilters = () => {
    setSelectedStatus('');
    setSearchTerm('');
    setConsultationType('');
    setPriority('');
    setSalesRepFilter('');
    setProjectFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedStatus ||
    searchTerm ||
    consultationType ||
    priority ||
    salesRepFilter ||
    projectFilter ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt'
  );

  const items = data?.items || [];
  const statusCounts = data?.statusCounts || {};
  const calendarConnected = data?.calendarIntegration?.isEnabled ?? false;

  // Real KPI calculations
  const totalRequests = data?.total ?? items.length;
  const pendingReview = (statusCounts['NEW_REQUEST'] || 0) + (statusCounts['PENDING_SCHEDULING'] || 0) + (statusCounts['RESCHEDULE_REQUESTED'] || 0);
  
  // Scheduled today calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const scheduledToday = items.filter((m) => {
    const start = m.scheduling?.scheduledStartTime;
    return Boolean(start && start.startsWith(todayStr));
  }).length;

  const upcomingMeetings = (statusCounts['SCHEDULED'] || 0) + (statusCounts['CONFIRMED'] || 0);
  const completedMeetings = statusCounts['COMPLETED'] || 0;
  const cancelledMeetings = (statusCounts['CANCELLED'] || 0) + (statusCounts['NO_SHOW'] || 0);

  const getStatusBadgeVariant = (status: string): 'secondary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return 'success';
      case 'IN_PROGRESS':
      case 'COMPLETED':
        return 'secondary';
      case 'PENDING_SCHEDULING':
      case 'NEW_REQUEST':
      case 'RESCHEDULE_REQUESTED':
        return 'warning';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (p: string): 'danger' | 'warning' | 'secondary' => {
    if (p === 'URGENT') return 'danger';
    if (p === 'HIGH') return 'warning';
    return 'secondary';
  };

  const formatMeetingType = (type?: string) => {
    if (!type) return 'Discovery Consultation';
    switch (type) {
      case 'SALES_SERVICE':
        return 'Sales & Service';
      case 'LEGACY_MODERNIZATION':
        return 'Legacy Modernization Demo';
      case 'TECHNICAL':
        return 'Technical Support';
      case 'ENTERPRISE_ARCHITECTURE':
        return 'Enterprise Architecture';
      case 'CONTRACT_PACKAGE':
        return 'Contract Discussion';
      case 'CUSTOM_REQUIREMENTS':
        return 'Custom Requirements';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE3EC] pb-4">
        <div>
          <PageHeader
            title="Meeting Requests"
          />
          <p className="text-xs text-[#8491A3] mt-1 font-medium">
            Manage customer meeting requests, scheduling, and follow-up activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar integration indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs">
            <Video className="w-3.5 h-3.5 text-[#244A70]" />
            <span className="text-[11px] text-slate-500">Meet Sync:</span>
            <span
              className={`w-2 h-2 rounded-full ${
                calendarConnected ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-700">
              {calendarConnected ? 'Active' : 'Manual / Fallback'}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/sales/meeting-requests/new')}
            className="inline-flex items-center gap-1.5 text-xs bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Meeting
          </Button>

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Action Feedback Alert ────────────────────────────────────────────── */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── KPI Cards (Section 4.3 - Equal-sized & Responsive) ───────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Requests */}
        <div
          onClick={() => { setSelectedStatus(''); setPage(1); }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1 cursor-pointer transition-all hover:border-[#244A70] ${
            selectedStatus === '' ? 'ring-2 ring-[#244A70]/20 border-[#244A70]' : 'border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block">
            Total Requests
          </span>
          <div className="text-2xl font-extrabold text-[#17263A]">
            {isLoading ? '...' : totalRequests}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">All recorded leads</span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => { setSelectedStatus('PENDING_SCHEDULING'); setPage(1); }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1 cursor-pointer transition-all hover:border-amber-400 ${
            selectedStatus === 'PENDING_SCHEDULING' || selectedStatus === 'NEW_REQUEST'
              ? 'ring-2 ring-amber-400/20 border-amber-400 bg-amber-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Pending Review
          </span>
          <div className="text-2xl font-extrabold text-amber-600">
            {isLoading ? '...' : pendingReview}
          </div>
          <span className="text-[11px] text-amber-600/80 block font-medium">Requires triage</span>
        </div>

        {/* Scheduled Today */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Scheduled Today
          </span>
          <div className="text-2xl font-extrabold text-blue-700">
            {isLoading ? '...' : scheduledToday}
          </div>
          <span className="text-[11px] text-blue-600/80 block font-medium">Active today</span>
        </div>

        {/* Upcoming Meetings */}
        <div
          onClick={() => { setSelectedStatus('SCHEDULED'); setPage(1); }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1 cursor-pointer transition-all hover:border-blue-400 ${
            selectedStatus === 'SCHEDULED' || selectedStatus === 'CONFIRMED'
              ? 'ring-2 ring-blue-400/20 border-blue-400 bg-blue-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-[#244A70] uppercase tracking-wider block">
            Upcoming Meetings
          </span>
          <div className="text-2xl font-extrabold text-[#244A70]">
            {isLoading ? '...' : upcomingMeetings}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">Confirmed slots</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => { setSelectedStatus('COMPLETED'); setPage(1); }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1 cursor-pointer transition-all hover:border-emerald-500 ${
            selectedStatus === 'COMPLETED' ? 'ring-2 ring-emerald-500/20 border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Completed
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {isLoading ? '...' : completedMeetings}
          </div>
          <span className="text-[11px] text-emerald-600/80 block font-medium">Held consultations</span>
        </div>

        {/* Cancelled */}
        <div
          onClick={() => { setSelectedStatus('CANCELLED'); setPage(1); }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1 cursor-pointer transition-all hover:border-rose-400 ${
            selectedStatus === 'CANCELLED' ? 'ring-2 ring-rose-400/20 border-rose-400 bg-rose-50/20' : 'border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Cancelled
          </span>
          <div className="text-2xl font-extrabold text-rose-600">
            {isLoading ? '...' : cancelledMeetings}
          </div>
          <span className="text-[11px] text-rose-600/80 block font-medium">Declined / no show</span>
        </div>
      </div>

      {/* ── Status Pills (Section 4.4 Quick Filter) ─────────────────────────── */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 min-w-max">
          <button
            type="button"
            onClick={() => { setSelectedStatus(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === '' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            All Requests ({totalRequests})
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('NEW_REQUEST'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatus === 'NEW_REQUEST' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <span>New Request</span>
            {(statusCounts['NEW_REQUEST'] || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#244A70] text-white">
                {statusCounts['NEW_REQUEST']}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('PENDING_SCHEDULING'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatus === 'PENDING_SCHEDULING' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <span>Pending Scheduling</span>
            {(statusCounts['PENDING_SCHEDULING'] || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {statusCounts['PENDING_SCHEDULING']}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('CONFIRMED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'CONFIRMED' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Confirmed
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('SCHEDULED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'SCHEDULED' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Scheduled
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('IN_PROGRESS'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'IN_PROGRESS' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            In Progress
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('COMPLETED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'COMPLETED' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Completed
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('CANCELLED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'CANCELLED' ? 'bg-white text-[#17263A] shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* ── Filter Bar (Section 4.4 - Comprehensive & Functional) ────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Search */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search customer, lead, organization, email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70] focus:bg-white"
            />
          </div>

          {/* 2. Meeting Type */}
          <div>
            <select
              value={consultationType}
              onChange={(e) => { setConsultationType(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Meeting Types</option>
              {Array.isArray(consultationTypes) && consultationTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sales Representative */}
          <div>
            <input
              type="text"
              value={salesRepFilter}
              onChange={(e) => { setSalesRepFilter(e.target.value); setPage(1); }}
              placeholder="Sales representative..."
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
          </div>

          {/* 4. Priority */}
          <div>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value as MeetingPriority | ''); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="createdAt-desc">Newest Created</option>
              <option value="createdAt-asc">Oldest Created</option>
              <option value="scheduledStartTime-asc">Nearest Meeting</option>
              <option value="priority-desc">Highest Priority</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Range & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              title="From Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              title="To Date"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Meeting Requests Table (Section 4.5) ────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card variant="outline" padding="lg">
          <div role="alert" className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load meeting requests</p>
              <p className="text-xs text-rose-500 mt-0.5">{(error as any)?.message || 'Server connection error'}</p>
            </div>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card variant="outline" padding="lg" className="bg-white border-slate-200">
          <div className="py-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Consultation Requests Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no meeting requests matching the selected filters. Click Create Meeting to submit one.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/sales/meeting-requests/new')}
              className="mt-2 text-xs bg-[#244A70]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Meeting
            </Button>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Meeting</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Meeting Type</th>
                  <th className="py-3 px-4">Sales Representative</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenDrawer(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* 1. Meeting Title & ID */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-[#17263A] group-hover:text-[#244A70] transition-colors truncate" title={item.topic || ''}>
                        {item.topic || 'Consultation Meeting'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-slate-400">{item.requestId}</span>
                        <Badge variant={getPriorityBadgeVariant(item.priority || 'MEDIUM')}>
                          {item.priority || 'MEDIUM'}
                        </Badge>
                      </div>
                    </td>

                    {/* 2. Customer Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.customer?.fullName || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {item.customer?.email || 'N/A'}
                      </div>
                    </td>

                    {/* 3. Organization Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{item.customer?.companyName || 'Individual / Prospect'}</span>
                      </div>
                    </td>

                    {/* 4. Requested Date */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">
                        {item.scheduling?.requestedDate || (item.scheduling?.scheduledStartTime ? new Date(item.scheduling.scheduledStartTime).toLocaleDateString('vi-VN') : 'Flexible slot')}
                      </div>
                      {item.scheduling?.requestedTime && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.scheduling.requestedTime} ({item.scheduling.timezone || 'ICT'})
                        </div>
                      )}
                    </td>

                    {/* 5. Meeting Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#244A70] border border-blue-100">
                        {formatMeetingType(item.consultationType)}
                      </span>
                    </td>

                    {/* 6. Sales Representative */}
                    <td className="py-3.5 px-4">
                      {item.assignment?.assignedSalesName ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.assignment.assignedSalesName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* 7. Status Badge */}
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(item.status || 'NEW_REQUEST')}>
                        {(item.status || 'NEW_REQUEST').replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    {/* 8. Created At */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    {/* 9. Actions (View, Schedule, Reject) */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDrawer(item)}
                          className="text-[11px] py-1 px-2.5 bg-white border-slate-200 text-[#17263A] hover:bg-slate-50"
                        >
                          View
                        </Button>

                        {/* Schedule action if not scheduled and not cancelled */}
                        {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && !item.scheduling?.scheduledStartTime && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setActiveMeeting(item);
                              setIsConfirmOpen(true);
                            }}
                            className="text-[11px] py-1 px-2.5 bg-[#244A70] text-white hover:bg-[#244A70]"
                          >
                            Schedule
                          </Button>
                        )}

                        {/* Reject / Cancel action if pending/new */}
                        {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickReject(item)}
                            className="text-[11px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            title="Reject consultation request"
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Real Pagination Controls */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
                {Math.min(page * limit, data?.total || items.length)} of {data?.total || items.length} requests
              </span>
              <span className="text-slate-300">|</span>
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-2.5 py-1 bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))}
                disabled={page >= (data?.totalPages || 1)}
                className="text-xs px-2.5 py-1 bg-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-Over Detail Drawer (Section 4.6) ──────────────────────────── */}
      <MeetingRequestDetailDrawer
        meeting={activeMeeting}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAssignSales={() => {
          if (activeMeeting) handleQuickAssign(activeMeeting);
        }}
        onProposeSlots={() => setIsProposeSlotsOpen(true)}
        onConfirmMeeting={() => setIsConfirmOpen(true)}
        onReschedule={() => setIsRescheduleOpen(true)}
        onCancel={() => {
          if (!activeMeeting) return;
          const reason = prompt('Reason for cancelling consultation:', 'Customer requested cancellation');
          if (reason) cancelMutation.mutate({ id: activeMeeting.id, reason });
        }}
        onRecordOutcome={() => setIsRecordOutcomeOpen(true)}
        onConvertToOpportunity={() => setIsConvertToOpportunityOpen(true)}
        onCreateQuote={() => setIsCreateQuoteOpen(true)}
        onAddNote={async (content) => {
          if (activeMeeting) {
            await addNoteMutation.mutateAsync({ id: activeMeeting.id, content });
          }
        }}
        calendarConnected={calendarConnected}
      />

      {/* ── Action Modals ───────────────────────────────────────────────────── */}
      {activeMeeting && (
        <>
          <ProposeSlotsModal
            meeting={activeMeeting}
            isOpen={isProposeSlotsOpen}
            onClose={() => setIsProposeSlotsOpen(false)}
            onSubmit={async (slots, message) => {
              await proposeSlotsMutation.mutateAsync({
                id: activeMeeting.id,
                slots,
                message,
              });
            }}
            isSubmitting={proposeSlotsMutation.isPending}
          />

          <ConfirmMeetingModal
            meeting={activeMeeting}
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onSubmit={async (payload) => {
              await confirmMeetingMutation.mutateAsync({
                id: activeMeeting.id,
                payload,
              });
            }}
            isSubmitting={confirmMeetingMutation.isPending}
            calendarConnected={calendarConnected}
          />

          <RescheduleMeetingModal
            meeting={activeMeeting}
            isOpen={isRescheduleOpen}
            onClose={() => setIsRescheduleOpen(false)}
            onSubmit={async (payload) => {
              await rescheduleMutation.mutateAsync({
                id: activeMeeting.id,
                payload,
              });
            }}
            isSubmitting={rescheduleMutation.isPending}
          />

          <RecordOutcomeModal
            meeting={activeMeeting}
            isOpen={isRecordOutcomeOpen}
            onClose={() => setIsRecordOutcomeOpen(false)}
            onSubmit={async (payload) => {
              await recordOutcomeMutation.mutateAsync({
                id: activeMeeting.id,
                payload,
              });
            }}
            isSubmitting={recordOutcomeMutation.isPending}
          />

          <ConvertToOpportunityModal
            meeting={activeMeeting}
            isOpen={isConvertToOpportunityOpen}
            onClose={() => setIsConvertToOpportunityOpen(false)}
            onSubmit={async (payload) => {
              await convertToOpportunityMutation.mutateAsync({
                id: activeMeeting.id,
                payload,
              });
            }}
            isSubmitting={convertToOpportunityMutation.isPending}
          />

          <CreateEnterpriseQuoteModal
            meeting={activeMeeting}
            isOpen={isCreateQuoteOpen}
            onClose={() => setIsCreateQuoteOpen(false)}
            onSubmit={async (payload) => {
              await createQuoteMutation.mutateAsync({
                id: activeMeeting.id,
                payload,
              });
            }}
            isSubmitting={createQuoteMutation.isPending}
          />
        </>
      )}

      {/* New Consultation Request Modal */}
      <NewMeetingRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={async (payload) => {
          await createRequestMutation.mutateAsync(payload);
        }}
        isSubmitting={createRequestMutation.isPending}
      />
    </div>
  );
};
