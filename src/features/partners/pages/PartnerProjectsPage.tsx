import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, RefreshCw, AlertCircle, ArrowLeft, FolderKanban } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePartnerQuery, usePartnerProjectsQuery } from '../hooks/usePartnersQuery';

const CONVERSION_TYPE_LABEL: Record<string, string> = {
  BMS_DSPF_TO_FRONTEND: 'BMS / DSPF -> React',
  COBOL_TO_JAVA: 'COBOL -> Java',
};

export const PartnerProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { partnerId = '' } = useParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('partners.manage');

  const { data: partner, isLoading: partnerLoading } = usePartnerQuery(partnerId);
  const { data: projects = [], isLoading, error } = usePartnerProjectsQuery(partnerId);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={partnerLoading ? 'Partner Projects' : `${partner?.name ?? 'Partner'} - Projects`}
        subtitle="Modernization projects created for this partner."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/organisations/partners')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Partners
            </Button>
            {canManage && (
              <Button onClick={() => navigate(`/organisations/partners/${partnerId}/projects/new`)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Project
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{(error as any)?.response?.data?.message || 'Unable to load projects from backend.'}</span>
        </div>
      )}

      <Card variant="default" padding="none">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B778C] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0652CC]" />
            <span>Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B778C]">
            No projects have been created for this partner yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {projects.map((project) => (
              <div key={project.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#E8F1FF] text-[#0652CC] flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#091E42] truncate">{project.name}</h3>
                      <Badge variant={project.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B778C] flex-wrap">
                      <span>{CONVERSION_TYPE_LABEL[project.conversionType] ?? project.conversionType}</span>
                      {project.description && <span className="truncate">{project.description}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-[#6B778C] shrink-0">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PartnerProjectsPage;
