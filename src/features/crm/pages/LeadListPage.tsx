import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, Phone, Mail, Building, 
  ArrowRight, TrendingUp, Users, ArrowUpDown, UserCheck
} from 'lucide-react';
import { crmApi, LeadDto } from '../api/crm.api';
import { Button } from '@/shared/ui';
import { formatVnd } from '@/shared/utils/currency';
import { AddLeadModal } from '../components/AddLeadModal';

export const LeadListPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [sortByScoreDesc, setSortByScoreDesc] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await crmApi.getLeads({
        stage: stageFilter === 'ALL' ? undefined : stageFilter,
        search: searchTerm || undefined,
      });
      setLeads(data);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [stageFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const sortedLeads = [...leads].sort((a, b) => {
    if (sortByScoreDesc) {
      return (b.score || 0) - (a.score || 0);
    }
    return (a.score || 0) - (b.score || 0);
  });

  const getStageBadge = (stage: LeadDto['stage']) => {
    switch (stage) {
      case 'NEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">New</span>;
      case 'CONTACTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Contacted</span>;
      case 'QUALIFIED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Qualified</span>;
      case 'PROPOSAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Proposal</span>;
      case 'WON':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Won (Customer)</span>;
      case 'LOST':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Lost</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{stage}</span>;
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800">{score}</span>;
    }
    if (score >= 40) {
      return <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-800">{score}</span>;
    }
    return <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-gray-100 text-gray-700">{score}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">
            CRM & Lead Management
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Section 3.11: Track prospective modernization enterprise clients, log interactions, and advance conversion deals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/pipeline')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] transition-colors shadow-xs cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-[#0652CC]" />
            Pipeline Kanban
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by company, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
            />
            <Search className="w-4 h-4 text-[#6B778C] absolute left-3 top-2.5 pointer-events-none" />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-[#6B778C] flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Stage:
            </span>
            {['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].map((st) => (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  stageFilter === st
                    ? 'bg-[#0652CC] text-white shadow-xs'
                    : 'bg-[#F7F9FC] text-[#091E42] hover:bg-[#E5EAF0]'
                }`}
              >
                {st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}

            <button
              onClick={() => setSortByScoreDesc(!sortByScoreDesc)}
              className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="Toggle sort by lead qualification score"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              Score: {sortByScoreDesc ? 'High-to-Low' : 'Low-to-High'}
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Contact & Company</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-4">Deal Value</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Assigned Rep</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Loading leads from MongoDB / Local CRM store...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B778C]">
                    <Users className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    title="Click to view lead details"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#091E42] group-hover:text-[#0652CC] transition-colors">
                        {lead.contactName}
                      </div>
                      <div className="text-[11px] text-[#6B778C] flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-[#6B778C]" />
                        {lead.company}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#091E42] flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#6B778C]" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="text-[11px] text-[#6B778C] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-[#6B778C]" />
                          {lead.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {getScoreBadge(lead.score)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {formatVnd(lead.dealValue || 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStageBadge(lead.stage)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.assignedToName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#6B778C]">
                      {lead.lastContactAt
                        ? new Date(lead.lastContactAt).toLocaleDateString()
                        : 'No activity'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-[#E5EAF0] text-[#0652CC] hover:bg-[#F7F9FC]"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sales/leads/${lead.id}`);
                          }}
                        >
                          View
                          <ArrowRight className="w-3 h-3 ml-1" />
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

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(created) => {
          fetchLeads();
          navigate(`/sales/leads/${created.id}`);
        }}
      />
    </div>
  );
};
