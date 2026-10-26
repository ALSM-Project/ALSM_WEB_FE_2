import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  ShieldCheck,
  Server,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useNavigation } from '@/context/NavigationContext';
import { meetingRequestsApi } from '../api/meeting-requests.api';
import type {
  ConsultationType,
  CreateMeetingRequestPayload,
  CustomerType,
  MeetingPriority,
} from '../types/meeting-request';

export const CreateMeetingRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useNavigation();

  // Breadcrumb integration
  useEffect(() => {
    setCustomBreadcrumbs([
      { label: 'Meeting Requests', path: '/sales/meeting-requests' },
      { label: 'New Consultation Request' },
    ]);
    return () => {
      setCustomBreadcrumbs(null);
    };
  }, [setCustomBreadcrumbs]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('PROSPECT');

  const [topic, setTopic] = useState('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('SALES_SERVICE');
  const [priority, setPriority] = useState<MeetingPriority>('MEDIUM');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');

  const [legacySystemType, setLegacySystemType] = useState('IBM 3270 BMS');
  const [estimatedScreens, setEstimatedScreens] = useState<number>(50);
  const [estimatedPrograms, setEstimatedPrograms] = useState<number>(10);
  const [estimatedProjectScale, setEstimatedProjectScale] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'>('MEDIUM');
  const [expectedTimeline, setExpectedTimeline] = useState('Q1 2027');
  const [businessRequirements, setBusinessRequirements] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full Name is required';
    if (!companyName.trim()) errs.companyName = 'Company / Organization is required';
    if (!email.trim()) {
      errs.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email address';
    }
    if (!topic.trim()) errs.topic = 'Meeting Topic is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload: CreateMeetingRequestPayload = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        customerType,
        topic: topic.trim(),
        consultationType,
        priority,
        serviceMode: 'ALSM_MANAGED',
        legacySystemType,
        estimatedScreens: Number(estimatedScreens) || 0,
        estimatedPrograms: Number(estimatedPrograms) || 0,
        estimatedProjectScale,
        expectedTimeline: expectedTimeline.trim() || undefined,
        businessRequirements: businessRequirements.trim() || undefined,
        requestedDate: requestedDate || undefined,
        requestedTime: requestedTime || undefined,
      };

      await meetingRequestsApi.createMeetingRequest(payload);
      navigate('/sales/meeting-requests');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to submit consultation request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <div className="flex items-center gap-2">

          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A] mt-1">
            New Consultation & Meeting Request
          </h1>
        </div>

      </div>

      {submitError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 shadow-2xs">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
          <span className="font-medium">{submitError}</span>
        </div>
      )}

      {/* Main Content: 2-Column Responsive Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Cards (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Customer Profile */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">1. Customer & Enterprise Profile</h2>
                      <p className="text-xs text-[#8491A3]">Primary client contact and corporate identity</p>
                    </div>
                  </div>
                  <Badge variant="info">Required</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Tran Van A"
                        className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                          errors.fullName ? 'border-rose-500' : 'border-[#DCE3EC]'
                        } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                      />
                    </div>
                    {errors.fullName && <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Company / Organization *
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Vietcombank Core"
                        className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                          errors.companyName ? 'border-rose-500' : 'border-[#DCE3EC]'
                        } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                      />
                    </div>
                    {errors.companyName && <p className="text-[11px] text-rose-600 mt-1">{errors.companyName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@company.com"
                        className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                          errors.email ? 'border-rose-500' : 'border-[#DCE3EC]'
                        } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                      />
                    </div>
                    {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+84 988 888 888"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Customer Relationship Type
                    </label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="PROSPECT">New Prospect (Lead Qualification)</option>
                      <option value="EXISTING_CUSTOMER">Existing Enterprise Customer</option>
                      <option value="PARTNER">Strategic Partner</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Consultation Specifications */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">2. Consultation Specifications</h2>
                      <p className="text-xs text-[#8491A3]">Meeting objective, category, and preferred scheduling</p>
                    </div>
                  </div>
                  <Badge variant="info">Required</Badge>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                    Meeting Topic / Subject *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Modernization feasibility study for Core Banking screens"
                    className={`w-full px-3.5 py-2 text-xs bg-white border ${
                      errors.topic ? 'border-rose-500' : 'border-[#DCE3EC]'
                    } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                  />
                  {errors.topic && <p className="text-[11px] text-rose-600 mt-1">{errors.topic}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Consultation Type
                    </label>
                    <select
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="SALES_SERVICE">Sales & Service Consultation</option>
                      <option value="LEGACY_MODERNIZATION">Legacy System Modernization Consultation</option>
                      <option value="TECHNICAL">Technical Deep-Dive Consultation</option>
                      <option value="ENTERPRISE_ARCHITECTURE">Enterprise Architecture Consultation</option>
                      <option value="CUSTOM_REQUIREMENTS">Custom Enterprise Requirements</option>
                      <option value="CONTRACT_PACKAGE">Contract & Service Package Consultation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Urgency / Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as MeetingPriority)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="LOW">Low (Standard Cadence)</option>
                      <option value="MEDIUM">Medium (Normal SLA 24h)</option>
                      <option value="HIGH">High (Priority Response 4h)</option>
                      <option value="URGENT">Urgent (Immediate Deal Triage)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Preferred Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Preferred Time Slot (Optional)
                    </label>
                    <input
                      type="time"
                      value={requestedTime}
                      onChange={(e) => setRequestedTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 3: Legacy System Scope */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">3. Legacy System Scope & Architecture</h2>
                      <p className="text-xs text-[#8491A3]">Mainframe architecture, scale estimates, and requirements</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#244A70] bg-[#EEF1F6] px-2 py-0.5 rounded">
                    Technical Scope
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Legacy Architecture
                    </label>
                    <select
                      value={legacySystemType}
                      onChange={(e) => setLegacySystemType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="IBM 3270 BMS">IBM 3270 BMS</option>
                      <option value="AS/400 DSPF">AS/400 DSPF (IBM i)</option>
                      <option value="COBOL CICS">COBOL CICS Transactional</option>
                      <option value="Unisys MAPPER">Unisys MAPPER</option>
                      <option value="Other Mainframe">Other Mainframe / Legacy Green-Screen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Estimated Screens
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={estimatedScreens}
                      onChange={(e) => setEstimatedScreens(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Estimated Programs
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={estimatedPrograms}
                      onChange={(e) => setEstimatedPrograms(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Project Scale
                    </label>
                    <select
                      value={estimatedProjectScale}
                      onChange={(e) => setEstimatedProjectScale(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="SMALL">Small (1-20 screens)</option>
                      <option value="MEDIUM">Medium (20-100 screens)</option>
                      <option value="LARGE">Large (100-300 screens)</option>
                      <option value="ENTERPRISE">Enterprise (300+ screens)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Target Timeline
                    </label>
                    <input
                      type="text"
                      value={expectedTimeline}
                      onChange={(e) => setExpectedTimeline(e.target.value)}
                      placeholder="e.g. Q1 2027"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                    Business & Technical Requirements
                  </label>
                  <textarea
                    value={businessRequirements}
                    onChange={(e) => setBusinessRequirements(e.target.value)}
                    placeholder="Key modernization expectations, existing mainframe pain points, target web/cloud technology, security constraints..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DCE3EC] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70] resize-none"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Sticky Summary & Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6 space-y-5">
              <div className="pb-3 border-b border-[#F4F7FB] flex items-center justify-between">
                <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Request Summary
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  NEW_REQUEST
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Client</span>
                  <p className="font-bold text-[#17263A] mt-0.5">{companyName || 'Not specified'}</p>
                  <p className="text-[#8491A3]">{fullName ? `${fullName} (${email || 'No email'})` : 'Contact details pending'}</p>
                </div>

                <div className="pt-2 border-t border-[#F4F7FB]">
                  <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Topic</span>
                  <p className="font-semibold text-[#17263A] mt-0.5">{topic || 'Consultation topic not set'}</p>
                  <p className="text-[11px] text-[#244A70] font-medium mt-0.5">{consultationType.replace(/_/g, ' ')}</p>
                </div>

                <div className="pt-2 border-t border-[#F4F7FB] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Priority</span>
                    <p className="font-bold text-[#17263A] mt-0.5">{priority}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Estimated Scope</span>
                    <p className="font-bold text-[#17263A] mt-0.5">{estimatedScreens} screens</p>
                  </div>
                </div>
              </div>

              {/* Service SLA card */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#17263A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Enterprise SLA Response</span>
                </div>
                <p className="text-[11px] text-[#8491A3] leading-relaxed">
                  Upon submission, this request enters the CRM intake pipeline. A dedicated Sales Engineer will triage requirements, generate Google Meet invitations, and follow up within standard SLAs.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-[#244A70] hover:bg-[#244A70] py-2.5 text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  
                  <span>{isSubmitting ? 'Submitting Request...' : 'Submit Consultation Request'}</span>
                </Button>
                <Button
                  type="button"   
                  variant="outline"
                  className="w-full py-2 text-xs font-semibold text-[#17263A]"
                  onClick={() => navigate('/sales/meeting-requests')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
