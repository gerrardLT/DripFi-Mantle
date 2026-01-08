# Requirements Document

## Introduction

DripFi-Mantle 是一个基于 Mantle L2 的去中心化定投（Dollar Cost Averaging）协议。该协议允许用户创建自动化定投计划，定期将稳定币兑换为目标资产（如 WETH、WBTC 或 RWA 代币），利用 Chainlink Automation 实现完全去中心化的自动执行。

本项目是从 Flow 区块链上的 DCA Protocol 迁移而来，针对 Mantle 黑客松进行优化，主攻 DeFi & 可组合性 和 RWA/RealFi 双赛道。

## Glossary

- **DCA_Protocol**: 定投协议的核心智能合约系统
- **DCA_Vault**: 用户资金存储合约，管理用户的定投资金
- **DCA_Strategy**: 定投策略合约，定义执行逻辑
- **Automation_Registry**: Chainlink Automation 注册合约
- **DEX_Router**: 去中心化交易所路由合约（如 Uniswap V3）
- **Plan**: 用户创建的定投计划
- **Execution**: 单次定投执行操作
- **Source_Token**: 源代币（通常是稳定币如 USDT/USDC）
- **Target_Token**: 目标代币（如 WETH、WBTC、RWA 代币）

## Requirements

### Requirement 1: 用户账户管理

**User Story:** As a user, I want to connect my wallet and manage my DCA funds, so that I can participate in automated investing.

#### Acceptance Criteria

1. WHEN a user connects their wallet, THE DCA_Protocol SHALL recognize the user's address and display their account status
2. WHEN a user deposits Source_Token into DCA_Vault, THE DCA_Vault SHALL credit the user's balance and emit a Deposit event
3. WHEN a user withdraws funds from DCA_Vault, THE DCA_Vault SHALL transfer the requested amount and emit a Withdrawal event
4. IF a user attempts to withdraw more than their available balance, THEN THE DCA_Vault SHALL revert the transaction with an insufficient balance error
5. THE DCA_Vault SHALL support multiple Source_Token types (USDT, USDC, DAI)

### Requirement 2: 定投计划创建

**User Story:** As a user, I want to create DCA plans with customizable parameters, so that I can automate my investment strategy.

#### Acceptance Criteria

1. WHEN a user creates a new Plan, THE DCA_Strategy SHALL store the plan with unique planId, owner, sourceToken, targetToken, amountPerExecution, interval, and maxExecutions
2. WHEN a Plan is created, THE DCA_Strategy SHALL validate that amountPerExecution is greater than zero
3. WHEN a Plan is created, THE DCA_Strategy SHALL validate that interval is at least 1 hour (3600 seconds)
4. WHEN a Plan is created, THE DCA_Strategy SHALL emit a PlanCreated event with all plan parameters
5. THE DCA_Strategy SHALL support intervals of: 1 hour, 4 hours, 1 day, 1 week
6. THE DCA_Strategy SHALL allow users to set maxExecutions to 0 for unlimited executions

### Requirement 3: 定投计划管理

**User Story:** As a user, I want to pause, resume, and stop my DCA plans, so that I can control my investment strategy.

#### Acceptance Criteria

1. WHEN a user pauses their Plan, THE DCA_Strategy SHALL set isPaused to true and emit a PlanPaused event
2. WHEN a user resumes their paused Plan, THE DCA_Strategy SHALL set isPaused to false and emit a PlanResumed event
3. WHEN a user stops their Plan, THE DCA_Strategy SHALL set isActive to false and emit a PlanStopped event
4. IF a non-owner attempts to modify a Plan, THEN THE DCA_Strategy SHALL revert with an unauthorized error
5. WHEN a Plan is stopped, THE DCA_Strategy SHALL allow the user to withdraw remaining funds

### Requirement 4: 自动化执行

**User Story:** As a user, I want my DCA plans to execute automatically at scheduled intervals, so that I don't need to manually trigger each swap.

#### Acceptance Criteria

1. THE DCA_Strategy SHALL implement Chainlink AutomationCompatibleInterface
2. WHEN checkUpkeep is called, THE DCA_Strategy SHALL return true if any Plan is ready for execution
3. WHEN performUpkeep is called with valid planId, THE DCA_Strategy SHALL execute the swap and record the execution
4. WHEN a swap is executed, THE DCA_Strategy SHALL withdraw Source_Token from user's vault, swap via DEX_Router, and deposit Target_Token to user's wallet
5. WHEN execution completes, THE DCA_Strategy SHALL emit an ExecutionCompleted event with amountIn, amountOut, and executionNumber
6. IF a Plan has reached maxExecutions, THEN THE DCA_Strategy SHALL automatically deactivate the Plan
7. THE DCA_Strategy SHALL enforce minimum interval between executions

### Requirement 5: DEX 集成

**User Story:** As a user, I want my swaps to be executed through a reliable DEX with best prices, so that I get optimal value for my investments.

#### Acceptance Criteria

1. THE DCA_Strategy SHALL integrate with Uniswap V3 or equivalent DEX on Mantle
2. WHEN executing a swap, THE DCA_Strategy SHALL use the configured slippage tolerance (default 0.5%)
3. WHEN executing a swap, THE DCA_Strategy SHALL check for minimum output amount based on oracle price
4. IF the swap output is below minimum acceptable amount, THEN THE DCA_Strategy SHALL revert with slippage error
5. THE DCA_Strategy SHALL support multiple trading pairs (USDT/WETH, USDC/WBTC, etc.)

### Requirement 6: 价格预言机

**User Story:** As a user, I want accurate price data for my swaps, so that I can trust the execution prices are fair.

#### Acceptance Criteria

1. THE DCA_Strategy SHALL integrate with Chainlink Price Feeds on Mantle
2. WHEN calculating expected output, THE DCA_Strategy SHALL use oracle price with configurable deviation threshold
3. IF oracle price is stale (older than 1 hour), THEN THE DCA_Strategy SHALL skip execution and emit a StalePrice event
4. THE DCA_Strategy SHALL emit price information in execution events for transparency

### Requirement 7: 事件和历史记录

**User Story:** As a user, I want to view my execution history and plan statistics, so that I can track my investment performance.

#### Acceptance Criteria

1. THE DCA_Strategy SHALL emit events for all state changes: PlanCreated, PlanPaused, PlanResumed, PlanStopped, ExecutionCompleted, ExecutionFailed
2. WHEN querying plan details, THE DCA_Strategy SHALL return: planId, owner, sourceToken, targetToken, amountPerExecution, interval, totalExecutions, totalAmountIn, totalAmountOut, isActive, isPaused
3. THE DCA_Strategy SHALL provide a function to get all planIds for a given user address

### Requirement 8: 安全性

**User Story:** As a user, I want my funds to be secure, so that I can trust the protocol with my assets.

#### Acceptance Criteria

1. THE DCA_Vault SHALL use OpenZeppelin's ReentrancyGuard for all external functions
2. THE DCA_Strategy SHALL validate all input parameters before execution
3. THE DCA_Protocol SHALL implement Pausable pattern for emergency stops
4. THE DCA_Protocol SHALL use SafeERC20 for all token transfers
5. IF an execution fails, THEN THE DCA_Strategy SHALL not deduct funds and SHALL emit ExecutionFailed event

### Requirement 9: Gas 优化

**User Story:** As a user, I want the protocol to be gas-efficient, so that I can benefit from Mantle's low fees.

#### Acceptance Criteria

1. THE DCA_Strategy SHALL batch-check multiple plans in single checkUpkeep call
2. THE DCA_Strategy SHALL use efficient storage patterns to minimize gas costs
3. THE DCA_Strategy SHALL support batch execution of multiple plans in single transaction (optional)

### Requirement 10: 前端界面

**User Story:** As a user, I want a user-friendly interface to manage my DCA plans, so that I can easily interact with the protocol.

#### Acceptance Criteria

1. WHEN the frontend loads, THE UI SHALL connect to user's wallet via WalletConnect or MetaMask
2. THE UI SHALL display user's current balance, active plans, and execution history
3. THE UI SHALL provide forms to create new plans with validation
4. THE UI SHALL show real-time status of plan executions
5. THE UI SHALL support Mantle Testnet and Mainnet networks

### Requirement 11: Telegram 通知

**User Story:** As a user, I want to receive notifications when my plans execute, so that I can stay informed about my investments.

#### Acceptance Criteria

1. WHEN a user links their wallet to Telegram, THE Bot SHALL store the mapping
2. WHEN an execution completes, THE Bot SHALL send a notification with execution details
3. THE Bot SHALL provide commands: /wallet, /plans, /history, /help
4. THE Bot SHALL query on-chain data from Mantle network
