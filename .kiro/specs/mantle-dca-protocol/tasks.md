# Implementation Plan: DripFi-Mantle Protocol

## Overview

将 Flow DCA Protocol 迁移到 Mantle L2，使用 Solidity 重写智能合约，集成 Chainlink Automation 实现自动化执行，并适配前端和 Telegram Bot。

## Tasks

- [x] 1. 项目初始化和基础设施搭建
  - [x] 1.1 创建 Foundry 项目结构
    - 初始化 `mantle-dca` 目录
    - 配置 `foundry.toml` 支持 Mantle 网络
    - 安装 OpenZeppelin 和 Chainlink 依赖
    - _Requirements: 8.1, 8.4_
  - [x] 1.2 配置 Mantle 网络
    - 添加 Mantle Testnet RPC 配置
    - 配置部署脚本
    - 设置环境变量模板
    - _Requirements: 10.5_

- [x] 2. 核心智能合约开发
  - [x] 2.1 实现 DCAVault.sol
    - 实现 deposit/withdraw 功能
    - 实现多代币支持
    - 添加 ReentrancyGuard 和 SafeERC20
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 8.1, 8.4_
  - [x]* 2.2 编写 DCAVault 单元测试
    - 测试存款/取款功能
    - 测试余额不足场景
    - **Property 1: Deposit-Withdraw Round Trip**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 2.3 实现 DCAStrategy.sol 基础功能
    - 实现 Plan 结构体和存储
    - 实现 createPlan 功能
    - 实现 pausePlan/resumePlan/stopPlan
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - [x]* 2.4 编写 Plan 管理单元测试
    - 测试计划创建
    - 测试暂停/恢复/停止
    - **Property 2: Plan Creation Invariants**
    - **Property 4: Owner-Only Modifications**
    - **Validates: Requirements 2.1, 2.4, 3.4**

- [x] 3. Checkpoint - 核心合约完成
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. Chainlink Automation 集成
  - [x] 4.1 实现 AutomationCompatible 接口
    - 实现 checkUpkeep 函数
    - 实现 performUpkeep 函数
    - 添加执行间隔检查逻辑
    - _Requirements: 4.1, 4.2, 4.3, 4.7_
  - [x]* 4.2 编写 Automation 单元测试
    - 测试 checkUpkeep 返回值
    - 测试 performUpkeep 执行
    - **Property 3: Execution Interval Enforcement**
    - **Property 8: Paused Plan Non-Execution**
    - **Validates: Requirements 4.7, 3.1**

- [x] 5. DEX 和预言机集成
  - [x] 5.1 实现 SwapHelper.sol
    - 集成 Uniswap V3 Router
    - 实现 swap 和 getQuote 功能
    - 添加滑点保护
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 5.2 实现 PriceOracle.sol
    - 集成 Chainlink Price Feeds
    - 实现价格查询和过期检查
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 5.3 编写 Swap 集成测试
    - 测试 swap 功能
    - 测试滑点保护
    - **Property 7: Slippage Protection**
    - **Validates: Requirements 5.4**

- [x] 6. 完整执行流程实现
  - [x] 6.1 实现完整的 DCA 执行逻辑
    - 连接 Vault、Strategy、SwapHelper
    - 实现资金转移和 swap 执行
    - 实现执行记录和事件发出
    - 添加 swap 失败时的资金退回机制
    - _Requirements: 4.4, 4.5, 4.6, 7.1_
  - [x]* 6.2 编写执行流程集成测试 (2025-01-07)
    - 测试完整执行流程
    - 测试 maxExecutions 限制
    - 测试 swap 失败时的资金退回
    - **Property 5: Balance Consistency**
    - **Property 6: Max Executions Limit**
    - **Validates: Requirements 4.4, 4.6**

- [x] 7. Checkpoint - 智能合约完成
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. 部署脚本和配置
  - [x] 8.1 编写部署脚本
    - 创建 Deploy.s.sol
    - 配置合约初始化参数
    - 添加验证脚本
    - _Requirements: 10.5_
  - [x] 8.2 部署到 Mantle Testnet (2025-01-07)
    - ✅ 部署所有合约
    - 合约地址:
      - PriceOracle: 0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863
      - DCAVault: 0x60b863F96c146f8D33B7dC99040ef93A39C37cA5
      - SwapHelper: 0xb2888D850F6A59fff8d537305DfA51ccEf77c177
      - DCAStrategy: 0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E
    - Gas 消耗: 0.2537 MNT
    - _Requirements: 10.5_

- [x] 9. 前端迁移
  - [x] 9.1 更新区块链配置
    - 替换 FCL 为 ethers.js/viem
    - 配置 Mantle 网络参数
    - 更新合约地址和 ABI
    - _Requirements: 10.1, 10.5_
  - [x] 9.2 更新钱包连接
    - 集成 WalletConnect
    - 支持 MetaMask
    - 添加网络切换功能
    - _Requirements: 10.1_
  - [x] 9.3 更新合约交互 hooks
    - 重写 useFlow.ts 为 useMantle.ts
    - 更新所有合约调用
    - 添加事件监听
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 10. Checkpoint - 前端完成
  - 确保前端可以正常连接和交互，如有问题请询问用户

- [x] 11. Telegram Bot 迁移
  - [x] 11.1 更新 Bot 配置
    - 更新 RPC 为 Mantle
    - 更新合约地址和 ABI
    - 测试链上查询
    - _Requirements: 11.4_
  - [x] 11.2 更新事件监听
    - 监听 Mantle 网络事件
    - 更新通知格式
    - _Requirements: 11.2_

- [x] 12. Chainlink Automation 注册
  - [x] 12.1 注册 Upkeep
    - 在 Chainlink Automation 注册合约
    - 配置 gas limit 和资金
    - 测试自动执行
    - _Requirements: 4.1_

- [x] 13. 最终测试和文档
  - [x] 13.1 端到端测试
    - 测试完整用户流程
    - 测试自动执行
    - 测试 Telegram 通知
  - [x] 13.2 编写文档
    - 更新 README
    - 编写部署指南
    - 录制演示视频

- [x] 14. Final Checkpoint
  - 确保所有功能正常，准备提交黑客松

## Notes

- Tasks marked with `*` are optional property-based tests
- 智能合约使用 Foundry 开发和测试
- 前端复用现有 React 代码，只替换区块链交互层
- Telegram Bot 复用 90% 代码，只更新网络配置
- 预计总工作量：5-6 周
