import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Clock, DollarSign, MessageSquare,
  FileText, CheckCircle2, AlertCircle, Video, Check, Award, Lock,
  Sparkles, ExternalLink, History, UserCheck, Building2, Globe,
  ShieldCheck, Layers, RefreshCw, ChevronRight, User,
  Tag, PhoneCall, Workflow, ArrowUpRight, Edit3, Share2
} from 'lucide-react';
import { crmApi, LeadDto, LeadQuote, LeadContract, LeadStage } from '../api/crm.api';
import { adminApi, AuditLogDto } from '@/features/admin/api/admin.api';
import { formatVnd } from '@/shared/utils/currency';
import { formatDate, formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { Button, Card } from '@/shared/ui';

// Modals
import { LogInteractionModal } from '../components/LogInteractionModal';
import { ScheduleDemoModal } from '../components/ScheduleDemoModal';
import { CreateQuoteModal } from '../components/CreateQuoteModal';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ManageStageModal } from '../components/ManageStageModal';
import { CustomerActivationModal } from '../components/CustomerActivationModal';
import { RequestLegalInfoModal } from '../components/RequestLegalInfoModal';
import { EditLeadModal } from '../components/EditLeadModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigation } from '@/context/NavigationContext';

const PIPELINE_STAGES: { key: LeadStage; label: string; description: string }[] = [
  { key: 'NEW', label: 'New', description: 'Inbound or captured prospect' },
  { key: 'CONTACTED', label: 'Contacted', description: 'Initial contact established' },
  { key: 'QUALIFIED', label: 'Qualified', description: 'Scope & requirements verified' },
  { key: 'PROPOSAL', label: 'Proposal', description: 'Quotation delivered' },
  { key: 'NEGOTIATION', label: 'Negotiation', description: 'Contract terms in review' },
  { key: 'WON', label: 'Closed Won', description: 'Activated customer tenant' },
];

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { setCustomBreadcrumbs } = useNavigation();

  const canCreateContracts = hasPermission('sales.leads.manage');
  const canViewAudit = hasPermission('audit.view') || hasPermission('sales.reports.view');

  const [lead, setLead] = useState<LeadDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'demos' | 'quotes' | 'contracts' | 'activation' | 'audit'>('activity');

  // Backend Audit Logs state
  const [backendAuditLogs, setBackendAuditLogs] = useState<AuditLogDto[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Modal Visibility States
  const [showLogCallModal, setShowLogCallModal] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState<boolean>(false);
  const [showManageStageModal, setShowManageStageModal] = useState<boolean>(false);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);
  const [showRequestLegalModal, setShowRequestLegalModal] = useState<boolean>(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState<boolean>(false);

  // Document Previews
  const [previewQuote, setPreviewQuote] = useState<LeadQuote | null>(null);
  const [previewContract, setPreviewContract] = useState<LeadContract | null>(null);

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const data = await crmApi.getLeadById(leadId);
      setLead(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchAuditLogs = useCallback(async () => {
    if (!leadId || !canViewAudit) return;
    try {
      setAuditLoading(true);
      const logs = await adminApi.getAuditLogs({ resourceId: leadId, limit: 100 });
      setBackendAuditLogs(logs || []);
    } catch {
      // Fallback gracefully without throwing
      setBackendAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
    fetchAuditLogs();
  }, [fetchLead, fetchAuditLogs]);

  const companyCandidate = [lead?.company, lead?.companyName].find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  const titleCandidate = typeof lead?.title === 'string' ? lead.title.trim() : '';
  const leadDisplayName = companyCandidate?.trim()
    || (titleCandidate && !/^[a-f\d]{24}$/i.test(titleCandidate) ? titleCandidate : '')
    || lead?.contactName?.trim()
    || (lead?.id ? `Lead ${lead.id.slice(0, 8)}` : 'Lead Dossier');

  // Set system breadcrumbs: Leads (CRM) > Lead Name
  useEffect(() => {
    if (leadId) {
      setCustomBreadcrumbs([
        { label: 'Leads (CRM)', path: '/sales/leads' },
        { label: leadDisplayName },
      ]);
      return () => {
        setCustomBreadcrumbs(null);
      };
    }
  }, [leadId, leadDisplayName, setCustomBreadcrumbs]);

  // Combined audit events: backend audit records + lead.stageAudit + interactions
  const combinedAuditLogs = useMemo(() => {
    const list: Array<{
      id: string;
      timestamp: string;
      actor: string;
      action: string;
      details: string;
      entity: string;
      ipAddress?: string;
    }> = [];

    // 1. From backend audit API
    backendAuditLogs.forEach((b) => {
      list.push({
        id: b.id,
        timestamp: b.timestamp,
        actor: b.actor || 'System Admin',
        action: b.action.replace(/_/g, ' '),
        details: b.metadata ? JSON.stringify(b.metadata) : 'System operation executed',
        entity: b.resourceType || 'LEAD',
        ipAddress: b.ipAddress,
      });
    });

    // 2. From lead stage transitions
    lead?.stageAudit?.forEach((s) => {
      const exists = list.some(
        (item) => item.timestamp === s.timestamp && item.details.includes(s.toStage),
      );
      if (!exists) {
        list.push({
          id: s.id,
          timestamp: s.timestamp,
          actor: s.changedBy || 'Sales Representative',
          action: 'STAGE CHANGE',
          details: `${s.fromStage} → ${s.toStage}${s.notes ? ` ("${s.notes}")` : ''}`,
          entity: 'LEAD',
        });
      }
    });

    // 3. From contracts
    lead?.contracts?.forEach((c) => {
      list.push({
        id: `cnt-${c.id}`,
        timestamp: c.createdAt || c.effectiveDate,
        actor: 'Legal & Sales',
        action: 'CONTRACT DRAFT',
        details: `${c.contractNumber}: ${c.title} (${c.status})`,
        entity: 'CONTRACT',
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [backendAuditLogs, lead?.stageAudit, lead?.contracts]);

  if (loading) {
    return (
      <div className="py-24 text-center text-[#8491A3]">
        <div className="w-9 h-9 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin mx-auto mb-3.5" />
        <span className="text-sm font-medium">Loading lead dossier from ALSM CRM repository...</span>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#17263A]">Lead Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          The requested lead identifier was not found or may have been deleted from the database.
        </p>
        <Button variant="primary" size="sm" className="mt-5" onClick={() => navigate('/sales/leads')}>
          Return to Leads Directory
        </Button>
      </div>
    );
  }

  const hasSignedContract = lead.contracts?.some(
    (c) => c.status === 'FULLY_SIGNED' || c.status === 'SIGNED',
  );
  const isWon = lead.stage === 'WON';
  const isLost = lead.stage === 'LOST';

  // Navigate to dedicated Create Contract wizard with pre-fills
  const handleOpenCreateContract = (quoteId?: string) => {
    const query = new URLSearchParams({ leadId: lead.id });
    if (quoteId) query.set('quoteId', quoteId);
    navigate(`/sales/contracts/new?${query.toString()}`);
  };

  // Navigate to dedicated Schedule Demo / Meeting Room creation page with lead pre-fills
  const handleOpenScheduleDemo = () => {
    const query = new URLSearchParams({
      leadId: lead.id,
      company: lead.company || (lead as any).companyName || '',
      email: (lead as any).contactEmail || lead.email || '',
      title: `ALSM Modernization Demo: ${lead.company || (lead as any).companyName || 'Client'}`,
    });
    navigate(`/meetings/create?${query.toString()}`);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold p-1 cursor-pointer">&times;</button>
        </div>
      )}

      {/* ── SECTION A: LEAD HEADER ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Identity */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">{leadDisplayName}</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-[#244A70] border border-blue-200">
                Score: {lead.score}
              </span>
              {isWon ? (
                <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Closed Won (Customer Active)
                </span>
              ) : isLost ? (
                <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Closed Lost
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Stage: {lead.stage}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-[#8491A3]">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">{lead.contactName}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#244A70]" />
                <a href={`mailto:${lead.email}`} className="text-slate-700 hover:text-[#244A70] hover:underline">
                  {lead.email}
                </a>
              </span>
              {lead.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <a href={`tel:${lead.phone}`} className="text-slate-700 hover:underline">
                    {lead.phone}
                  </a>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Rep:</span>
                <span className="font-semibold text-slate-800">{lead.assignedToName || 'Unassigned'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Source:</span>
                <span className="font-medium text-slate-700">{lead.source}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons (Strictly Prioritized: Primary = Create Quote, Create Contract; Secondary = Log Call, Schedule Demo, Update Stage) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Secondary Actions */}
            <button
              onClick={() => setShowLogCallModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] shadow-2xs transition-colors cursor-pointer"
              title="Record phone call, meeting note or email"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Log Call / Note</span>
            </button>

            <button
              onClick={() => handleOpenScheduleDemo()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] shadow-2xs transition-colors cursor-pointer"
              title="Schedule customer demonstration with Google Meet link"
            >
              <Video className="w-3.5 h-3.5 text-indigo-600" />
              <span>Schedule Demo</span>
            </button>

            <button
              onClick={() => setShowManageStageModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] shadow-2xs transition-colors cursor-pointer"
              title="Change pipeline stage"
            >
              <Workflow className="w-3.5 h-3.5 text-amber-600" />
              <span>Update Stage</span>
            </button>

            <button
              onClick={() => setShowRequestLegalModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-[#244A70] rounded-xl text-xs font-semibold hover:bg-blue-100/70 shadow-2xs transition-colors cursor-pointer"
              title="Open message and email template to request legal entity details"
            >
              <Share2 className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Request Legal Info</span>
            </button>

            <button
              onClick={() => setShowEditLeadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] shadow-2xs transition-colors cursor-pointer"
              title="Update lead contact and legal entity details"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit Lead Details</span>
            </button>

            {/* Primary Actions */}
            <button
              onClick={() => setShowCreateQuoteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Generate new commercial pricing quote"
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Create Quote</span>
            </button>

            {canCreateContracts && (
              <button
                onClick={() => handleOpenCreateContract()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Open dedicated New Contract Wizard"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Create Contract</span>
              </button>
            )}

            {/* Highlighted Activation CTA if contract is signed */}
            {hasSignedContract && !isWon && (
              <button
                onClick={() => setShowActivationModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs ring-2 ring-emerald-300 transition-all cursor-pointer"
                title="Contract signed! Ready for Customer Activation"
              >
                <Sparkles className="w-4 h-4 text-emerald-100" />
                <span>Customer Activation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION B: PIPELINE STAGE STEPPER ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Deal Pipeline:
            </span>
            <span className="text-xs font-bold text-[#17263A] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Current: {lead.stage}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isLost ? (
              <span className="text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Opportunity Lost
              </span>
            ) : (
              <button
                onClick={() => setShowManageStageModal(true)}
                className="text-xs text-[#244A70] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                <span>Edit Stage / Transition</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Stepper Grid (Connected Segmented Bar - No Nested Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded-xl overflow-hidden border border-slate-200 divide-x divide-y sm:divide-y-0 divide-slate-200 mt-3.5 bg-slate-50">
          {PIPELINE_STAGES.map((st, idx) => {
            const isCurrent = lead.stage === st.key;
            const stageOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
            const currentIdx = stageOrder.indexOf(lead.stage);
            const isPassed = !isLost && currentIdx > idx;

            return (
              <div
                key={st.key}
                onClick={() => {
                  if (st.key === 'WON') {
                    setShowActivationModal(true);
                  } else {
                    setShowManageStageModal(true);
                  }
                }}
                className={`p-3 text-left transition-colors cursor-pointer relative ${
                  isCurrent
                    ? st.key === 'WON'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#244A70] text-white'
                    : isPassed
                    ? 'bg-blue-50/80 hover:bg-blue-100/70'
                    : 'bg-white hover:bg-slate-50'
                }`}
                title={
                  st.key === 'WON'
                    ? isWon
                      ? 'Customer Activated & Tenant Provisioned'
                      : 'Requires signed contract & Customer Activation'
                    : `Pipeline stage: ${st.label}`
                }
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-white' : isPassed ? 'text-blue-900' : 'text-slate-700'
                  }`}>
                    Step {idx + 1}
                  </span>
                  {isCurrent ? (
                    st.key === 'WON' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )
                  ) : isPassed ? (
                    <Check className="w-3.5 h-3.5 text-blue-800" />
                  ) : st.key === 'WON' ? (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  ) : null}
                </div>
                <div className={`font-bold text-xs mt-1 truncate ${
                  isCurrent ? 'text-white' : isPassed ? 'text-blue-950' : 'text-slate-900'
                }`}>
                  {st.label}
                </div>
                <div className={`text-xs truncate mt-0.5 ${
                  isCurrent ? (st.key === 'WON' ? 'text-emerald-100 font-medium' : 'text-blue-100 font-medium') : isPassed ? 'text-blue-900 font-medium' : 'text-slate-700 font-medium'
                }`}>
                  {st.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION C: LEAD OVERVIEW (4 BALANCED COLUMNS) ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* 1. Contact Details */}
        <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#244A70]" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact & Legal Entity</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditLeadModal(true)}
                className="text-xs text-[#244A70] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                title="Update legal entity and contact info"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <span className="text-slate-600 text-xs font-semibold block">Company / Organization</span>
                <span className="font-bold text-[#17263A] text-sm">{lead.company || lead.companyName || '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-600 text-xs font-semibold block">Tax ID / VAT Number</span>
                  <span className="font-semibold text-slate-800 font-mono text-xs">
                    {lead.taxId || <span className="text-amber-700 font-sans italic text-xs">Not provided</span>}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 text-xs font-semibold block">Authorized Signer</span>
                  <span className="font-semibold text-slate-800 truncate block text-xs">
                    {lead.representativeName || lead.contactName}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-600 text-xs font-semibold block">Primary Contact</span>
                <span className="font-semibold text-slate-800 text-xs">{lead.contactName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-[#244A70] shrink-0" />
                <a href={`mailto:${lead.email}`} className="truncate hover:underline hover:text-[#244A70]">
                  {lead.email}
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lead.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Vietnam
            </span>
            <span className="text-slate-600 font-mono text-xs">ID: {lead.id.slice(0, 8)}</span>
          </div>
        </Card>

        {/* 2. Source & Representative */}
        <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Source & Rep</span>
              <UserCheck className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Lead Source:</span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {lead.source}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Sales Rep:</span>
                <span className="font-semibold text-slate-800">{lead.assignedToName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Created Date:</span>
                <span className="text-slate-800 font-medium">{formatDate(lead.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Last Contact:</span>
                <span className="text-slate-800 font-medium">{formatDate(lead.lastContactAt, 'None yet')}</span>
              </div>
            </div>
          </div>
          {lead.conversationId ? (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(`/crm/conversations?leadId=${lead.id}`)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 text-[#244A70] hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#244A70]" />
                <span>Open Customer Chat</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
              Direct intake lead (no chat thread)
            </div>
          )}
        </Card>

        {/* 3. Commercial Scope */}
        <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Commercial Scope</span>
              <DollarSign className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <span className="text-slate-600 text-xs font-semibold block">Deal Investment Value</span>
                <div className="font-bold text-xl text-blue-700">
                  {formatVnd(lead.dealValue || lead.estimatedValue || 0)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Payment Status:</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  lead.payment?.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : !lead.payment?.required
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {lead.payment?.status || (lead.payment?.required ? 'PENDING' : 'WAIVED')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Requested Scope:</span>
                <span className="font-semibold text-slate-800">
                  {(lead.estimatedScreens || lead.estimatedPrograms)
                    ? `${lead.estimatedScreens || 0} screens • ${lead.estimatedPrograms || 0} programs`
                    : 'Standard Assessment'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Est. Close Date:</span>
                <span className="text-slate-800 font-medium">{formatDate(lead.expectedCloseDate, 'Not set')}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Currency: <strong className="text-slate-800">VND</strong></span>
            <span>Mode: <strong className="text-slate-800">Hybrid SOW</strong></span>
          </div>
        </Card>

        {/* 4. Tenant & Provisioning */}
        <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tenant & Provisioning</span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {isWon ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Customer Tenant Active</span>
                  </div>
                  <div>
                    <span className="text-slate-600 text-xs font-semibold block">Organization Tenant</span>
                    <span className="font-semibold text-slate-900 block truncate">
                      {lead.provisioning?.organizationName || lead.company}
                    </span>
                    <span className="font-mono text-xs text-slate-600 block truncate">
                      ID: {lead.provisioning?.organizationId || lead.convertedOrganizationId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Resource Quota:</span>
                    <span className="font-semibold text-slate-800">
                      {lead.estimatedScreens || 20} screens • {lead.estimatedPrograms || 5} programs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Quota Health:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      Normal (Healthy)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Pipeline State:</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {lead.stage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Organization:</span>
                    <span className="text-slate-500 italic">Not Configured</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Legal Contract:</span>
                    <span className={`font-semibold text-xs ${hasSignedContract ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {hasSignedContract ? 'Signed (Ready)' : 'Pending Signature'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Activation:</span>
                    <span className="text-slate-500 italic">Awaiting Sign-off</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
            {(isWon || lead.convertedOrganizationId || lead.provisioning?.organizationId) && (
              <button
                type="button"
                onClick={() => navigate(`/admin/billing/usage?orgId=${lead.provisioning?.organizationId || lead.convertedOrganizationId}`)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 text-[#244A70] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <span>View Usage & Quotas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setActiveTab('activation')}
              className="w-full text-center text-xs font-semibold text-[#244A70] hover:underline cursor-pointer block"
            >
              {isWon ? 'Inspect Organization Settings →' : 'View Activation Checklist →'}
            </button>
          </div>
        </Card>
      </div>

      {/* ── SECTION D: LEAD WORKSPACE TABS ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] shadow-xs overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-[#DCE3EC] px-6 flex gap-6 overflow-x-auto bg-white">
          {[
            { key: 'activity', label: 'Activity Timeline', count: lead.interactions?.length || 0, icon: Clock },
            { key: 'demos', label: 'Scheduled Demos', count: lead.demos?.length || 0, icon: Video },
            { key: 'quotes', label: 'Quotes', count: lead.quotes?.length || 0, icon: DollarSign },
            { key: 'contracts', label: 'Contracts & E-Sign', count: lead.contracts?.length || 0, icon: FileText },
            {
              key: 'activation',
              label: 'Customer Activation',
              badge: isWon ? 'Active' : hasSignedContract ? 'Ready' : undefined,
              icon: Sparkles,
            },
            {
              key: 'audit',
              label: 'Audit Log',
              count: combinedAuditLogs.length,
              icon: History,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3.5 px-1 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#244A70]' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-blue-100 text-[#244A70]' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    tab.badge === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="p-5">
          {/* 1. ACTIVITY TIMELINE TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A]">Client Touchpoint History</h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Timeline of meetings, calls, notes, and milestones for this lead.
                  </p>
                </div>
                <button
                  onClick={() => setShowLogCallModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#DCE3EC] hover:bg-[#F8FAFC] text-[#17263A] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#244A70]" />
                  <span>Log New Interaction</span>
                </button>
              </div>

              {!lead.interactions || lead.interactions.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No interaction touchpoints logged yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">Click "Log New Interaction" to record calls, customer discovery, or notes.</p>
                  <Button variant="outline" size="sm" className="mt-3.5" onClick={() => setShowLogCallModal(true)}>
                    Log Call / Note
                  </Button>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {lead.interactions.map((act) => {
                    const isCall = act.type === 'PHONE_CALL';
                    const isEmail = act.type === 'EMAIL';
                    const isMeeting = act.type === 'MEETING' || act.type === 'DEMO';
                    const rawDate = act.timestamp || (act as any).createdAt || (act as any).date;

                    return (
                      <div key={act.id} className="relative flex items-start gap-3.5 p-3.5 rounded-lg bg-slate-50/80 hover:bg-slate-100/70 transition-colors">
                        {/* Dot indicator */}
                        <div className={`absolute -left-6 top-4.5 w-3 h-3 rounded-full border-2 border-white ${
                          isCall ? 'bg-blue-600' : isEmail ? 'bg-indigo-600' : isMeeting ? 'bg-purple-600' : 'bg-slate-500'
                        }`} />

                        {/* Icon */}
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isCall ? 'bg-blue-50 text-blue-600' : isEmail ? 'bg-indigo-50 text-indigo-600' : isMeeting ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isCall ? <Phone className="w-4 h-4" /> : isEmail ? <Mail className="w-4 h-4" /> : isMeeting ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="font-bold text-[#17263A] text-xs">{act.summary}</span>
                            <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                              <span>{formatDateTime(rawDate)}</span>
                              <span>&bull;</span>
                              <span className="italic">{formatRelativeTime(rawDate)}</span>
                            </div>
                          </div>

                          {act.outcome && (
                            <div className="mt-1">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Outcome: {act.outcome}
                              </span>
                            </div>
                          )}

                          {act.details && (
                            <p className="text-slate-800 mt-2 leading-relaxed bg-white p-2.5 rounded-lg text-xs">
                              {act.details}
                            </p>
                          )}

                          {act.actionItems && (
                            <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-1.5">
                              <span className="font-bold">Follow-up:</span>
                              <span>{act.actionItems}</span>
                            </div>
                          )}

                          <div className="mt-2.5 text-xs text-slate-600 flex items-center justify-between">
                            <span>Logged by: <strong className="text-slate-800 font-semibold">{act.performedBy}</strong></span>
                            {act.durationMinutes && (
                              <span className="text-slate-600">Duration: {act.durationMinutes} mins</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. SCHEDULED DEMOS TAB */}
          {activeTab === 'demos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A]">Scheduled Customer Demonstrations & Walkthroughs</h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Architecture reviews and modernization product walkthroughs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/sales/meeting-requests')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3EC] hover:bg-[#F8FAFC] text-[#17263A] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Open central Meeting Requests management"
                  >
                    <span>All Meeting Requests</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleOpenScheduleDemo()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
                  >
                    <Video className="w-3.5 h-3.5 text-white" />
                    <span>Schedule Demo</span>
                  </button>
                </div>
              </div>

              {!lead.demos || lead.demos.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No product demos scheduled yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">Generate a dedicated meeting link and calendar slot for the prospect.</p>
                  <Button variant="primary" size="sm" className="mt-3.5" onClick={() => handleOpenScheduleDemo()}>
                    Schedule First Demo
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#DCE3EC]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-slate-700 text-xs uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Demo Topic</th>
                        <th className="py-3 px-4">Scheduled Date & Time</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Attendees</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Meeting Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC] bg-white">
                      {lead.demos.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17263A] flex items-center gap-2">
                              <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>{d.topic}</span>
                            </div>
                            {d.agenda && (
                              <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">{d.agenda}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDateTime(d.scheduledAt)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {d.durationMinutes || 45} mins
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {d.attendees && d.attendees.length > 0 ? (
                                d.attendees.map((att, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800">
                                    {att}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 italic">None specified</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              d.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {d.status || 'SCHEDULED'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {d.meetingLink && (
                                <a
                                  href={d.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                                >
                                  <span>Join Room</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() => handleOpenScheduleDemo()}
                                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-[#17263A] border border-slate-200 hover:bg-slate-50 rounded-lg font-medium transition-colors cursor-pointer"
                                title="Reschedule or update meeting parameters"
                              >
                                Reschedule
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. QUOTES TAB */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A]">Commercial Quotations & Discount Approvals</h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Formal cost estimates and corporate discount tier approvals.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateQuoteModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
                >
                  <DollarSign className="w-3.5 h-3.5 text-white" />
                  <span>Create Quote</span>
                </button>
              </div>

              {!lead.quotes || lead.quotes.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No commercial quotes generated yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">Create a quotation based on legacy screen count and desired SLA tier.</p>
                  <Button variant="primary" size="sm" className="mt-3.5" onClick={() => setShowCreateQuoteModal(true)}>
                    Create First Quote
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#DCE3EC]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-slate-700 text-xs uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Quote #</th>
                        <th className="py-3 px-4">Service Plan & Scope</th>
                        <th className="py-3 px-4">Base Price</th>
                        <th className="py-3 px-4">Discount</th>
                        <th className="py-3 px-4">Final Investment</th>
                        <th className="py-3 px-4">Manager Review</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC] bg-white">
                      {lead.quotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#17263A]">{q.quoteNumber}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17263A]">{q.plan}</div>
                            {q.projectScope && (
                              <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">{q.projectScope}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{formatVnd(q.basePrice)}</td>
                          <td className="py-3.5 px-4 text-[#17263A] font-medium">
                            {q.discountPercent > 0 ? `${q.discountPercent}%` : '0%'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-blue-600">{formatVnd(q.finalPrice)}</td>
                          <td className="py-3.5 px-4">
                            {q.approvalStatus === 'APPROVED' ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Approved
                              </span>
                            ) : q.approvalStatus === 'PENDING' ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Needs Review (&gt;15%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                              q.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canCreateContracts && q.status === 'ACCEPTED' && (
                                <button
                                  onClick={() => handleOpenCreateContract(q.id)}
                                  className="px-2.5 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold transition-colors cursor-pointer"
                                  title="Convert accepted quote to a contract"
                                >
                                  Convert to Contract
                                </button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-[#DCE3EC] text-[#244A70] hover:bg-[#F8FAFC]"
                                onClick={() => setPreviewQuote(q)}
                              >
                                Preview & Actions
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. CONTRACTS & E-SIGN TAB */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A]">Legal Contracts & Electronic Signature Records</h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Legally binding agreements, e-signature status, and executed copies.
                  </p>
                </div>
                {canCreateContracts && (
                  <button
                    onClick={() => handleOpenCreateContract()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
                  >
                    <FileText className="w-3.5 h-3.5 text-white" />
                    <span>Create Contract</span>
                  </button>
                )}
              </div>

              {!lead.contracts || lead.contracts.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No legal contracts drafted yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Launch the New Contract Wizard to configure legal terms, quotas, and electronic signing.
                  </p>
                  {canCreateContracts && (
                    <Button variant="primary" size="sm" className="mt-3.5" onClick={() => handleOpenCreateContract()}>
                      Create Contract
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#DCE3EC]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-slate-700 text-xs uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Contract #</th>
                        <th className="py-3 px-4">Title & Service Tier</th>
                        <th className="py-3 px-4">Annual Value</th>
                        <th className="py-3 px-4">Contract Status</th>
                        <th className="py-3 px-4">Signing Envelope</th>
                        <th className="py-3 px-4">Effective Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC] bg-white">
                      {lead.contracts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#17263A]">{c.contractNumber}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17263A]">{c.title}</div>
                            <div className="text-xs text-slate-600">{c.plan}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">{formatVnd(c.annualValue)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              c.status === 'FULLY_SIGNED' || c.status === 'SIGNED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : c.status === 'SENT_FOR_SIGNATURE'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {c.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {c.docusignEnvelopeId || 'Not dispatched'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{formatDate(c.effectiveDate)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/sales/contracts/${c.id}`)}
                                className="px-2.5 py-1 text-xs border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer"
                                title="Open full contract detail page"
                              >
                                View Contract
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-[#DCE3EC] text-[#244A70] hover:bg-[#F8FAFC]"
                                onClick={() => setPreviewContract(c)}
                              >
                                Preview & E-Sign
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. CUSTOMER ACTIVATION TAB */}
          {activeTab === 'activation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Customer Activation & Organization Provisioning Workflow</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Verify signed contracts, confirm initial payment, and provision tenant.
                  </p>
                </div>
                {canCreateContracts && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowActivationModal(true)}
                    className={isWon ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#244A70] hover:bg-[#1B3856]'}
                  >
                    {isWon ? 'View Provisioned Tenant' : 'Launch Customer Activation'}
                  </Button>
                )}
              </div>

              {/* 6-Step Visual Workflow */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
                  Enterprise Activation Pipeline:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { step: 1, label: 'Contract Signed', done: hasSignedContract },
                    { step: 2, label: 'Org Provisioned', done: isWon },
                    { step: 3, label: 'Service Package', done: isWon },
                    { step: 4, label: 'Quota Configured', done: isWon },
                    { step: 5, label: 'Account Activated', done: isWon },
                    { step: 6, label: 'Web 3 Access Ready', done: isWon },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        s.done
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1">
                        {s.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 text-xs flex items-center justify-center font-bold">
                            {s.step}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold block">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activation Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Pre-requisite Verification */}
                <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                      Prerequisites Verification
                    </span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Countersigned Agreement:</span>
                      <span className={`font-semibold ${hasSignedContract ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {hasSignedContract ? '✓ Verified (Executed)' : '✗ Pending Signature'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Commercial Deposit / Policy:</span>
                      <span className={`font-semibold ${
                        lead.payment?.status === 'CONFIRMED' || !lead.payment?.required
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}>
                        {lead.payment?.status === 'CONFIRMED'
                          ? '✓ Deposit Received'
                          : !lead.payment?.required
                          ? '✓ Policy Waived'
                          : '✗ Pending Confirmation'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Customer Admin Account:</span>
                      <span className="font-semibold text-emerald-700">
                        ✓ {lead.email}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Provisioned Infrastructure State */}
                <Card variant="default" padding="md" className="bg-white border-[#DCE3EC] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                      Infrastructure & Tenant Quota
                    </span>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Provisioning Status:</span>
                      <span className={`font-bold ${isWon ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {lead.provisioning?.status || (isWon ? 'COMPLETED' : 'NOT_STARTED')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Organization Tenant:</span>
                      <span className="font-mono text-slate-800">
                        {lead.provisioning?.organizationId || lead.convertedOrganizationId || 'Pending activation'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Capacity Quotas:</span>
                      <span className="font-semibold text-slate-800">
                        {lead.estimatedScreens || 20} screens &bull; {lead.estimatedPrograms || 5} programs
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {isWon && (lead.convertedOrganizationId || lead.provisioning?.organizationId) && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-emerald-900">Enterprise Tenant Active & Ready for Production</h3>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        This customer can now access ALSM Web 3 with provisioned quotas and enterprise roles.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-[#244A70] hover:bg-[#1B3856] text-xs font-bold inline-flex items-center gap-1.5"
                      onClick={() => navigate(`/admin/billing/usage?orgId=${lead.convertedOrganizationId || lead.provisioning?.organizationId}`)}
                    >
                      <span>View Resource Usage & Quotas</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs"
                      onClick={() => navigate(`/admin/organizations/${lead.convertedOrganizationId || lead.provisioning?.organizationId}`)}
                    >
                      <span>Organization Dossier</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17263A]">Immutable Audit Trail & Compliance Ledger</h2>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Audit trail of stage transitions, quote approvals, and contract executions.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={auditLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DCE3EC] hover:bg-[#F8FAFC] text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Audit Trail</span>
                </button>
              </div>

              {combinedAuditLogs.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No audit events recorded for this lead yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">All future stage modifications, quotes, and contract creations will be appended here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#DCE3EC]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-slate-700 text-xs uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Operator / Actor</th>
                        <th className="py-3 px-4">Action Event</th>
                        <th className="py-3 px-4">Target Entity</th>
                        <th className="py-3 px-4">Audit Details & Context</th>
                        <th className="py-3 px-4 text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC] bg-white">
                      {combinedAuditLogs.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                            {formatDateTime(entry.timestamp)}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {entry.actor}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {entry.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {entry.entity}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 max-w-md">
                            <span className="line-clamp-2">{entry.details}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                            {entry.ipAddress || 'Internal Auth Session'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      <LogInteractionModal
        isOpen={showLogCallModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        onClose={() => setShowLogCallModal(false)}
        onSuccess={() => {
          fetchLead();
          fetchAuditLogs();
          setSuccessMsg('Interaction logged successfully');
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
      />

      <ScheduleDemoModal
        isOpen={showDemoModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadEmail={lead.email}
        onClose={() => setShowDemoModal(false)}
        onSuccess={() => {
          fetchLead();
          fetchAuditLogs();
          setSuccessMsg('Product demo scheduled with dedicated Google Meet room.');
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
      />

      <CreateQuoteModal
        isOpen={showCreateQuoteModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        onClose={() => setShowCreateQuoteModal(false)}
        onSuccess={(quote) => {
          fetchLead();
          fetchAuditLogs();
          setPreviewQuote(quote);
          setSuccessMsg(
            quote.requiresApproval
              ? 'Quote submitted for Sales Manager review (>15% discount)'
              : 'Commercial quote generated successfully',
          );
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
      />

      <QuotePreviewModal
        isOpen={!!previewQuote}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        quote={previewQuote}
        onClose={() => setPreviewQuote(null)}
        onQuoteUpdated={(updated) => {
          setPreviewQuote(updated);
          fetchLead();
          fetchAuditLogs();
        }}
        onCreateContractFromQuote={(quote) => {
          setPreviewQuote(null);
          handleOpenCreateContract(quote.id);
        }}
      />

      <ContractPreviewModal
        isOpen={!!previewContract}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        contract={previewContract}
        onClose={() => setPreviewContract(null)}
        onContractUpdated={(c) => {
          setPreviewContract(c);
          fetchLead();
          fetchAuditLogs();
        }}
        onProceedToActivation={() => {
          setPreviewContract(null);
          setShowActivationModal(true);
        }}
      />

      <ManageStageModal
        isOpen={showManageStageModal}
        lead={lead}
        onClose={() => setShowManageStageModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          fetchAuditLogs();
          setSuccessMsg(`Pipeline stage updated to ${updated.stage}`);
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
        onOpenActivation={() => {
          setShowManageStageModal(false);
          setShowActivationModal(true);
        }}
      />

      <CustomerActivationModal
        isOpen={showActivationModal}
        lead={lead}
        canActivate={canCreateContracts}
        onClose={() => setShowActivationModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          fetchAuditLogs();
          setSuccessMsg('Customer organization provisioned and lead successfully converted to Won.');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      <RequestLegalInfoModal
        isOpen={showRequestLegalModal}
        onClose={() => setShowRequestLegalModal(false)}
        lead={lead}
        onOpenEditModal={() => setShowEditLeadModal(true)}
      />

      <EditLeadModal
        isOpen={showEditLeadModal}
        onClose={() => setShowEditLeadModal(false)}
        lead={lead}
        onSuccess={(updated) => {
          setLead(updated);
          fetchLead();
          setSuccessMsg('Lead details and legal entity information updated successfully.');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};

export default LeadDetailPage;
