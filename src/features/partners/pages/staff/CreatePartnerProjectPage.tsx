import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Monitor,
  Cpu,
  ChevronDown,
  ArrowRight,
  Check,
  Building2,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { partnersApi, PartnerApiError } from '../../api/partners.api';
import { Partner, ConversionType } from '../../types/partner.types';

export const CreatePartnerProjectPage: React.FC = () => {
  const { partnerId } = useParams<{ partnerId?: string }>();
  const navigate = useNavigate();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partnerId || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conversionType, setConversionType] = useState<ConversionType>('BMS_DSPF_TO_FRONTEND');
  const [targetFramework, setTargetFramework] = useState('React 19 + Tailwind CSS');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    partnersApi
      .getPartners()
      .then((list) => {
        if (!isMounted) return;
        setPartners(list);
        if (!selectedPartnerId && list.length > 0) {
          setSelectedPartnerId(list[0].id);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPartners(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedPartnerId]);

  const handleTypeChange = (type: ConversionType) => {
    setConversionType(type);
    if (type === 'BMS_DSPF_TO_FRONTEND') {
      setTargetFramework('React 19 + Tailwind CSS');
    } else {
      setTargetFramework('Spring Boot 3.3 / Java 21');
    }
  };

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

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

    const partnerName = selectedPartner ? selectedPartner.name : 'Enterprise Partner';

    try {
      setSubmitting(true);
      const newProj = await partnersApi.createProject({
        partnerId: selectedPartnerId,
        partnerName,
        name: name.trim(),
        description: description.trim(),
        conversionType,
        targetFramework,
      });

      navigate(`/partners/projects/${newProj.id}`);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err instanceof PartnerApiError
            ? err.message
            : 'Failed to create partner project. Please verify inputs and try again.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(partnerId ? `/partners/${partnerId}` : '/partners')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0652CC] hover:text-[#0543A8] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{partnerId && selectedPartner ? `Back to ${selectedPartner.name}` : 'Back to Partners'}</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[#091E42]">
            Create Partner Modernization Project
          </h1>
          <p className="text-xs text-[#6B778C] mt-0.5">
            Initiate a modernization project on behalf of an onboarded partner organization.
          </p>
        </div>

        {selectedPartner && (
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs self-start sm:self-auto">
            <Building2 className="w-4 h-4 text-[#0652CC]" />
            <div className="text-left">
              <p className="text-xs font-bold text-[#091E42] leading-tight">{selectedPartner.name}</p>
              <p className="text-[10px] text-[#6B778C]">{selectedPartner.domain || 'Enterprise Account'}</p>
            </div>
            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {selectedPartner.engagementType || 'Active'}
            </span>
          </div>
        )}
      </div>

      {/* Main 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 8 cols */}
        <div className="lg:col-span-8 bg-white border border-[#D9E2EC] rounded-2xl shadow-2xs p-6 sm:p-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.form && (
              <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] px-4 py-2.5 rounded-lg text-xs font-medium">
                {errors.form}
              </div>
            )}

            {/* Section 1: Partner & Project Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
                <Building2 className="w-4 h-4 text-[#0652CC]" />
                <h2 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                  Partner Organization &amp; Project Scope
                </h2>
              </div>

              {/* Target Partner Selection */}
              <div>
                <label
                  htmlFor="partner-select"
                  className="block text-xs font-semibold text-[#091E42] mb-1.5"
                >
                  Target Partner Organization <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="partner-select"
                    value={selectedPartnerId}
                    onChange={(e) => {
                      setSelectedPartnerId(e.target.value);
                      if (errors.partner) {
                        setErrors((prev) => ({ ...prev, partner: '' }));
                      }
                    }}
                    disabled={loadingPartners || Boolean(partnerId)}
                    className={`w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-lg text-[#091E42] appearance-none pr-10 transition-all outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC] ${
                      errors.partner
                        ? 'border-rose-500 focus:ring-rose-500/20'
                        : 'border-[#D9E2EC]'
                    } ${loadingPartners || partnerId ? 'bg-[#F7F9FC] text-[#42526E]' : ''}`}
                  >
                    {loadingPartners ? (
                      <option value="">Loading onboarded partners...</option>
                    ) : partners.length === 0 ? (
                      <option value="">No partners available</option>
                    ) : (
                      partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.domain ? `(${p.domain})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6B778C]">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {errors.partner && (
                  <p className="text-xs font-medium text-rose-500 mt-1">{errors.partner}</p>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-xs font-semibold text-[#091E42] mb-1.5"
                >
                  Modernization Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder="e.g. Core Banking Customer Portal Modernization"
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-lg text-[#091E42] placeholder-[#8993A4] transition-all outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC] ${
                    errors.name
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-[#D9E2EC]'
                  }`}
                />
                {errors.name && (
                  <p className="text-xs font-medium text-rose-500 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Scope Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="project-desc"
                    className="block text-xs font-semibold text-[#091E42]"
                  >
                    Project Description &amp; Scope Notes
                  </label>
                  <span className="text-[11px] text-[#6B778C]">Optional</span>
                </div>
                <textarea
                  id="project-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline legacy system characteristics, batch windows, or modernization guidelines..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] placeholder-[#8993A4] transition-all outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC] resize-none"
                />
              </div>
            </div>

            {/* Section 2: Modernization Pipeline */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
                <Layers className="w-4 h-4 text-[#0652CC]" />
                <h2 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                  Modernization Domain &amp; Pipeline
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pipeline 1: BMS/DSPF Screens */}
                <div
                  role="radio"
                  aria-checked={conversionType === 'BMS_DSPF_TO_FRONTEND'}
                  tabIndex={0}
                  onClick={() => handleTypeChange('BMS_DSPF_TO_FRONTEND')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleTypeChange('BMS_DSPF_TO_FRONTEND');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    conversionType === 'BMS_DSPF_TO_FRONTEND'
                      ? 'border-[#0652CC] bg-blue-50/40 shadow-xs'
                      : 'border-[#E5EAF0] bg-white hover:border-[#D9E2EC]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          conversionType === 'BMS_DSPF_TO_FRONTEND'
                            ? 'bg-[#0652CC] text-white shadow-xs'
                            : 'bg-gray-100 text-[#42526E]'
                        }`}
                      >
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#091E42]">
                          BMS / DSPF Screens to Web
                        </h4>
                        <p className="text-[11px] text-[#6B778C] mt-0.5">
                          Converts 3270 maps into React 19 components
                        </p>
                      </div>
                    </div>
                    {conversionType === 'BMS_DSPF_TO_FRONTEND' && (
                      <span className="w-5 h-5 rounded-full bg-[#0652CC] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2.5 border-t border-[#E5EAF0]/60">
                    <span className="text-[#6B778C]">Source: BMS / DSPF</span>
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-100/70 text-[#0652CC]">
                      React 19 + TypeScript
                    </span>
                  </div>
                </div>

                {/* Pipeline 2: COBOL to Java */}
                <div
                  role="radio"
                  aria-checked={conversionType === 'COBOL_TO_JAVA'}
                  tabIndex={0}
                  onClick={() => handleTypeChange('COBOL_TO_JAVA')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleTypeChange('COBOL_TO_JAVA');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    conversionType === 'COBOL_TO_JAVA'
                      ? 'border-[#0652CC] bg-blue-50/40 shadow-xs'
                      : 'border-[#E5EAF0] bg-white hover:border-[#D9E2EC]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          conversionType === 'COBOL_TO_JAVA'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-gray-100 text-[#42526E]'
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#091E42]">
                          COBOL to Java Microservices
                        </h4>
                        <p className="text-[11px] text-[#6B778C] mt-0.5">
                          AST parsing into Spring Boot 3 services
                        </p>
                      </div>
                    </div>
                    {conversionType === 'COBOL_TO_JAVA' && (
                      <span className="w-5 h-5 rounded-full bg-[#0652CC] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2.5 border-t border-[#E5EAF0]/60">
                    <span className="text-[#6B778C]">Source: COBOL / CBL</span>
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-purple-100/70 text-purple-700">
                      Spring Boot 3 + Java 21
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Target Framework & Architecture */}
            <div className="space-y-4 pt-2">
              <div>
                <label
                  htmlFor="framework-select"
                  className="block text-xs font-semibold text-[#091E42] mb-1.5"
                >
                  Target Framework &amp; Stack <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="framework-select"
                    value={targetFramework}
                    onChange={(e) => setTargetFramework(e.target.value)}
                    className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] appearance-none pr-10 transition-all outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC]"
                  >
                    {conversionType === 'BMS_DSPF_TO_FRONTEND' ? (
                      <>
                        <option value="React 19 + Tailwind CSS">React 19 + Tailwind CSS (Strict TypeScript)</option>
                        <option value="Vue 3 + Tailwind CSS">Vue 3 + Tailwind CSS (Composition API)</option>
                        <option value="Angular 17">Angular 17 (Signals + Modern Template)</option>
                      </>
                    ) : (
                      <>
                        <option value="Spring Boot 3.3 / Java 21">Spring Boot 3.3 / Java 21 (Gradle)</option>
                        <option value="Quarkus 3 / Java 21">Quarkus 3 / Java 21 (GraalVM Native)</option>
                        <option value="Micronaut 4 / Java 21">Micronaut 4 / Java 21</option>
                      </>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6B778C]">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF0]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(partnerId ? `/partners/${partnerId}` : '/partners')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                className="bg-[#0652CC] hover:bg-[#0543A8] flex items-center gap-2"
              >
                <span>Create &amp; Go to Project Overview</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Right Configuration & Architecture Summary: 4 cols */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
              <Sparkles className="w-4 h-4 text-[#0652CC]" />
              <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Modernization Blueprint
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B778C] block text-[11px]">Selected Partner:</span>
                <span className="font-semibold text-[#091E42]">
                  {selectedPartner?.name || 'Loading partner...'}
                </span>
              </div>

              <div>
                <span className="text-[#6B778C] block text-[11px]">Pipeline Mode:</span>
                <span className="font-semibold text-[#0652CC]">
                  {conversionType === 'BMS_DSPF_TO_FRONTEND'
                    ? 'Screen Conversion (BMS/DSPF)'
                    : 'Program Conversion (COBOL to Java)'}
                </span>
              </div>

              <div>
                <span className="text-[#6B778C] block text-[11px]">Target Architecture:</span>
                <span className="font-semibold text-[#091E42]">{targetFramework}</span>
              </div>

              <div>
                <span className="text-[#6B778C] block text-[11px]">SLA Response Tier:</span>
                <span className="font-semibold text-emerald-700">
                  {selectedPartner?.engagementType || 'Dedicated Modernization'}
                </span>
              </div>
            </div>

            {/* Stepper overview */}
            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-2">
              <p className="text-[11px] font-bold text-[#091E42] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Next Lifecycle Stages:</span>
              </p>
              <ul className="text-[10px] text-[#42526E] space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0652CC] font-bold text-[9px] flex items-center justify-center shrink-0">1</span>
                  <span>Upload source files (.cbl, .bms, .dspf)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-200 text-[#42526E] font-bold text-[9px] flex items-center justify-center shrink-0">2</span>
                  <span>AST parsing &amp; field mapping</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-200 text-[#42526E] font-bold text-[9px] flex items-center justify-center shrink-0">3</span>
                  <span>Automated code generation &amp; validation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-200 text-[#42526E] font-bold text-[9px] flex items-center justify-center shrink-0">4</span>
                  <span>Quality review &amp; export code bundle</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePartnerProjectPage;
