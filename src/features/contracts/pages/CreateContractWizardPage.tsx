import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Building2,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  DollarSign,
  Lock,
  Monitor,
  Send,
} from 'lucide-react';
import { Button, Card, Badge } from '@/shared/ui';
import { contractsApi } from '../api/contracts.api';
import type {
  ServiceMode,
  ContractType,
  CustomerDetails,
  ServiceScope,
  ContractClause,
  ContractMilestone,
} from '../api/contracts.api';
import { crmApi } from '@/features/crm/api/crm.api';
import { companyProfileApi } from '@/features/admin/api/companyProfile.api';
import { formatVnd } from '@/shared/utils/currency';
import { useNavigation } from '@/context/NavigationContext';

const STEPS = [
  { id: 1, title: 'Select Customer', subtitle: 'Customer & Organization' },
  { id: 2, title: 'Contract Type', subtitle: 'Type & Service Model' },
  { id: 3, title: 'Configure Services', subtitle: 'Capacity & Quotas' },
  { id: 4, title: 'Commercial Terms', subtitle: 'Pricing & Milestone Billing' },
  { id: 5, title: 'Legal Clauses', subtitle: 'Clauses & Terms' },
  { id: 6, title: 'Approval & Signature', subtitle: 'Signatories & Approvals' },
  { id: 7, title: 'Generate Draft', subtitle: 'Review & Generate Draft' },
];

export const CreateContractWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useNavigation();
  const [searchParams] = useSearchParams();
  const paramOrgId = searchParams.get('orgId') || '';
  const paramLeadId = searchParams.get('leadId') || '';
  const paramQuoteId = searchParams.get('quoteId') || '';
  const paramCompany = searchParams.get('company') || '';
  const paramEmail = searchParams.get('email') || '';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available data from backend
  const [orgList, setOrgList] = useState<any[]>([]);
  const [leadList, setLeadList] = useState<any[]>([]);
  const [, setTemplateList] = useState<any[]>([]);
  const [clauseLibrary, setClauseLibrary] = useState<ContractClause[]>([]);

  // Helper to generate a valid MongoDB ObjectId for prospective new organizations
  const [newOrgTenantId] = useState<string>(() => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return (timestamp + random).toLowerCase();
  });

  // Step 1: Customer Form
  const [selectedOrgId, setSelectedOrgId] = useState<string>('__NEW_ORGANIZATION__');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(paramLeadId);
  const [customer, setCustomer] = useState<CustomerDetails>({
    companyName: paramCompany || '',
    taxId: '',
    businessAddress: '',
    representativeName: '',
    representativeTitle: '',
    contactEmail: paramEmail || '',
    contactPhone: '',
    powerOfAttorneyRef: '',
  });

  // Step 2: Contract Type & Service Model
  const [title, setTitle] = useState<string>('Enterprise Modernization Master Services Agreement');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('WE_CONVERT_FOR_YOU');
  const [contractType, setContractType] = useState<ContractType>('MANAGED_CONVERSION_SOW');
  const [planTier, setPlanTier] = useState<string>('Enterprise Core Modernization');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  // Step 3: Scope & Quotas
  const [scope, setScope] = useState<ServiceScope>({
    screensQuota: 500,
    programsQuota: 200,
    storageGb: 50,
    targetTechnology: 'React 19 + TypeScript + Spring Boot 3 Java',
    sourceCodeType: 'IBM 3270 BMS / AS400 DSPF & COBOL Logic',
    supportTier: 'Dedicated Enterprise SLA (2h response)',
    slaCommitment: '99.9% Platform Availability with Deterministic AST Validation',
    deliverables: [
      'Synthesized React 19 UI component repository with Tailwind styles',
      'Spring Boot 3 Java DTO contracts and JPA entities',
      'AST semantic equivalence & rule verification dossier',
      'Deployment architecture blueprint and migration runbook',
    ],
  });

  // Step 4: Commercial Terms
  const [subtotal, setSubtotal] = useState<number>(500000000); // 500M VND default
  const [currency, setCurrency] = useState<string>('VND');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Wire Transfer');
  const [paymentTermsDays, setPaymentTermsDays] = useState<string>('Net 30');
  const [paymentStructure, setPaymentStructure] = useState<'ONE_TIME' | 'MILESTONE_BASED' | 'MONTHLY_SUBSCRIPTION'>('MILESTONE_BASED');
  const [bankAccountInfo] = useState<string>(
    'Vietcombank — Account: 1029384756 (ALSM Technology Solutions JSC)',
  );

  // Computed Commercials
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = Math.round((afterDiscount * vatRate) / 100);
  const finalTotal = afterDiscount + vatAmount;

  // Step 5: Clauses & Milestones
  const [selectedClauses, setSelectedClauses] = useState<ContractClause[]>([]);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);

  // Step 6: Approval & Signature
  const [internalApprover, setInternalApprover] = useState<string>('Commercial Director');
  const [providerSignatoryName, setProviderSignatoryName] = useState<string>('Nguyen Gia Khanh');
  const [signatureDeadline, setSignatureDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  // Synchronize global header breadcrumb with origin
  useEffect(() => {
    if (paramLeadId) {
      const leadLabel = customer.companyName || paramCompany || 'Lead Detail';
      setCustomBreadcrumbs([
        { label: 'Leads (CRM)', path: '/sales/leads' },
        { label: leadLabel, path: `/sales/leads/${paramLeadId}` },
        { label: 'New Contract Wizard' },
      ]);
    } else if (paramOrgId) {
      setCustomBreadcrumbs([
        { label: 'Organizations', path: '/admin/billing/usage' },
        { label: paramCompany || customer.companyName || 'Organization', path: `/admin/billing/usage/${paramOrgId}` },
        { label: 'New Contract Wizard' },
      ]);
    } else {
      setCustomBreadcrumbs([
        { label: 'Quotes & Contracts', path: '/sales/contracts' },
        { label: 'New Contract Wizard' },
      ]);
    }

    return () => setCustomBreadcrumbs(null);
  }, [paramLeadId, paramOrgId, customer.companyName, paramCompany, setCustomBreadcrumbs]);

  // Initialize data and handle prefilling
  useEffect(() => {
    (async () => {
      try {
        const [custRes, tmplRes] = await Promise.all([
          contractsApi.getSelectableCustomers(),
          contractsApi.getTemplatesAndClauses(),
        ]);
        setOrgList(custRes.organizations || []);
        setLeadList(custRes.leads || []);
        setTemplateList(tmplRes.templates || []);
        const normalizedClauses = (tmplRes.clauses || []).map((c: any) => ({
          ...c,
          title: c.titleEn || c.title,
          description: c.descriptionEn || c.description,
        }));
        setClauseLibrary(normalizedClauses);
        setSelectedClauses(normalizedClauses);

        try {
          const profile = await companyProfileApi.getActiveProfile();
          if (profile) {
            const activeSigner = profile.signatoryConfig?.signerName || profile.representativeName;
            if (activeSigner) {
              setProviderSignatoryName(activeSigner);
            }
          }
        } catch {
          // ignore error and maintain default
        }

        // Prefill from paramLeadId if present
        if (paramLeadId) {
          let matchedLead = custRes.leads?.find((l) => l.id === paramLeadId || l._id === paramLeadId);
          let leadDetail: any = null;
          try {
            leadDetail = await crmApi.getLeadById(paramLeadId);
          } catch {
            // fallback to custRes.leads
          }

          const targetLead = leadDetail || matchedLead;
          if (targetLead) {
            setSelectedLeadId(targetLead.id || targetLead._id);
            const comp = targetLead.company || targetLead.companyName || targetLead.contactName || paramCompany || 'Enterprise Customer';
            setTitle(`Enterprise Modernization Agreement - ${comp}`);
            setCustomer({
              companyName: comp,
              taxId: targetLead.taxId || '0108849201',
              businessAddress: targetLead.address || 'Hanoi, Vietnam',
              representativeName: targetLead.contactName || 'Enterprise Representative',
              representativeTitle: targetLead.contactTitle || 'Director',
              contactEmail: targetLead.email || targetLead.contactEmail || paramEmail || 'contact@client.com',
              contactPhone: targetLead.phone || '',
              powerOfAttorneyRef: 'POA-2026-ALSM-01',
            });

            // Auto-resolve Organization ID for lead
            const leadOrgId =
              targetLead.organizationId ||
              targetLead.convertedOrganizationId ||
              targetLead.provisioning?.organizationId;
            const matchedOrg = custRes.organizations?.find(
              (o: any) =>
                (leadOrgId && (o.id === leadOrgId || o._id === leadOrgId)) ||
                (targetLead.taxId && o.taxId && o.taxId === targetLead.taxId) ||
                (o.name && comp && o.name.toLowerCase() === comp.toLowerCase())
            );
            if (matchedOrg) {
              setSelectedOrgId(matchedOrg.id || matchedOrg._id);
            } else {
              // Brand new organization for this lead
              setSelectedOrgId('__NEW_ORGANIZATION__');
            }

            if (targetLead.estimatedScreens || targetLead.estimatedPrograms) {
              setScope((prev) => ({
                ...prev,
                screensQuota: targetLead.estimatedScreens || prev.screensQuota,
                programsQuota: targetLead.estimatedPrograms || prev.programsQuota,
              }));
            }

            if (paramQuoteId && targetLead.quotes) {
              const matchedQuote = targetLead.quotes.find((q: any) => q.id === paramQuoteId);
              if (matchedQuote) {
                setPlanTier(matchedQuote.plan || 'Enterprise Core Modernization');
                setSubtotal(matchedQuote.basePrice || matchedQuote.finalPrice || targetLead.dealValue || 500000000);
                setDiscountPercent(matchedQuote.discountPercent || 0);
              }
            } else if (targetLead.dealValue || targetLead.estimatedValue) {
              setSubtotal(targetLead.dealValue || targetLead.estimatedValue);
            }
          }
        } else if (paramOrgId) {
          const matchedOrg = custRes.organizations?.find((o: any) => o.id === paramOrgId || o._id === paramOrgId);
          setSelectedOrgId(paramOrgId);
          const comp = matchedOrg?.name || matchedOrg?.companyName || paramCompany || 'Enterprise Organization';
          setTitle(`Enterprise Modernization Agreement - ${comp}`);
          setCustomer({
            companyName: comp,
            taxId: matchedOrg?.taxId || '0108849201',
            businessAddress: matchedOrg?.businessAddress || 'Hanoi, Vietnam',
            representativeName: matchedOrg?.representativeName || 'Representative',
            representativeTitle: matchedOrg?.representativeTitle || 'Managing Director',
            contactEmail: matchedOrg?.contactEmail || paramEmail || 'admin@customer.com',
            contactPhone: matchedOrg?.contactPhone || '',
            powerOfAttorneyRef: 'POA-2026-ALSM-01',
          });
        } else if (custRes.organizations && custRes.organizations.length > 0 && !paramCompany) {
          const first = custRes.organizations[0];
          setSelectedOrgId(first.id);
          setCustomer({
            companyName: first.name,
            taxId: first.taxId || '0108849201',
            businessAddress: first.businessAddress || 'Hanoi, Vietnam',
            representativeName: first.representativeName || 'Representative',
            representativeTitle: first.representativeTitle || 'Managing Director',
            contactEmail: first.contactEmail || 'admin@customer.com',
            contactPhone: first.contactPhone || '',
            powerOfAttorneyRef: 'POA-2026-ALSM-01',
          });
        }

        // Initialize default milestones
        setMilestones([
          {
            title: 'Milestone 1: Legacy Extraction & Architecture Blueprint',
            description: 'Complete analysis of legacy BMS maps, copybooks, and batch dependencies.',
            targetDate: effectiveDate,
            paymentPercentage: 30,
            deliverables: ['Legacy Architecture Assessment', 'Component inventory matrix', 'Target schema specifications'],
            status: 'PENDING',
          },
          {
            title: 'Milestone 2: Deterministic AST Conversion & Validation',
            description: 'Automated synthesis of React 19 UI components and Spring Boot 3 microservices.',
            targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            paymentPercentage: 40,
            deliverables: ['Synthesized frontend bundles', 'Spring Boot backend microservices', 'AST compliance report'],
            status: 'PENDING',
          },
          {
            title: 'Milestone 3: Final Acceptance & Production Handover',
            description: 'User acceptance testing, gap remediation, and certified production deliverables handover.',
            targetDate: endDate,
            paymentPercentage: 30,
            deliverables: ['Production deployment bundle', 'Certified sign-off dossier', '30-day warranty coverage'],
            status: 'PENDING',
          },
        ]);
      } catch (err) {
        console.error('Failed to load initial wizard data:', err);
      }
    })();
  }, [paramLeadId, paramQuoteId, paramCompany, paramEmail]);

  // Adjust deliverables dynamically when Service Mode changes
  const handleServiceModeChange = (mode: ServiceMode) => {
    setServiceMode(mode);
    if (mode === 'SELF_SERVICE_CONVERSION' || mode === 'SELF_SERVICE') {
      setContractType('SELF_SERVICE_SUBSCRIPTION');
      setScope((prev) => ({
        ...prev,
        supportTier: 'Standard Developer SLA (8x5 response)',
        slaCommitment: '99.5% Cloud AST Conversion API Availability',
        deliverables: [
          'Access to ALSM Cloud Web 2 modernization compiler workspace',
          'Platform-based automated AST translation CLI & Web SDK tokens',
          'Standard React 19 and Java Spring Boot target code templates',
          'Online documentation and knowledgebase access',
        ],
      }));
    } else {
      setContractType('MANAGED_CONVERSION_SOW');
      setScope((prev) => ({
        ...prev,
        supportTier: 'Dedicated Enterprise SLA (2h response)',
        slaCommitment: '99.9% Uptime with Deterministic AST Validation',
        deliverables: [
          'Full-service modernization execution performed by ALSM engineering team on Web 2',
          'Synthesized React 19 UI component repository with Tailwind styles',
          'Spring Boot 3 Java DTO contracts and JPA entities',
          'AST semantic equivalence & rule verification dossier delivered to Web 3',
          'Deployment architecture blueprint and migration runbook',
        ],
      }));
    }
  };

  const handleSelectExistingOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    if (orgId === '__NEW_ORGANIZATION__') {
      return;
    }
    const found = orgList.find((o) => o.id === orgId);
    if (found) {
      setCustomer((prev) => ({
        ...prev,
        companyName: found.name,
        taxId: found.taxId || prev.taxId,
        businessAddress: found.businessAddress || prev.businessAddress,
        representativeName: found.representativeName || prev.representativeName,
        representativeTitle: found.representativeTitle || prev.representativeTitle,
        contactEmail: found.contactEmail || prev.contactEmail,
      }));
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const found = leadList.find((l) => l.id === leadId || l._id === leadId);
    if (found) {
      const comp = found.company || found.companyName || 'Enterprise Customer';
      setTitle(`Enterprise Modernization Agreement - ${comp}`);
      setCustomer({
        companyName: comp,
        taxId: found.taxId || '0108849201',
        businessAddress: found.address || 'Hanoi, Vietnam',
        representativeName: found.contactName || 'Enterprise Representative',
        representativeTitle: found.contactTitle || 'Director',
        contactEmail: found.email || found.contactEmail || 'contact@client.com',
        contactPhone: found.phone || '',
        powerOfAttorneyRef: 'POA-2026-ALSM-01',
      });
      if (found.estimatedValue) {
        setSubtotal(found.estimatedValue);
      }

      // Auto-resolve Organization for selected lead
      const leadOrgId =
        found.organizationId ||
        (found as any).convertedOrganizationId ||
        (found as any).provisioning?.organizationId;
      const matchedOrg = orgList.find(
        (o: any) =>
          (leadOrgId && (o.id === leadOrgId || o._id === leadOrgId)) ||
          (found.taxId && o.taxId && o.taxId === found.taxId) ||
          (o.name && comp && o.name.toLowerCase() === comp.toLowerCase())
      );
      if (matchedOrg) {
        setSelectedOrgId(matchedOrg.id || matchedOrg._id);
      } else if (leadOrgId) {
        setSelectedOrgId(String(leadOrgId));
      } else if (!selectedOrgId && orgList.length > 0) {
        setSelectedOrgId(orgList[0].id || orgList[0]._id);
      }
    }
  };

  const handleCreateDraft = async (submitForReviewDirectly: boolean = false) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Validation
      const effectiveOrgId =
        selectedOrgId && selectedOrgId !== '__NEW_ORGANIZATION__'
          ? selectedOrgId
          : newOrgTenantId;

      if (!customer.companyName.trim()) {
        setErrorMsg('Please enter the customers full legal entity name.');
        setSubmitting(false);
        return;
      }
      if (
        !customer.representativeName.trim() ||
        (/^[a-z0-9_]{3,25}$/i.test(customer.representativeName.trim()) && /\d{3,}/.test(customer.representativeName.trim()))
      ) {
        setErrorMsg('Representative name cannot be a username (e.g. hoangndhde180637). Please enter the full legal name.');
        setSubmitting(false);
        return;
      }
      if (!customer.representativeTitle.trim()) {
        setErrorMsg('Please enter representative title (e.g. General Director, Managing Director).');
        setSubmitting(false);
        return;
      }
      if (!customer.taxId.trim()) {
        setErrorMsg('Please enter a valid Enterprise Tax ID / TIN.');
        setSubmitting(false);
        return;
      }

      const sanitizedCustomer: CustomerDetails = {
        companyName: customer.companyName.trim() || 'Client Workspace',
        taxId: customer.taxId.trim() || '0108849201',
        businessAddress: customer.businessAddress.trim() || 'Keangnam Landmark 72, Pham Hung, Nam Tu Liem, Hanoi, Vietnam',
        representativeName: customer.representativeName.trim() || 'Enterprise Representative',
        representativeTitle: customer.representativeTitle.trim() || 'Managing Director',
        contactEmail: customer.contactEmail.trim() || 'contracts@client.com',
        contactPhone: customer.contactPhone?.trim() || '+84 24 3982 7710',
        powerOfAttorneyRef: customer.powerOfAttorneyRef?.trim() || 'POA-2026-ALSM-01',
      };

      const contractValue = isNaN(finalTotal) || finalTotal <= 0 ? 11000 : finalTotal;

      const created = await contractsApi.createContract({
        title,
        serviceMode,
        contractType,
        organizationId: effectiveOrgId,
        leadId: selectedLeadId || undefined,
        planTier,
        effectiveDate,
        endDate,
        customer: sanitizedCustomer,
        scope,
        commercialTerms: {
          totalValue: contractValue,
          currency,
          discountPercent,
          vatRate,
          paymentStructure,
          bankAccountInfo,
          paymentTermsDays,
        },
        clauses: selectedClauses,
        milestones,
        requestId: crypto.randomUUID(),
      } as any);

      if (submitForReviewDirectly) {
        await contractsApi.submitForReview(created.id);
      }

      navigate(`/sales/contracts/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create contract draft:', err);
      const resData = err?.response?.data;
      let serverMsg = '';
      if (Array.isArray(resData?.details) && resData.details.length > 0) {
        serverMsg = resData.details.join('; ');
      } else if (typeof resData?.message === 'string' && resData.message !== 'Request validation failed') {
        serverMsg = resData.message;
      } else if (Array.isArray(resData?.message)) {
        serverMsg = resData.message.join('; ');
      } else if (resData?.message) {
        serverMsg = resData.message;
      } else if (err.message) {
        serverMsg = err.message;
      } else {
        serverMsg = 'Failed to create contract draft';
      }
      setErrorMsg(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 min-w-0">
      {/* ── 7-Step Progress Stepper ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-[#17263A] tracking-tight">
              New Contract Creation Wizard
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#244A70] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                onClick={() => isCompleted && setCurrentStep(s.id)}
                className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50/70 border border-[#244A70]/30'
                    : isCompleted
                    ? 'cursor-pointer hover:bg-slate-50 border border-transparent'
                    : 'opacity-50 border border-transparent'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#244A70] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isCurrent ? 'text-[#244A70]' : 'text-slate-800'}`}>
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{s.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ── STEP 1: SELECT CUSTOMER & ORGANIZATION ───────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#244A70]" />
                Step 1: Select Enterprise Customer & Legal Entity
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Choose an existing Organization or active CRM Lead to prefill corporate identity, tax number, and signatory data.
              </p>
            </div>

            {/* Informative Guidance Banner for Sales */}
            {selectedLeadId ? (
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#244A70] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[#244A70] flex items-center gap-1.5">
                    <span>New Enterprise Contract from CRM Lead</span>
                    <span className="px-2 py-0.2 bg-blue-100 text-[#244A70] text-[10px] font-semibold rounded-full border border-blue-200">
                      CRM Sales Link
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Thông tin pháp lý của khách hàng đã được đồng bộ từ CRM Lead. Hợp đồng sẽ được gắn với <strong>Organization Tenant</strong> bên dưới để quản lý quyền sở hữu, hạn mức quota và tài khoản Web 3 khi hợp đồng hoàn tất.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Organization Tenant *
                  </label>
                  <span className="text-[10px] text-[#244A70] font-medium">Bắt buộc liên kết</span>
                </div>
                <select
                  value={selectedOrgId || '__NEW_ORGANIZATION__'}
                  onChange={(e) => handleSelectExistingOrg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="__NEW_ORGANIZATION__">
                    ➕ Khách hàng mới (Nhập tên tổ chức mới ở bên dưới)
                  </option>
                  {orgList.length > 0 && (
                    <optgroup label="Tổ chức đã có trên hệ thống ALSM (Tái ký / Gia hạn)">
                      {orgList.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.taxId || 'No Tax ID'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Select only if this enterprise already has an existing Organization on ALSM.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Prefill from CRM Sales Lead
                  </label>
                  <span className="text-[10px] text-[#244A70] font-bold">New Customer (Recommended)</span>
                </div>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="">-- Choose CRM Lead --</option>
                  {leadList.map((lead) => (
                    <option key={lead.id || lead._id} value={lead.id || lead._id}>
                      {lead.company || lead.companyName} ({lead.contactName})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#244A70] block mt-1">
                  Synchronizing legal entity details from selected Lead.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                Customer Legal Entity Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer Legal Name *
                  </label>
                  <input
                    type="text"
                    value={customer.companyName}
                    onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
                    placeholder="e.g. Fintech Nexus Ltd."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enterprise Tax Code *
                  </label>
                  <input
                    type="text"
                    value={customer.taxId}
                    onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })}
                    placeholder="e.g. 0108849201"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Legal Representative *
                  </label>
                  <input
                    type="text"
                    value={customer.representativeName}
                    onChange={(e) => setCustomer({ ...customer, representativeName: e.target.value })}
                    placeholder="e.g. Marcus Vance"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Representative Position *
                  </label>
                  <input
                    type="text"
                    value={customer.representativeTitle}
                    onChange={(e) => setCustomer({ ...customer, representativeTitle: e.target.value })}
                    placeholder="e.g. Managing Director"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Signatory Email *
                  </label>
                  <input
                    type="email"
                    value={customer.contactEmail}
                    onChange={(e) => setCustomer({ ...customer, contactEmail: e.target.value })}
                    placeholder="e.g. signatory@company.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customer.contactPhone || ''}
                    onChange={(e) => setCustomer({ ...customer, contactPhone: e.target.value })}
                    placeholder="e.g. +84 24 3982 7710"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Registered Business Address *
                  </label>
                  <input
                    type="text"
                    value={customer.businessAddress}
                    onChange={(e) => setCustomer({ ...customer, businessAddress: e.target.value })}
                    placeholder="e.g. Keangnam Landmark 72, Pham Hung, Nam Tu Liem, Hanoi, Vietnam"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>
              </div>
            </div>

            {/* Provider Legal Entity static details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Provider Legal Entity (Countersigning Party)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Company Name</span>
                  <span className="font-bold">ALSM Technology Solutions JSC</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Enterprise Tax ID</span>
                  <span className="font-mono">0109988776</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Headquarters</span>
                  <span>Keangnam Landmark 72, Hanoi, Vietnam</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 2: CONTRACT TYPE & SERVICE MODEL ────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#244A70]" />
                Step 2: Choose Service Track & Contract Category
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Choose between Platform-Based Modernization or full turnkey Managed Modernization Services.
              </p>
            </div>

            {/* Service Model Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => handleServiceModeChange('SELF_SERVICE_CONVERSION')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  serviceMode === 'SELF_SERVICE_CONVERSION' || serviceMode === 'SELF_SERVICE'
                    ? 'border-[#244A70] bg-blue-50/40 ring-2 ring-[#244A70]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#17263A] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#244A70]" />
                    Platform-Based Modernization
                  </span>
                  {(serviceMode === 'SELF_SERVICE_CONVERSION' || serviceMode === 'SELF_SERVICE') && (
                    <Badge variant="primary">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Customer uploads source code directly, triggers automated compiler modernization, and manages React 19 / Spring Boot 3 deliverables.
                </p>
                <div className="mt-3 text-[11px] text-blue-700 font-semibold">
                  ✓ Automatically provision quotas & API tokens via contract
                </div>
              </div>

              <div
                onClick={() => handleServiceModeChange('WE_CONVERT_FOR_YOU')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  serviceMode === 'WE_CONVERT_FOR_YOU' || serviceMode === 'HYBRID'
                    ? 'border-[#244A70] bg-blue-50/40 ring-2 ring-[#244A70]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#17263A] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Managed Modernization Services
                  </span>
                  {(serviceMode === 'WE_CONVERT_FOR_YOU' || serviceMode === 'HYBRID') && (
                    <Badge variant="success">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Customer provides source files and specs. ALSM engineers modernize code on Web 2; customer tracks milestones and receives deliverables on Web 3.
                </p>
                <div className="mt-3 text-[11px] text-emerald-700 font-semibold">
                  ✓ Includes 99.9% AST SLA guarantee and 30-day warranty
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract Agreement Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="MANAGED_CONVERSION_SOW">Managed Conversion SOW</option>
                  <option value="SELF_SERVICE_SUBSCRIPTION">Platform-Based Modernization Agreement</option>
                  <option value="ENTERPRISE_HYBRID_MSA">Enterprise Hybrid MSA</option>
                  <option value="ORDER_FORM">Standard Order Form</option>
                  <option value="CONTRACT_AMENDMENT">Contract Amendment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Effective Start Date *
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expiration / Delivery End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subscription Plan Tier
                </label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="Starter">Starter Conversion Tier</option>
                  <option value="Professional">Professional Tier</option>
                  <option value="Enterprise Core Modernization">Enterprise Core Modernization</option>
                  <option value="Mission-Critical Banking Suite">Mission-Critical Banking Suite</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 3: CONFIGURE SERVICES & QUOTAS ──────────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-[#244A70]" />
                    Step 3: Configure Services & Screen Quotas
                  </h2>
                  <p className="text-xs text-[#8491A3] mt-1">
                    Set resource limits allocated to this customer upon contract execution. Quotas are applied only when active.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Screen Conversion Quota *
                    </label>
                    <input
                      type="number"
                      value={scope.screensQuota}
                      onChange={(e) => setScope({ ...scope, screensQuota: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Screens to convert</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Programs Limit *
                    </label>
                    <input
                      type="number"
                      value={scope.programsQuota}
                      onChange={(e) => setScope({ ...scope, programsQuota: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Backend logic programs</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Storage Limit (GB) *
                    </label>
                    <input
                      type="number"
                      value={scope.storageGb}
                      onChange={(e) => setScope({ ...scope, storageGb: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Artifacts & logs pool</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Support Level SLA
                    </label>
                    <select
                      value={scope.supportTier}
                      onChange={(e) => setScope({ ...scope, supportTier: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="Standard Developer SLA (8x5 response)">Standard Developer SLA (8x5 response)</option>
                      <option value="Dedicated Enterprise SLA (2h response)">Dedicated Enterprise SLA (2h response)</option>
                      <option value="Mission-Critical 24/7 SLA (15m response)">Mission-Critical 24/7 SLA (15m response)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      AST Semantic Commitment
                    </label>
                    <input
                      type="text"
                      value={scope.slaCommitment}
                      onChange={(e) => setScope({ ...scope, slaCommitment: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">
                    Included Contract Deliverables
                  </label>
                  {(scope.deliverables || []).map((del, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#244A70]" />
                      <input
                        type="text"
                        value={del}
                        onChange={(e) => {
                          const updated = [...(scope.deliverables || [])];
                          updated[idx] = e.target.value;
                          setScope({ ...scope, deliverables: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Scope Summary Panel */}
            <div className="space-y-4">
              <Card variant="default" padding="md" className="bg-slate-50 border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quota Summary Panel
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-slate-600">Screen Quota:</span>
                    <span className="font-bold text-[#244A70]">{scope.screensQuota} screens</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-slate-600">Programs:</span>
                    <span className="font-bold text-slate-800">{scope.programsQuota}</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-slate-600">Storage:</span>
                    <span className="font-bold text-slate-800">{scope.storageGb} GB</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-slate-600">Plan:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">{planTier}</span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500">
                  ⚠️ Note: Quotas configured here will only be granted to the customer tenant once this contract reaches <span className="font-bold text-emerald-700">Active</span> status.
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: COMMERCIAL TERMS ─────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Step 4: Commercial Pricing & Payment Structure
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Configure base contract valuation, volume discount, VAT rate, and milestone billing disbursements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract Value (Subtotal) *
                </label>
                <input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="VND">VND (Vietnam Dong)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  VAT Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="Bank Wire Transfer">Bank Wire Transfer</option>
                  <option value="Escrow Account">Escrow Account</option>
                  <option value="Direct Debit">Corporate Direct Debit</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Structure
                </label>
                <select
                  value={paymentStructure}
                  onChange={(e) => setPaymentStructure(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="MILESTONE_BASED">Milestone-based (30/40/30)</option>
                  <option value="ONE_TIME">100% Upfront Deposit</option>
                  <option value="MONTHLY_SUBSCRIPTION">Monthly Subscription</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Panel */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Financial Calculation Breakdown
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatVnd(subtotal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Discount ({discountPercent}%)</span>
                  <span className="font-semibold text-rose-600">-{formatVnd(discountAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">VAT ({vatRate}%)</span>
                  <span className="font-semibold text-slate-800">+{formatVnd(vatAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Final Contract Value</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{formatVnd(finalTotal)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 5: LEGAL CLAUSES ────────────────────────────────────────────── */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#244A70]" />
                Step 5: Approved Legal Clauses & Compliance Terms
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Select legally reviewed clauses for intellectual property protection, confidentiality, data security, and governing law.
              </p>
            </div>

            <div className="space-y-3">
              {clauseLibrary.map((clause, idx) => {
                const clauseTitle = clause.titleEn || clause.title;
                const clauseDesc = clause.descriptionEn || clause.description;
                const isSelected = selectedClauses.some((c) => (c.titleEn || c.title) === clauseTitle);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedClauses(selectedClauses.filter((c) => (c.titleEn || c.title) !== clauseTitle));
                      } else {
                        setSelectedClauses([...selectedClauses, clause]);
                      }
                    }}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#244A70] bg-blue-50/20 ring-1 ring-[#244A70]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-[#244A70] focus:ring-[#244A70]"
                        />
                        <span className="font-bold text-[#17263A]">{clauseTitle}</span>
                      </div>
                      <Badge variant="secondary">
                        {clause.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-600 mt-2 leading-relaxed pl-5">
                      {clauseDesc}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 6: APPROVAL & SIGNATURE ─────────────────────────────────────── */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#244A70]" />
                Step 6: Approval Workflow & E-Signatures
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Configure internal review approvers, customer signatory information, and countersignature routing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Internal Commercial Approver *
                </label>
                <select
                  value={internalApprover}
                  onChange={(e) => setInternalApprover(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="Commercial Director">Commercial Director (Alice Commercial)</option>
                  <option value="Managing Director">Managing Director (David Pham)</option>
                  <option value="General Legal Counsel">General Legal Counsel (Attorney Tran)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Signature Execution Deadline *
                </label>
                <input
                  type="date"
                  value={signatureDeadline}
                  onChange={(e) => setSignatureDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ALSM Provider Signatory
                </label>
                <input
                  type="text"
                  value={providerSignatoryName}
                  onChange={(e) => setProviderSignatoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Signatory Email
                </label>
                <input
                  type="email"
                  value={customer.contactEmail}
                  onChange={(e) => setCustomer({ ...customer, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
            </div>

            {/* E-Signature Integration Status Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ALSM Corporate Digital Signature & Official Seal (e-Contract)
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  VNPT-CA • Ready for Automated Signing
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                The contract will be automatically stamped with corporate seal and ALSM digital signature ({providerSignatoryName || 'Nguyen Gia Khanh'} - General Director) from Company Profile upon initialization or customer execution.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 7: REVIEW & GENERATE DRAFT ─────────────────────────────────── */}
      {currentStep === 7 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card variant="default" padding="lg" className="bg-white border-[#DCE3EC] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Step 7: Final Contract Review & Draft Generation
              </h2>
              <p className="text-xs text-[#8491A3] mt-1">
                Verify all contract terms before generating the legal draft document. Contracts are created in Draft status and will require review before activation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-[#17263A] text-[11px] uppercase tracking-wider block">
                  Customer & Agreement Track
                </span>
                <div className="space-y-1">
                  <div><span className="text-slate-400">Customer Legal Name:</span> <span className="font-bold">{customer.companyName}</span></div>
                  <div><span className="text-slate-400">Tax ID:</span> <span className="font-mono">{customer.taxId}</span></div>
                  <div><span className="text-slate-400">Contract Agreement:</span> <span className="font-bold">{title}</span></div>
                  <div><span className="text-slate-400">Service Mode:</span> <span className="font-semibold text-blue-700">{serviceMode.replace(/_/g, ' ')}</span></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-[#17263A] text-[11px] uppercase tracking-wider block">
                  Financial Terms
                </span>
                <div className="space-y-1">
                  <div><span className="text-slate-400">Final Contract Value:</span> <span className="font-bold text-emerald-700 text-sm">{formatVnd(finalTotal)}</span></div>
                  <div><span className="text-slate-400">Payment Terms:</span> <span>{paymentTermsDays} • {paymentStructure}</span></div>
                  <div><span className="text-slate-400">Effective Dates:</span> <span>{effectiveDate} to {endDate}</span></div>
                  <div><span className="text-slate-400">Selected Clauses:</span> <span>{selectedClauses.length} clauses attached</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ready to create contract draft. Draft will be queued for commercial review and signatory approval.</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Wizard Bottom Navigation Buttons ─────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-2xs">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1 || submitting}
          className="text-xs"
        >
          Previous Step
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < 7 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep((s) => Math.min(7, s + 1))}
              className="text-xs bg-[#244A70] hover:bg-[#244A70] text-white inline-flex items-center gap-1.5"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleCreateDraft(false)}
                disabled={submitting}
                className="text-xs"
              >
                {submitting ? 'Creating Draft...' : 'Save as Draft'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCreateDraft(true)}
                disabled={submitting}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting...' : 'Submit for Commercial Approval'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
