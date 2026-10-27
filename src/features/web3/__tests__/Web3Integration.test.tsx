import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Web3Provider, useWeb3Wallet } from '../context/Web3Context';
import { WalletConnectPill } from '../components/WalletConnectPill';
import { Web3AdminPage } from '../pages/Web3AdminPage';

// Test consumer for Web3Context state verification
const Web3TestConsumer: React.FC = () => {
  const { wallet, currentNetwork, transactions, connect, disconnect, switchNetwork, simulateContractCall } = useWeb3Wallet();

  return (
    <div>
      <div data-testid="status">{wallet.status}</div>
      <div data-testid="address">{wallet.address || 'none'}</div>
      <div data-testid="network">{currentNetwork.name}</div>
      <div data-testid="chainId">{currentNetwork.id}</div>
      <div data-testid="txCount">{transactions.length}</div>
      <button onClick={() => connect()}>Connect Wallet</button>
      <button onClick={() => disconnect()}>Disconnect Wallet</button>
      <button onClick={() => switchNetwork(137)}>Switch to Polygon</button>
      <button
        onClick={() =>
          simulateContractCall('contract-audit', 'anchorProof', { projectId: 'test-proj', hash: '0xabc' })
        }
      >
        Simulate Proof
      </button>
    </div>
  );
};

describe('Web3 Integration & Wallet Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes in DISCONNECTED state and connects to simulated enterprise test wallet', async () => {
    render(
      <MemoryRouter>
        <Web3Provider>
          <Web3TestConsumer />
        </Web3Provider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('DISCONNECTED');
    expect(screen.getByTestId('address')).toHaveTextContent('none');

    // Click Connect
    fireEvent.click(screen.getByRole('button', { name: 'Connect Wallet' }));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('CONNECTED');
    });

    expect(screen.getByTestId('address')).toHaveTextContent('0x71C9496d0C88846c986C200e12A27c59E9a98B3f');
    expect(screen.getByTestId('network')).toHaveTextContent('Sepolia Testnet');
  });

  it('switches networks and updates chainId', async () => {
    render(
      <MemoryRouter>
        <Web3Provider>
          <Web3TestConsumer />
        </Web3Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Polygon' }));

    await waitFor(() => {
      expect(screen.getByTestId('network')).toHaveTextContent('Polygon Mainnet');
      expect(screen.getByTestId('chainId')).toHaveTextContent('137');
    });
  });

  it('simulates smart contract proof anchoring and updates transaction records', async () => {
    render(
      <MemoryRouter>
        <Web3Provider>
          <Web3TestConsumer />
        </Web3Provider>
      </MemoryRouter>
    );

    const initialCount = parseInt(screen.getByTestId('txCount').textContent || '0');

    // Connect wallet first
    fireEvent.click(screen.getByRole('button', { name: 'Connect Wallet' }));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('CONNECTED');
    });

    // Simulate Proof
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Proof' }));

    await waitFor(
      () => {
        const updatedCount = parseInt(screen.getByTestId('txCount').textContent || '0');
        expect(updatedCount).toBe(initialCount + 1);
      },
      { timeout: 2500 }
    );
  });

  it('renders WalletConnectPill with connection toggle and address shortening', async () => {
    render(
      <MemoryRouter>
        <Web3Provider>
          <WalletConnectPill />
        </Web3Provider>
      </MemoryRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /Connect Wallet/i });
    expect(connectBtn).toBeInTheDocument();

    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(screen.getByText('0x71C9...8B3f')).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByText('0x71C9...8B3f'));
    expect(screen.getByText('Active Network')).toBeInTheDocument();
    expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum One')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
  });

  it('renders Web3AdminPage with KPI metrics, smart contract registry, and simulator', async () => {
    render(
      <MemoryRouter>
        <Web3Provider>
          <Web3AdminPage />
        </Web3Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Blockchain & Web3 Administration')).toBeInTheDocument();
    expect(screen.getByText('Wallet Status')).toBeInTheDocument();
    expect(screen.getByText('Active Network')).toBeInTheDocument();
    expect(screen.getByText('Network Gas Price')).toBeInTheDocument();
    expect(screen.getByText('Active Smart Contracts')).toBeInTheDocument();

    // Verify smart contracts rendered
    expect(screen.getByText('ALSMEnterpriseIdentityRegistry')).toBeInTheDocument();
    expect(screen.getByText('ALSMConversionProofAnchor')).toBeInTheDocument();
    expect(screen.getByText('ALSMEnterpriseBillingTreasury')).toBeInTheDocument();

    // Switch to simulator tab
    const simTab = screen.getByRole('button', { name: /Transaction & Proof Simulator/i });
    fireEvent.click(simTab);

    expect(screen.getByText('Simulate Smart Contract Execution & Proof Anchoring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anchor & Execute On-Chain/i })).toBeInTheDocument();

    // Run simulation
    const executeBtn = screen.getByRole('button', { name: /Anchor & Execute On-Chain/i });
    fireEvent.click(executeBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Transaction broadcast and confirmed on block/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
