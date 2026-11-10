import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { BankAccount } from '../types/bankAccount.types';

interface DeleteBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  account: BankAccount | null;
  isDeleting?: boolean;
}

export const DeleteBankAccountModal: React.FC<DeleteBankAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  account,
  isDeleting = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  if (!account) return null;

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(account.id);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete bank account';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Receiving Bank Account"
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-900 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Confirm Permanent Deletion: {account.bankName}</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            Are you sure you want to permanently delete account <span className="font-semibold text-rose-950 font-mono">{account.accountNumberMasked}</span> ({account.accountHolderName})? This action cannot be undone.
          </p>
          {account.isDefault && (
            <p className="text-xs font-semibold text-rose-700 bg-white p-2 rounded border border-rose-300">
              Warning: This is the active default receiving account for {account.currency}. You must designate another active account as default or deactivate this account before deleting.
            </p>
          )}
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Bank Name:</span>
            <span className="font-semibold text-[#17263A]">{account.bankName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Account Holder:</span>
            <span className="font-semibold text-[#17263A]">{account.accountHolderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Currency / Country:</span>
            <span className="font-semibold text-[#17263A]">{account.currency} ({account.country})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className={`font-semibold uppercase text-[11px] ${account.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
              {account.status}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EEF1F6]">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeleting || (account.isDefault && account.status === 'active')}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Permanently Delete
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteBankAccountModal;
