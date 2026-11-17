import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { leadsApi } from '@/features/leads/api/leads.api';
import type { Lead } from '@/features/leads/types/lead';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { crmApi } from '../api/crm.api';

export const ContractLaunchPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let active = true;
    leadsApi.list({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }).then((response) => {
      if (active) setLeads(response.items);
    }).catch(() => {
      if (active) setError('Could not load Leads. Please refresh and try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) => [lead.companyName, lead.contactName, lead.contactEmail]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [leads, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLeads.length);

  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, startIndex, endIndex]);

  const needsSalesTeam = error.toLowerCase().includes('sales team');

  const openContract = async (lead: Lead) => {
    setBusyLeadId(lead.id);
    setError('');
    try {
      const crmLead = await crmApi.adoptLegacyLead(lead.id);
      navigate(`/sales/leads/${encodeURIComponent(crmLead.id)}?tab=contracts&action=create`);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || cause?.message || 'Could not link this Lead to the CRM contract workspace.');
    } finally {
      setBusyLeadId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#DCE3EC] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">Create a contract</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE3EC] bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <label className="relative block w-full sm:max-w-lg">
          <span className="sr-only">Search company, contact, or email</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search company, contact, or email"
            placeholder="Search company, contact, or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full h-9 rounded-xl border border-[#DCE3EC] bg-white pl-9 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
          />
        </label>
        <p className="text-xs font-medium text-slate-600" aria-live="polite">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DCE3EC] bg-white shadow-2xs">
        {loading ? <p className="p-8 text-center text-xs font-medium text-slate-500">Loading Leads…</p> : error && leads.length === 0 ?
          <p role="alert" className="p-8 text-center text-xs font-medium text-red-700">{error}</p> : filteredLeads.length === 0 ?
            <div className="space-y-2 p-8 text-center">
              <p className="text-xs font-semibold text-slate-800">{search.trim() ? 'No matching Leads found.' : 'No saved Leads are available.'}</p>
              <p className="text-xs text-slate-500 font-medium">{search.trim() ? 'Clear the search to see all Leads.' : 'Add a Lead from Leads (CRM), then return here to create its contract.'}</p>
              <div className="flex justify-center gap-3 pt-2">
                {search.trim() && <button type="button" onClick={() => setSearch('')} className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">Clear search</button>}
                <button type="button" onClick={() => navigate('/sales/leads')} className="rounded-xl bg-[#244A70] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1B3856] cursor-pointer shadow-2xs">Open Leads (CRM)</button>
              </div>
            </div> : (
              <>
                {error && <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs font-medium text-red-700">
                  <p role="alert">{error}</p>
                  {needsSalesTeam && <Link to="/organisations/teams/manage" className="mt-2 inline-flex font-semibold text-blue-800 underline">{hasPermission('teams.manage') ? 'Open Sales Team Management' : 'How to get Sales Team access'}</Link>}
                </div>}
                <ul className="divide-y divide-[#DCE3EC]">
                  {paginatedLeads.map((lead, index) => (
                    <li key={`${lead.id}-${index}`} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6 hover:bg-[#F8FAFC] transition-colors">
                      <div>
                        <h2 className="text-sm font-bold text-[#17263A]">{lead.companyName || lead.contactName}</h2>
                        <p className="mt-1 text-xs text-slate-600 font-medium">{lead.contactName} · {lead.contactEmail}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-medium">Status:</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {lead.status}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busyLeadId === lead.id || lead.status === 'WON' || lead.status === 'LOST'}
                        onClick={() => void openContract(lead)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#244A70] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1B3856] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyLeadId === lead.id ? 'Preparing…' : lead.status === 'WON' || lead.status === 'LOST' ? 'Not eligible' : 'Create Contract'} <ArrowRight className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Pagination Controls */}
                {filteredLeads.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-[#DCE3EC] bg-white text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-[#DCE3EC] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#244A70] cursor-pointer shadow-2xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="mx-1 text-slate-300">|</span>
                      <span>
                        Showing {startIndex + 1} to {endIndex} of {filteredLeads.length} leads
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 mr-2">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center justify-center rounded-lg border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center justify-center rounded-lg border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
      </section>
    </div>
  );
};
