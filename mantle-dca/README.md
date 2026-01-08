# DripFi-Mantle Smart Contracts

基于 Mantle L2 的自动定投协议智能合约，使用 Chainlink Automation 兼容接口实现自动化执行。

## 项目结构

```
mantle-dca/
├── src/
│   ├── DCAVault.sol        # 资金保管合约
│   ├── DCAStrategy.sol     # DCA策略合约 (Chainlink Automation)
│   ├── SwapHelper.sol      # DEX交换助手
│   ├── PriceOracle.sol     # Chainlink价格预言机
│   └── interfaces/
│       ├── IDCAVault.sol
│       └── IDCAStrategy.sol
├── test/
│   ├── DCAVault.t.sol
│   ├── DCAStrategy.t.sol
│   └── mocks/
│       ├── MockERC20.sol
│       └── MockSwapHelper.sol
├── script/
│   └── Deploy.s.sol
├── foundry.toml
└── remappings.txt
```

## 安装依赖

### 1. 安装 Foundry

Windows (PowerShell):
```powershell
# 从 GitHub Releases 下载预编译二进制文件
# https://github.com/foundry-rs/foundry/releases
```

### 2. 安装合约依赖

```bash
cd mantle-dca
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## 编译合约

```bash
forge build
```

## 运行测试

```bash
# 运行所有测试
forge test

# 运行特定测试文件
forge test --match-path test/DCAVault.t.sol

# 显示详细输出
forge test -vvv
```

## 部署

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入私钥和 RPC URL
# 注意: 私钥需要 0x 前缀
```

### 2. 部署到 Mantle Sepolia Testnet

```bash
forge script script/Deploy.s.sol --rpc-url https://rpc.sepolia.mantle.xyz --broadcast -vvv
```

## 合约地址 (Mantle Sepolia Testnet)

已部署 (2025-01-07):
- PriceOracle: `0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863`
- DCAVault: `0x60b863F96c146f8D33B7dC99040ef93A39C37cA5`
- SwapHelper: `0xb2888D850F6A59fff8d537305DfA51ccEf77c177`
- DCAStrategy: `0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E`

区块浏览器: https://sepolia.mantlescan.xyz/

## 核心功能

### DCAVault
- `deposit(token, amount)` - 存入代币
- `withdraw(token, amount)` - 取出代币
- `getBalance(user, token)` - 查询余额

### DCAStrategy
- `createPlan(params)` - 创建定投计划
- `pausePlan(planId)` - 暂停计划
- `resumePlan(planId)` - 恢复计划
- `stopPlan(planId)` - 停止计划
- `getPlan(planId)` - 查询计划详情
- `getUserPlans(user)` - 查询用户所有计划

### Chainlink Automation
- `checkUpkeep()` - 检查是否需要执行
- `performUpkeep()` - 执行定投

## 支持的执行间隔

- 1 小时
- 4 小时
- 1 天
- 1 周

## 安全特性

- ReentrancyGuard 防重入
- SafeERC20 安全转账
- Pausable 紧急暂停
- Ownable 权限控制
- 滑点保护

## License

MIT
