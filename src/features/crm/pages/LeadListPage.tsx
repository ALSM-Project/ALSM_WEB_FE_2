import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, Phone, Mail, Building, 
  ArrowRight, TrendingUp, Users, ArrowUpDown, UserCheck,
  ChevronLeft, ChevronRight
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
    setCurrentPage(1);
    fetchLeads();
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      if (sortByScoreDesc) {
        return (b.score || 0) - (a.score || 0);
      }
      return (a.score || 0) - (b.score || 0);
    });
  }, [leads, sortByScoreDesc]);

  // Reset to first page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter, sortByScoreDesc]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedLeads.length);

  const paginatedLeads = useMemo(() => {
    return sortedLeads.slice(startIndex, endIndex);
  }, [sortedLeads, startIndex, endIndex]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Leads
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/pipeline')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-xs cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-[#244A70]" />
            Pipeline Kanban
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by company, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-4 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span>Stage:</span>
            </span>
            {['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'].map((st) => (
              <button
                key={st}
                onClick={() => { setStageFilter(st); setCurrentPage(1); }}
                className={`h-8 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center transition-all cursor-pointer ${
                  stageFilter === st
                    ? 'bg-[#244A70] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-slate-700 hover:bg-[#DCE3EC]'
                }`}
              >
                {st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}

            <button
              onClick={() => setSortByScoreDesc(!sortByScoreDesc)}
              className="ml-2 h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              title="Toggle sort by lead qualification score"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Score: {sortByScoreDesc ? 'High-to-Low' : 'Low-to-High'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-5">Contact & Company</th>
                <th className="py-3.5 px-4 sm:px-5">Contact Info</th>
                <th className="py-3.5 px-3 text-center">Score</th>
                <th className="py-3.5 px-4 sm:px-5">Deal Value</th>
                <th className="py-3.5 px-4 sm:px-5">Stage</th>
                <th className="py-3.5 px-4 sm:px-5">Assigned Rep</th>
                <th className="py-3.5 px-4 sm:px-5">Last Activity</th>
                <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin" />
                      <span>Loading ...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                    title="Click to view lead details"
                  >
                    <td className="py-4 px-4 sm:px-5">
                      <div className="font-semibold text-xs text-[#17263A] group-hover:text-[#244A70] transition-colors">
                        {lead.contactName}
                      </div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{lead.company}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-5">
                      <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {getScoreBadge(lead.score)}
                    </td>
                    <td className="py-4 px-4 sm:px-5 font-semibold text-xs text-slate-800">
                      {formatVnd(lead.dealValue || 0)}
                    </td>
                    <td className="py-4 px-4 sm:px-5">
                      {getStageBadge(lead.stage)}
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{lead.assignedToName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-xs text-slate-500 font-medium">
                      {lead.lastContactAt
                        ? new Date(lead.lastContactAt).toLocaleDateString()
                        : 'No activity'}
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs h-8 px-3 border border-[#DCE3EC] text-[#244A70] hover:bg-[#F8FAFC]"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sales/leads/${lead.id}`);
                          }}
                        >
                          View
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {sortedLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-white border-t border-[#DCE3EC] text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#DCE3EC] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#244A70] cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-300">|</span>
              <span>
                Showing <strong className="font-semibold text-slate-900">{sortedLeads.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-900">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-900">{sortedLeads.length}</strong> leads
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE3EC] bg-white text-xs font-semibold text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 text-xs font-semibold text-slate-700">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE3EC] bg-white text-xs font-semibold text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
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
