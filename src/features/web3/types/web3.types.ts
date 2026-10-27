export type ChainId = 1 | 11155111 | 137 | 42161 | 1337;

export interface Web3Network {
  id: ChainId;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorerUrl: string;
  testnet: boolean;
  color: string;
}

export type WalletConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'WRONG_NETWORK';

export interface WalletState {
  address: string | null;
  chainId: ChainId | null;
  balance: string | null;
  status: WalletConnectionStatus;
  providerName: string;
  error: string | null;
}

export interface SmartContractRecord {
  id: string;
  name: string;
  address: string;
  chainId: ChainId;
  description: string;
  verified: boolean;
  deploymentDate: string;
  methods: string[];
}

export interface OnChainTransactionRecord {
  hash: string;
  chainId: ChainId;
  from: string;
  to: string;
  method: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  blockNumber: number;
  timestamp: string;
  gasUsed: number;
  gasPriceGwei: number;
  details?: Record<string, any>;
}
