import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesPipelinePage } from '../pages/SalesPipelinePage';
import { crmApi } from '../api/crm.api';
import type { SalesPipelineDto, SalesPipelineStage } from '../types/crm.types';

vi.mock('../api/crm.api', () => ({
  crmApi: {
    getSalesPipeline: vi.fn(),
  },
}));

const stages: SalesPipelineStage[] = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'UNMAPPED',
];

const makePipeline = (items: SalesPipelineDto['items']): SalesPipelineDto => ({
  items,
  total: items.length,
  stageCounts: Object.fromEntries(stages.map((stage) => [stage, items.filter((item) => item.stage === stage).length])) as Record<SalesPipelineStage, number>,
  lastUpdated: '2026-10-29T08:00:00.000Z',
});

const samplePipeline = makePipeline([
  {
    id: '6ad586fe9f2215c9ebcac858',
    company: 'Apex Health Systems',
    contactName: 'Dr. Michael Chang',
    source: 'Referral',
    stage: 'NEW',
    score: 72,
    dealValue: 250000,
    currency: 'VND',
    assignedToName: 'Lê Văn Sales',
  },
  {
    id: '6ad586fe9f2215c9ebcac859',
    company: 'Pacific Retail Group',
    contactName: 'David Tanaka',
    source: 'Partner',
    stage: 'NEGOTIATION',
    dealValue: 180000,
    currency: 'VND',
  },
]);

const renderPage = () => render(
  <MemoryRouter initialEntries={['/sales/pipeline']}>
    <Routes>
      <Route path="/sales/pipeline" element={<SalesPipelinePage />} />
      <Route path="/crm/leads/:leadId" element={<div>Lead details</div>} />
      <Route path="/sales/leads" element={<div>Lead table</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('SalesPipelinePage (UC-65)', () => {
  const getSalesPipeline = vi.mocked(crmApi.getSalesPipeline);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state and disables refresh while the request is pending', () => {
    getSalesPipeline.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading sales pipeline');
    expect(screen.getByRole('button', { name: 'Refresh sales pipeline' })).toBeDisabled();
  });

  it('renders current Mongo-backed stages and exposes cards as keyboard-accessible detail links', async () => {
    getSalesPipeline.mockResolvedValue(samplePipeline);
    renderPage();

    const leadCard = await screen.findByRole('button', { name: 'View Apex Health Systems lead details' });
    expect(screen.getByRole('heading', { name: 'Negotiation' })).toBeInTheDocument();
    expect(screen.getByText('Dr. Michael Chang')).toBeInTheDocument();
    expect(screen.getByText('250.000 VND')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add lead/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/move:/i)).not.toBeInTheDocument();

    fireEvent.click(leadCard);
    expect(await screen.findByText('Lead details')).toBeInTheDocument();
  });

  it('shows a real empty state without substituting local sample records', async () => {
    getSalesPipeline.mockResolvedValue(makePipeline([]));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No sales opportunities yet' })).toBeInTheDocument();
    expect(screen.queryByText('Apex Health Systems')).not.toBeInTheDocument();
    expect(getSalesPipeline).toHaveBeenCalledTimes(1);
  });

  it('shows a permission error without exposing backend details', async () => {
    getSalesPipeline.mockRejectedValue({ response: { status: 403 }, message: 'internal stack trace' });
    renderPage();

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('You do not have permission to view the sales pipeline.');
    expect(error).not.toHaveTextContent('internal stack trace');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('allows retry after an unexpected API failure', async () => {
    getSalesPipeline.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(samplePipeline);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'View Apex Health Systems lead details' })).toBeInTheDocument());
    expect(getSalesPipeline).toHaveBeenCalledTimes(2);
  });

  it('filters visible cards by search without changing pipeline state', async () => {
    getSalesPipeline.mockResolvedValue(samplePipeline);
    renderPage();

    await screen.findByRole('button', { name: 'View Apex Health Systems lead details' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales pipeline' }), { target: { value: 'Pacific' } });

    expect(screen.getByRole('button', { name: 'View Pacific Retail Group lead details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Apex Health Systems lead details' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2 opportunities')).toBeInTheDocument();
  });
});
