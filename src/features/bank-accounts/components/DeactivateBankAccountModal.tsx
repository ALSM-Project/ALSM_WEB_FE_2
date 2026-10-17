import React, { useState } from 'react';
import { AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { BankAccount } from '../types/bankAccount.types';

interface DeactivateBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, reason?: string) => Promise<void>;
  account: BankAccount | null;
  isDeactivating?: boolean;
}

export const DeactivateBankAccountModal: React.FC<DeactivateBankAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  account,
  isDeactivating = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!account) return null;

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(account.id, reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to deactivate bank account';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Receiving Bank Account"
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Confirm Deactivation: {account.bankName}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Account {account.accountNumberMasked} will immediately be marked inactive and will no longer be available for generating receiving payment instructions on new contracts or invoices. Historical records referencing this account will be preserved.
          </p>
          {account.isDefault && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
              Notice: This account is currently the Default Receiving Account for {account.currency}. Deactivating it will automatically remove its default designation.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#17263A] mb-1">
            Reason for Deactivation (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Account closed at banking institution / Replaced by primary treasury account"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EEF1F6]">
          <Button variant="secondary" onClick={onClose} disabled={isDeactivating}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Deactivating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Ban className="w-4 h-4" /> Confirm Deactivation
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
