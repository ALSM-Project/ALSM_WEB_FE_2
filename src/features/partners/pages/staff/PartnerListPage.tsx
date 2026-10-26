import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Building2,
  FolderKanban,
  CheckCircle2,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { partnersApi } from '../../api/partners.api';
import { Partner } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { RegisterPartnerModal } from '../../components/RegisterPartnerModal';
import { CreatePartnerProjectModal } from '../../components/CreatePartnerProjectModal';
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface PartnerListPageProps {
  openCreateModalOnInit?: boolean;
}

export const PartnerListPage: React.FC<PartnerListPageProps> = ({
  openCreateModalOnInit = false,
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'ACTIVE' | 'HAS_PROJECTS' | 'HAS_EXPORTS'>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(openCreateModalOnInit);
  const [selectedProjectPartner, setSelectedProjectPartner] = useState<Partner | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await partnersApi.getPartners();
      setPartners(data);
    } catch (err) {
      setPartners([]);
      setLoadError(err instanceof Error ? err.message : 'The partner list could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = partners.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.domain && p.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

    let matchSpecial = true;
    if (specialFilter === 'ACTIVE') {
      matchSpecial = p.status === 'ACTIVE';
    } else if (specialFilter === 'HAS_PROJECTS') {
      matchSpecial = (p.projectCount || 0) > 0;
    } else if (specialFilter === 'HAS_EXPORTS') {
      matchSpecial = (p.completedExportCount || 0) > 0;
    }

    return matchSearch && matchStatus && matchSpecial;
  });

  const totalPartners = partners.length;
  const activePartners = partners.filter((p) => p.status === 'ACTIVE').length;
  const totalProjects = partners.reduce((sum, p) => sum + (p.projectCount || 0), 0);
  const totalCompletedExports = partners.reduce((sum, p) => sum + (p.completedExportCount || 0), 0);

  return (
    <div className="space-y-5">
      {loadError && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between">
          <span>{loadError}</span>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-red-700 hover:text-red-900 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Partner Organizations</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {partners.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage enterprise partners, conversion accounts, assigned leads, and modernization pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 h-8"
            title="Refresh partners"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {hasPermission('partner.create') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs font-medium h-8 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Partner
            </Button>
          )}
        </div>
      </div>

      {successNotice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successNotice}
          </span>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metric Summary Cards - Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Partners */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSpecialFilter('ALL');
            setStatusFilter('ALL');
          }}
          className={`p-4 rounded-lg bg-white border shadow-xs space-y-1.5 cursor-pointer transition-all hover:border-slate-300 group ${
            specialFilter === 'ALL' && statusFilter === 'ALL'
              ? 'border-[#0652CC] ring-1 ring-[#0652CC] bg-blue-50/20'
              : 'border-slate-200'
          }`}
          title="Click to view all partner accounts"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-[#0652CC] transition-colors">Total Partners</span>
            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-[#0652CC] transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalPartners}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Registered enterprise accounts</span>
            <span className="text-[#0652CC] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View all →</span>
          </div>
        </div>

        {/* Card 2: Active Modernization */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSpecialFilter('ACTIVE');
            setStatusFilter('ACTIVE');
          }}
          className={`p-4 rounded-lg bg-white border shadow-xs space-y-1.5 cursor-pointer transition-all hover:border-emerald-300 group ${
            specialFilter === 'ACTIVE' || statusFilter === 'ACTIVE'
              ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20'
              : 'border-slate-200'
          }`}
          title="Click to view active modernization partners"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">Active Modernization</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">{activePartners}</div>
          <div className="flex items-center justify-between text-[11px] text-emerald-700 pt-0.5">
            <span>Under active conversion SLA</span>
            <span className="font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Filter active →</span>
          </div>
        </div>

        {/* Card 3: Total Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSpecialFilter('HAS_PROJECTS');
            setStatusFilter('ALL');
          }}
          className={`p-4 rounded-lg bg-white border shadow-xs space-y-1.5 cursor-pointer transition-all hover:border-indigo-300 group ${
            specialFilter === 'HAS_PROJECTS'
              ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20'
              : 'border-slate-200'
          }`}
          title="Click to view partners with active projects"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">Total Projects</span>
            <FolderKanban className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalProjects}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Across BMS & COBOL domains</span>
            <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">With projects →</span>
          </div>
        </div>

        {/* Card 4: Completed Exports */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSpecialFilter('HAS_EXPORTS');
            setStatusFilter('ALL');
          }}
          className={`p-4 rounded-lg bg-white border shadow-xs space-y-1.5 cursor-pointer transition-all hover:border-teal-300 group ${
            specialFilter === 'HAS_EXPORTS'
              ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50/20'
              : 'border-slate-200'
          }`}
          title="Click to view partners with delivered export bundles"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-teal-700 transition-colors">Completed Exports</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-600 tracking-tight">{totalCompletedExports}</div>
          <div className="flex items-center justify-between text-[11px] text-teal-700 pt-0.5">
            <span>Delivered code bundles</span>
            <span className="font-semibold opacity-0 group-hover:opacity-100 transition-opacity">With exports →</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, domain, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-[#0652CC] rounded-md text-slate-900 placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#0652CC] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-[#0652CC] rounded-md px-2.5 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-[#0652CC] font-medium transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Partner Data Table */}
      <div className="alsm-table-container">
        <table className="alsm-table">
          <thead>
            <tr>
              <th>Partner Name & Domain</th>
              <th>Engagement Tier</th>
              <th>Assigned Conversion Lead</th>
              <th className="text-center">Projects</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0652CC]" />
                    <span className="text-xs">Loading partner accounts...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-800">No partner organizations found</p>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new partner.</p>
                </td>
              </tr>
            ) : (
              filtered.map((partner) => (
                <tr
                  key={partner.id}
                  onClick={() => navigate(`/partners/${partner.id}`)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div>
                      <button
                        onClick={() => navigate(`/partners/${partner.id}`)}
                        className="font-semibold text-sm text-slate-900 group-hover:text-[#0652CC] hover:underline text-left block transition-colors"
                      >
                        {partner.name}
                      </button>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">{partner.domain || 'no-domain.com'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{partner.contactEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                      {partner.engagementType || 'Dedicated Modernization'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 text-xs">
                      {partner.assignedStaffName || 'Not assigned'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">SLA: 4h response</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-sm text-slate-900">{partner.projectCount}</span>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">projects</span>
                  </td>
                  <td className="py-3 px-4">
                    <PartnerStatusBadge status={partner.status} type="partner" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/partners/${partner.id}`);
                        }}
                        className="text-xs text-[#0652CC] hover:bg-blue-50/60 transition-colors font-medium h-7"
                      >
                        View Details
                      </Button>
                      {hasPermission('partner_project.create') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectPartner(partner);
                            setIsCreateProjectModalOpen(true);
                          }}
                          className="text-xs flex items-center gap-1 border-slate-200 text-[#0652CC] hover:bg-blue-50/60 font-medium h-7"
                        >
                          <Plus className="w-3 h-3" /> New Project
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

      {/* Centered Register Partner Modal */}
      <RegisterPartnerModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          if (openCreateModalOnInit) {
            navigate('/partners', { replace: true });
          }
        }}
        onSuccess={async (partner) => {
          setSuccessNotice(`Partner "${partner.name}" was created successfully.`);
          await loadData();
        }}
      />

      {/* Centered Create Partner Project Modal */}
      <CreatePartnerProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => {
          setIsCreateProjectModalOpen(false);
          setSelectedProjectPartner(null);
        }}
        partner={selectedProjectPartner}
        partnersList={partners}
        onSuccess={async () => {
          await loadData();
        }}
      />
    </div>
  );
};
