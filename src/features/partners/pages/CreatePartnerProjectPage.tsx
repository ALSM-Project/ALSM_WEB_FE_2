import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card, Button, Input, Select, PageHeader } from '@/shared/ui';
import { usePartnerQuery, useCreatePartnerProjectMutation } from '../hooks/usePartnersQuery';
import type { ConversionType } from '../api/partners.api';

const CONVERSION_TYPE_OPTIONS = [
  { value: 'BMS_DSPF_TO_FRONTEND', label: 'BMS / DSPF -> React' },
  { value: 'COBOL_TO_JAVA', label: 'COBOL -> Java' },
];

export const CreatePartnerProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { partnerId = '' } = useParams();
  const { data: partner, isLoading: partnerLoading, error: partnerError } = usePartnerQuery(partnerId);
  const createProjectMutation = useCreatePartnerProjectMutation(partnerId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conversionType, setConversionType] = useState<ConversionType>('BMS_DSPF_TO_FRONTEND');

  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const backToProjects = () => navigate(`/organisations/partners/${partnerId}/projects`);

  const validate = (): boolean => {
    const errors: { name?: string } = {};
    if (!name.trim()) {
      errors.name = 'Project name is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validate()) return;
    if (createProjectMutation.isPending) return;

    try {
      const created = await createProjectMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        conversionType,
      });
      setSuccessMessage(`Project '${created.name}' created successfully.`);
      setName('');
      setDescription('');
      setConversionType('BMS_DSPF_TO_FRONTEND');
      setFieldErrors({});
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create project.';
      setErrorMessage(msg);
    }
  };

  if (partnerLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#6B778C]">Loading partner...</div>
    );
  }

  if (partnerError || !partner) {
    return (
      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>
          {(partnerError as any)?.response?.data?.message || 'Partner not found.'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <PageHeader
        title={`Create Project for ${partner.name}`}
        subtitle="Register a new modernization project for this partner."
        actions={
          <Button variant="outline" size="sm" onClick={backToProjects}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Projects
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card variant="default" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project Name *"
            placeholder="e.g. CardDemo Modernization"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-[#091E42] tracking-wide">Description</label>
            <textarea
              placeholder="Briefly describe the scope of this modernization effort..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] placeholder-[#6B778C] shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0652CC] focus:border-[#0652CC] h-24"
            />
          </div>

          <Select
            label="Conversion Type *"
            value={conversionType}
            onChange={(e) => setConversionType(e.target.value as ConversionType)}
            options={CONVERSION_TYPE_OPTIONS}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" onClick={backToProjects}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createProjectMutation.isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreatePartnerProjectPage;
