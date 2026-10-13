import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertCircle, Building2, Mail, Phone } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePartnersQuery } from '../hooks/usePartnersQuery';

export const PartnersPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('partners.manage');

  const { data: partners = [], isLoading, error } = usePartnersQuery();

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Partners"
        subtitle="Business partners managed by conversion staff."
        actions={
          canManage && (
            <Button onClick={() => navigate('/organisations/partners/new')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Partner
            </Button>
          )
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{(error as any)?.response?.data?.message || 'Unable to load partners from backend.'}</span>
        </div>
      )}

      <Card variant="default" padding="none">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B778C] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0652CC]" />
            <span>Loading partners...</span>
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B778C]">
            No partner profiles have been created yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {partners.map((partner) => (
              <div key={partner.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#E8F1FF] text-[#0652CC] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#091E42] truncate">{partner.name}</h3>
                      <Badge variant={partner.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {partner.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B778C] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {partner.contactEmail}
                      </span>
                      {partner.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {partner.contactPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-[#6B778C] shrink-0">
                  {new Date(partner.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PartnersPage;
