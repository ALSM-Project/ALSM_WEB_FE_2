import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Layers,
  ShieldAlert,
  Sliders,
  Sparkles,
  Calendar,
  CreditCard,
  Wrench,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { Modal, Button, Badge } from '@/shared/ui';
import { formatVnd } from '@/shared/utils/currency';
import { crmApi, LeadDto } from '../api/crm.api';

interface EnterpriseQuoteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newQuote: any) => void;
  onCreated?: () => void;
  leads?: LeadDto[];
  prefilledCustomer?: {
    customerName?: string;
    customerEmail?: string;
    companyName?: string;
    customerPhone?: string;
    leadId?: string;
  };
}

export const EnterpriseQuoteWizardModal: React.FC<EnterpriseQuoteWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onCreated,
  leads = [],
  prefilledCustomer,
}) => {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [leadId, setLeadId] = useState<string>(prefilledCustomer?.leadId || '');
  const [customerName, setCustomerName] = useState<string>(prefilledCustomer?.customerName || '');
  const [customerEmail, setCustomerEmail] = useState<string>(prefilledCustomer?.customerEmail || '');
  const [companyName, setCompanyName] = useState<string>(prefilledCustomer?.companyName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(prefilledCustomer?.customerPhone || '');

  // Step 2: Service Type
  const [serviceType, setServiceType] = useState<'ALSM_MANAGED' | 'CUSTOMER_SELF_SERVICE'>('ALSM_MANAGED');

  // Step 3: Package
  const [servicePackage, setServicePackage] = useState<string>('Enterprise');

  // Step 4: Capacity Configuration
  const [screenCapacity, setScreenCapacity] = useState<number>(50);
  const [programCapacity, setProgramCapacity] = useState<number>(20);
  const [projectCapacity, setProjectCapacity] = useState<number>(5);
  const [userSeats, setUserSeats] = useState<number>(10);
  const [concurrentLimit, setConcurrentLimit] = useState<number>(3);
  const [storageGb, setStorageGb] = useState<number>(20);
  const [selectedLegacyTypes, setSelectedLegacyTypes] = useState<string[]>(['AS400', 'COBOL']);

  // Step 5: Duration
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [autoRenewal, setAutoRenewal] = useState<boolean>(true);

  // Step 6: Pricing (VND)
  const [baseFee, setBaseFee] = useState<number>(150000000);
  const [capacityFee, setCapacityFee] = useState<number>(25000000);
  const [setupFee, setSetupFee] = useState<number>(15000000);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(10);

  // Step 7: Payment Terms
  const [paymentTerms, setPaymentTerms] = useState<string>('DEPOSIT_REMAINDER');

  // Step 8: Additional Services
  const [additionalServices, setAdditionalServices] = useState<string[]>([
    'Custom Parser Development',
    'Technical Architecture Consultation',
  ]);

  // Handle lead select
  const handleSelectLead = (selectedId: string) => {
    setLeadId(selectedId);
    const found = leads.find((l) => l.id === selectedId);
    if (found) {
      setCustomerName(found.contactName || '');
      setCustomerEmail(found.email || (found as any).contactEmail || '');
      setCompanyName(found.company || (found as any).companyName || '');
      setCustomerPhone(found.phone || '');
    }
  };

  // Calculations
  const subtotal = baseFee + capacityFee + setupFee;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRatePercent / 100));
  const totalAmount = afterDiscount + taxAmount;
  const requiresApproval = discountPercent >= 15;
  const requiresExecutive = discountPercent >= 30;

  const toggleLegacyType = (type: string) => {
    setSelectedLegacyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleAdditionalService = (svc: string) => {
    setAdditionalServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!customerName.trim() || !customerEmail.trim()) {
        setErrorMsg('Please provide customer name and email.');
        return;
      }
    }
    if (step === 6) {
      if (requiresApproval && !discountReason.trim()) {
        setErrorMsg('Discounts of 15% or higher require an approval justification reason.');
        return;
      }
    }
    setStep((prev) => Math.min(10, prev + 1));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        leadId: leadId || undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        companyName: companyName.trim() || customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        serviceType,
        servicePackage,
        capacityConfig: {
          screenCapacity,
          programCapacity,
          projectCapacity,
          userSeats,
          concurrentLimit,
          storageGb,
          legacyTypes: selectedLegacyTypes,
        },
        durationMonths,
        startDate,
        autoRenewal,
        baseFee,
        capacityFee,
        setupFee,
        discountPercent,
        discountReason: discountReason.trim() || undefined,
        taxRatePercent,
        paymentTerms,
        additionalServices,
      };

      const res = await crmApi.createEnterpriseQuote(payload);
      if (onSuccess) onSuccess(res.quote || res);
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create quote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Enterprise Modernization Quote"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Progress Stepper Bar */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              Step {step} of 10: {
                step === 1 ? 'Customer Identification' :
                step === 2 ? 'Service Engagement Mode' :
                step === 3 ? 'Package Tier' :
                step === 4 ? 'Contract Capacity' :
                step === 5 ? 'Duration & Terms' :
                step === 6 ? 'Pricing & Discounts' :
                step === 7 ? 'Payment Terms' :
                step === 8 ? 'Additional Services' :
                step === 9 ? 'Review Commercial Proposal' : 'Finalize & Submit'
              }
            </span>
            <span className="font-mono text-slate-700">{Math.round((step / 10) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#244A70] h-full transition-all duration-300"
              style={{ width: `${(step / 10) * 100}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Customer Identification */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#244A70]" /> Select or Enter Customer Account
            </h3>

            {leads.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Link with Existing Lead / Prospect
                </label>
                <select
                  value={leadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                >
                  <option value="">-- Start fresh or choose existing lead --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company || (l as any).companyName || l.contactName} ({l.email || (l as any).contactEmail}) - Stage: {l.stage}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Person Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tran Minh Tuan"
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. tuan.tran@vietbank.vn"
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. VietBank Financial Services"
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +84 901 234 567"
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Service Engagement Mode */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#244A70]" /> Select Service Engagement Scenario
            </h3>
            <p className="text-xs text-slate-500">
              ALSM separates managed operational engagements from customer platform-based modernization workspaces.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setServiceType('ALSM_MANAGED')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  serviceType === 'ALSM_MANAGED'
                    ? 'border-[#244A70] bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#17263A]">Scenario A: Managed Modernization Services</span>
                  <Badge variant={serviceType === 'ALSM_MANAGED' ? 'primary' : 'secondary'}>
                    Full Service
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  ALSM receives legacy system assets and our engineering team performs the complete modernization, conversion, quality verification, and delivery.
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1">
                  <li>&bull; Dedicated ALSM project delivery team</li>
                  <li>&bull; Strict SLA and milestone guarantees</li>
                  <li>&bull; Customer receives modernized output repository</li>
                </ul>
              </div>

              <div
                onClick={() => setServiceType('CUSTOMER_SELF_SERVICE')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  serviceType === 'CUSTOMER_SELF_SERVICE'
                    ? 'border-[#244A70] bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#17263A]">Scenario B: Platform-Based Modernization</span>
                  <Badge variant={serviceType === 'CUSTOMER_SELF_SERVICE' ? 'primary' : 'secondary'}>
                    Web3 Workspace
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Customer provisions a Web3 Organization workspace with allocated capacity. Customer developers convert screens and manage projects directly.
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1">
                  <li>&bull; Direct Web3 workspace access</li>
                  <li>&bull; Automated quota allocation and enforcement</li>
                  <li>&bull; Customer Organization Admin self-management</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Package Tier */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#244A70]" /> Select Service Package
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Starter',
                  name: 'Starter Package',
                  screens: 20,
                  fee: 60000000,
                  desc: 'Small legacy subsystems and pilot modernization programs.',
                },
                {
                  id: 'Professional',
                  name: 'Professional Package',
                  screens: 50,
                  fee: 150000000,
                  desc: 'Core departmental systems and mid-size conversions.',
                },
                {
                  id: 'Enterprise',
                  name: 'Enterprise Package',
                  screens: 150,
                  fee: 350000000,
                  desc: 'Mission-critical enterprise transformation with full capacity.',
                },
              ].map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setServicePackage(pkg.id);
                    setScreenCapacity(pkg.screens);
                    setBaseFee(pkg.fee);
                  }}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                    servicePackage === pkg.id
                      ? 'border-[#244A70] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="font-bold text-xs text-[#17263A]">{pkg.name}</p>
                  <p className="font-mono text-sm font-bold text-[#244A70] mt-1">{formatVnd(pkg.fee)}</p>
                  <p className="text-[11px] text-slate-500 mt-2">{pkg.desc}</p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                    Up to {pkg.screens} Screens
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Capacity Configuration */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#244A70]" /> Contracted Modernization Capacity
            </h3>
            <p className="text-xs text-slate-500">
              These quotas will be provisioned to the customer organization limits upon contract signature.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Screen Quota</label>
                <input
                  type="number"
                  min={1}
                  value={screenCapacity}
                  onChange={(e) => setScreenCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Programs Limit</label>
                <input
                  type="number"
                  min={1}
                  value={programCapacity}
                  onChange={(e) => setProgramCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Projects Limit</label>
                <input
                  type="number"
                  min={1}
                  value={projectCapacity}
                  onChange={(e) => setProjectCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">User Seats</label>
                <input
                  type="number"
                  min={1}
                  value={userSeats}
                  onChange={(e) => setUserSeats(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Concurrent Jobs</label>
                <input
                  type="number"
                  min={1}
                  value={concurrentLimit}
                  onChange={(e) => setConcurrentLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage (GB)</label>
                <input
                  type="number"
                  min={1}
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Supported Legacy Systems</label>
              <div className="flex flex-wrap gap-2">
                {['AS400', 'COBOL', 'IBM Mainframe', 'VB6', 'Oracle Forms', 'Delphi', 'PowerBuilder'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleLegacyType(t)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      selectedLegacyTypes.includes(t)
                        ? 'bg-[#244A70] text-white border-[#244A70]'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Duration & Terms */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#244A70]" /> Contract Timeline & Renewal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contract Duration (Months)
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                >
                  <option value={3}>3 Months (Quarterly Pilot)</option>
                  <option value={6}>6 Months (Modernization Phase 1)</option>
                  <option value={12}>12 Months (Annual Standard)</option>
                  <option value={24}>24 Months (Multi-year Enterprise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Effective Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
              <input
                id="autoRenewalCb"
                type="checkbox"
                checked={autoRenewal}
                onChange={(e) => setAutoRenewal(e.target.checked)}
                className="w-4 h-4 text-[#244A70] rounded"
              />
              <label htmlFor="autoRenewalCb" className="text-xs text-slate-700 select-none">
                Enable automatic contract renewal notification 30 days before expiration
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: Pricing & Discounts */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#244A70]" /> Commercial Fees & Discounts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Base Package Fee (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={baseFee}
                  onChange={(e) => setBaseFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Capacity Fee (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={capacityFee}
                  onChange={(e) => setCapacityFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Setup / Onboarding Fee (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Special Commercial Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                  />
                  {requiresApproval && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      {requiresExecutive ? 'Requires Executive Director Approval (>= 30%)' : 'Requires Sales Manager Approval (>= 15%)'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tax Rate (VAT %)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-md outline-none focus:border-[#244A70]"
                  />
                </div>
              </div>

              {requiresApproval && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Discount Justification Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Strategic partner commitment for multi-phase banking modernizations"
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-md outline-none focus:border-amber-500 bg-amber-50/50"
                  />
                </div>
              )}

              {/* Price Calculation Summary */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Net Total Contract Value:</span>
                <span className="text-base font-bold text-[#244A70] font-mono">{formatVnd(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Payment Terms */}
        {step === 7 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#244A70]" /> Select Payment Schedule
            </h3>

            <div className="space-y-2.5">
              {[
                {
                  id: 'DEPOSIT_REMAINDER',
                  name: '50% Initial Deposit, 50% Upon Modernization Handover',
                  desc: 'Standard commercial enterprise term with verified milestone delivery.',
                },
                {
                  id: 'FULL',
                  name: '100% Full Payment Upfront (5% Early Settlement Bonus)',
                  desc: 'Single advance transaction with accelerated priority onboarding.',
                },
                {
                  id: 'MILESTONES',
                  name: 'Milestone-Based (30% Inception / 40% Screen Parsing / 30% Acceptance)',
                  desc: 'Phased payment schedule aligned with project sprint deliverables.',
                },
                {
                  id: 'MONTHLY',
                  name: 'Monthly Billing (Subscription Model)',
                  desc: 'Recurring automated invoice schedule for platform-based modernization workspaces.',
                },
              ].map((term) => (
                <div
                  key={term.id}
                  onClick={() => setPaymentTerms(term.id)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                    paymentTerms === term.id
                      ? 'border-[#244A70] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="font-bold text-xs text-[#17263A]">{term.name}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{term.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: Additional Services */}
        {step === 8 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#244A70]" /> Select Specialized Services
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Custom Parser Development',
                'Technical Architecture Consultation',
                'Enterprise On-Premise Air-Gapped Deployment',
                'Migration Assistance & Database Synchronization',
                'Technical Staff Training & Knowledge Transfer',
                'Custom 24/7 Priority SLA',
              ].map((svc) => (
                <div
                  key={svc}
                  onClick={() => toggleAdditionalService(svc)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    additionalServices.includes(svc)
                      ? 'border-[#244A70] bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xs font-semibold text-[#17263A]">{svc}</span>
                  <input
                    type="checkbox"
                    checked={additionalServices.includes(svc)}
                    readOnly
                    className="w-4 h-4 text-[#244A70] rounded pointer-events-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 9: Review Proposal */}
        {step === 9 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#244A70]" /> Commercial Quotation Summary
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <p className="font-bold text-sm text-[#17263A]">{companyName}</p>
                  <p className="text-slate-500">{customerName} &bull; {customerEmail}</p>
                </div>
                <Badge variant="primary">{serviceType}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">Package Tier</span>
                  <span className="font-semibold">{servicePackage}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Screen Capacity</span>
                  <span className="font-semibold">{screenCapacity} Screens</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contract Duration</span>
                  <span className="font-semibold">{durationMonths} Months (From {startDate})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Schedule</span>
                  <span className="font-semibold">{paymentTerms}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-[#17263A]">
                <span>Total Proposal Value:</span>
                <span className="font-mono text-[#244A70] text-base">{formatVnd(totalAmount)}</span>
              </div>

              {requiresApproval && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    This quotation includes a {discountPercent}% discount and will automatically be routed to the <strong>Discount Approvals Queue</strong> before finalization.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 10: Finalize & Submit */}
        {step === 10 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#244A70] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#17263A]">Ready to Generate Proposal</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Submitting will generate a formal proposal document for {companyName}. You can convert this quote into an agreement contract upon acceptance.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 1 || submitting}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < 10 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Generating Proposal...' : 'Create Enterprise Quote'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
