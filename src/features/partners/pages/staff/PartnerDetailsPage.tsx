import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  FolderKanban,
  Plus,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  DownloadCloud,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { partnersApi } from '../../api/partners.api';
import { Partner, PartnerProject, ExportBundleInfo } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { CreatePartnerProjectModal } from '../../components/CreatePartnerProjectModal';
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const PartnerDetailsPage: React.FC = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [exports, setExports] = useState<ExportBundleInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'sla' | 'exports'>('projects');
  const [loading, setLoading] = useState(true);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  const loadData = async () => {
    if (!partnerId) return;
    try {
      setLoading(true);
      const [p, projs, expList] = await Promise.all([
        partnersApi.getPartnerById(partnerId),
        partnersApi.getProjects(partnerId),
        partnersApi.getExportBundles(partnerId),
      ]);
      setPartner(p);
      setProjects(projs);
      setExports(expList);
    } catch {
      setPartner(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [partnerId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC] mx-auto mb-2" />
        <p className="text-xs text-[#6B778C]">Loading partner profile...</p>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0]">
        <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#091E42]">Partner Not Found</h3>
        <p className="text-xs text-[#6B778C] mt-1">The specified partner organization could not be located.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/partners')} className="mt-4">
          Return to Partners
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card Header */}
      <div className="p-6 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-xl bg-[#091E42] text-white flex items-center justify-center font-bold text-lg shrink-0">
              {partner.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[#091E42]">{partner.name}</h1>
                <PartnerStatusBadge status={partner.status} type="partner" />
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B778C] flex-wrap">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {partner.domain || 'domain.com'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {partner.contactEmail}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {partner.engagementType || 'Dedicated Modernization'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasPermission('partner_project.create') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="text-xs flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
              >
                <Plus className="w-4 h-4" /> Create Project
              </Button>
            )}
          </div>
        </div>

      {/* Tabs */}
      <div className="border-b border-[#E5EAF0] flex items-center space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'projects'
              ? 'text-[#0652CC] border-b-2 border-[#0652CC]'
              : 'text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          Modernization Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('sla')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'sla'
              ? 'text-[#0652CC] border-b-2 border-[#0652CC]'
              : 'text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          Assigned Staff & SLA Tier
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'exports'
              ? 'text-[#0652CC] border-b-2 border-[#0652CC]'
              : 'text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          Export History ({exports.length})
        </button>
      </div>

      {/* Tab 1: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#D9E2EC]">
              <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#091E42]">No Projects Assigned</h4>
              <p className="text-xs text-[#6B778C] mt-1">
                This partner has not initiated any BMS or COBOL modernization projects yet.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="mt-4 bg-[#0652CC] hover:bg-[#0543A8]"
              >
                Create First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/partners/projects/${project.id}`)}
                  className="p-5 rounded-xl border border-[#E5EAF0] bg-white shadow-2xs hover:border-[#0652CC] hover:shadow-md transition-all space-y-4 flex flex-col justify-between cursor-pointer group"
                  title="Click to view project details & team allocation"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-[#4A5568]">
                        {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL to Java 21' : 'BMS/DSPF to React'}
                      </span>
                      <PartnerStatusBadge status={project.status} type="project" />
                    </div>

                    <div className="text-left">
                      <h3 className="text-sm font-bold text-[#091E42] group-hover:text-[#0652CC] transition-colors">
                        {project.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#6B778C] line-clamp-2">{project.description}</p>
                  </div>

                  {/* Dual metric progress */}
                  <ProgressBar
                    screensTotal={project.screensTotal}
                    screensCompleted={project.screensCompleted}
                    programsTotal={project.programsTotal}
                    programsCompleted={project.programsCompleted}
                  />

                  <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-between">
                    <span className="text-[11px] text-[#6B778C]">
                      Target: <span className="font-medium text-[#091E42]">{project.targetFramework}</span>
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/partners/projects/${project.id}`);
                        }}
                        className="text-xs text-[#091E42]"
                        title="View Project Overview & Team Allocation"
                      >
                        Overview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/partners/projects/${project.id}/upload`);
                        }}
                        className="text-xs"
                      >
                        Upload
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/partners/projects/${project.id}/workspace`);
                        }}
                        className="text-xs bg-[#0652CC] hover:bg-[#0543A8]"
                      >
                        Workspace
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assigned Staff & SLA */}
      {activeTab === 'sla' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-[#E5EAF0] bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
              <UserCheck className="w-5 h-5 text-[#0652CC]" />
              <h3 className="text-sm font-bold text-[#091E42]">Assigned Conversion Lead</h3>
            </div>
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0652CC] flex items-center justify-center font-bold text-sm">
                SJ
              </div>
              <div>
                <p className="text-sm font-bold text-[#091E42]">
                  {partner.assignedStaffName || 'Not assigned'}
                </p>
                <p className="text-xs text-[#6B778C]">Senior Conversion & Modernization Specialist</p>
              </div>
            </div>
            <div className="text-xs text-[#4A5568] space-y-1 pt-2">
              <p>• Lead authority for AST AST syntax rules & quality review</p>
              <p>• Authorized to resolve custom field mapping transforms</p>
              <p>• Direct escalation contact: <span className="font-mono text-[#0652CC]">sjenkins@alsm.internal</span></p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-[#E5EAF0] bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#091E42]">SLA Agreement & Guarantees</h3>
            </div>
            <div className="space-y-3 text-xs text-[#4A5568]">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-medium text-[#091E42]">Tier:</span>
                <span className="font-semibold text-[#0652CC]">{partner.engagementType || 'Dedicated Modernization'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-medium text-[#091E42]">Initial Error Triage SLA:</span>
                <span className="font-semibold text-emerald-600">&lt; 4 business hours</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-medium text-[#091E42]">AI Quality Verification:</span>
                <span className="font-semibold text-purple-600">Continuous Enabled</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-medium text-[#091E42]">Export Bundle Delivery:</span>
                <span className="font-semibold text-[#091E42]">Automated Zip with Checksum</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Export History */}
      {activeTab === 'exports' && (
        <div className="space-y-4">
          {exports.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#D9E2EC]">
              <DownloadCloud className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#091E42]">No Bundles Exported Yet</h4>
              <p className="text-xs text-[#6B778C] mt-1">
                Completed project code bundles will appear here once generated by the conversion staff.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5EAF0] bg-white shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs text-[#091E42]">
                <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Package Name</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4 text-center">Items Included</th>
                    <th className="py-3 px-4">Exported Date</th>
                    <th className="py-3 px-4">Partner Notification</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {exports.map((bundle) => (
                    <tr
                      key={bundle.id}
                      onClick={() => navigate(`/partners/projects/${bundle.projectId}/workspace`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      title="Click to open project workspace"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0652CC] group-hover:underline">
                        {bundle.packageName}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{bundle.projectName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold">{bundle.totalItems} items</span>
                        <span className="text-[10px] text-[#6B778C] block">
                          ({bundle.screensIncluded} screens, {bundle.programsIncluded} cobol)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B778C]">
                        {new Date(bundle.exportedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <PartnerStatusBadge status={bundle.notificationStatus} type="partner" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/partners/projects/${bundle.projectId}/workspace`);
                          }}
                          className="text-xs text-[#0652CC] hover:bg-blue-50"
                        >
                          Open Workspace
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Centered Create Partner Project Modal */}
      <CreatePartnerProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        partner={partner}
        onSuccess={async () => {
          await loadData();
        }}
      />
    </div>
  );
};
