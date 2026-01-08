// DCAVault ABI
export const DCAVaultABI = [
  // Events
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'getBalance',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'supportedTokens',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  // Write functions
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// DCAStrategy ABI
export const DCAStrategyABI = [
  // Events
  {
    type: 'event',
    name: 'PlanCreated',
    inputs: [
      { name: 'planId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'sourceToken', type: 'address', indexed: false },
      { name: 'targetToken', type: 'address', indexed: false },
      { name: 'amountPerExecution', type: 'uint256', indexed: false },
      { name: 'interval', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PlanPaused',
    inputs: [{ name: 'planId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'PlanResumed',
    inputs: [{ name: 'planId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'PlanStopped',
    inputs: [{ name: 'planId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'ExecutionCompleted',
    inputs: [
      { name: 'planId', type: 'uint256', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'executionNumber', type: 'uint256', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'getPlan',
    stateMutability: 'view',
    inputs: [{ name: 'planId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'planId', type: 'uint256' },
        { name: 'owner', type: 'address' },
        { name: 'sourceToken', type: 'address' },
        { name: 'targetToken', type: 'address' },
        { name: 'amountPerExecution', type: 'uint256' },
        { name: 'interval', type: 'uint256' },
        { name: 'maxExecutions', type: 'uint256' },
        { name: 'totalExecutions', type: 'uint256' },
        { name: 'totalAmountIn', type: 'uint256' },
        { name: 'totalAmountOut', type: 'uint256' },
        { name: 'lastExecutionTime', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'isActive', type: 'bool' },
        { name: 'isPaused', type: 'bool' },
      ],
    }],
  },
  {
    type: 'function',
    name: 'getUserPlans',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'planCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'checkUpkeep',
    stateMutability: 'view',
    inputs: [{ name: 'checkData', type: 'bytes' }],
    outputs: [
      { name: 'upkeepNeeded', type: 'bool' },
      { name: 'performData', type: 'bytes' },
    ],
  },
  // Write functions
  {
    type: 'function',
    name: 'createPlan',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'sourceToken', type: 'address' },
      { name: 'targetToken', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'interval', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'minPrice', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'pausePlan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'planId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resumePlan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'planId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'stopPlan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'planId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'performUpkeep',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'performData', type: 'bytes' }],
    outputs: [],
  },
] as const;

// ERC20 ABI (minimal)
export const ERC20ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

// Plan Status enum
export enum PlanStatus {
  Active = 0,
  Paused = 1,
  Stopped = 2,
  Completed = 3,
}

// Interval constants (in seconds)
export const INTERVALS = {
  HOURLY: 3600n,
  FOUR_HOURLY: 14400n,
  DAILY: 86400n,
  WEEKLY: 604800n,
} as const;

// Interval labels
export const INTERVAL_LABELS: Record<string, string> = {
  '3600': '1 小时',
  '14400': '4 小时',
  '86400': '1 天',
  '604800': '1 周',
};
