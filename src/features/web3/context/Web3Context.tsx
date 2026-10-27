import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChainId,
  Web3Network,
  WalletState,
  SmartContractRecord,
  OnChainTransactionRecord,
} from '../types/web3.types';

export const SUPPORTED_NETWORKS: Record<ChainId, Web3Network> = {
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
    testnet: false,
    color: '#627EEA',
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'SEP', decimals: 18 },
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    testnet: true,
    color: '#CFB53B',
  },
  137: {
    id: 137,
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
    testnet: false,
    color: '#8247E5',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorerUrl: 'https://arbiscan.io',
    testnet: false,
    color: '#28A0F0',
  },
  1337: {
    id: 1337,
    name: 'Local Enterprise DevNet',
    shortName: 'DevNet',
    nativeCurrency: { name: 'Test Ether', symbol: 'TETH', decimals: 18 },
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorerUrl: '#',
    testnet: true,
    color: '#10B981',
  },
};

export const INITIAL_SMART_CONTRACTS: SmartContractRecord[] = [
  {
    id: 'contract-identity',
    name: 'ALSMEnterpriseIdentityRegistry',
    address: '0x3A5c098E4B17B2720d2c3B9178Efe298b4c73f41',
    chainId: 11155111,
    description: 'Verifies tenant membership and enterprise admin permissions on-chain.',
    verified: true,
    deploymentDate: '2026-08-10',
    methods: ['verifyOrganization(string orgId)', 'isEnterpriseAdmin(address user)', 'registerDomain(string domain)'],
  },
  {
    id: 'contract-audit',
    name: 'ALSMConversionProofAnchor',
    address: '0x89F19E3c4A538D9cEa4f91005a76E2bFc56E74B0',
    chainId: 11155111,
    description: 'Anchors cryptographic SHA-256 merkle root hashes of converted screen packages.',
    verified: true,
    deploymentDate: '2026-09-02',
    methods: ['anchorProof(bytes32 packageHash, string projectId)', 'verifyProof(bytes32 packageHash)', 'getAnchorsByProject(string projectId)'],
  },
  {
    id: 'contract-treasury',
    name: 'ALSMEnterpriseBillingTreasury',
    address: '0x712B56dE304896d8D9f1704eB78c2e68444aDe6B',
    chainId: 11155111,
    description: 'Automates multi-sig settlement for enterprise conversions and usage billing.',
    verified: true,
    deploymentDate: '2026-09-20',
    methods: ['payInvoice(string invoiceId)', 'getPendingSettlements(address tenant)', 'releaseEscrow(bytes32 jobId)'],
  },
];

export const INITIAL_TRANSACTIONS: OnChainTransactionRecord[] = [
  {
    hash: '0x4f89d3a12781bcf704e67295da9e472091c3be19c72e4854f9a5621da8a9cf21',
    chainId: 11155111,
    from: '0x71C9496d0C88846c986C200e12A27c59E9a98B3f',
    to: '0x89F19E3c4A538D9cEa4f91005a76E2bFc56E74B0',
    method: 'anchorProof',
    status: 'SUCCESS',
    blockNumber: 6891204,
    timestamp: '2026-10-21T14:32:00Z',
    gasUsed: 46210,
    gasPriceGwei: 19.4,
    details: { projectId: 'proj-acme-bms-01', packageHash: '0x8f2a...c014' },
  },
  {
    hash: '0x992ab458c6e289f81014cc62a39dfa0021c78491bb4efac1449bca74e0d9b412',
    chainId: 11155111,
    from: '0x71C9496d0C88846c986C200e12A27c59E9a98B3f',
    to: '0x3A5c098E4B17B2720d2c3B9178Efe298b4c73f41',
    method: 'verifyOrganization',
    status: 'SUCCESS',
    blockNumber: 6891180,
    timestamp: '2026-10-21T11:15:00Z',
    gasUsed: 62400,
    gasPriceGwei: 21.1,
    details: { orgId: 'org-fnx-prod' },
  },
];

export interface Web3ContextType {
  wallet: WalletState;
  currentNetwork: Web3Network;
  supportedNetworks: Web3Network[];
  contracts: SmartContractRecord[];
  transactions: OnChainTransactionRecord[];
  connect: (preferredProvider?: string) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: ChainId) => Promise<void>;
  simulateContractCall: (contractId: string, method: string, args: Record<string, any>) => Promise<OnChainTransactionRecord>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const STORAGE_KEY = 'alsm_web3_wallet_session';

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          address: parsed.address || null,
          chainId: parsed.chainId || 11155111,
          balance: parsed.balance || '3.420',
          status: parsed.address ? 'CONNECTED' : 'DISCONNECTED',
          providerName: parsed.providerName || 'Enterprise Browser Wallet',
          error: null,
        };
      }
    } catch {
      // ignore
    }
    return {
      address: null,
      chainId: 11155111,
      balance: null,
      status: 'DISCONNECTED',
      providerName: 'Enterprise Browser Wallet',
      error: null,
    };
  });

  const [contracts] = useState<SmartContractRecord[]>(INITIAL_SMART_CONTRACTS);
  const [transactions, setTransactions] = useState<OnChainTransactionRecord[]>(INITIAL_TRANSACTIONS);

  // Sync to local storage
  useEffect(() => {
    if (wallet.status === 'CONNECTED' && wallet.address) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          address: wallet.address,
          chainId: wallet.chainId,
          balance: wallet.balance,
          providerName: wallet.providerName,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [wallet]);

  const currentNetwork = useMemo(() => {
    const chain = wallet.chainId || 11155111;
    return SUPPORTED_NETWORKS[chain] || SUPPORTED_NETWORKS[11155111];
  }, [wallet.chainId]);

  // Connect wallet
  const connect = useCallback(async (preferredProvider: string = 'Injected') => {
    setWallet((prev) => ({ ...prev, status: 'CONNECTING', error: null }));
    try {
      const eth = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
      if (eth && eth.request) {
        try {
          const accounts = await eth.request({ method: 'eth_requestAccounts' });
          const chainHex = await eth.request({ method: 'eth_chainId' });
          const rawChainId = parseInt(chainHex, 16) as ChainId;
          const targetChain = SUPPORTED_NETWORKS[rawChainId] ? rawChainId : 11155111;

          setWallet({
            address: accounts[0],
            chainId: targetChain,
            balance: '4.850',
            status: 'CONNECTED',
            providerName: 'MetaMask / EIP-1193',
            error: null,
          });
          return;
        } catch (err: any) {
          if (err.code === 4001) {
            setWallet((prev) => ({
              ...prev,
              status: 'DISCONNECTED',
              error: 'Connection request rejected by user.',
            }));
            return;
          }
          // fallback to simulated enterprise test wallet
        }
      }

      // Simulated enterprise test wallet adapter
      await new Promise((resolve) => setTimeout(resolve, 400));
      const simulatedAddress = '0x71C9496d0C88846c986C200e12A27c59E9a98B3f';
      setWallet({
        address: simulatedAddress,
        chainId: 11155111,
        balance: '3.420',
        status: 'CONNECTED',
        providerName: preferredProvider || 'Enterprise Hardware Adapter',
        error: null,
      });
    } catch (err: any) {
      setWallet((prev) => ({
        ...prev,
        status: 'DISCONNECTED',
        error: err.message || 'Failed to connect Web3 wallet.',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      chainId: 11155111,
      balance: null,
      status: 'DISCONNECTED',
      providerName: 'Enterprise Browser Wallet',
      error: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const switchNetwork = useCallback(async (targetChainId: ChainId) => {
    try {
      const eth = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
      if (eth && eth.request && wallet.providerName.includes('EIP-1193')) {
        const chainHex = `0x${targetChainId.toString(16)}`;
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainHex }],
          });
        } catch (switchError: any) {
          // If network not added or user rejects, handle gracefully
        }
      }

      setWallet((prev) => ({
        ...prev,
        chainId: targetChainId,
      }));
    } catch (err: any) {
      setWallet((prev) => ({
        ...prev,
        error: `Could not switch network: ${err.message}`,
      }));
    }
  }, [wallet.providerName]);

  const simulateContractCall = useCallback(
    async (contractId: string, method: string, args: Record<string, any>): Promise<OnChainTransactionRecord> => {
      const targetContract = contracts.find((c) => c.id === contractId);
      const contractAddress = targetContract?.address || '0x3A5c098E4B17B2720d2c3B9178Efe298b4c73f41';
      const sender = wallet.address || '0x71C9496d0C88846c986C200e12A27c59E9a98B3f';

      // Simulate network latency
      await new Promise((r) => setTimeout(r, 600));

      const randomHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const newTx: OnChainTransactionRecord = {
        hash: randomHash,
        chainId: wallet.chainId || 11155111,
        from: sender,
        to: contractAddress,
        method,
        status: 'SUCCESS',
        blockNumber: 6891200 + Math.floor(Math.random() * 50),
        timestamp: new Date().toISOString(),
        gasUsed: Math.floor(35000 + Math.random() * 40000),
        gasPriceGwei: 18 + Math.floor(Math.random() * 6),
        details: args,
      };

      setTransactions((prev) => [newTx, ...prev]);
      return newTx;
    },
    [contracts, wallet.address, wallet.chainId]
  );

  return (
    <Web3Context.Provider
      value={{
        wallet,
        currentNetwork,
        supportedNetworks: Object.values(SUPPORTED_NETWORKS),
        contracts,
        transactions,
        connect,
        disconnect,
        switchNetwork,
        simulateContractCall,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Wallet = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Wallet must be used within a Web3Provider');
  }
  return context;
};
