import React from 'react';
import type { ItemConversionStatus } from '../types/partner.types';

const STYLE: Record<ItemConversionStatus, { label: string; className: string; dot: string }> = {
  PENDING: {
    label: 'PENDING',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  PROCESSING: {
    label: 'PROCESSING',
    className: 'bg-blue-50 text-[#0652CC] border-blue-200',
    dot: 'bg-[#0652CC] animate-pulse',
  },
  COMPLETED: {
    label: 'COMPLETED',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  READY_FOR_EXPORT: {
    label: 'READY FOR EXPORT',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  FAILED: {
    label: 'FAILED',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  DEAD_LETTER: {
    label: 'FAILED (DEAD LETTER)',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

/** Conversion status of a workspace item: grey pending, animated blue while processing,
 * green when converted, red when it failed. */
export const ConversionStatusBadge: React.FC<{ status: ItemConversionStatus }> = ({ status }) => {
  const style = STYLE[status] ?? STYLE.PENDING;
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  );
};
