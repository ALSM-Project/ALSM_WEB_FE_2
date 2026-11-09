import React, { useState } from 'react';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { BankAccountSummaryCards } from './BankAccountSummaryCards';
import { BankAccountsTable } from './BankAccountsTable';
import { BankAccountFormModal } from './BankAccountFormModal';
import { BankAccountDetailModal } from './BankAccountDetailModal';
import { DeactivateBankAccountModal } from './DeactivateBankAccountModal';
import { useBankAccounts } from '../hooks/useBankAccounts';
import {
  BankAccount,
  BankAccountsQueryParams,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../types/bankAccount.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface BankAccountsSectionProps {
  showHeader?: boolean;
}

export const BankAccountsSection: React.FC<BankAccountsSectionProps> = ({ showHeader = true }) => {
  const { hasPermission, user } = useAuth();
  const canCreate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.create'));

  const [queryParams, setQueryParams] = useState<BankAccountsQueryParams>({
    page: 1,
    limit: 10,
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const {
    data,
    isLoading,
    refetch,
    createAccount,
    isCreating,
    updateAccount,
    isUpdating,
    setDefault,
    deactivateAccount,
    isDeactivating,
    reactivateAccount,
    revealAccountNumber,
  } = useBankAccounts(queryParams);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<BankAccount | null>(null);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivatingAccount, setDeactivatingAccount] = useState<BankAccount | null>(null);

  // Success / error banner feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleQueryChange = (updates: Partial<BankAccountsQueryParams>) => {
    setQueryParams((prev) => ({ ...prev, ...updates }));
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setIsFormModalOpen(true);
  };

  const handleOpenView = (acc: BankAccount) => {
    setViewingAccount(acc);
    setIsDetailModalOpen(true);
  };

  const handleOpenDeactivate = (acc: BankAccount) => {
    setDeactivatingAccount(acc);
    setIsDeactivateModalOpen(true);
  };

  const handleFormSubmit = async (input: CreateBankAccountInput | UpdateBankAccountInput) => {
    if (editingAccount) {
      await updateAccount({ id: editingAccount.id, input });
      showFeedback('success', `Bank account ${input.bankName || editingAccount.bankName} updated successfully.`);
    } else {
      await createAccount(input as CreateBankAccountInput);
      showFeedback('success', `Bank account ${input.bankName} registered successfully.`);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id);
      showFeedback('success', 'Default receiving account updated successfully.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to set default account';
      showFeedback('error', msg);
    }
  };

  const handleDeactivate = async (id: string, reason?: string) => {
    await deactivateAccount({ id, reason });
    showFeedback('success', 'Receiving bank account deactivated.');
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateAccount(id);
      showFeedback('success', 'Bank account reactivated successfully.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reactivate account';
      showFeedback('error', msg);
    }
  };

  const accounts = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const summary = data?.summary;

  return (
    <div className="w-full space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-lg border text-xs sm:text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header Bar */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl font-bold text-[#17263A] tracking-tight">
              Bank Accounts
            </h2>
            <p className="text-xs text-[#8491A3] mt-0.5">
              Manage company bank accounts used to receive customer payments for signed contracts, conversion services, and invoices.
            </p>
          </div>

          {canCreate && (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenAdd}
              className="bg-[#244A70] hover:bg-[#244A70] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Bank Account</span>
            </Button>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <BankAccountSummaryCards
        summary={summary}
        activeStatusFilter={queryParams.status}
        onSelectStatus={(status) => handleQueryChange({ status, page: 1 })}
        isLoading={isLoading}
      />

      {/* Bank Accounts Data Table */}
      <BankAccountsTable
        accounts={accounts}
        pagination={pagination}
        queryParams={queryParams}
        onQueryChange={handleQueryChange}
        isLoading={isLoading}
        onRefresh={refetch}
        onAddAccount={canCreate ? handleOpenAdd : undefined}
        onViewAccount={handleOpenView}
        onEditAccount={handleOpenEdit}
        onSetDefault={handleSetDefault}
        onDeactivate={handleOpenDeactivate}
        onReactivate={handleReactivate}
      />

      {/* Form Modal (Add / Edit) */}
      <BankAccountFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingAccount}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Detail Modal */}
      <BankAccountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        account={viewingAccount}
        onRevealAccountNumber={revealAccountNumber}
        onEdit={handleOpenEdit}
        onSetDefault={handleSetDefault}
        onDeactivate={handleOpenDeactivate}
      />

      {/* Deactivate Confirmation Modal */}
      <DeactivateBankAccountModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleDeactivate}
        account={deactivatingAccount}
        isDeactivating={isDeactivating}
      />
    </div>
  );
};

export default BankAccountsSection;
