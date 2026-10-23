import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Cpu, Check, Building2 } from 'lucide-react';
import { Modal, Button, Input } from '@/shared/ui';
import { partnersApi } from '../api/partners.api';
import { Partner, PartnerProject, ConversionType } from '../types/partner.types';

export interface CreatePartnerProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: Partner | null;
  partnersList?: Partner[];
  onSuccess?: (newProject: PartnerProject) => void;
}

export const CreatePartnerProjectModal: React.FC<CreatePartnerProjectModalProps> = ({
  isOpen,
  onClose,
  partner,
  partnersList = [],
  onSuccess,
}) => {
  const navigate = useNavigate();

  const [availablePartners, setAvailablePartners] = useState<Partner[]>(partnersList);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partner?.id || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conversionType, setConversionType] = useState<ConversionType>('BMS_DSPF_TO_FRONTEND');
  const [targetFramework, setTargetFramework] = useState('React 19 + Tailwind CSS');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (partner?.id) {
        setSelectedPartnerId(partner.id);
      } else if (partnersList.length > 0) {
        setSelectedPartnerId(partnersList[0].id);
      } else {
        partnersApi
          .getPartners()
          .then((list) => {
            setAvailablePartners(list);
            if (list.length > 0 && !selectedPartnerId) {
              setSelectedPartnerId(list[0].id);
            }
          })
          .catch(() => setAvailablePartners([]));
      }
    }
  }, [isOpen, partner, partnersList]);

  const activePartner =
    partner || availablePartners.find((p) => p.id === selectedPartnerId);

  const resetForm = () => {
    setName('');
    setDescription('');
    setConversionType('BMS_DSPF_TO_FRONTEND');
    setTargetFramework('React 19 + Tailwind CSS');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeChange = (type: ConversionType) => {
    setConversionType(type);
    if (type === 'BMS_DSPF_TO_FRONTEND') {
      setTargetFramework('React 19 + Tailwind CSS');
    } else {
      setTargetFramework('Spring Boot 3.3 / Java 21');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedPartnerId) {
      errs.partner = 'Partner selection is required';
    }
    if (!name.trim()) {
      errs.name = 'Project name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Project name must be at least 2 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const partnerName = activePartner?.name || 'Enterprise Partner';

      const newProj = await partnersApi.createProject({
        partnerId: selectedPartnerId,
        partnerName,
        name: name.trim(),
        description: description.trim(),
        conversionType,
        targetFramework,
      });

      resetForm();
      if (onSuccess) {
        onSuccess(newProj);
      }
      onClose();
      navigate(`/partners/projects/${newProj.id}/workspace`);
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to create modernization project' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Partner Modernization Project"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-[#6B778C] -mt-2">
          Initiate a modernization project on behalf of an onboarded partner organization.
        </p>

        {errors.form && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errors.form}
          </div>
        )}

        {/* Target Partner */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-1.5">
            Target Partner Organization <span className="text-rose-500">*</span>
          </label>
          {partner ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#D9E2EC]">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-[#0652CC]" />
                <div>
                  <p className="text-xs font-bold text-[#091E42]">{partner.name}</p>
                  <p className="text-[11px] text-[#6B778C]">{partner.domain || partner.contactEmail}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#0652CC]">
                {partner.engagementType || 'Dedicated Modernization'}
              </span>
            </div>
          ) : (
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] outline-none focus:ring-1 focus:ring-[#0652CC]"
            >
              {availablePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.domain ? `(${p.domain})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Project Name */}
        <div>
          <Input
            label="Modernization Project Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Core Banking Customer Portal Modernization"
            error={errors.name}
          />
        </div>

        {/* Project Scope Description */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-1.5 flex items-center justify-between">
            <span>Project Description &amp; Scope Notes</span>
            <span className="text-[11px] font-normal text-[#6B778C]">Optional</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Outline legacy system characteristics, batch windows, or modernization guidelines..."
            className="w-full px-3 py-2 text-xs bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] placeholder-[#6B778C] outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC] resize-none"
          />
        </div>

        {/* Modernization Pipeline Selection Cards */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-2">
            Modernization Domain &amp; Pipeline <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pipeline 1: BMS/DSPF Screens */}
            <div
              onClick={() => handleTypeChange('BMS_DSPF_TO_FRONTEND')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                conversionType === 'BMS_DSPF_TO_FRONTEND'
                  ? 'border-[#0652CC] bg-blue-50/40 shadow-xs'
                  : 'border-[#E5EAF0] bg-white hover:border-[#D9E2EC]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      conversionType === 'BMS_DSPF_TO_FRONTEND'
                        ? 'bg-[#0652CC] text-white'
                        : 'bg-gray-100 text-[#42526E]'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#091E42]">BMS / DSPF Screens to Web</h5>
                    <p className="text-[10px] text-[#6B778C]">3270 maps to React 19 components</p>
                  </div>
                </div>
                {conversionType === 'BMS_DSPF_TO_FRONTEND' && (
                  <span className="w-4 h-4 rounded-full bg-[#0652CC] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-[#E5EAF0]/60">
                <span className="text-[#6B778C]">Source: BMS / DSPF</span>
                <span className="font-semibold text-[#0652CC]">React 19 + TypeScript</span>
              </div>
            </div>

            {/* Pipeline 2: COBOL to Java */}
            <div
              onClick={() => handleTypeChange('COBOL_TO_JAVA')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                conversionType === 'COBOL_TO_JAVA'
                  ? 'border-[#0652CC] bg-blue-50/40 shadow-xs'
                  : 'border-[#E5EAF0] bg-white hover:border-[#D9E2EC]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      conversionType === 'COBOL_TO_JAVA'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-[#42526E]'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#091E42]">COBOL to Java Microservices</h5>
                    <p className="text-[10px] text-[#6B778C]">AST parsing to Spring Boot 3</p>
                  </div>
                </div>
                {conversionType === 'COBOL_TO_JAVA' && (
                  <span className="w-4 h-4 rounded-full bg-[#0652CC] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-[#E5EAF0]/60">
                <span className="text-[#6B778C]">Source: COBOL / CBL</span>
                <span className="font-semibold text-purple-700">Spring Boot 3 + Java 21</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Framework */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-1.5">
            Target Framework &amp; Stack <span className="text-rose-500">*</span>
          </label>
          <select
            value={targetFramework}
            onChange={(e) => setTargetFramework(e.target.value)}
            className="w-full text-xs p-2.5 bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] outline-none focus:ring-1 focus:ring-[#0652CC]"
          >
            {conversionType === 'BMS_DSPF_TO_FRONTEND' ? (
              <>
                <option value="React 19 + Tailwind CSS">React 19 + Tailwind CSS (Strict TypeScript)</option>
                <option value="Vue 3 + Tailwind CSS">Vue 3 + Tailwind CSS (Composition API)</option>
                <option value="Angular 17">Angular 17 (Signals + Modern Template)</option>
              </>
            ) : (
              <>
                <option value="Spring Boot 3.3 / Java 21">Spring Boot 3.3 / Java 21 (Virtual Threads)</option>
                <option value="Quarkus 3 / Java 21">Quarkus 3 / Java 21 (GraalVM Native)</option>
                <option value="Micronaut 4 / Java 21">Micronaut 4 / Java 21</option>
              </>
            )}
          </select>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF0]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            className="bg-[#0652CC] hover:bg-[#0543A8]"
          >
            Create &amp; Open Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default CreatePartnerProjectModal;
