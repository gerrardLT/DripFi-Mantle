# Design Document

## Overview

DripFi-Mantle 是一个完全去中心化的定投协议，部署在 Mantle L2 网络上。该协议利用 Chainlink Automation 实现自动化执行，集成 Uniswap V3 进行代币兑换，并使用 Chainlink Price Feeds 确保价格公平性。

### 核心设计原则

1. **去中心化执行** - 使用 Chainlink Automation 替代中心化 Keeper
2. **资金安全** - 用户资金存储在独立 Vault，非托管模式
3. **Gas 优化** - 利用 Mantle L2 低费用优势
4. **可组合性** - 模块化设计，支持扩展

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ WalletConnect│  │ Plan Manager│  │  Dashboard  │  │   History   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ethers.js / viem                                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Mantle Network (L2)                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DCAVault.sol                              │    │
│  │  ├── deposit(token, amount)                                  │    │
│  │  ├── withdraw(token, amount)                                 │    │
│  │  ├── getBalance(user, token)                                 │    │
│  │  └── transferToStrategy(user, token, amount)                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                │                                     │
│                                ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   DCAStrategy.sol                            │    │
│  │  ├── createPlan(params)                                      │    │
│  │  ├── pausePlan(planId)                                       │    │
│  │  ├── resumePlan(planId)                                      │    │
│  │  ├── stopPlan(planId)                                        │    │
│  │  ├── checkUpkeep(checkData) → Chainlink Automation           │    │
│  │  ├── performUpkeep(performData) → Execute DCA                │    │
│  │  └── getPlanDetails(planId)                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                    │                    │                │
│           ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          │
│  │ Uniswap V3  │      │  Chainlink  │      │  Chainlink  │          │
│  │   Router    │      │ Price Feeds │      │ Automation  │          │
│  └─────────────┘      └─────────────┘      └─────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. DCAVault.sol

用户资金管理合约，负责存储和管理用户的定投资金。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IDCAVault {
    // Events
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event TransferredToStrategy(address indexed user, address indexed token, uint256 amount);
    
    // Functions
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
    function getBalance(address user, address token) external view returns (uint256);
    function transferToStrategy(address user, address token, uint256 amount) external;
    function setSupportedToken(address token, bool supported) external;
    function isSupportedToken(address token) external view returns (bool);
}
```

### 2. DCAStrategy.sol

定投策略合约，实现 Chainlink Automation 接口，管理定投计划和执行逻辑。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

interface IDCAStrategy {
    // Structs
    struct Plan {
        uint256 planId;
        address owner;
        address sourceToken;
        address targetToken;
        uint256 amountPerExecution;
        uint256 interval;           // seconds between executions
        uint256 maxExecutions;      // 0 = unlimited
        uint256 totalExecutions;
        uint256 totalAmountIn;
        uint256 totalAmountOut;
        uint256 lastExecutionTime;
        uint256 createdAt;
        bool isActive;
        bool isPaused;
    }
    
    struct PlanParams {
        address sourceToken;
        address targetToken;
        uint256 amountPerExecution;
        uint256 interval;
        uint256 maxExecutions;
    }
    
    // Events
    event PlanCreated(
        uint256 indexed planId,
        address indexed owner,
        address sourceToken,
        address targetToken,
        uint256 amountPerExecution,
        uint256 interval,
        uint256 maxExecutions
    );
    event PlanPaused(uint256 indexed planId, address indexed owner);
    event PlanResumed(uint256 indexed planId, address indexed owner);
    event PlanStopped(uint256 indexed planId, address indexed owner);
    event ExecutionCompleted(
        uint256 indexed planId,
        address indexed owner,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionNumber,
        uint256 price
    );
    event ExecutionFailed(uint256 indexed planId, address indexed owner, string reason);
    
    // Plan Management
    function createPlan(PlanParams calldata params) external returns (uint256 planId);
    function pausePlan(uint256 planId) external;
    function resumePlan(uint256 planId) external;
    function stopPlan(uint256 planId) external;
    
    // Queries
    function getPlan(uint256 planId) external view returns (Plan memory);
    function getUserPlans(address user) external view returns (uint256[] memory);
    function canExecute(uint256 planId) external view returns (bool);
    
    // Chainlink Automation
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}
```

### 3. SwapHelper.sol

DEX 集成辅助合约，封装 Uniswap V3 交互逻辑。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISwapHelper {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);
    
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut);
    
    function setSlippageTolerance(uint256 bps) external; // basis points, e.g., 50 = 0.5%
}
```

### 4. PriceOracle.sol

价格预言机封装，集成 Chainlink Price Feeds。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp);
    function isPriceStale(address token) external view returns (bool);
    function getExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut);
}
```

## Data Models

### Plan Storage

```solidity
// Storage layout in DCAStrategy
mapping(uint256 => Plan) public plans;           // planId => Plan
mapping(address => uint256[]) public userPlans;  // user => planIds
uint256 public nextPlanId;

// Supported intervals (in seconds)
uint256 constant INTERVAL_1_HOUR = 3600;
uint256 constant INTERVAL_4_HOURS = 14400;
uint256 constant INTERVAL_1_DAY = 86400;
uint256 constant INTERVAL_1_WEEK = 604800;
```

### Token Configuration

```solidity
// Supported tokens on Mantle
address constant USDT = 0x...; // Mantle USDT
address constant USDC = 0x...; // Mantle USDC
address constant WETH = 0x...; // Wrapped ETH
address constant WBTC = 0x...; // Wrapped BTC
address constant MNT = 0x...; // Mantle Token
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Deposit-Withdraw Round Trip
*For any* user and valid deposit amount, depositing then withdrawing the same amount SHALL result in the user receiving exactly the deposited amount (minus any fees if applicable).
**Validates: Requirements 1.2, 1.3**

### Property 2: Plan Creation Invariants
*For any* valid PlanParams, creating a plan SHALL result in a plan with all specified parameters stored correctly and isActive=true, isPaused=false.
**Validates: Requirements 2.1, 2.4**

### Property 3: Execution Interval Enforcement
*For any* active plan, performUpkeep SHALL only succeed if the time since lastExecutionTime is greater than or equal to the plan's interval.
**Validates: Requirements 4.7**

### Property 4: Owner-Only Modifications
*For any* plan modification operation (pause, resume, stop), the transaction SHALL revert if msg.sender is not the plan owner.
**Validates: Requirements 3.4**

### Property 5: Balance Consistency
*For any* execution, the sum of user's vault balance decrease SHALL equal the amountIn of the swap, and the user SHALL receive amountOut of target token.
**Validates: Requirements 4.4**

### Property 6: Max Executions Limit
*For any* plan with maxExecutions > 0, when totalExecutions reaches maxExecutions, the plan SHALL be automatically deactivated.
**Validates: Requirements 4.6**

### Property 7: Slippage Protection
*For any* swap execution, if the actual output is less than minAmountOut (calculated from oracle price and slippage tolerance), the transaction SHALL revert.
**Validates: Requirements 5.4**

### Property 8: Paused Plan Non-Execution
*For any* paused plan, checkUpkeep SHALL return false and performUpkeep SHALL not execute the swap.
**Validates: Requirements 3.1, 3.2**

## Error Handling

### Custom Errors

```solidity
error InsufficientBalance(address user, address token, uint256 required, uint256 available);
error InvalidAmount(uint256 amount);
error InvalidInterval(uint256 interval);
error PlanNotFound(uint256 planId);
error NotPlanOwner(uint256 planId, address caller);
error PlanNotActive(uint256 planId);
error PlanAlreadyPaused(uint256 planId);
error PlanNotPaused(uint256 planId);
error ExecutionTooEarly(uint256 planId, uint256 nextExecutionTime);
error SlippageExceeded(uint256 expected, uint256 actual);
error StalePriceData(address token, uint256 lastUpdate);
error UnsupportedToken(address token);
error SwapFailed(string reason);
```

### Error Recovery

1. **Execution Failure**: 如果 swap 失败，不扣除用户资金，发出 ExecutionFailed 事件
2. **Price Stale**: 如果价格数据过期，跳过执行，等待下次 checkUpkeep
3. **Insufficient Balance**: 如果用户余额不足，跳过执行，发出警告事件

## Testing Strategy

### Unit Tests

使用 Foundry 进行单元测试：

```solidity
// test/DCAVault.t.sol
contract DCAVaultTest is Test {
    function testDeposit() public { ... }
    function testWithdraw() public { ... }
    function testInsufficientBalance() public { ... }
}

// test/DCAStrategy.t.sol
contract DCAStrategyTest is Test {
    function testCreatePlan() public { ... }
    function testPausePlan() public { ... }
    function testExecutePlan() public { ... }
    function testMaxExecutions() public { ... }
}
```

### Property-Based Tests

使用 Foundry 的 fuzz testing：

```solidity
function testFuzz_DepositWithdraw(uint256 amount) public {
    vm.assume(amount > 0 && amount < type(uint128).max);
    // Property 1: Round trip consistency
}

function testFuzz_IntervalEnforcement(uint256 timeDelta) public {
    // Property 3: Execution interval enforcement
}
```

### Integration Tests

1. 完整的 DCA 执行流程测试
2. Chainlink Automation 模拟测试
3. DEX swap 集成测试

### Testnet Deployment

1. 部署到 Mantle Testnet
2. 注册 Chainlink Automation
3. 端到端测试完整流程
