import { useState, useEffect } from 'react';
import { fcl, CONTRACTS } from '@/lib/flow-config';
import * as t from '@onflow/types';

// Hook to get current user
export const useFlowUser = () => {
  const [user, setUser] = useState<{ addr?: string; loggedIn?: boolean }>({ loggedIn: false });

  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  return user;
};

// Hook to check if account is setup
export const useAccountSetup = (address?: string) => {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setIsSetup(null);
      return;
    }

    const checkSetup = async () => {
      setLoading(true);
      try {
        const result = await fcl.query({
          cadence: `
            import DCAContract from 0xDCAContract

            access(all) fun main(address: Address): Bool {
              let account = getAccount(address)
              let planManagerCap = account.capabilities
                .get<&DCAContract.PlanManager>(DCAContract.PlanManagerPublicPath)

              return planManagerCap.borrow() != nil
            }
          `,
          args: (arg: any, t: any) => [arg(address, t.Address)],
        });
        setIsSetup(result);
      } catch (error) {
        console.error('Error checking setup:', error);
        setIsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [address]);

  return { isSetup, loading };
};

// Hook to get user's DCA plans
export const useUserPlans = (address?: string) => {
  const [plans, setPlans] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setPlans([]);
      return;
    }

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const result = await fcl.query({
          cadence: `
            import DCAContract from 0xDCAContract

            access(all) fun main(userAddress: Address): [UInt64] {
              let account = getAccount(userAddress)

              let planManagerCap = account.capabilities
                .get<&DCAContract.PlanManager>(DCAContract.PlanManagerPublicPath)

              if let planManager = planManagerCap.borrow() {
                return planManager.getPlanIds()
              }

              return []
            }
          `,
          args: (arg: any, t: any) => [arg(address, t.Address)],
        });
        setPlans(result || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [address]);

  return { plans, loading };
};

// Hook: Get Execution History
export const useExecutionHistory = (address: string | null) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setExecutions([]);
      return;
    }

    const fetchExecutions = async () => {
      setLoading(true);
      try {
        // Get the latest block height first
        const latestBlock = await fcl.send([fcl.getBlock(true)]).then(fcl.decode);
        const latestHeight = latestBlock.height;

        // Flow API allows max 250 blocks per query
        const CHUNK_SIZE = 250;
        const TOTAL_BLOCKS_TO_QUERY = 2500; // Query last 2500 blocks in chunks
        const startHeight = Math.max(0, latestHeight - TOTAL_BLOCKS_TO_QUERY);

        // Query in chunks
        const allEvents: any[] = [];
        let currentStart = startHeight;

        while (currentStart < latestHeight) {
          const currentEnd = Math.min(currentStart + CHUNK_SIZE, latestHeight);

          try {
            const events = await fcl.send([
              fcl.getEventsAtBlockHeightRange(
                'A.78acd984694957cf.DCAContract.PlanExecuted',
                currentStart,
                currentEnd
              )
            ]).then(fcl.decode);

            allEvents.push(...events);
          } catch (chunkError) {
            console.warn(`Error fetching events for blocks ${currentStart}-${currentEnd}:`, chunkError);
          }

          currentStart = currentEnd + 1;
        }

        // Filter events for this user and format them
        const userExecutions = allEvents
          .filter((event: any) => event.data.owner === address)
          .map((event: any) => ({
            planId: event.data.planId,
            owner: event.data.owner,
            amountIn: event.data.amountIn,
            amountOut: event.data.amountOut,
            executionNumber: event.data.executionNumber,
            blockHeight: event.blockHeight,
            transactionId: event.transactionId,
          }))
          .sort((a: any, b: any) => b.blockHeight - a.blockHeight); // Most recent first

        setExecutions(userExecutions);
      } catch (error) {
        console.error('Error fetching execution history:', error);
        setExecutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [address]);

  return { executions, loading };
};

// Hook to get plan details
export const usePlanDetails = (ownerAddress?: string, planId?: number) => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ownerAddress || planId === undefined) {
      setPlan(null);
      return;
    }

    const fetchPlan = async () => {
      setLoading(true);
      try {
        const result = await fcl.query({
          cadence: `
            import DCAContract from 0xDCAContract

            access(all) fun main(ownerAddress: Address, planId: UInt64): DCAContract.PlanDetails? {
              let account = getAccount(ownerAddress)

              let planManagerCap = account.capabilities
                .get<&DCAContract.PlanManager>(DCAContract.PlanManagerPublicPath)

              if let planManager = planManagerCap.borrow() {
                if let plan = planManager.borrowPlan(planId: planId) {
                  return plan.getPlanDetails()
                }
              }

              return nil
            }
          `,
          args: (arg: any, t: any) => [
            arg(ownerAddress, t.Address),
            arg(planId.toString(), t.UInt64),
          ],
        });
        setPlan(result);
      } catch (error) {
        console.error('Error fetching plan details:', error);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [ownerAddress, planId]);

  return { plan, loading };
};

// Hook to get token balances
export const useTokenBalances = (address?: string) => {
  const [balances, setBalances] = useState<{ USD: string; BTC: string }>({ USD: '0', BTC: '0' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setBalances({ USD: '0', BTC: '0' });
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const result = await fcl.query({
          cadence: `
            import FungibleToken from 0xFungibleToken
            import MockUSD from 0xMockUSD
            import MockBTC from 0xMockBTC

            access(all) fun main(address: Address): {String: UFix64} {
              let account = getAccount(address)
              let balances: {String: UFix64} = {}

              // Get USD balance
              let usdVaultCap = account.capabilities
                .get<&{FungibleToken.Balance}>(MockUSD.VaultPublicPath)
              if let usdVault = usdVaultCap.borrow() {
                balances["USD"] = usdVault.balance
              }

              // Get BTC balance
              let btcVaultCap = account.capabilities
                .get<&{FungibleToken.Balance}>(MockBTC.VaultPublicPath)
              if let btcVault = btcVaultCap.borrow() {
                balances["BTC"] = btcVault.balance
              }

              return balances
            }
          `,
          args: (arg: any, t: any) => [arg(address, t.Address)],
        });
        setBalances(result || { USD: '0', BTC: '0' });
      } catch (error) {
        console.error('Error fetching balances:', error);
        setBalances({ USD: '0', BTC: '0' });
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address]);

  return { balances, loading };
};

// Transaction: Create DCA Plan
export const createDCAPlan = async (
  amountPerExecution: string,
  timeCycle: string,
  totalAmount: string
) => {
  // Ensure UFix64 format (must have decimal point)
  const formatUFix64 = (value: string) => {
    const num = parseFloat(value);
    return num.toFixed(1); // At least one decimal place
  };

  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract
      import MockUSD from 0xMockUSD
      import FungibleToken from 0xFungibleToken

      transaction(amountPerExecution: UFix64, timeCycle: UFix64, totalAmount: UFix64) {
        prepare(signer: auth(Storage, Capabilities, BorrowValue) &Account) {
          // Borrow PlanManager
          let planManager = signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) ?? panic("Could not borrow PlanManager")

          // Withdraw USD tokens
          let usdVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &MockUSD.Vault>(
            from: MockUSD.VaultStoragePath
          ) ?? panic("Could not borrow USD vault")

          let initialDeposit <- usdVault.withdraw(amount: totalAmount)

          // Create plan
          planManager.createPlan(
            amountPerExecution: amountPerExecution,
            timeCycle: timeCycle,
            initialDeposit: <-initialDeposit
          )
        }
      }
    `,
    args: (arg: any, t: any) => [
      arg(formatUFix64(amountPerExecution), t.UFix64),
      arg(timeCycle, t.UFix64), // Already formatted in CreatePlanModal
      arg(formatUFix64(totalAmount), t.UFix64),
    ],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Pause Plan
export const pausePlan = async (planId: number) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract

      transaction(planId: UInt64) {
        prepare(signer: auth(Storage, BorrowValue) &Account) {
          let planManager = signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) ?? panic("Could not borrow PlanManager")

          let plan = planManager.borrowPlan(planId: planId)
            ?? panic("Plan not found")

          plan.pause()
        }
      }
    `,
    args: (arg: any, t: any) => [arg(planId.toString(), t.UInt64)],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Resume Plan
export const resumePlan = async (planId: number) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract

      transaction(planId: UInt64) {
        prepare(signer: auth(Storage, BorrowValue) &Account) {
          let planManager = signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) ?? panic("Could not borrow PlanManager")

          let plan = planManager.borrowPlan(planId: planId)
            ?? panic("Plan not found")

          plan.resume()
        }
      }
    `,
    args: (arg: any, t: any) => [arg(planId.toString(), t.UInt64)],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Stop Plan
export const stopPlan = async (planId: number) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract

      transaction(planId: UInt64) {
        prepare(signer: auth(Storage, BorrowValue) &Account) {
          let planManager = signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) ?? panic("Could not borrow PlanManager")

          let plan = planManager.borrowPlan(planId: planId)
            ?? panic("Plan not found")

          plan.stop()
        }
      }
    `,
    args: (arg: any, t: any) => [arg(planId.toString(), t.UInt64)],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Schedule Execution
export const scheduleExecution = async (
  planId: number,
  delaySeconds: number,
  priority: number = 1,
  executionEffort: number = 1000
) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract
      import DCATransactionHandler from 0xDCATransactionHandler
      import FlowTransactionScheduler from 0xFlowTransactionScheduler
      import FlowTransactionSchedulerUtils from 0xFlowTransactionSchedulerUtils
      import FlowToken from 0xFlowToken
      import FungibleToken from 0xFungibleToken

      transaction(
        planId: UInt64,
        delaySeconds: UFix64,
        priority: UInt8,
        executionEffort: UInt64
      ) {
        prepare(signer: auth(Storage, Capabilities, BorrowValue) &Account) {
          // Calculate execution timestamp
          let future = getCurrentBlock().timestamp + delaySeconds
          let pr = FlowTransactionScheduler.Priority(rawValue: priority)
            ?? FlowTransactionScheduler.Priority.Medium
          
          // Create execution data
          let executionData = DCATransactionHandler.ExecutionData(
            planOwner: signer.address,
            planId: planId,
            slippageTolerance: 0.05
          )
          
          // Estimate fees
          let estimate = FlowTransactionScheduler.estimate(
            data: executionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort
          )
          
          // Get entitled handler capability
          var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil
          
          let controllers = signer.capabilities.storage
            .getControllers(forPath: DCATransactionHandler.HandlerStoragePath)
          
          for controller in controllers {
            if let cap = controller.capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
              handlerCap = cap
              break
            }
          }
          
          // Withdraw fees
          let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")
          let fees <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.0) as! @FlowToken.Vault
          
          // Borrow Manager
          let manager = signer.storage
            .borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(
              from: FlowTransactionSchedulerUtils.managerStoragePath
            )
            ?? panic("Could not borrow Manager")
          
          // Schedule the execution
          manager.schedule(
            handlerCap: handlerCap!,
            data: executionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort,
            fees: <-fees
          )
        }
      }
    `,
    args: (arg: any, t: any) => [
      arg(planId.toString(), t.UInt64),
      arg(delaySeconds.toFixed(1), t.UFix64),
      arg(priority.toString(), t.UInt8),
      arg(executionEffort.toString(), t.UInt64),
    ],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Schedule Multiple Executions
export const scheduleMultipleExecutions = async (
  planId: number,
  numberOfExecutions: number,
  intervalSeconds: number,
  priority: number = 1,
  executionEffort: number = 1000
) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract
      import DCATransactionHandler from 0xDCATransactionHandler
      import FlowTransactionScheduler from 0xFlowTransactionScheduler
      import FlowTransactionSchedulerUtils from 0xFlowTransactionSchedulerUtils
      import FlowToken from 0xFlowToken
      import FungibleToken from 0xFungibleToken

      transaction(
        planId: UInt64,
        numberOfExecutions: Int,
        intervalSeconds: UFix64,
        priority: UInt8,
        executionEffort: UInt64
      ) {
        prepare(signer: auth(Storage, Capabilities, BorrowValue) &Account) {

          let planManager = signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) ?? panic("Could not borrow PlanManager")

          let plan = planManager.borrowPlan(planId: planId)
            ?? panic("Plan not found")

          if !plan.isActive {
            panic("Plan is not active")
          }

          let pr = FlowTransactionScheduler.Priority(rawValue: priority)
            ?? FlowTransactionScheduler.Priority.Medium

          let executionData = DCATransactionHandler.ExecutionData(
            planOwner: signer.address,
            planId: planId,
            slippageTolerance: 0.05
          )

          if !signer.storage.check<@DCATransactionHandler.Handler>(
            from: DCATransactionHandler.HandlerStoragePath
          ) {
            panic("Handler not found. Run Setup Scheduler first.")
          }

          var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil

          let controllers = signer.capabilities.storage
            .getControllers(forPath: DCATransactionHandler.HandlerStoragePath)

          for controller in controllers {
            if let cap = controller.capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
              handlerCap = cap
              break
            }
          }

          if handlerCap == nil {
            panic("Could not find entitled handler capability")
          }

          let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")

          let manager = signer.storage
            .borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(
              from: FlowTransactionSchedulerUtils.managerStoragePath
            )
            ?? panic("Could not borrow Manager")

          var i = 0

          while i < numberOfExecutions {
            let delaySeconds = intervalSeconds * UFix64(i + 1)
            let executionTime = getCurrentBlock().timestamp + delaySeconds

            let estimate = FlowTransactionScheduler.estimate(
              data: executionData,
              timestamp: executionTime,
              priority: pr,
              executionEffort: executionEffort
            )

            if estimate.timestamp == nil && pr != FlowTransactionScheduler.Priority.Low {
              panic("Failed to estimate fees")
            }

            let fee = estimate.flowFee ?? 0.0
            let fees <- vaultRef.withdraw(amount: fee) as! @FlowToken.Vault

            manager.schedule(
              handlerCap: handlerCap!,
              data: executionData,
              timestamp: executionTime,
              priority: pr,
              executionEffort: executionEffort,
              fees: <-fees
            )

            i = i + 1
          }
        }
      }
    `,
    args: (arg: any, t: any) => [
      arg(planId.toString(), t.UInt64),
      arg(numberOfExecutions, t.Int),
      arg(intervalSeconds.toFixed(1), t.UFix64),
      arg(priority, t.UInt8),
      arg(executionEffort.toString(), t.UInt64),
    ],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Setup Account
export const setupAccount = async () => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCAContract from 0xDCAContract

      transaction {
        prepare(signer: auth(Storage, Capabilities) &Account) {
          // Check if PlanManager already exists
          if signer.storage.borrow<&DCAContract.PlanManager>(
            from: DCAContract.PlanManagerStoragePath
          ) != nil {
            log("PlanManager already exists")
            return
          }

          // Create and save PlanManager
          let manager <- DCAContract.createPlanManager()
          signer.storage.save(<-manager, to: DCAContract.PlanManagerStoragePath)

          // Create and publish public capability
          let cap = signer.capabilities.storage.issue<&DCAContract.PlanManager>(
            DCAContract.PlanManagerStoragePath
          )
          signer.capabilities.publish(cap, at: DCAContract.PlanManagerPublicPath)

          log("Account setup complete!")
        }
      }
    `,
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Setup DCA Handler for Scheduling
export const setupDCAHandler = async () => {
  const transactionId = await fcl.mutate({
    cadence: `
      import DCATransactionHandler from 0xDCATransactionHandler
      import FlowTransactionScheduler from 0xFlowTransactionScheduler
      import FlowTransactionSchedulerUtils from 0xFlowTransactionSchedulerUtils

      transaction() {
        prepare(signer: auth(Storage, Capabilities) &Account) {

          // Setup DCA transaction handler
          if signer.storage.check<@DCATransactionHandler.Handler>(
            from: DCATransactionHandler.HandlerStoragePath
          ) {
            // Unpublish old capability
            signer.capabilities.unpublish(DCATransactionHandler.HandlerPublicPath)

            // Remove existing handler
            let oldHandler <- signer.storage.load<@DCATransactionHandler.Handler>(
              from: DCATransactionHandler.HandlerStoragePath
            )
            destroy oldHandler
            log("Removed existing handler")
          }

          // Create and save new handler
          let handler <- DCATransactionHandler.createHandler()
          signer.storage.save(<-handler, to: DCATransactionHandler.HandlerStoragePath)

          // Issue entitled capability for FlowTransactionScheduler
          let entitledCap = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(
              DCATransactionHandler.HandlerStoragePath
            )

          // Also issue and publish a non-entitled public capability
          let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(DCATransactionHandler.HandlerStoragePath)
          signer.capabilities.publish(publicCap, at: DCATransactionHandler.HandlerPublicPath)

          log("DCA Transaction Handler setup complete")

          // Setup Manager if not already set up
          if !signer.storage.check<@{FlowTransactionSchedulerUtils.Manager}>(
            from: FlowTransactionSchedulerUtils.managerStoragePath
          ) {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)

            let managerCap = signer.capabilities.storage
              .issue<&{FlowTransactionSchedulerUtils.Manager}>(FlowTransactionSchedulerUtils.managerStoragePath)
            signer.capabilities.publish(managerCap, at: FlowTransactionSchedulerUtils.managerPublicPath)

            log("Manager setup complete")
          } else {
            log("Manager already exists")
          }
        }
      }
    `,
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

// Transaction: Mint Test Tokens
export const mintTestTokens = async (usdAmount: string = "1000.0", btcAmount: string = "0.0") => {
  const transactionId = await fcl.mutate({
    cadence: `
      import FungibleToken from 0xFungibleToken
      import MockUSD from 0xMockUSD
      import MockBTC from 0xMockBTC

      transaction(initialUSD: UFix64, initialBTC: UFix64) {
        prepare(signer: auth(Storage, Capabilities) &Account) {
          // Setup MockUSD vault if needed
          if signer.storage.borrow<&MockUSD.Vault>(from: MockUSD.VaultStoragePath) == nil {
            let usdVault <- MockUSD.createEmptyVault(vaultType: Type<@MockUSD.Vault>())
            signer.storage.save(<-usdVault, to: MockUSD.VaultStoragePath)

            let usdCap = signer.capabilities.storage.issue<&MockUSD.Vault>(MockUSD.VaultStoragePath)
            signer.capabilities.publish(usdCap, at: MockUSD.VaultPublicPath)
          }

          // Setup MockBTC vault if needed
          if signer.storage.borrow<&MockBTC.Vault>(from: MockBTC.VaultStoragePath) == nil {
            let btcVault <- MockBTC.createEmptyVault(vaultType: Type<@MockBTC.Vault>())
            signer.storage.save(<-btcVault, to: MockBTC.VaultStoragePath)

            let btcCap = signer.capabilities.storage.issue<&MockBTC.Vault>(MockBTC.VaultStoragePath)
            signer.capabilities.publish(btcCap, at: MockBTC.VaultPublicPath)
          }

          // Mint USD
          if initialUSD > 0.0 {
            let mintedUSD <- MockUSD.mintTokens(amount: initialUSD)
            let usdVault = signer.storage.borrow<&MockUSD.Vault>(from: MockUSD.VaultStoragePath)!
            usdVault.deposit(from: <-mintedUSD)
          }

          // Mint BTC
          if initialBTC > 0.0 {
            let mintedBTC <- MockBTC.mintTokens(amount: initialBTC)
            let btcVault = signer.storage.borrow<&MockBTC.Vault>(from: MockBTC.VaultStoragePath)!
            btcVault.deposit(from: <-mintedBTC)
          }
        }
      }
    `,
    args: (arg: any, t: any) => [
      arg(usdAmount, t.UFix64),
      arg(btcAmount, t.UFix64),
    ],
    limit: 9999,
  });

  return fcl.tx(transactionId).onceSealed();
};

