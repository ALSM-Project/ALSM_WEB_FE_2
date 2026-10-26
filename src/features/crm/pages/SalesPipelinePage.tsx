import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Plus, Sparkles, Lock, 
  Award, UserCheck
} from 'lucide-react';
import { crmApi, LeadDto, LeadStage } from '../api/crm.api';
import { CustomerActivationModal } from '../components/CustomerActivationModal';
import { AddLeadModal } from '../components/AddLeadModal';

const STAGES: { key: LeadStage; label: string; color: string; border: string; desc: string }[] = [
  { key: 'NEW', label: 'New Inbound', color: 'bg-gray-100 text-gray-800', border: 'border-gray-200', desc: 'Discovered / uncontacted' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-800', border: 'border-blue-200', desc: 'Initial dialogue initiated' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-200', desc: 'Demo presented & scoped' },
  { key: 'PROPOSAL', label: 'Proposal & Contract', color: 'bg-amber-100 text-amber-800', border: 'border-amber-200', desc: 'Commercial negotiation' },
  { key: 'WON', label: 'Closed Won (Activation)', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200', desc: 'Automated provisioning' },
  { key: 'LOST', label: 'Closed Lost', color: 'bg-rose-100 text-rose-800', border: 'border-rose-200', desc: 'Postponed or lost' },
];

export const SalesPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  // Modals
  const [activeActivationLead, setActiveActivationLead] = useState<LeadDto | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await crmApi.getLeads();
      setLeads(data);
    } catch (err: any) {
      console.error('Failed to load pipeline leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleMoveStage = async (leadId: string, newStage: LeadStage) => {
    if (newStage === 'WON') {
      alert("Manual transition to 'Won' is prohibited by Section 3.11 rules. Please click 'Activate Customer' to run the verification checklist.");
      return;
    }

    try {
      setMovingId(leadId);
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      );
      await crmApi.updateLeadStage(leadId, { stage: newStage });
    } catch (err: any) {
      console.error('Failed to move stage:', err);
      fetchLeads();
    } finally {
      setMovingId(null);
    }
  };

  const getLeadsByStage = (stage: LeadStage) => {
    return leads.filter((l) => l.stage === stage);
  };

  // Metrics Calculations
  const totalPipelineValue = leads
    .filter((l) => l.stage !== 'LOST')
    .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const activeDeals = leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST').length;
  const wonDeals = leads.filter((l) => l.stage === 'WON').length;
  const wonRevenue = leads
    .filter((l) => l.stage === 'WON')
    .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const avgDealSize = leads.length > 0 ? Math.round(totalPipelineValue / leads.length) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5EAF0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">Sales Pipeline Kanban</h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Section 3.11: Track deal velocity, enforce automated Customer Activation, and prevent manual Won overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
          <button
            onClick={() => navigate('/sales/leads')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors"
          >
            Table View
          </button>
          <button
            onClick={fetchLeads}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline Value</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">${totalPipelineValue.toLocaleString()} USD</div>
          <span className="text-[10px] text-slate-500">{leads.length} tracked opportunities</span>
        </div>

        <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Deals in Flight</span>
          <div className="text-lg font-bold text-blue-600 mt-0.5">{activeDeals} Deals</div>
          <span className="text-[10px] text-slate-500">Across 4 qualifying stages</span>
        </div>

        <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closed Won Revenue</span>
          <div className="text-lg font-bold text-emerald-600 mt-0.5">${wonRevenue.toLocaleString()} USD</div>
          <span className="text-[10px] text-emerald-700 font-medium">{wonDeals} provisioned customers</span>
        </div>

        <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Deal Size</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">${avgDealSize.toLocaleString()} USD</div>
          <span className="text-[10px] text-slate-500">Enterprise modernization tier</span>
        </div>
      </div>

      {/* Kanban Board Container */}
      {loading ? (
        <div className="py-20 text-center text-[#6B778C]">
          <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading sales pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 min-h-[600px] overflow-x-auto">
          {STAGES.map((col) => {
            const columnLeads = getLeadsByStage(col.key);
            const isWonCol = col.key === 'WON';

            return (
              <div
                key={col.key}
                className={`flex flex-col rounded-2xl border p-3 shadow-xs ${
                  isWonCol ? 'bg-emerald-50/40 border-emerald-200' : 'bg-[#F7F9FC] border-[#E5EAF0]'
                }`}
              >
                {/* Column Header */}
                <div className="pb-2.5 mb-2.5 border-b border-[#E5EAF0]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#091E42] uppercase tracking-wider flex items-center gap-1">
                      {isWonCol && <Lock className="w-3 h-3 text-emerald-700" />}
                      {col.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.color}`}>
                      {columnLeads.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{col.desc}</span>
                </div>

                {/* Column Content */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[700px] pr-1">
                  {columnLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-[#6B778C]/60 italic">
                      No deals in this stage
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const hasSigned = lead.contracts?.some((c) => c.status === 'FULLY_SIGNED');

                      return (
                        <div
                          key={lead.id}
                          className="bg-white rounded-xl p-3 border border-[#E5EAF0] shadow-xs hover:border-[#0652CC] hover:shadow-sm transition-all text-xs"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4
                              onClick={() => navigate(`/sales/leads/${lead.id}`)}
                              className="font-bold text-xs text-[#091E42] hover:text-[#0652CC] cursor-pointer line-clamp-1"
                              title={lead.company}
                            >
                              {lead.company}
                            </h4>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0652CC]">
                              {lead.score}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#6B778C] mt-1 line-clamp-1">
                            {lead.contactName}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                            <span className="font-semibold text-slate-800">
                              ${(lead.dealValue || 0).toLocaleString()} USD
                            </span>
                            {lead.assignedToName && (
                              <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                                <UserCheck className="w-3 h-3 text-slate-400" />
                                {lead.assignedToName.split(' ')[0]}
                              </span>
                            )}
                          </div>

                          {/* Specific Action for Proposal with Signed Contract */}
                          {lead.stage === 'PROPOSAL' && hasSigned && (
                            <div className="mt-2.5">
                              <button
                                type="button"
                                onClick={() => setActiveActivationLead(lead)}
                                className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-blue-200" />
                                Activate Customer
                              </button>
                            </div>
                          )}

                          {/* Specific details for Closed Won */}
                          {lead.stage === 'WON' && (
                            <div className="mt-2.5 pt-1.5 border-t border-emerald-100">
                              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Award className="w-3 h-3 text-emerald-600" />
                                Provisioned Tenant
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveActivationLead(lead)}
                                className="text-[10px] text-blue-600 hover:underline mt-0.5 block"
                              >
                                View Credentials
                              </button>
                            </div>
                          )}

                          {/* Move Stage Selector (Won is excluded per Section 3.11 rules) */}
                          {lead.stage !== 'WON' && (
                            <div className="mt-2.5 pt-2 border-t border-[#E5EAF0]">
                              <select
                                disabled={movingId === lead.id}
                                value={lead.stage}
                                onChange={(e) => handleMoveStage(lead.id, e.target.value as any)}
                                className="text-[10px] py-1 px-1.5 rounded-lg border border-[#E5EAF0] bg-white text-[#091E42] w-full focus:outline-none focus:border-[#0652CC] cursor-pointer"
                              >
                                {STAGES.filter((s) => s.key !== 'WON').map((s) => (
                                  <option key={s.key} value={s.key}>
                                    Move: {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Activation Modal */}
      {activeActivationLead && (
        <CustomerActivationModal
          isOpen={!!activeActivationLead}
          lead={activeActivationLead}
          onClose={() => setActiveActivationLead(null)}
          onSuccess={(updated) => {
            fetchLeads();
            setActiveActivationLead(updated);
          }}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onSuccess={() => {
          fetchLeads();
        }}
      />
    </div>
  );
};
