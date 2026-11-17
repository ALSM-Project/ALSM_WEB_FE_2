import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import { crmApi } from '../api/crm.api';
import type { SalesPipelineDto, SalesPipelineLeadDto, SalesPipelineStage } from '../types/crm.types';
import { formatVnd } from '@/shared/utils/currency';

const STAGES: Array<{
  key: SalesPipelineStage;
  label: string;
  description: string;
  tone: string;
  surface: string;
}> = [
  { key: 'NEW', label: 'New inbound', description: 'New opportunities', tone: 'text-slate-700', surface: 'bg-slate-200/70' },
  { key: 'CONTACTED', label: 'Contacted', description: 'Initial dialogue', tone: 'text-sky-800', surface: 'bg-sky-100' },
  { key: 'QUALIFIED', label: 'Qualified', description: 'Needs confirmed', tone: 'text-indigo-800', surface: 'bg-indigo-100' },
  { key: 'PROPOSAL', label: 'Proposal', description: 'Quote or proposal sent', tone: 'text-purple-800', surface: 'bg-purple-100' },
  { key: 'NEGOTIATION', label: 'Negotiation', description: 'Commercial discussion', tone: 'text-blue-900', surface: 'bg-blue-100' },
  { key: 'WON', label: 'Closed won', description: 'Successfully closed', tone: 'text-emerald-800', surface: 'bg-emerald-100' },
  { key: 'LOST', label: 'Closed lost', description: 'Closed opportunities', tone: 'text-rose-800', surface: 'bg-rose-100' },
  { key: 'UNMAPPED', label: 'Needs review', description: 'Stage needs review', tone: 'text-slate-700', surface: 'bg-slate-200/70' },
];

type LoadError = 'permission' | 'unexpected';

const getLoadError = (error: unknown): LoadError => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status === 403) return 'permission';
  }
  return 'unexpected';
};

const sumByCurrency = (leads: SalesPipelineLeadDto[]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const lead of leads) {
    if (lead.dealValue === undefined || !Number.isFinite(lead.dealValue)) continue;
    const currency = 'VND';
    totals.set(currency, (totals.get(currency) ?? 0) + lead.dealValue);
  }
  return totals;
};

const averageByCurrency = (leads: SalesPipelineLeadDto[]): Map<string, number> => {
  const totals = sumByCurrency(leads);
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (lead.dealValue === undefined || !Number.isFinite(lead.dealValue)) continue;
    const currency = 'VND';
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  return new Map(Array.from(totals, ([currency, total]) => [currency, total / (counts.get(currency) ?? 1)]));
};

const formatMoney = (amount: number): string => formatVnd(amount);

const formatCurrencyTotals = (totals: Map<string, number>): string =>
  totals.size > 0
    ? Array.from(totals.values(), (amount) => formatMoney(amount)).join(' · ')
    : '—';

export const SalesPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<SalesPipelineDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const requestInFlight = useRef(false);

  const loadPipeline = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      setPipeline(await crmApi.getSalesPipeline());
    } catch (error) {
      setPipeline(null);
      setLoadError(getLoadError(error));
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const visibleLeads = useMemo(() => {
    const items = pipeline?.items ?? [];
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((lead) => [lead.company, lead.contactName, lead.source, lead.assignedToName]
      .some((value) => value?.toLocaleLowerCase().includes(query)));
  }, [pipeline, searchTerm]);

  const groupedLeads = useMemo(() => {
    const groups = new Map<SalesPipelineStage, SalesPipelineLeadDto[]>(STAGES.map((stage) => [stage.key, []]));
    for (const lead of visibleLeads) groups.get(lead.stage)?.push(lead);
    return groups;
  }, [visibleLeads]);

  const activeLeads = visibleLeads.filter((lead) => lead.stage !== 'WON' && lead.stage !== 'LOST');
  const pipelineValue = sumByCurrency(visibleLeads.filter((lead) => lead.stage !== 'LOST'));
  const wonRevenue = sumByCurrency(visibleLeads.filter((lead) => lead.stage === 'WON'));
  const averageDealSize = averageByCurrency(activeLeads);
  const wonDeals = visibleLeads.filter((lead) => lead.stage === 'WON').length;

  return (
    <main className="space-y-6" aria-busy={loading}>
      <div className="flex flex-col gap-4 border-b border-[#DCE3EC] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">Sales Pipeline</h1>
          
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sales/leads')}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs transition-colors hover:bg-[#F8FAFC] cursor-pointer"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Table view
          </button>
          <button
            type="button"
            onClick={() => void loadPipeline()}
            disabled={loading}
            aria-label="Refresh sales pipeline"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {!loading && !loadError && pipeline && (
        <>
          <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pipeline summary">
            <MetricCard label="Pipeline value" value={formatCurrencyTotals(pipelineValue)} detail={`${visibleLeads.length} tracked opportunities`} />
            <MetricCard label="Active deals" value={`${activeLeads.length}`} detail="Open opportunities" />
            <MetricCard label="Closed won revenue" value={formatCurrencyTotals(wonRevenue)} detail={`${wonDeals} closed won`} />
            <MetricCard label="Average active deal" value={formatCurrencyTotals(averageDealSize)} detail="Amounts shown in VND" />
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE3EC] bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <label className="relative block w-full sm:max-w-lg">
              <span className="sr-only">Search sales pipeline</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search sales pipeline"
                placeholder="Search by company, contact, source, or salesperson..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full h-9 rounded-xl border border-[#DCE3EC] bg-white pl-9 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
              />
            </label>
            <p className="text-xs font-medium text-slate-600" aria-live="polite">
              Showing {visibleLeads.length} of {pipeline.total} opportunities
            </p>
          </div>
        </>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500" role="status" aria-live="polite">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#244A70] border-t-transparent" />
          Loading sales pipeline...
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center shadow-2xs" role="alert">
          <h2 className="font-semibold text-[#17263A]">
            {loadError === 'permission' ? 'Access denied' : 'Failed to load sales pipeline'}
          </h2>
          <p className="mt-2 text-xs text-slate-600 font-medium">
            {loadError === 'permission'
              ? 'You do not have permission to view the sales pipeline.'
              : 'The sales pipeline could not be loaded. Please try again.'}
          </p>
          {loadError === 'unexpected' && (
            <button
              type="button"
              onClick={() => void loadPipeline()}
              className="mt-4 rounded-xl bg-[#244A70] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d3c5c] shadow-2xs cursor-pointer"
            >
              Try again
            </button>
          )}
        </div>
      ) : pipeline?.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE3EC] bg-white px-6 py-16 text-center" role="status">
          <h2 className="font-semibold text-[#17263A]">No sales opportunities yet</h2>
          <p className="mt-2 text-xs text-slate-500 font-medium">When leads are available, they will appear here by stage.</p>
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE3EC] bg-white px-6 py-16 text-center" role="status">
          <h2 className="font-semibold text-[#17263A]">No matching opportunities</h2>
          <p className="mt-2 text-xs text-slate-500 font-medium">Try another search term or clear the search.</p>
          <button type="button" onClick={() => setSearchTerm('')} className="mt-3 text-xs font-semibold text-[#244A70] hover:underline cursor-pointer">
            Clear search
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto px-1 pt-1 pb-4 -mx-1" aria-label="Sales pipeline board">
          <div className="grid min-h-[500px] gap-3.5" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(260px, 1fr))` }}>
            {STAGES.map((stage) => {
              const leads = groupedLeads.get(stage.key) ?? [];
              return (
                <section key={stage.key} aria-labelledby={`pipeline-stage-${stage.key}`} className={`flex min-h-[460px] flex-col rounded-2xl border border-[#DCE3EC] ${stage.key === 'WON' ? 'bg-emerald-50/30' : 'bg-[#F8FAFC]'}`}>
                  <header className="border-b border-[#DCE3EC] p-3.5 bg-white/70 rounded-t-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <h2 id={`pipeline-stage-${stage.key}`} className={`text-xs font-bold uppercase tracking-wider ${stage.tone}`}>{stage.label}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stage.surface} ${stage.tone}`} aria-label={`${leads.length} opportunities`}>
                        {leads.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 font-medium">{stage.description}</p>
                  </header>
                  <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {leads.length === 0 ? (
                      <p className="py-12 text-center text-xs italic text-slate-500 font-medium">No opportunities in this stage.</p>
                    ) : leads.map((lead) => (
                      <PipelineLeadCard key={lead.id} lead={lead} onOpen={() => navigate(`/crm/leads/${encodeURIComponent(lead.id)}`)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
};

const MetricCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="rounded-2xl border border-[#DCE3EC] bg-white p-4 sm:p-5 shadow-2xs">
    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
    <div className="mt-1.5 break-words text-xl font-bold text-[#17263A]">{value}</div>
    <span className="mt-1 block text-xs text-slate-500 font-medium">{detail}</span>
  </div>
);

const PipelineLeadCard = ({ lead, onOpen }: { lead: SalesPipelineLeadDto; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`View ${lead.company} lead details`}
    className="block w-full rounded-xl border border-[#DCE3EC] bg-white p-3.5 text-left text-xs shadow-2xs transition-all hover:border-[#244A70] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244A70] cursor-pointer group"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="line-clamp-2 font-bold text-xs text-[#17263A] group-hover:text-[#244A70] transition-colors">{lead.company}</span>
      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#244A70] border border-blue-200/60" aria-label={`Score ${lead.score ?? 'not set'}`}>
        {lead.score ?? '—'}
      </span>
    </div>
    <div className="mt-1.5 block line-clamp-1 text-xs text-slate-600 font-medium">{lead.contactName}</div>
    <div className="mt-2.5 block border-t border-[#DCE3EC] pt-2 text-xs font-bold text-slate-900">
      {lead.dealValue === undefined ? 'Value not set' : formatMoney(lead.dealValue)}
    </div>
    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
      <span className="truncate">{lead.assignedToName || 'Unassigned'}</span>
      <span className="truncate px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-xs">{lead.source}</span>
    </div>
  </button>
);
