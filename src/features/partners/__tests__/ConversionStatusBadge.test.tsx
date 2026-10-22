import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConversionStatusBadge } from '../components/ConversionStatusBadge';

describe('ConversionStatusBadge', () => {
  it.each([
    ['PENDING', 'PENDING', 'bg-slate-100'],
    ['PROCESSING', 'PROCESSING', 'bg-blue-50'],
    ['COMPLETED', 'COMPLETED', 'bg-emerald-50'],
    ['FAILED', 'FAILED', 'bg-rose-50'],
    ['DEAD_LETTER', 'FAILED (DEAD LETTER)', 'bg-rose-50'],
  ] as const)('renders %s as "%s" with its colour', (status, label, colour) => {
    render(<ConversionStatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass(colour);
    expect(badge).toHaveAttribute('data-status', status);
  });

  it('animates only while processing', () => {
    const { container, rerender } = render(<ConversionStatusBadge status="PROCESSING" />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    rerender(<ConversionStatusBadge status="COMPLETED" />);
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
});
