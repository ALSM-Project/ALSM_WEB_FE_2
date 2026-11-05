import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileSignature, Search } from 'lucide-react';
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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-100 p-3 text-blue-700"><FileSignature className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create a contract</h1>
            <p className="mt-1 text-sm text-slate-600">Choose a Lead to open its contract workspace and create a draft.</p>
          </div>
        </div>
      </header>

      <label className="flex max-w-xl items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5">
        <Search className="h-4 w-4 text-slate-500" />
        <input className="w-full border-0 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, or email" />
      </label>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading Leads…</p> : error && leads.length === 0 ?
          <p role="alert" className="p-8 text-center text-sm text-red-700">{error}</p> : filteredLeads.length === 0 ?
            <div className="space-y-2 p-8 text-center">
              <p className="font-medium text-slate-700">{search.trim() ? 'No matching Leads found.' : 'No saved Leads are available.'}</p>
              <p className="text-sm text-slate-500">{search.trim() ? 'Clear the search to see all Leads.' : 'Add a Lead from Leads (CRM), then return here to create its contract.'}</p>
              <div className="flex justify-center gap-3 pt-2">
                {search.trim() && <button type="button" onClick={() => setSearch('')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear search</button>}
                <button type="button" onClick={() => navigate('/sales/leads')} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Open Leads (CRM)</button>
              </div>
            </div> : (
              <>
                {error && <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
                  <p role="alert">{error}</p>
                  {needsSalesTeam && <Link to="/organisations/teams/manage" className="mt-2 inline-flex font-semibold text-blue-800 underline">{hasPermission('teams.manage') ? 'Open Sales Team Management' : 'How to get Sales Team access'}</Link>}
                </div>}
                <ul className="divide-y divide-slate-200">
                  {filteredLeads.map((lead) => (
                    <li key={lead.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
                      <div>
                        <h2 className="font-semibold text-slate-900">{lead.companyName || lead.contactName}</h2>
                        <p className="mt-1 text-sm text-slate-600">{lead.contactName} · {lead.contactEmail}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {lead.status}</p>
                      </div>
                      <button type="button" disabled={busyLeadId === lead.id || lead.status === 'WON' || lead.status === 'LOST'} onClick={() => void openContract(lead)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                        {busyLeadId === lead.id ? 'Preparing…' : lead.status === 'WON' || lead.status === 'LOST' ? 'Not eligible' : 'Create Contract'} <ArrowRight className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
      </section>
    </main>
  );
};
