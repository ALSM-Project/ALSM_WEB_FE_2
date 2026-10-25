import React, { useState } from 'react';
import { Building2, Mail, Phone, Plus, User, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import type {
  ConsultationType,
  CreateMeetingRequestPayload,
  CustomerType,
  MeetingPriority,
} from '../types/meeting-request';

interface NewMeetingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMeetingRequestPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const NewMeetingRequestModal: React.FC<NewMeetingRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, _setCustomerType] = useState<CustomerType>('PROSPECT');
  const [topic, setTopic] = useState('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('SALES_SERVICE');
  const [priority, setPriority] = useState<MeetingPriority>('MEDIUM');
  const [legacySystemType, setLegacySystemType] = useState('IBM 3270 BMS');
  const [estimatedScreens, setEstimatedScreens] = useState<number>(50);
  const [estimatedPrograms, _setEstimatedPrograms] = useState<number>(10);
  const [estimatedProjectScale, _setEstimatedProjectScale] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'>('MEDIUM');
  const [expectedTimeline, setExpectedTimeline] = useState('Q1 2027');
  const [businessRequirements, setBusinessRequirements] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      customerType,
      topic: topic.trim(),
      consultationType,
      priority,
      legacySystemType,
      estimatedScreens,
      estimatedPrograms,
      estimatedProjectScale,
      expectedTimeline,
      businessRequirements: businessRequirements.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">New Consultation Request</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Initiate customer discovery and enterprise consultation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
              1. Customer Profile
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tran Van A"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Organization *
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Vietcombank Core"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+84..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Consultation Details */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
              2. Consultation Specifications
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Modernization feasibility study for Core Banking screens"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consultation Type
                </label>
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="SALES_SERVICE">Sales & Service Consultation</option>
                  <option value="LEGACY_MODERNIZATION">Legacy System Modernization Consultation</option>
                  <option value="TECHNICAL">Technical Consultation</option>
                  <option value="ENTERPRISE_ARCHITECTURE">Enterprise Architecture Consultation</option>
                  <option value="CUSTOM_REQUIREMENTS">Custom Enterprise Requirements</option>
                  <option value="CONTRACT_PACKAGE">Contract & Service Package Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MeetingPriority)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technical Scope */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
              3. Legacy System Scope
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legacy Architecture
                </label>
                <select
                  value={legacySystemType}
                  onChange={(e) => setLegacySystemType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="IBM 3270 BMS">IBM 3270 BMS</option>
                  <option value="AS/400 DSPF">AS/400 DSPF</option>
                  <option value="COBOL CICS">COBOL CICS</option>
                  <option value="Unisys MAPPER">Unisys MAPPER</option>
                  <option value="Other Mainframe">Other Mainframe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Screens
                </label>
                <input
                  type="number"
                  min={0}
                  value={estimatedScreens}
                  onChange={(e) => setEstimatedScreens(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Timeline
                </label>
                <input
                  type="text"
                  value={expectedTimeline}
                  onChange={(e) => setExpectedTimeline(e.target.value)}
                  placeholder="e.g. Q1 2027"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business & Technical Requirements
              </label>
              <textarea
                value={businessRequirements}
                onChange={(e) => setBusinessRequirements(e.target.value)}
                placeholder="Key expectations, existing pain points, mainframe green-screen modernization objectives..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#244A70] inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Create Consultation Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
