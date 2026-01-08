import * as fcl from "@onflow/fcl";

// Contract addresses on Flow Testnet
export const CONTRACTS = {
  DCA_CONTRACT: "0x78acd984694957cf",
  DCA_TRANSACTION_HANDLER: "0x78acd984694957cf",
  MOCK_USD: "0x78acd984694957cf",
  MOCK_BTC: "0x78acd984694957cf",
  SIMPLE_SWAP: "0x78acd984694957cf",
  FLOW_TOKEN: "0x7e60df042a9c0868",
  FUNGIBLE_TOKEN: "0x9a0766d93b6608b7",
  FLOW_TRANSACTION_SCHEDULER: "0x8c5303eaa26202d6",
  FLOW_TRANSACTION_SCHEDULER_UTILS: "0x8c5303eaa26202d6",
} as const;

// Configure FCL for Flow Testnet
fcl.config({
  "app.detail.title": "DCA Protocol",
  "app.detail.icon": "https://placekitten.com/g/200/200",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "0x78acd984694957cf": CONTRACTS.DCA_CONTRACT,
  "0xDCAContract": CONTRACTS.DCA_CONTRACT,
  "0xDCATransactionHandler": CONTRACTS.DCA_TRANSACTION_HANDLER,
  "0xMockUSD": CONTRACTS.MOCK_USD,
  "0xMockBTC": CONTRACTS.MOCK_BTC,
  "0xSimpleSwap": CONTRACTS.SIMPLE_SWAP,
  "0xFlowToken": CONTRACTS.FLOW_TOKEN,
  "0xFungibleToken": CONTRACTS.FUNGIBLE_TOKEN,
  "0xFlowTransactionScheduler": CONTRACTS.FLOW_TRANSACTION_SCHEDULER,
  "0xFlowTransactionSchedulerUtils": CONTRACTS.FLOW_TRANSACTION_SCHEDULER_UTILS,
});

export { fcl };

