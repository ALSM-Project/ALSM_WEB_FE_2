import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateDemoProjectModal } from '../components/CreateDemoProjectModal';

describe('CreateDemoProjectModal - Demo Sandbox Creation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders step 1 with project name and description fields', () => {
    render(
      <MemoryRouter>
        <CreateDemoProjectModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Create Demo Project Sandbox')).toBeInTheDocument();
    expect(screen.getByText('DEMO SANDBOX')).toBeInTheDocument();
    expect(screen.getByLabelText(/Demo Project Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Next: Select Sample Files/i)).toBeInTheDocument();
  });

  it('progresses through file selection and review to create demo project', () => {
    const handleSuccess = vi.fn();
    render(
      <MemoryRouter>
        <CreateDemoProjectModal isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />
      </MemoryRouter>
    );

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Select Sample Files/i }));
    expect(screen.getByText('CUSTINQ.bms')).toBeInTheDocument();
    expect(screen.getByText('TRANSPROC.cbl')).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next: Review & Confirm/i }));
    expect(screen.getByText(/Project Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Included Source Files/i)).toBeInTheDocument();

    // Confirm creation
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Create Demo Project/i });
    fireEvent.click(confirmBtn);

    // Verify success view
    expect(screen.getByText('Demo Project Created Successfully')).toBeInTheDocument();
    expect(screen.getByText(/Open Conversion Workspace/i)).toBeInTheDocument();
    expect(handleSuccess).toHaveBeenCalled();

    // Verify localStorage has demo project saved
    const stored = localStorage.getItem('alsm_demo_projects');
    expect(stored).not.toBeNull();
    const list = JSON.parse(stored!);
    expect(list.length).toBe(1);
    expect(list[0].isDemo).toBe(true);
  });
});
