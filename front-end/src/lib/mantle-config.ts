import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem';

// Mantle Sepolia Testnet Chain Definition
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantlescan',
      url: 'https://sepolia.mantlescan.xyz',
    },
  },
  testnet: true,
});

// Mantle Mainnet Chain Definition
export const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantlescan',
      url: 'https://mantlescan.xyz',
    },
  },
  testnet: false,
});

// Contract Addresses (Mantle Sepolia Testnet)
export const CONTRACTS = {
  PRICE_ORACLE: '0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863' as `0x${string}`,
  DCA_VAULT: '0x60b863F96c146f8D33B7dC99040ef93A39C37cA5' as `0x${string}`,
  SWAP_HELPER: '0xb2888D850F6A59fff8d537305DfA51ccEf77c177' as `0x${string}`,
  DCA_STRATEGY: '0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E' as `0x${string}`,
} as const;

// Current network (can be switched)
export const CURRENT_CHAIN = mantleSepolia;

// Create public client for reading data
export const publicClient = createPublicClient({
  chain: CURRENT_CHAIN,
  transport: http(),
});

// Create wallet client (will be initialized when user connects)
export const getWalletClient = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('未检测到钱包');
  }

  return createWalletClient({
    chain: CURRENT_CHAIN,
    transport: custom(window.ethereum),
  });
};

// Helper to switch network
export const switchToMantle = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('未检测到钱包');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CURRENT_CHAIN.id.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CURRENT_CHAIN.id.toString(16)}`,
          chainName: CURRENT_CHAIN.name,
          nativeCurrency: CURRENT_CHAIN.nativeCurrency,
          rpcUrls: [CURRENT_CHAIN.rpcUrls.default.http[0]],
          blockExplorerUrls: [CURRENT_CHAIN.blockExplorers.default.url],
        }],
      });
    } else {
      throw switchError;
    }
  }
};

// Declare ethereum on window
declare global {
  interface Window {
    ethereum?: any;
  }
}
