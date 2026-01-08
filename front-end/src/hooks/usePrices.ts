import { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_TOKENS, type TokenInfo } from '@/lib/tokens';

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: number;
}

export interface PriceData {
  prices: Record<string, TokenPrice>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Mock price data for demo (in production, use real API)
const MOCK_PRICES: Record<string, { price: number; change24h: number }> = {
  USDT: { price: 1.0, change24h: 0.01 },
  USDC: { price: 1.0, change24h: -0.02 },
  WETH: { price: 3450.25, change24h: 2.35 },
  WBTC: { price: 97500.80, change24h: 1.85 },
  MNT: { price: 0.85, change24h: -1.25 },
};

// Fetch prices from CoinGecko API (free tier)
const fetchPricesFromAPI = async (): Promise<Record<string, TokenPrice>> => {
  const tokens = Object.values(SUPPORTED_TOKENS);
  const coingeckoIds = tokens
    .filter((t) => t.coingeckoId)
    .map((t) => t.coingeckoId)
    .join(',');

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const data = await response.json();
    const prices: Record<string, TokenPrice> = {};

    for (const token of tokens) {
      if (token.coingeckoId && data[token.coingeckoId]) {
        prices[token.symbol] = {
          symbol: token.symbol,
          price: data[token.coingeckoId].usd || 0,
          change24h: data[token.coingeckoId].usd_24h_change || 0,
          lastUpdated: Date.now(),
        };
      }
    }

    return prices;
  } catch (error) {
    console.warn('Failed to fetch from CoinGecko, using mock data:', error);
    // Fallback to mock data
    return getMockPrices();
  }
};

// Get mock prices with slight randomization for demo
const getMockPrices = (): Record<string, TokenPrice> => {
  const prices: Record<string, TokenPrice> = {};
  
  for (const [symbol, data] of Object.entries(MOCK_PRICES)) {
    // Add slight randomization for demo effect
    const randomFactor = 1 + (Math.random() - 0.5) * 0.002; // ±0.1%
    prices[symbol] = {
      symbol,
      price: data.price * randomFactor,
      change24h: data.change24h + (Math.random() - 0.5) * 0.5,
      lastUpdated: Date.now(),
    };
  }
  
  return prices;
};

// Hook to get token prices
export const usePrices = (refreshInterval: number = 60000): PriceData => {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      const newPrices = await fetchPricesFromAPI();
      setPrices(newPrices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      // Use mock data on error
      setPrices(getMockPrices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    
    // Set up refresh interval
    const interval = setInterval(fetchPrices, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refetch: fetchPrices };
};

// Hook to get a single token price
export const useTokenPrice = (symbol: string): TokenPrice | null => {
  const { prices } = usePrices();
  return prices[symbol] || null;
};

// Format price for display
export const formatPrice = (price: number, decimals: number = 2): string => {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return price.toFixed(decimals);
};

// Format percentage change
export const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};
