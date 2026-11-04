/** Format monetary values in the platform's single supported currency. */
export const formatVnd = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(amount)} VND`;
};
