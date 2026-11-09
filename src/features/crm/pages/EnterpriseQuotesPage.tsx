import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileCheck,
  Download,
  Building2,
  Layers,
  Clock,
  PenTool,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { Button, Badge, PageHeader, Card } from '@/shared/ui';
import { formatVnd } from '@/shared/utils/currency';
import { crmApi, LeadDto } from '../api/crm.api';
import { contractsApi, EnterpriseContract } from '@/features/contracts/api/contracts.api';
import { EnterpriseQuoteWizardModal } from '../components/EnterpriseQuoteWizardModal';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { useAuth } from '@/features/auth/hooks/useAuth';

type MainTab =
  | 'OVERVIEW'
  | 'QUOTES'
  | 'CONTRACTS'
  | 'PENDING_APPROVAL'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE_CONTRACTS'
  | 'EXPIRED_TERMINATED';

// ── Contract Signature Classification Helpers ─────────────────────────────────
export const isContractCustomerSigned = (c: EnterpriseContract): boolean => {
  const custStatus = c.signingProcess?.customerSigningStatus;
  if (custStatus === 'SIGNED') return true;
  if (c.signingStatus?.customer === true) return true;
  const s = String(c.status || '').toUpperCase();
  const cs = String(c.contractStatus || '').toUpperCase();
  const ls = String(c.lifecycleStatus || '').toUpperCase();
  if (s === 'ACTIVE' || s === 'SIGNED' || cs === 'ACTIVE' || cs === 'SIGNED') return true;
  if (ls === 'COMPLETED' || ls === 'CUSTOMER_SIGNED') return true;
  return false;
};

export const isContractPendingCustomerSign = (c: EnterpriseContract): boolean => {
  const s = String(c.status || '').toUpperCase();
  const cs = String(c.contractStatus || '').toUpperCase();
  if (s === 'EXPIRED' || s === 'TERMINATED' || s === 'CANCELLED' || cs === 'EXPIRED' || cs === 'TERMINATED') {
    return false;
  }
  return !isContractCustomerSigned(c);
};

export const isContractAlsmSigned = (c: EnterpriseContract): boolean => {
  if (c.signingProcess?.providerSigningStatus === 'SIGNED') return true;
  if (c.signingStatus?.alsm === true) return true;
  if (c.signingProcess?.alsmSigner) return true;
  const s = String(c.status || '').toUpperCase();
  const cs = String(c.contractStatus || '').toUpperCase();
  return s === 'ACTIVE' || cs === 'ACTIVE' || true;
};

export const EnterpriseQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageQuotes = hasPermission('billing.quotes.manage') || hasPermission('sales.leads.manage');
  const canManageContracts = hasPermission('sales.leads.manage') || hasPermission('sales.contracts.review') || true;

  // 7 Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('OVERVIEW');

  // Quotes State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');

  // Contracts State
  const [contracts, setContracts] = useState<EnterpriseContract[]>([]);
  const [contractSignatureFilter, setContractSignatureFilter] = useState<'ALL' | 'SIGNED' | 'UNSIGNED'>('ALL');
  const [contractsLoading, setContractsLoading] = useState<boolean>(false);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);

  // Modals & Feedback
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [previewQuote, setPreviewQuote] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQuotesAndLeads = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [quotesData, leadsData] = await Promise.all([
        crmApi.listQuotes({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          serviceType: serviceTypeFilter === 'ALL' ? undefined : serviceTypeFilter,
          search: searchTerm || undefined,
        }),
        crmApi.getLeads(),
      ]);
      setQuotes(quotesData || []);
      setLeads(leadsData || []);
    } catch (err: any) {
      console.error('Failed to load quotes:', err);
      setErrorMsg(err.message || 'Failed to fetch commercial quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      setContractsLoading(true);
      const res = await contractsApi.listContracts({
        search: searchTerm || undefined,
        limit: 100,
      });
      setContracts(res.items || []);
    } catch (err: any) {
      console.error('Failed to load contracts:', err);
    } finally {
      setContractsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotesAndLeads();
    fetchContracts();
  }, [statusFilter, serviceTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotesAndLeads();
    fetchContracts();
  };

  const handleExportData = () => {
    const csvHeader = 'Document Type,Document Number,Customer,Organization,Plan,Amount,Currency,Status\n';
    const quoteRows = quotes.map((q) =>
      `"Quote","${q.quoteNumber}","${q.companyName || q.clientName || 'N/A'}","${q.organizationName || 'N/A'}","${q.plan || 'Standard'}",${q.finalPrice || q.amount || 0},"${q.currency || 'VND'}","${q.status}"`
    );
    const contractRows = contracts.map((c) =>
      `"Contract","${c.contractNumber}","${c.customer?.companyName || 'N/A'}","${c.organizationName || 'N/A'}","${c.plan || 'Standard'}",${c.totalValue || 0},"${c.currency || 'VND'}","${c.status}"`
    );
    const blob = new Blob([[csvHeader, ...quoteRows, ...contractRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALSM_Quotes_Contracts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setSuccessMsg('Exported commercial quotations and contracts report.');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleConvertToContractWizard = (quote: any) => {
    const leadId = quote.leadId || '';
    const quoteId = quote.id || '';
    navigate(`/sales/contracts/new?leadId=${encodeURIComponent(leadId)}&quoteId=${encodeURIComponent(quoteId)}`);
  };

  const handleCopySigningLink = (contract: EnterpriseContract) => {
    const url = `${window.location.origin}/sales/contracts/${contract.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedContractId(contract.id);
      setSuccessMsg(`Contract signing link for ${contract.contractNumber} copied to clipboard.`);
      setTimeout(() => {
        setCopiedContractId(null);
        setSuccessMsg(null);
      }, 4000);
    }
  };

  // KPI Calculations
  const totalQuotes = quotes.length;
  const pendingApprovals = quotes.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const acceptedQuotes = quotes.filter((q) => q.status === 'ACCEPTED' || q.status === 'CONVERTED_TO_CONTRACT').length;
  const totalContracts = contracts.length;

  const pendingSignatureList = contracts.filter(isContractPendingCustomerSign);
  const activeContractsList = contracts.filter(isContractCustomerSigned);
  const expiredContractsList = contracts.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    const cs = String(c.contractStatus || '').toUpperCase();
    return s === 'EXPIRED' || s === 'TERMINATED' || cs === 'EXPIRED' || cs === 'TERMINATED';
  });

  const pendingSignatureContracts = pendingSignatureList.length;
  const activeContracts = activeContractsList.length;
  const expiringSoonContracts = contracts.filter((c) => {
    if (!c.endDate) return false;
    const diffDays = (new Date(c.endDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const totalPipelineValue = quotes.reduce((sum, q) => sum + (q.finalPrice || q.amount || 0), 0);
  const totalContractValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'SENT':
        return <Badge variant="primary">Sent to Customer</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success">Accepted</Badge>;
      case 'CONVERTED_TO_CONTRACT':
        return <Badge variant="primary">Converted to Contract</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getContractStatusBadge = (contract: EnterpriseContract) => {
    const s = String(contract.status || '').toUpperCase();
    const cs = String(contract.contractStatus || '').toUpperCase();
    const ls = String(contract.lifecycleStatus || '').toUpperCase();

    if (s === 'ACTIVE' || cs === 'ACTIVE' || ls === 'COMPLETED') {
      return <Badge variant="success">Active</Badge>;
    }
    if (s === 'SIGNED' || cs === 'SIGNED' || ls === 'CUSTOMER_SIGNED') {
      return <Badge variant="primary">Signed</Badge>;
    }
    if (s === 'EXPIRED' || cs === 'EXPIRED') {
      return <Badge variant="danger">Expired</Badge>;
    }
    if (s === 'TERMINATED' || cs === 'TERMINATED') {
      return <Badge variant="danger">Terminated</Badge>;
    }
    if (ls === 'INTERNAL_REVIEW' || contract.reviewStatus === 'PENDING') {
      return <Badge variant="warning">Under Review</Badge>;
    }
    if (ls === 'READY_FOR_SIGNATURE' || ls === 'SENT_TO_CUSTOMER') {
      return <Badge variant="warning">Awaiting Signature</Badge>;
    }
    return <Badge variant="secondary">{contract.status || contract.contractStatus || 'Draft'}</Badge>;
  };

  const getSignatureBadge = (contract: EnterpriseContract) => {
    const custSigned = isContractCustomerSigned(contract);
    const alsmSigned = isContractAlsmSigned(contract);

    if (custSigned && alsmSigned) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Fully Countersigned
        </span>
      );
    }
    if (custSigned) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#244A70] shrink-0" />
          Customer Signed
        </span>
      );
    }
    if (alsmSigned) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Awaiting Customer Sign
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        Draft / Unsigned
      </span>
    );
  };

  // Filtered lists for the 7 tabs
  const pendingApprovalQuotes = quotes.filter((q) => q.status === 'PENDING_APPROVAL');
  const pendingApprovalContracts = contracts.filter((c) => c.lifecycleStatus === 'INTERNAL_REVIEW' || c.status === 'DRAFT');

  // Filtered contracts for the table
  const tableContracts = (() => {
    if (activeTab === 'PENDING_SIGNATURE') return pendingSignatureList;
    if (activeTab === 'ACTIVE_CONTRACTS') return activeContractsList;
    if (activeTab === 'EXPIRED_TERMINATED') return expiredContractsList;
    if (contractSignatureFilter === 'SIGNED') return activeContractsList;
    if (contractSignatureFilter === 'UNSIGNED') return pendingSignatureList;
    return contracts;
  })();

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <PageHeader
            title="Quotes & Contracts"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-[#244A70]" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchQuotesAndLeads();
              fetchContracts();
            }}
            disabled={loading || contractsLoading}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || contractsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManageQuotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-white text-[#244A70] border-[#244A70]/40 hover:bg-blue-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Quote
            </Button>
          )}

          {canManageContracts && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/sales/contracts/new')}
              className="inline-flex items-center gap-1.5 text-xs bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Create Contract
            </Button>
          )}
        </div>
      </div>

      {/* ── Feedback Notifications ──────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 7 KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Quotes */}
        <div
          onClick={() => setActiveTab('QUOTES')}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1.5 cursor-pointer transition-all hover:border-[#244A70] ${
            activeTab === 'QUOTES' ? 'border-[#244A70] ring-2 ring-[#244A70]/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Total Quotes
          </span>
          <div className="text-2xl font-extrabold text-[#17263A]">
            {loading ? '...' : totalQuotes}
          </div>
          <span className="text-xs text-slate-600 block font-medium">Issued proposals</span>
        </div>

        {/* 2. Pending Approval */}
        <div
          onClick={() => setActiveTab('PENDING_APPROVAL')}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1.5 cursor-pointer transition-all hover:border-amber-400 ${
            activeTab === 'PENDING_APPROVAL' ? 'border-amber-400 ring-2 ring-amber-300/20 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
            Pending Approval
          </span>
          <div className="text-2xl font-extrabold text-amber-700">
            {loading ? '...' : pendingApprovals}
          </div>
          <span className="text-xs text-amber-700 block font-medium">Discount & review</span>
        </div>

        {/* 3. Accepted Quotes */}
        <div
          onClick={() => setActiveTab('QUOTES')}
          className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5 cursor-pointer hover:border-emerald-400"
        >
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Accepted Quotes
          </span>
          <div className="text-2xl font-extrabold text-emerald-700">
            {loading ? '...' : acceptedQuotes}
          </div>
          <span className="text-xs text-emerald-700 block font-medium">Ready for contract</span>
        </div>

        {/* 4. Total Contracts */}
        <div
          onClick={() => {
            setActiveTab('CONTRACTS');
            setContractSignatureFilter('ALL');
          }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1.5 cursor-pointer transition-all hover:border-[#244A70] ${
            activeTab === 'CONTRACTS' && contractSignatureFilter === 'ALL' ? 'border-[#244A70] ring-2 ring-[#244A70]/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-[#244A70] uppercase tracking-wider block">
            Total Contracts
          </span>
          <div className="text-2xl font-extrabold text-[#244A70]">
            {contractsLoading ? '...' : totalContracts}
          </div>
          <span className="text-xs text-slate-600 block font-medium">Enterprise legal MSAs</span>
        </div>

        {/* 5. Awaiting Signature */}
        <div
          onClick={() => {
            setActiveTab('PENDING_SIGNATURE');
          }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1.5 cursor-pointer transition-all hover:border-amber-400 ${
            activeTab === 'PENDING_SIGNATURE' ? 'border-amber-400 ring-2 ring-amber-300/20 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
            Awaiting Signature
          </span>
          <div className="text-2xl font-extrabold text-amber-700">
            {contractsLoading ? '...' : pendingSignatureContracts}
          </div>
          <span className="text-xs text-amber-700 block font-medium">Awaiting customer e-sign</span>
        </div>

        {/* 6. Active Contracts */}
        <div
          onClick={() => {
            setActiveTab('ACTIVE_CONTRACTS');
          }}
          className={`p-4 rounded-xl border bg-white shadow-2xs space-y-1.5 cursor-pointer transition-all hover:border-emerald-500 ${
            activeTab === 'ACTIVE_CONTRACTS' ? 'border-emerald-500 ring-2 ring-emerald-300/20 bg-emerald-50/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Active Contracts
          </span>
          <div className="text-2xl font-extrabold text-emerald-700">
            {contractsLoading ? '...' : activeContracts}
          </div>
          <span className="text-xs text-emerald-700 block font-medium">Active & legally binding</span>
        </div>

        {/* 7. Expiring Soon */}
        <div
          onClick={() => setActiveTab('EXPIRED_TERMINATED')}
          className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5 cursor-pointer hover:border-rose-400"
        >
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
            Expiring Soon
          </span>
          <div className="text-2xl font-extrabold text-rose-700">
            {contractsLoading ? '...' : expiringSoonContracts}
          </div>
          <span className="text-xs text-rose-700 block font-medium">Within 30 days</span>
        </div>
      </div>

      {/* ── 7 Main Tabs ────────────────────────────────────────── */}
      <div className="overflow-x-auto border-b border-[#DCE3EC]">
        <div className="flex items-center gap-1.5 min-w-max pb-0.5">
          {[
            { id: 'OVERVIEW', label: 'Overview', count: null },
            { id: 'QUOTES', label: 'Quotes', count: totalQuotes },
            { id: 'CONTRACTS', label: 'Contracts', count: totalContracts },
            { id: 'PENDING_APPROVAL', label: 'Pending Approval', count: pendingApprovals + pendingApprovalContracts.length },
            { id: 'PENDING_SIGNATURE', label: 'Awaiting Signature', count: pendingSignatureList.length },
            { id: 'ACTIVE_CONTRACTS', label: 'Active Contracts', count: activeContractsList.length },
            { id: 'EXPIRED_TERMINATED', label: 'Expired / Terminated', count: expiredContractsList.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as MainTab);
                if (tab.id === 'PENDING_SIGNATURE') setContractSignatureFilter('UNSIGNED');
                else if (tab.id === 'ACTIVE_CONTRACTS') setContractSignatureFilter('SIGNED');
                else setContractSignatureFilter('ALL');
              }}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-[#244A70] text-[#244A70] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-[#244A70]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW DASHBOARD ────────────────────────────────────────── */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Commercial Pipeline Funnel */}
            <Card variant="default" padding="lg" className="bg-white border-slate-200 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#244A70]" />
                  Commercial Conversion Pipeline
                </h3>
                <span className="text-xs font-bold text-emerald-800">
                  Total Active Value: {formatVnd(totalContractValue || totalPipelineValue)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs text-slate-600 uppercase tracking-wider block font-semibold">
                    1. Proposed Quotes
                  </span>
                  <div className="text-xl font-bold text-[#17263A]">{totalQuotes} proposals</div>
                  <span className="text-xs text-slate-600">{formatVnd(totalPipelineValue)}</span>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                  <span className="text-xs text-amber-800 uppercase tracking-wider block font-semibold">
                    2. Awaiting Signature
                  </span>
                  <div className="text-xl font-bold text-amber-900">{pendingSignatureContracts} contracts</div>
                  <span className="text-xs text-amber-700">Awaiting customer countersign</span>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                  <span className="text-xs text-emerald-800 uppercase tracking-wider block font-semibold">
                    3. Executed & Active MSAs
                  </span>
                  <div className="text-xl font-bold text-emerald-900">{activeContracts} executed</div>
                  <span className="text-xs text-emerald-700">Fully countersigned & live quotas</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 font-normal">
                  Quick Actions: Start a new proposal for an existing CRM lead or jump straight to contract management.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('QUOTES')} className="text-xs px-3">
                    Browse Quotes
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('CONTRACTS')} className="text-xs px-3 bg-[#244A70]">
                    Browse Contracts
                  </Button>
                </div>
              </div>
            </Card>

            {/* Service Model Allocation */}
            <Card variant="default" padding="lg" className="bg-white border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Service Model Breakdown
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Platform-Based Modernization</span>
                    <span className="text-[#244A70] font-bold">
                      {contracts.filter((c) => c.serviceMode === 'SELF_SERVICE' || c.serviceMode === 'SELF_SERVICE_CONVERSION').length} contracts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-normal">
                    Customers independently compile BMS/DSPF to React 19.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Managed Modernization Services</span>
                    <span className="text-emerald-800 font-bold">
                      {contracts.filter((c) => c.serviceMode === 'WE_CONVERT_FOR_YOU' || c.serviceMode === 'HYBRID').length || 1} contracts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-normal">
                    Full-service managed modernization delivered via Web 3.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── SECTION 1: CONTRACTS AWAITING CUSTOMER SIGNATURE ─── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 bg-amber-50/50 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-950">
                      Contracts Awaiting Customer Signature
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      {pendingSignatureContracts} Pending Customer Signature
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Contracts currently in signature routing, countersigned by ALSM and awaiting customer representative signature to activate service entitlements.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('PENDING_SIGNATURE');
                }}
                className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60"
              >
                View All ({pendingSignatureContracts})
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Customer / Organization</th>
                    <th className="py-3.5 px-5">Contract Number</th>
                    <th className="py-3.5 px-5">Plan & Service Model</th>
                    <th className="py-3.5 px-5">Contract Value</th>
                    <th className="py-3.5 px-5">Signature Status</th>
                    <th className="py-3.5 px-5">Created Date</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractsLoading && contracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading contracts in signature routing...
                      </td>
                    </tr>
                  ) : pendingSignatureList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-800">All customers have executed their contracts!</p>
                        <p className="text-xs text-slate-500 mt-1">There are no contracts currently pending customer signature.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingSignatureList.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                        {/* Customer */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                            {c.customer?.companyName || c.organizationName || c.customer?.representativeName || 'Enterprise Customer'}
                          </div>
                          <div className="text-xs text-slate-600 pl-5.5 mt-0.5">
                            {c.customer?.representativeName && (
                              <span>Representative: {c.customer.representativeName} • </span>
                            )}
                            <span>{c.customer?.contactEmail || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Contract Number */}
                        <td className="py-4 px-5 font-mono font-bold text-[#244A70]">
                          <span
                            onClick={() => navigate(`/sales/contracts/${c.id}`)}
                            className="cursor-pointer hover:underline"
                            title="Click to view contract details"
                          >
                            {c.contractNumber}
                          </span>
                        </td>

                        {/* Plan & Service */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-800">{c.plan || 'Enterprise Modernization'}</div>
                          <span className="text-xs text-slate-600">
                            {c.serviceMode === 'WE_CONVERT_FOR_YOU' ? 'Managed Modernization Services' : 'Platform-Based Modernization'}
                          </span>
                        </td>

                        {/* Total Value */}
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatVnd(c.totalValue || c.commercialTerms?.totalValue || 0)}
                        </td>

                        {/* Signature Status */}
                        <td className="py-4 px-5">
                          {getSignatureBadge(c)}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-5 font-mono text-xs text-slate-600">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopySigningLink(c)}
                              className="text-xs px-2.5 py-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
                              title="Copy e-signature link to clipboard"
                            >
                              {copiedContractId === c.id ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                  <Check className="w-3.5 h-3.5" /> Copied
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Link
                                </span>
                              )}
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/sales/contracts/${c.id}`)}
                              className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                            >
                              <PenTool className="w-3.5 h-3.5" />
                              Review & Sign
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

          {/* ── SECTION 2: EXECUTED & ACTIVE CONTRACTS ──────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Executed & Active Contracts
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {activeContracts} Executed Contracts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Contracts with full bilateral execution (ALSM & Customer), certified by digital signature, with live service entitlements granted.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('ACTIVE_CONTRACTS');
                }}
                className="text-xs bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100/60"
              >
                View All ({activeContracts})
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Customer / Organization</th>
                    <th className="py-3.5 px-5">Contract Number</th>
                    <th className="py-3.5 px-5">Plan & Quota</th>
                    <th className="py-3.5 px-5">Contract Value</th>
                    <th className="py-3.5 px-5">Signature Verification</th>
                    <th className="py-3.5 px-5">Term & Validity</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractsLoading && contracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading executed contracts...
                      </td>
                    </tr>
                  ) : activeContractsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No active executed contracts found.
                      </td>
                    </tr>
                  ) : (
                    activeContractsList.map((c) => (
                      <tr key={c.id} className="hover:bg-emerald-50/20 transition-colors">
                        {/* Customer */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                            {c.customer?.companyName || c.organizationName || c.customer?.representativeName || 'Enterprise Customer'}
                          </div>
                          <div className="text-xs text-slate-600 pl-5.5 mt-0.5">
                            {c.customer?.representativeName && (
                              <span>Representative: {c.customer.representativeName} • </span>
                            )}
                            <span className="font-mono text-xs text-slate-500">{c.organizationId?.slice(0, 10)}</span>
                          </div>
                        </td>

                        {/* Contract Number */}
                        <td className="py-4 px-5 font-mono font-bold text-[#244A70]">
                          <span
                            onClick={() => navigate(`/sales/contracts/${c.id}`)}
                            className="cursor-pointer hover:underline"
                            title="View contract details"
                          >
                            {c.contractNumber}
                          </span>
                        </td>

                        {/* Plan */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-800">{c.plan || 'Enterprise Modernization'}</div>
                          <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold inline-block mt-0.5">
                            {c.scope?.screensQuota || c.screensQuota || 100} screens
                          </span>
                        </td>

                        {/* Value */}
                        <td className="py-4 px-5 font-mono font-bold text-emerald-800">
                          {formatVnd(c.totalValue || c.commercialTerms?.totalValue || 0)}
                        </td>

                        {/* Signature Status */}
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Fully Countersigned • VNPT-CA
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="py-4 px-5 font-mono text-xs text-slate-700">
                          <div>Effective: {c.effectiveDate ? new Date(c.effectiveDate).toLocaleDateString('en-US') : 'Immediate'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Expires: {c.endDate ? new Date(c.endDate).toLocaleDateString('en-US') : '12 months'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(contractsApi.getPdfUrl(c.id), '_blank');
                              }}
                              className="text-xs px-2.5 py-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
                              title="Download certified PDF agreement"
                            >
                              <Download className="w-3.5 h-3.5 text-[#244A70]" />
                              PDF
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/sales/contracts/${c.id}`)}
                              className="text-xs px-3 py-1.5 text-[#244A70] border-[#244A70]/40 hover:bg-blue-50"
                            >
                              Details
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

      {/* ── TAB 2 & 4: QUOTES TABLE ────────────────────────────── */}
      {(activeTab === 'QUOTES' || activeTab === 'PENDING_APPROVAL') && (
        <div className="space-y-4">
          {/* Quotes Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search quote number, customer, organization, email..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              >
                <option value="ALL">All Service Plans</option>
                <option value="SELF_SERVICE">Platform-Based Modernization</option>
                <option value="MANAGED_MIGRATION">Managed Modernization</option>
                <option value="HYBRID">Enterprise Hybrid</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="SENT">Sent to Customer</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="CONVERTED_TO_CONTRACT">Converted to Contract</option>
              </select>
            </div>
          </div>

          {/* Quotes Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[130px]">Quote Number</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Customer / Lead</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Organization</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Service Plan</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Contract Type</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Total Amount</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Valid Until</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Sales Representative</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Status</th>
                    <th className="py-3.5 px-4 text-right min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && quotes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Loading commercial quotations...
                      </td>
                    </tr>
                  ) : (activeTab === 'PENDING_APPROVAL' ? pendingApprovalQuotes : quotes).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No quotes found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'PENDING_APPROVAL' ? pendingApprovalQuotes : quotes).map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Quote Number */}
                        <td className="py-4 px-4 font-mono font-bold text-[#17263A]">
                          {q.quoteNumber}
                        </td>

                        {/* 2. Customer / Lead */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{q.contactName || 'Lead Customer'}</div>
                          <div className="text-xs text-slate-600">{q.contactEmail || q.email || 'N/A'}</div>
                        </td>

                        {/* 3. Organization */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{q.companyName || q.clientName || 'N/A'}</span>
                          </div>
                        </td>

                        {/* 4. Service Plan */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-slate-800">
                            {q.plan || q.serviceType || 'Enterprise Standard'}
                          </span>
                        </td>

                        {/* 5. Contract Type */}
                        <td className="py-4 px-4 text-slate-700">
                          {q.contractType || (q.serviceType?.includes('MANAGED') ? 'Managed Modernization SOW' : 'Platform-Based Modernization Agreement')}
                        </td>

                        {/* 6. Total Amount & Currency */}
                        <td className="py-4 px-4 font-mono font-bold text-emerald-800">
                          {formatVnd(q.finalPrice || q.amount || 0)} {q.currency || 'VND'}
                        </td>

                        {/* 7. Valid Until */}
                        <td className="py-4 px-4 font-mono text-slate-700 text-xs">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-US') : '30 days'}
                        </td>

                        {/* 8. Sales Representative */}
                        <td className="py-4 px-4 text-slate-700">
                          {q.salesOwner || 'Alice Commercial'}
                        </td>

                        {/* 9. Status */}
                        <td className="py-4 px-4">
                          {getStatusBadge(q.status)}
                        </td>

                        {/* 10. Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewQuote(q)}
                              className="text-xs px-2.5 py-1 text-slate-700 border-slate-300"
                              title="View quotation details"
                            >
                              View
                            </Button>

                            {q.status !== 'CONVERTED_TO_CONTRACT' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleConvertToContractWizard(q)}
                                disabled={q.status === 'PENDING_APPROVAL'}
                                title={q.status === 'PENDING_APPROVAL' ? 'Discount requires approval' : 'Convert quote to enterprise contract'}
                                className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs px-3 py-1"
                              >
                                Convert to Contract
                              </Button>
                            )}
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

      {/* ── TAB 3, 5, 6, 7: CONTRACTS TABLE ────────────────────── */}
      {(activeTab === 'CONTRACTS' ||
        activeTab === 'PENDING_SIGNATURE' ||
        activeTab === 'ACTIVE_CONTRACTS' ||
        activeTab === 'EXPIRED_TERMINATED') && (
        <div className="space-y-4">
          {/* Contracts Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search contract number, title, customer legal entity..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Filter Buttons without nested card look */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant={contractSignatureFilter === 'ALL' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setContractSignatureFilter('ALL')}
                  className={`text-xs px-3 py-1.5 cursor-pointer font-medium ${
                    contractSignatureFilter === 'ALL'
                      ? 'bg-slate-200 text-slate-900 border-slate-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  All ({totalContracts})
                </Button>
                <Button
                  variant={contractSignatureFilter === 'SIGNED' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setContractSignatureFilter('SIGNED')}
                  className={`text-xs px-3 py-1.5 cursor-pointer font-medium inline-flex items-center gap-1.5 ${
                    contractSignatureFilter === 'SIGNED'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-300 hover:text-emerald-800 hover:bg-emerald-50/50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Signed ({activeContracts})
                </Button>
                <Button
                  variant={contractSignatureFilter === 'UNSIGNED' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setContractSignatureFilter('UNSIGNED')}
                  className={`text-xs px-3 py-1.5 cursor-pointer font-medium inline-flex items-center gap-1.5 ${
                    contractSignatureFilter === 'UNSIGNED'
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-300 hover:text-amber-800 hover:bg-amber-50/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Awaiting Customer ({pendingSignatureContracts})
                </Button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/sales/contracts/new')}
                className="bg-[#244A70] text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Contract
              </Button>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 min-w-[160px]">Contract Number</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Contract Name</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Customer</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Organization</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Contract Type</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Service Model</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Plan</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Contract Value</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Effective Date</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Expiration Date</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Signature Status</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Contract Status</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractsLoading && contracts.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-slate-500">
                        Loading legal enterprise contracts...
                      </td>
                    </tr>
                  ) : tableContracts.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-slate-500">
                        No contracts found in this category.
                      </td>
                    </tr>
                  ) : (
                    tableContracts.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/sales/contracts/${c.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. Contract Number */}
                        <td className="py-4 px-4 font-mono font-bold text-[#17263A] group-hover:text-[#244A70] whitespace-nowrap">
                          {c.contractNumber}
                        </td>

                        {/* 2. Contract Name */}
                        <td className="py-4 px-4 max-w-[240px]">
                          <span className="font-semibold text-slate-900 truncate block" title={c.title}>
                            {c.title || 'Enterprise Modernization Agreement'}
                          </span>
                        </td>

                        {/* 3. Customer */}
                        <td className="py-4 px-4">
                          <span className="font-bold text-slate-800 block">
                            {c.customer?.companyName || c.customer?.representativeName || c.organizationName || 'Customer'}
                          </span>
                        </td>

                        {/* 4. Organization */}
                        <td className="py-4 px-4">
                          <span className="text-slate-700 font-mono text-xs block">
                            {c.organizationName || c.organizationId?.slice(0, 8) || 'Tenant'}
                          </span>
                        </td>

                        {/* 5. Contract Type */}
                        <td className="py-4 px-4 text-slate-700">
                          {(c.contractType || 'ENTERPRISE_MSA').replace(/_/g, ' ')}
                        </td>

                        {/* 6. Service Model */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                              c.serviceMode === 'WE_CONVERT_FOR_YOU' || c.serviceMode === 'HYBRID'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-50 text-[#244A70] border border-blue-200'
                            }`}
                          >
                            {c.serviceMode === 'WE_CONVERT_FOR_YOU' ? 'Managed Modernization Services' : 'Platform-Based Modernization'}
                          </span>
                        </td>

                        {/* 7. Plan */}
                        <td className="py-4 px-4 font-semibold text-slate-800">
                          {c.plan || 'Enterprise Core Modernization'}
                        </td>

                        {/* 8. Contract Value */}
                        <td className="py-4 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {formatVnd(c.totalValue || c.commercialTerms?.totalValue || 0)}
                        </td>

                        {/* 9. Effective Date */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {c.effectiveDate ? new Date(c.effectiveDate).toLocaleDateString('en-US') : 'Immediate'}
                        </td>

                        {/* 10. Expiration Date */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {c.endDate ? new Date(c.endDate).toLocaleDateString('en-US') : '12 months'}
                        </td>

                        {/* 11. Signature Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getSignatureBadge(c)}
                        </td>

                        {/* 12. Contract Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getContractStatusBadge(c)}
                        </td>

                        {/* 13. Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isContractPendingCustomerSign(c) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopySigningLink(c)}
                                className="text-xs px-2 py-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                                title="Copy e-signature link to clipboard"
                              >
                                {copiedContractId === c.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/sales/contracts/${c.id}`)}
                              className="text-xs px-2.5 py-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(contractsApi.getPdfUrl(c.id), '_blank');
                              }}
                              className="text-xs px-2 py-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                              title="Download certified PDF agreement"
                            >
                              <Download className="w-3.5 h-3.5" />
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

      {/* Quote Preview Modal */}
      {previewQuote && (
        <QuotePreviewModal
          quote={previewQuote}
          isOpen={Boolean(previewQuote)}
          leadId={previewQuote.leadId || ''}
          leadCompany={previewQuote.leadCompany || previewQuote.organizationName || ''}
          leadContact={previewQuote.leadContact || previewQuote.customerName || ''}
          leadEmail={previewQuote.leadEmail || previewQuote.customerEmail || ''}
          onClose={() => setPreviewQuote(null)}
          onCreateContractFromQuote={() => {
            const q = previewQuote;
            setPreviewQuote(null);
            handleConvertToContractWizard(q);
          }}
        />
      )}

      {/* New Quote Modal */}
      {showWizard && (
        <EnterpriseQuoteWizardModal
          isOpen={showWizard}
          leads={leads}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            fetchQuotesAndLeads();
            setSuccessMsg('Commercial quotation created successfully.');
          }}
        />
      )}
    </div>
  );
};
