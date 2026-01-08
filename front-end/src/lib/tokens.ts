// Token configurations for DripFi-Mantle
import type { Address } from 'viem';

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  coingeckoId?: string; // For price fetching
}

// Supported tokens on Mantle Sepolia (testnet addresses - placeholders)
// In production, these would be real token addresses
export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  USDT: {
    address: '0x0000000000000000000000000000000000000001' as Address,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    coingeckoId: 'tether',
  },
  USDC: {
    address: '0x0000000000000000000000000000000000000002' as Address,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    coingeckoId: 'usd-coin',
  },
  WETH: {
    address: '0x0000000000000000000000000000000000000003' as Address,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    coingeckoId: 'ethereum',
  },
  WBTC: {
    address: '0x0000000000000000000000000000000000000004' as Address,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logoUrl: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
    coingeckoId: 'wrapped-bitcoin',
  },
  MNT: {
    address: '0x0000000000000000000000000000000000000005' as Address,
    symbol: 'MNT',
    name: 'Mantle',
    decimals: 18,
    logoUrl: 'https://cryptologos.cc/logos/mantle-mnt-logo.png',
    coingeckoId: 'mantle',
  },
};

// Get token by address
export const getTokenByAddress = (address: Address): TokenInfo | undefined => {
  return Object.values(SUPPORTED_TOKENS).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
};

// Get token by symbol
export const getTokenBySymbol = (symbol: string): TokenInfo | undefined => {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
};

// Format token amount with proper decimals
export const formatTokenAmount = (
  amount: bigint,
  decimals: number,
  displayDecimals: number = 4
): string => {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalStr.slice(0, displayDecimals);
  
  return `${integerPart}.${displayFractional}`;
};
