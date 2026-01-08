import { useState, useEffect, useCallback } from 'react';
import {
  publicClient,
  getWalletClient,
  switchToMantle,
  CONTRACTS,
  CURRENT_CHAIN
} from '@/lib/mantle-config';
import { DCAVaultABI, DCAStrategyABI, ERC20ABI, PlanStatus, INTERVAL_LABELS } from '@/lib/abis';
import { formatUnits, parseUnits, type Address } from 'viem';

declare global {
  interface Window {
    ethereum?: any;
  }
}


// Types
export interface Plan {
  id: bigint;
  planId: bigint;
  owner: Address;
  sourceToken: Address;
  targetToken: Address;
  amountPerExecution: bigint;
  interval: bigint;
  maxExecutions: bigint;
  totalExecutions: bigint;
  totalAmountIn: bigint;
  totalAmountOut: bigint;
  lastExecutionTime: bigint;
  createdAt: bigint;
  isActive: boolean;
  isPaused: boolean;
  // Legacy fields for compatibility
  executionCount: bigint;
  status: PlanStatus;
}

export interface ExecutionEvent {
  planId: bigint;
  amountIn: bigint;
  amountOut: bigint;
  executionNumber: bigint;
  blockNumber: bigint;
  transactionHash: string;
}

// Hook: Get current user wallet
export const useMantleUser = () => {
  const [user, setUser] = useState<{ address?: Address; connected: boolean }>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout - ensure loading never gets stuck
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setUser({ address: accounts[0] as Address, connected: true });
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setUser({ address: accounts[0] as Address, connected: true });
        } else {
          setUser({ connected: false });
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      clearTimeout(timeout);
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask 或其他 Web3 钱包');
    }

    try {
      // Switch to Mantle network first
      await switchToMantle();

      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setUser({ address: accounts[0] as Address, connected: true });
      }
    } catch (error) {
      console.error('Error connecting:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setUser({ connected: false });
  }, []);

  return { user, loading, connect, disconnect };
};

// Hook: Get user's DCA plans
export const useUserPlans = (address?: Address) => {
  const [planIds, setPlanIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setPlanIds([]);
      return;
    }

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.DCA_STRATEGY,
          abi: DCAStrategyABI,
          functionName: 'getUserPlans',
          args: [address],
        });
        setPlanIds([...(result as bigint[])]);
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlanIds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [address]);

  return { planIds, loading };
};

// Hook: Get plan details
export const usePlanDetails = (planId?: bigint) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId === undefined) {
      setPlan(null);
      return;
    }

    const fetchPlan = async () => {
      setLoading(true);
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.DCA_STRATEGY,
          abi: DCAStrategyABI,
          functionName: 'getPlan',
          args: [planId],
        }) as any;

        // Map isActive/isPaused to status for compatibility
        let status = PlanStatus.Active;
        if (!result.isActive) {
          status = PlanStatus.Stopped;
        } else if (result.isPaused) {
          status = PlanStatus.Paused;
        }

        // Check if max executions reached
        if (result.maxExecutions > 0n && result.totalExecutions >= result.maxExecutions) {
          status = PlanStatus.Completed;
        }

        setPlan({
          id: planId,
          planId: result.planId || planId,
          owner: result.owner,
          sourceToken: result.sourceToken,
          targetToken: result.targetToken,
          amountPerExecution: result.amountPerExecution,
          interval: result.interval,
          maxExecutions: result.maxExecutions,
          totalExecutions: result.totalExecutions,
          totalAmountIn: result.totalAmountIn || 0n,
          totalAmountOut: result.totalAmountOut || 0n,
          lastExecutionTime: result.lastExecutionTime,
          createdAt: result.createdAt,
          isActive: result.isActive,
          isPaused: result.isPaused,
          // Legacy compatibility
          executionCount: result.totalExecutions,
          status,
        });
      } catch (error) {
        console.error('Error fetching plan:', error);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  return { plan, loading };
};


// Hook: Get vault balances
export const useVaultBalances = (address?: Address, tokens?: Address[]) => {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !tokens || tokens.length === 0) {
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const results: Record<string, bigint> = {};

        for (const token of tokens) {
          const balance = await publicClient.readContract({
            address: CONTRACTS.DCA_VAULT,
            abi: DCAVaultABI,
            functionName: 'getBalance',
            args: [address, token],
          });
          results[token] = balance as bigint;
        }

        setBalances(results);
      } catch (error) {
        console.error('Error fetching balances:', error);
        setBalances({});
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address, tokens?.join(',')]);

  return { balances, loading };
};

// Hook: Get execution history
export const useExecutionHistory = (address?: Address) => {
  const [executions, setExecutions] = useState<ExecutionEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setExecutions([]);
      return;
    }

    const fetchExecutions = async () => {
      setLoading(true);
      try {
        // Get current block number to limit the range (RPC limits to 10,000 blocks)
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 9000n ? currentBlock - 9000n : 0n;

        // Get recent execution events
        const logs = await publicClient.getLogs({
          address: CONTRACTS.DCA_STRATEGY,
          event: {
            type: 'event',
            name: 'ExecutionCompleted',
            inputs: [
              { name: 'planId', type: 'uint256', indexed: true },
              { name: 'amountIn', type: 'uint256', indexed: false },
              { name: 'amountOut', type: 'uint256', indexed: false },
              { name: 'executionNumber', type: 'uint256', indexed: false },
            ],
          },
          fromBlock: fromBlock,
          toBlock: 'latest',
        });

        // Filter by user's plans
        const userPlanIds = await publicClient.readContract({
          address: CONTRACTS.DCA_STRATEGY,
          abi: DCAStrategyABI,
          functionName: 'getUserPlans',
          args: [address],
        }) as bigint[];

        const userPlanIdSet = new Set(userPlanIds.map(id => id.toString()));

        const userExecutions = logs
          .filter(log => userPlanIdSet.has((log.args as any).planId?.toString()))
          .map(log => ({
            planId: (log.args as any).planId as bigint,
            amountIn: (log.args as any).amountIn as bigint,
            amountOut: (log.args as any).amountOut as bigint,
            executionNumber: (log.args as any).executionNumber as bigint,
            blockNumber: log.blockNumber || 0n,
            transactionHash: log.transactionHash || '0x',
          }))
          .sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setExecutions(userExecutions);
      } catch (error) {
        console.error('Error fetching executions:', error);
        setExecutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [address]);

  return { executions, loading };
};

// Transaction: Create DCA Plan
export const createDCAPlan = async (
  sourceToken: Address,
  targetToken: Address,
  amountPerExecution: bigint,
  interval: bigint,
  maxExecutions: bigint,
  minPrice: bigint = 0n,
  maxPrice: bigint = 0n
) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  const hash = await walletClient.writeContract({
    address: CONTRACTS.DCA_STRATEGY,
    abi: DCAStrategyABI,
    functionName: 'createPlan',
    args: [sourceToken, targetToken, amountPerExecution, interval, maxExecutions, minPrice, maxPrice],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

// Transaction: Pause Plan
export const pausePlan = async (planId: bigint) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  const hash = await walletClient.writeContract({
    address: CONTRACTS.DCA_STRATEGY,
    abi: DCAStrategyABI,
    functionName: 'pausePlan',
    args: [planId],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

// Transaction: Resume Plan
export const resumePlan = async (planId: bigint) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  const hash = await walletClient.writeContract({
    address: CONTRACTS.DCA_STRATEGY,
    abi: DCAStrategyABI,
    functionName: 'resumePlan',
    args: [planId],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

// Transaction: Stop Plan
export const stopPlan = async (planId: bigint) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  const hash = await walletClient.writeContract({
    address: CONTRACTS.DCA_STRATEGY,
    abi: DCAStrategyABI,
    functionName: 'stopPlan',
    args: [planId],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

// Transaction: Deposit to Vault
export const depositToVault = async (token: Address, amount: bigint) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  // First approve the vault to spend tokens
  const approveHash = await walletClient.writeContract({
    address: token,
    abi: ERC20ABI,
    functionName: 'approve',
    args: [CONTRACTS.DCA_VAULT, amount],
    account,
    chain: CURRENT_CHAIN,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Then deposit
  const depositHash = await walletClient.writeContract({
    address: CONTRACTS.DCA_VAULT,
    abi: DCAVaultABI,
    functionName: 'deposit',
    args: [token, amount],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash: depositHash });
};

// Transaction: Withdraw from Vault
export const withdrawFromVault = async (token: Address, amount: bigint) => {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('未连接钱包');

  const hash = await walletClient.writeContract({
    address: CONTRACTS.DCA_VAULT,
    abi: DCAVaultABI,
    functionName: 'withdraw',
    args: [token, amount],
    account,
    chain: CURRENT_CHAIN,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

// Helper: Format interval to readable string
export const formatInterval = (interval: bigint): string => {
  return INTERVAL_LABELS[interval.toString()] || `${interval} 秒`;
};

// Helper: Format plan status
export const formatPlanStatus = (status: PlanStatus): string => {
  switch (status) {
    case PlanStatus.Active:
      return '运行中';
    case PlanStatus.Paused:
      return '已暂停';
    case PlanStatus.Stopped:
      return '已停止';
    case PlanStatus.Completed:
      return '已完成';
    default:
      return '未知';
  }
};

// Helper: Get status color
export const getStatusColor = (status: PlanStatus): string => {
  switch (status) {
    case PlanStatus.Active:
      return 'text-green-500';
    case PlanStatus.Paused:
      return 'text-yellow-500';
    case PlanStatus.Stopped:
      return 'text-red-500';
    case PlanStatus.Completed:
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};
