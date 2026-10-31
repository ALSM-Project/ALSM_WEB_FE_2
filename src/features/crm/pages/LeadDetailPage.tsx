import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Clock, DollarSign,
  FileText, CheckCircle2, AlertCircle, ArrowLeft,
  Video, Check, Award, Lock, Sparkles,
  ExternalLink, History, UserCheck
} from 'lucide-react';
import { crmApi, LeadDto, LeadQuote, LeadContract } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';
import { Button, Card } from '@/shared/ui';

// Modals
import { LogInteractionModal } from '../components/LogInteractionModal';
import { ScheduleDemoModal } from '../components/ScheduleDemoModal';
import { CreateQuoteModal } from '../components/CreateQuoteModal';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { CreateContractModal } from '../components/CreateContractModal';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ManageStageModal } from '../components/ManageStageModal';
import { CustomerActivationModal } from '../components/CustomerActivationModal';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreateContracts = hasPermission('sales.leads.manage');

  const [lead, setLead] = useState<LeadDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'demos' | 'quotes' | 'contracts' | 'activation' | 'audit'>('activity');

  // Modal Visibility States
  const [showLogCallModal, setShowLogCallModal] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState<boolean>(false);
  const [showCreateContractModal, setShowCreateContractModal] = useState<boolean>(false);
  const [showManageStageModal, setShowManageStageModal] = useState<boolean>(false);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);

  // Selected Documents for Preview Modals
  const [previewQuote, setPreviewQuote] = useState<LeadQuote | null>(null);
  const [previewContract, setPreviewContract] = useState<LeadContract | null>(null);
  const [initialContractQuoteId, setInitialContractQuoteId] = useState<string | undefined>();

  const fetchLead = async () => {
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
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading lead dossier from MongoDB / Local CRM store...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-[#091E42]">Lead Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested lead identifier was not found in the repository.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/sales/leads')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const hasSignedContract = lead.contracts?.some(c => c.status === 'FULLY_SIGNED');
  const isWon = lead.stage === 'WON';

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales/leads')}
            className="p-2 rounded-xl border border-[#D9E2EC] bg-white hover:bg-[#F7F9FC] text-[#6B778C] transition-colors"
            title="Back to Lead Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">{lead.company}</h1>
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20">
                Score: {lead.score}
              </span>
              {isWon && (
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Closed Won
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B778C] mt-1">
              Primary Contact: <span className="font-semibold text-slate-800">{lead.contactName}</span> ({lead.email})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLogCallModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <Phone className="w-4 h-4 text-[#0652CC]" />
            Log Call / Note
          </button>

          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <Video className="w-4 h-4 text-indigo-600" />
            Schedule Demo
          </button>

          <button
            onClick={() => setShowCreateQuoteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Create Quote
          </button>

          {canCreateContracts && (
            <button
              onClick={() => { setInitialContractQuoteId(undefined); setShowCreateContractModal(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Create Contract
            </button>
          )}

          <button
            onClick={() => setShowManageStageModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            Update Stage
          </button>

          <button
            onClick={() => setShowActivationModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${
              isWon
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : hasSignedContract
                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300'
                : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            {isWon ? 'View Provisioned Tenant' : 'Customer Activation'}
          </button>
        </div>
      </div>

      {/* Stage Progression Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
              Deal Pipeline Stage:
            </span>
            <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Current: {lead.stage}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'LOST'] as const).map((st) => {
              const isActive = lead.stage === st;
              return (
                <button
                  key={st}
                  onClick={() => setShowManageStageModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? st === 'LOST'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#0652CC] text-white shadow-xs'
                      : 'bg-[#F7F9FC] text-[#6B778C] hover:bg-[#E5EAF0]'
                  }`}
                  title="Click to update lead stage"
                >
                  {isActive && <Check className="w-3 h-3" />}
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              );
            })}

            {/* Won Stage - Locked & System Controlled */}
            <button
              onClick={() => setShowActivationModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                isWon
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isWon ? 'Customer is Closed Won & Provisioned' : 'Won stage is unlocked only via Customer Activation'}
            >
              {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3 text-emerald-600" />}
              Closed Won (Activation)
            </button>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Contact Details</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="font-semibold text-[#091E42]">{lead.contactName}</div>
            <div className="text-[#6B778C] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0652CC]" /> {lead.email}
            </div>
            {lead.phone && (
              <div className="text-[#6B778C] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> {lead.phone}
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Source & Representative</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]"><span className="font-semibold">Source:</span> {lead.source}</div>
            <div className="text-[#091E42] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Rep:</span> {lead.assignedToName || 'Unassigned'}
            </div>
            <div className="text-[#6B778C] text-[11px]">
              Created: {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Commercial Scope</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]">
              <span className="font-semibold">Deal Value:</span>{' '}
              <span className="font-bold text-blue-600">{formatVnd(lead.dealValue || 0)}</span>
            </div>
            <div className="text-[#091E42]">
              <span className="font-semibold">Payment Status:</span>{' '}
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                lead.payment?.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {lead.payment?.status || (lead.payment?.required ? 'PENDING' : 'WAIVED')}
              </span>
            </div>
            <div className="text-[#6B778C] text-[11px]">
              Last Contact: {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'None yet'}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Tenant & Provisioning</span>
          <div className="mt-2 space-y-1.5 text-xs">
            {isWon ? (
              <div className="space-y-1">
                <div className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Customer Tenant Active
                </div>
                <div className="text-[11px] text-[#6B778C] font-mono">
                  Org: {lead.provisioning?.organizationId || lead.convertedOrganizationId}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-amber-700 font-medium">In Pipeline ({lead.stage})</div>
                <div className="text-[11px] text-slate-500">
                  {hasSignedContract ? 'Contract executed; ready to activate.' : 'Contract signature pending.'}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5EAF0] flex gap-4 overflow-x-auto">
        {[
          { key: 'activity', label: `Activity Timeline (${lead.interactions?.length || 0})` },
          { key: 'demos', label: `Scheduled Demos (${lead.demos?.length || 0})` },
          { key: 'quotes', label: `Quotes (${lead.quotes?.length || 0})` },
          { key: 'contracts', label: `Contracts & E-Sign (${lead.contracts?.length || 0})` },
          { key: 'activation', label: `Customer Activation ${isWon ? '✓' : ''}` },
          { key: 'audit', label: `Audit Log (${lead.stageAudit?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {/* 1. Activity Tab */}
      {activeTab === 'activity' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.interactions || lead.interactions.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No interactions logged yet. Click "Log Call / Note" above to record client touchpoints.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.interactions.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
                  <div className="p-2 rounded-lg bg-white border border-[#E5EAF0] text-[#0652CC]">
                    {act.type === 'PHONE_CALL' ? <Phone className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#091E42]">{act.summary}</span>
                      <span className="text-[11px] text-[#6B778C]">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    {act.outcome && (
                      <div className="text-[11px] text-blue-700 font-medium mt-0.5">Outcome: {act.outcome}</div>
                    )}
                    {act.details && <p className="text-xs text-slate-700 mt-1 leading-relaxed">{act.details}</p>}
                    {act.actionItems && (
                      <p className="text-[11px] text-slate-600 mt-1 italic bg-white p-2 rounded border border-slate-200">
                        Follow-up Action: {act.actionItems}
                      </p>
                    )}
                    <span className="text-[10px] text-[#6B778C] font-mono mt-1.5 block">Logged by: {act.performedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 2. Demos Tab */}
      {activeTab === 'demos' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.demos || lead.demos.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No product demos scheduled. Click "Schedule Demo" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.demos.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-[#091E42] flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      {d.topic}
                    </div>
                    <div className="text-xs text-[#6B778C] mt-1 flex flex-wrap items-center gap-3">
                      <span><Calendar className="w-3 h-3 inline mr-1 text-slate-400" />{new Date(d.scheduledAt).toLocaleString()}</span>
                      <span><Clock className="w-3 h-3 inline mr-1 text-slate-400" />{d.durationMinutes} mins</span>
                      {d.attendees && d.attendees.length > 0 && (
                        <span>Attendees: {d.attendees.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={d.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 flex items-center justify-center gap-1 w-full sm:w-auto"
                  >
                    Join Meet Room
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. Quotes Tab */}
      {activeTab === 'quotes' && (
        <Card variant="default" padding="none" className="bg-white border-[#E5EAF0] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Quote #</th>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">Base Price</th>
                <th className="py-2.5 px-3">Discount</th>
                <th className="py-2.5 px-3">Final Investment</th>
                <th className="py-2.5 px-3">Approval</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {!lead.quotes || lead.quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B778C]">
                    No commercial quotes generated yet. Click "Create Quote" above.
                  </td>
                </tr>
              ) : (
                lead.quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{q.quoteNumber}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.plan}</td>
                    <td className="py-3 px-3 text-[#6B778C]">{formatVnd(q.basePrice)}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.discountPercent}%</td>
                    <td className="py-3 px-3 font-semibold text-blue-600">{formatVnd(q.finalPrice)}</td>
                    <td className="py-3 px-3">
                      {q.approvalStatus === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Approved</span>
                      ) : q.approvalStatus === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">Needs Review (&gt;15%)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">Rejected</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-[#E5EAF0] text-[#0652CC] hover:bg-[#F7F9FC]"
                        onClick={() => setPreviewQuote(q)}
                      >
                        Preview & Actions
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* 4. Contracts Tab */}
      {activeTab === 'contracts' && (
        <Card variant="default" padding="none" className="bg-white border-[#E5EAF0] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Contract #</th>
                <th className="py-2.5 px-3">Title & Plan</th>
                <th className="py-2.5 px-3">Annual Value</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">DocuSign Envelope</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {!lead.contracts || lead.contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B778C]">
                    No legal contracts created yet. Click "Create Contract" above.
                  </td>
                </tr>
              ) : (
                lead.contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{c.contractNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#091E42]">{c.title}</div>
                      <div className="text-[11px] text-[#6B778C]">{c.plan}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-700">{formatVnd(c.annualValue)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === 'FULLY_SIGNED' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'SENT_FOR_SIGNATURE' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#6B778C]">
                      {c.docusignEnvelopeId || 'Not dispatched'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-[#E5EAF0] text-[#0652CC] hover:bg-[#F7F9FC]"
                        onClick={() => setPreviewContract(c)}
                      >
                        Preview & E-Sign
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* 5. Customer Activation Tab */}
      {activeTab === 'activation' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Section 3.11 Lead-to-Customer Activation Pipeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated 7-step provisioning: signed contract, payment confirmation, tenant creation, and Web 3 workspace binding.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowActivationModal(true)}
              className={isWon ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isWon ? 'View Provisioned Tenant Details' : 'Launch Customer Activation'}
            </Button>
          </div>

          {/* Provisioning summary checklist preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Verification Requirements
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Contract Countersigned:</span>
                  <span className={`font-semibold ${hasSignedContract ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {hasSignedContract ? '✓ Verified' : '✗ Pending Signature'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Commercial Payment Deposit:</span>
                  <span className={`font-semibold ${
                    lead.payment?.status === 'CONFIRMED' || !lead.payment?.required ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {lead.payment?.status === 'CONFIRMED' ? '✓ Received' : (!lead.payment?.required ? '✓ Policy Waived' : '✗ Pending')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Activation Execution State
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Provisioning Status:</span>
                  <span className="font-semibold text-slate-800">
                    {lead.provisioning?.status || (isWon ? 'COMPLETED' : 'NOT_STARTED')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Organization Tenant:</span>
                  <span className="font-mono text-slate-800">
                    {lead.provisioning?.organizationId || lead.convertedOrganizationId || 'Pending activation'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 6. Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.stageAudit || lead.stageAudit.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No stage audit transitions recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.stageAudit.map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <History className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {entry.fromStage} → <span className="text-blue-600 font-bold">{entry.toStage}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-slate-600 mt-1 italic">"{entry.notes}"</p>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      Author: {entry.changedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Feature Modals */}
      <LogInteractionModal
        isOpen={showLogCallModal}
        leadId={lead.id}
        leadCompany={lead.company}
        onClose={() => setShowLogCallModal(false)}
        onSuccess={() => {
          fetchLead();
          setSuccessMsg('Interaction logged successfully');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <ScheduleDemoModal
        isOpen={showDemoModal}
        leadId={lead.id}
        leadCompany={lead.company}
        leadEmail={lead.email}
        onClose={() => setShowDemoModal(false)}
        onSuccess={() => {
          fetchLead();
          setSuccessMsg('Demo scheduled with generated Google Meet room');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <CreateQuoteModal
        isOpen={showCreateQuoteModal}
        leadId={lead.id}
        leadCompany={lead.company}
        onClose={() => setShowCreateQuoteModal(false)}
        onSuccess={(quote) => {
          fetchLead();
          setPreviewQuote(quote);
          setSuccessMsg(quote.requiresApproval ? 'Quote submitted for Sales Manager review (>15% discount)' : 'Quote generated');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <QuotePreviewModal
        isOpen={!!previewQuote}
        leadId={lead.id}
        leadCompany={lead.company}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        quote={previewQuote}
        onClose={() => setPreviewQuote(null)}
        onQuoteUpdated={(updated) => {
          setPreviewQuote(updated);
          fetchLead();
        }}
        onCreateContractFromQuote={(quote) => {
          setInitialContractQuoteId(quote.id);
          setShowCreateContractModal(true);
        }}
      />

      <CreateContractModal
        isOpen={showCreateContractModal}
        leadId={lead.id}
        leadCompany={lead.company}
        quotes={lead.quotes}
        initialQuoteId={initialContractQuoteId}
        canCreateContract={canCreateContracts}
        onClose={() => setShowCreateContractModal(false)}
        onSuccess={(contract) => {
          fetchLead();
          setPreviewContract(contract);
          setSuccessMsg('Legal contract draft created');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <ContractPreviewModal
        isOpen={!!previewContract}
        leadId={lead.id}
        leadCompany={lead.company}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        contract={previewContract}
        onClose={() => setPreviewContract(null)}
        onContractUpdated={(c) => {
          setPreviewContract(c);
          fetchLead();
        }}
        onProceedToActivation={() => {
          setShowActivationModal(true);
        }}
      />

      <ManageStageModal
        isOpen={showManageStageModal}
        lead={lead}
        onClose={() => setShowManageStageModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          setSuccessMsg(`Stage updated to ${updated.stage}`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
        onOpenActivation={() => {
          setShowActivationModal(true);
        }}
      />

      <CustomerActivationModal
        isOpen={showActivationModal}
        lead={lead}
        onClose={() => setShowActivationModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          setSuccessMsg(`Customer successfully activated and transitioned to Won!`);
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
