import React, { useState } from 'react';
import {
  Landmark,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Edit2,
  Star,
  Ban,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { BankAccount, BankAccountsQueryParams } from '../types/bankAccount.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface BankAccountsTableProps {
  accounts: BankAccount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  queryParams: BankAccountsQueryParams;
  onQueryChange: (updates: Partial<BankAccountsQueryParams>) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddAccount?: () => void;
  onViewAccount: (account: BankAccount) => void;
  onEditAccount: (account: BankAccount) => void;
  onSetDefault: (id: string) => void;
  onDeactivate: (account: BankAccount) => void;
  onReactivate: (id: string) => void;
}

export const BankAccountsTable: React.FC<BankAccountsTableProps> = ({
  accounts,
  pagination,
  queryParams,
  onQueryChange,
  isLoading = false,
  onRefresh,
  onAddAccount,
  onViewAccount,
  onEditAccount,
  onSetDefault,
  onDeactivate,
  onReactivate,
}) => {
  const { hasPermission, user } = useAuth();
  const canCreate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.create'));
  const canUpdate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.update'));
  const canSetDefault = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.set_default'));
  const canDeactivate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.deactivate'));

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const hasActiveFilters = Boolean(
    queryParams.search || (queryParams.status && queryParams.status !== 'all') || queryParams.currency,
  );

  return (
    <div className="w-full bg-white border border-[#DCE3EC] rounded-lg shadow-xs overflow-hidden">
      {/* Search & Filter Controls Toolbar */}
      <div className="p-4 border-b border-[#EEF1F6] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center flex-wrap gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={queryParams.search || ''}
              onChange={(e) => onQueryChange({ search: e.target.value, page: 1 })}
              placeholder="Search by bank, account holder, branch, or last 4..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={queryParams.status || 'all'}
            onChange={(e) => onQueryChange({ status: e.target.value as any, page: 1 })}
            className="px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Currency Filter */}
          <select
            value={queryParams.currency || ''}
            onChange={(e) => onQueryChange({ currency: e.target.value || undefined, page: 1 })}
            className="px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70]"
          >
            <option value="">All Currencies</option>
            <option value="VND">VND</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
            <option value="SGD">SGD</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onQueryChange({ search: '', status: 'all', currency: undefined, page: 1 })}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-1 py-1 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#244A70]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#F8FAFC] text-slate-500 font-semibold border-b border-[#EEF1F6] text-[11px] uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-4">Bank</th>
              <th className="py-3 px-4">Account Holder</th>
              <th className="py-3 px-4">Account Number</th>
              <th className="py-3 px-4">Currency</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Default</th>
              <th className="py-3 px-4">Updated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F6]">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-12"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                  <td className="py-3 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
                </tr>
              ))
            ) : accounts.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Landmark className="w-6 h-6" />
                    </div>
                    {hasActiveFilters ? (
                      <>
                        <h3 className="text-sm font-bold text-[#17263A] mb-1">
                          No matching bank accounts
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          No accounts match your current filter and search criteria.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onQueryChange({ search: '', status: 'all', currency: undefined, page: 1 })}
                        >
                          Clear Filters
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-[#17263A] mb-1">
                          No bank accounts configured
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          Add a bank account to receive customer payments for contracts, conversion services, and invoices.
                        </p>
                        {canCreate && onAddAccount && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={onAddAccount}
                          >
                            <Plus className="w-4 h-4 mr-1.5" /> Add Bank Account
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Table Rows
              accounts.map((acc) => (
                <tr
                  key={acc.id}
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => onViewAccount(acc)}
                >
                  {/* Bank Name & BIN */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#17263A]">{acc.bankName}</span>
                        {acc.bankCode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium">
                            {acc.bankCode}
                          </span>
                        )}
                      </div>
                      {acc.bin && (
                        <span className="text-[11px] font-mono text-slate-500 mt-0.5">
                          BIN: <span className="font-semibold text-slate-700">{acc.bin}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Account Holder */}
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {acc.accountHolderName}
                  </td>

                  {/* Account Number */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-700 font-medium">
                        {acc.accountNumberMasked}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.id, acc.accountNumberLast4)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200 transition-colors"
                        title="Copy masked last 4"
                      >
                        {copiedId === acc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Currency */}
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-xs">
                    {acc.currency}
                  </td>

                  {/* Branch */}
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {acc.branchName || '—'}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        acc.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {acc.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Default Status */}
                  <td className="py-3 px-4">
                    {acc.isDefault ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Star className="w-3 h-3 fill-indigo-600 text-indigo-600" /> Default
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Updated At */}
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(acc.updatedAt)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* View Detail */}
                      <button
                        type="button"
                        onClick={() => onViewAccount(acc)}
                        className="p-1 text-slate-500 hover:text-[#244A70] hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => onEditAccount(acc)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Edit account"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Set Default */}
                      {canSetDefault && acc.status === 'active' && !acc.isDefault && (
                        <button
                          type="button"
                          onClick={() => onSetDefault(acc.id)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title={`Set as default receiving account for ${acc.currency}`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}

                      {/* Deactivate */}
                      {canDeactivate && acc.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => onDeactivate(acc)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Deactivate account"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reactivate */}
                      {canUpdate && acc.status === 'inactive' && (
                        <button
                          type="button"
                          onClick={() => onReactivate(acc.id)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Reactivate account"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.total > 0 && (
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#EEF1F6] flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#17263A]">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#17263A]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#17263A]">{pagination.total}</span> accounts
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onQueryChange({ page: pagination.page - 1 })}
              className="p-1 rounded border border-[#DCE3EC] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onQueryChange({ page: pagination.page + 1 })}
              className="p-1 rounded border border-[#DCE3EC] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
