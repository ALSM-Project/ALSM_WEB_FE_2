import React, { useState } from 'react';
import { DollarSign, FileText, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { MeetingRequest } from '../types/meeting-request';

interface CreateEnterpriseQuoteModalProps {
  meeting: MeetingRequest;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    planName: string;
    amount: number;
    discountPercent?: number;
    discountReason?: string;
    projectScope?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const CreateEnterpriseQuoteModal: React.FC<CreateEnterpriseQuoteModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [planName, setPlanName] = useState('Enterprise Managed Modernization');
  const [amount, setAmount] = useState<number>(450000000);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountReason, setDiscountReason] = useState('Early adopter bundle discount');
  const [projectScope, setProjectScope] = useState(
    `${meeting.requirements.estimatedScreens || 50} screens deterministic AST transformation`
  );

  if (!isOpen) return null;

  const finalPrice = Math.round(amount * (1 - discountPercent / 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      planName,
      amount,
      discountPercent,
      discountReason: discountPercent > 0 ? discountReason : undefined,
      projectScope,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Create Enterprise Quotation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft commercial quote for {meeting.customer.companyName} ({meeting.requestId})
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Plan / Package Name *
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Base List Price (VND) *
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={1000000}
                  step={5000000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>

          {discountPercent >= 15 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
              <span className="font-bold">Governance Alert:</span> Discounts of 15% or higher require executive sales approval before issuing to customer.
            </div>
          )}

          {discountPercent > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Business Rationale
              </label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason for discount"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Modernization Scope
            </label>
            <textarea
              value={projectScope}
              onChange={(e) => setProjectScope(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Final Quotation Total:</span>
            <span className="text-sm font-extrabold text-[#17263A]">
              {finalPrice.toLocaleString('vi-VN')} VND
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
              <FileText className="w-3.5 h-3.5" />
              {isSubmitting ? 'Generating...' : 'Generate Quotation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
