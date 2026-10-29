import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import { crmApi } from '../api/crm.api';
import type { SalesPipelineDto, SalesPipelineLeadDto, SalesPipelineStage } from '../types/crm.types';

const STAGES: Array<{
  key: SalesPipelineStage;
  label: string;
  description: string;
  tone: string;
  surface: string;
}> = [
  { key: 'NEW', label: 'New inbound', description: 'New opportunities', tone: 'text-slate-700', surface: 'bg-slate-100' },
  { key: 'CONTACTED', label: 'Contacted', description: 'Initial dialogue', tone: 'text-blue-700', surface: 'bg-blue-50' },
  { key: 'QUALIFIED', label: 'Qualified', description: 'Needs confirmed', tone: 'text-indigo-700', surface: 'bg-indigo-50' },
  { key: 'PROPOSAL', label: 'Proposal', description: 'Quote or proposal sent', tone: 'text-amber-700', surface: 'bg-amber-50' },
  { key: 'NEGOTIATION', label: 'Negotiation', description: 'Commercial discussion', tone: 'text-orange-700', surface: 'bg-orange-50' },
  { key: 'WON', label: 'Closed won', description: 'Successfully closed', tone: 'text-emerald-700', surface: 'bg-emerald-50' },
  { key: 'LOST', label: 'Closed lost', description: 'Closed opportunities', tone: 'text-rose-700', surface: 'bg-rose-50' },
  { key: 'UNMAPPED', label: 'Needs review', description: 'Stage needs review', tone: 'text-slate-700', surface: 'bg-slate-100' },
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
    const currency = /^[A-Z]{3}$/.test(lead.currency) ? lead.currency : 'USD';
    totals.set(currency, (totals.get(currency) ?? 0) + lead.dealValue);
  }
  return totals;
};

const averageByCurrency = (leads: SalesPipelineLeadDto[]): Map<string, number> => {
  const totals = sumByCurrency(leads);
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (lead.dealValue === undefined || !Number.isFinite(lead.dealValue)) continue;
    const currency = /^[A-Z]{3}$/.test(lead.currency) ? lead.currency : 'USD';
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  return new Map(Array.from(totals, ([currency, total]) => [currency, total / (counts.get(currency) ?? 1)]));
};

const formatMoney = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const formatCurrencyTotals = (totals: Map<string, number>): string =>
  totals.size > 0
    ? Array.from(totals, ([currency, amount]) => formatMoney(amount, currency)).join(' · ')
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
      <div className="flex flex-col gap-4 border-b border-[#E5EAF0] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">Sales Pipeline</h1>
          <p className="mt-1 text-xs text-[#6B778C]">Read-only view of current sales opportunities by stage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sales/leads')}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#091E42] shadow-xs transition-colors hover:bg-[#F4F6F8]"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Table view
          </button>
          <button
            type="button"
            onClick={() => void loadPipeline()}
            disabled={loading}
            aria-label="Refresh sales pipeline"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#091E42] shadow-xs transition-colors hover:bg-[#F4F6F8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {!loading && !loadError && pipeline && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pipeline summary">
            <MetricCard label="Pipeline value" value={formatCurrencyTotals(pipelineValue)} detail={`${visibleLeads.length} tracked opportunities`} />
            <MetricCard label="Active deals" value={`${activeLeads.length}`} detail="Open opportunities" />
            <MetricCard label="Closed won revenue" value={formatCurrencyTotals(wonRevenue)} detail={`${wonDeals} closed won`} />
            <MetricCard label="Average active deal" value={formatCurrencyTotals(averageDealSize)} detail="Grouped by currency" />
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF0] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-lg">
              <span className="sr-only">Search sales pipeline</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6B778C]" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search sales pipeline"
                placeholder="Search by company, contact, source, or salesperson..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#0652CC] focus:ring-2 focus:ring-[#0652CC]/20"
              />
            </label>
            <p className="text-xs text-[#6B778C]" aria-live="polite">
              Showing {visibleLeads.length} of {pipeline.total} opportunities
            </p>
          </div>
        </>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-[#6B778C]" role="status" aria-live="polite">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#0652CC] border-t-transparent" />
          Loading sales pipeline...
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center" role="alert">
          <h2 className="font-semibold text-[#091E42]">
            {loadError === 'permission' ? 'Access denied' : 'Failed to load sales pipeline'}
          </h2>
          <p className="mt-2 text-sm text-[#6B778C]">
            {loadError === 'permission'
              ? 'You do not have permission to view the sales pipeline.'
              : 'The sales pipeline could not be loaded. Please try again.'}
          </p>
          {loadError === 'unexpected' && (
            <button
              type="button"
              onClick={() => void loadPipeline()}
              className="mt-4 rounded-lg bg-[#0652CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0543A8]"
            >
              Try again
            </button>
          )}
        </div>
      ) : pipeline?.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9E2EC] bg-white px-6 py-16 text-center" role="status">
          <h2 className="font-semibold text-[#091E42]">No sales opportunities yet</h2>
          <p className="mt-2 text-sm text-[#6B778C]">When leads are available, they will appear here by stage.</p>
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9E2EC] bg-white px-6 py-16 text-center" role="status">
          <h2 className="font-semibold text-[#091E42]">No matching opportunities</h2>
          <p className="mt-2 text-sm text-[#6B778C]">Try another search term or clear the search.</p>
          <button type="button" onClick={() => setSearchTerm('')} className="mt-3 text-sm font-semibold text-[#0652CC] hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2" aria-label="Sales pipeline board">
          <div className="grid min-h-[460px] gap-3" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(230px, 1fr))` }}>
            {STAGES.map((stage) => {
              const leads = groupedLeads.get(stage.key) ?? [];
              return (
                <section key={stage.key} aria-labelledby={`pipeline-stage-${stage.key}`} className={`flex min-h-[420px] flex-col rounded-2xl border border-[#E5EAF0] ${stage.key === 'WON' ? 'bg-emerald-50/40' : 'bg-[#F7F9FC]'}`}>
                  <header className="border-b border-[#E5EAF0] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 id={`pipeline-stage-${stage.key}`} className={`text-xs font-bold uppercase tracking-wide ${stage.tone}`}>{stage.label}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.surface} ${stage.tone}`} aria-label={`${leads.length} opportunities`}>
                        {leads.length}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{stage.description}</p>
                  </header>
                  <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
                    {leads.length === 0 ? (
                      <p className="py-8 text-center text-xs italic text-[#6B778C]">No opportunities in this stage.</p>
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
  <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-xs">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    <div className="mt-1 break-words text-lg font-bold text-slate-900">{value}</div>
    <span className="text-[10px] text-slate-500">{detail}</span>
  </div>
);

const PipelineLeadCard = ({ lead, onOpen }: { lead: SalesPipelineLeadDto; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`View ${lead.company} lead details`}
    className="block w-full rounded-xl border border-[#E5EAF0] bg-white p-3 text-left text-xs shadow-xs transition-all hover:border-[#0652CC] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0652CC]"
  >
    <span className="flex items-start justify-between gap-2">
      <span className="line-clamp-2 font-bold text-[#091E42]">{lead.company}</span>
      <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0652CC]" aria-label={`Score ${lead.score ?? 'not set'}`}>
        {lead.score ?? '—'}
      </span>
    </span>
    <span className="mt-1 block line-clamp-1 text-[11px] text-[#6B778C]">{lead.contactName}</span>
    <span className="mt-2 block border-t border-slate-100 pt-2 text-[10px] text-slate-600">
      {lead.dealValue === undefined ? 'Value not set' : formatMoney(lead.dealValue, lead.currency)}
    </span>
    <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
      <span className="truncate">{lead.assignedToName || 'Unassigned'}</span>
      <span className="truncate">{lead.source}</span>
    </span>
  </button>
);
