// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DCAStrategy.sol";
import "../src/DCAVault.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockSwapHelper.sol";

/**
 * @title DCAStrategyTest
 * @notice Unit tests for DCAStrategy contract
 * @dev Property 2: Plan Creation Invariants
 *      Property 3: Execution Interval Enforcement
 *      Property 4: Owner-Only Modifications
 *      Property 8: Paused Plan Non-Execution
 *      Validates: Requirements 2.1, 2.4, 3.4, 4.7, 3.1
 */
contract DCAStrategyTest is Test {
    DCAStrategy public strategy;
    DCAVault public vault;
    MockERC20 public usdt;
    MockERC20 public weth;
    MockSwapHelper public swapHelper;
    
    address public owner;
    address public user1;
    address public user2;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e18;
    uint256 constant AMOUNT_PER_EXECUTION = 100 * 1e18;
    
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
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Deploy vault
        vault = new DCAVault();
        
        // Deploy strategy
        strategy = new DCAStrategy(address(vault));
        
        // Deploy mock tokens
        usdt = new MockERC20("Tether USD", "USDT", 18);
        weth = new MockERC20("Wrapped ETH", "WETH", 18);
        
        // Deploy mock swap helper
        swapHelper = new MockSwapHelper();
        
        // Setup vault
        vault.setSupportedToken(address(usdt), true);
        vault.setStrategy(address(strategy));
        
        // Setup strategy
        strategy.setSwapHelper(address(swapHelper));
        strategy.setSupportedPair(address(usdt), address(weth), true);
        
        // Setup exchange rate: 1 USDT = 0.0005 WETH (2000 USDT per WETH)
        swapHelper.setExchangeRate(address(usdt), address(weth), 0.0005 * 1e18);
        
        // Mint tokens to users
        usdt.mint(user1, INITIAL_BALANCE);
        usdt.mint(user2, INITIAL_BALANCE);
        
        // Approve and deposit to vault
        vm.startPrank(user1);
        usdt.approve(address(vault), type(uint256).max);
        vault.deposit(address(usdt), INITIAL_BALANCE);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdt.approve(address(vault), type(uint256).max);
        vault.deposit(address(usdt), INITIAL_BALANCE);
        vm.stopPrank();
    }
    
    // ============ Plan Creation Tests ============
    
    function test_CreatePlan_Success() public {
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 10
        });
        
        vm.expectEmit(true, true, false, true);
        emit PlanCreated(1, user1, address(usdt), address(weth), AMOUNT_PER_EXECUTION, 1 hours, 10);
        
        vm.prank(user1);
        uint256 planId = strategy.createPlan(params);
        
        assertEq(planId, 1);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertEq(plan.owner, user1);
        assertEq(plan.sourceToken, address(usdt));
        assertEq(plan.targetToken, address(weth));
        assertEq(plan.amountPerExecution, AMOUNT_PER_EXECUTION);
        assertEq(plan.interval, 1 hours);
        assertEq(plan.maxExecutions, 10);
        assertEq(plan.totalExecutions, 0);
        assertTrue(plan.isActive);
        assertFalse(plan.isPaused);
    }
    
    function test_CreatePlan_MultipleIntervals() public {
        uint256[] memory intervals = new uint256[](4);
        intervals[0] = 1 hours;
        intervals[1] = 4 hours;
        intervals[2] = 1 days;
        intervals[3] = 7 days;
        
        for (uint256 i = 0; i < intervals.length; i++) {
            IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
                sourceToken: address(usdt),
                targetToken: address(weth),
                amountPerExecution: AMOUNT_PER_EXECUTION,
                interval: intervals[i],
                maxExecutions: 0
            });
            
            vm.prank(user1);
            uint256 planId = strategy.createPlan(params);
            
            IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
            assertEq(plan.interval, intervals[i]);
        }
    }
    
    function test_CreatePlan_RevertOnZeroAmount() public {
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: 0,
            interval: 1 hours,
            maxExecutions: 10
        });
        
        vm.prank(user1);
        vm.expectRevert(IDCAStrategy.InvalidAmount.selector);
        strategy.createPlan(params);
    }
    
    function test_CreatePlan_RevertOnInvalidInterval() public {
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 30 minutes, // Invalid - less than MIN_INTERVAL
            maxExecutions: 10
        });
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.InvalidInterval.selector, 30 minutes));
        strategy.createPlan(params);
    }
    
    function test_CreatePlan_RevertOnUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS", 18);
        
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(unsupportedToken),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 10
        });
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.UnsupportedToken.selector, address(unsupportedToken)));
        strategy.createPlan(params);
    }
    
    function test_CreatePlan_RevertOnUnsupportedPair() public {
        MockERC20 btc = new MockERC20("Bitcoin", "BTC", 18);
        
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(btc), // Not a supported pair
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 10
        });
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.UnsupportedPair.selector, address(usdt), address(btc)));
        strategy.createPlan(params);
    }
    
    // ============ Property 2: Plan Creation Invariants ============
    
    function testFuzz_PlanCreationInvariants(uint256 amount, uint8 intervalIndex) public {
        // Bound inputs
        amount = bound(amount, 1, INITIAL_BALANCE);
        intervalIndex = uint8(bound(intervalIndex, 0, 3));
        
        uint256[] memory validIntervals = new uint256[](4);
        validIntervals[0] = 1 hours;
        validIntervals[1] = 4 hours;
        validIntervals[2] = 1 days;
        validIntervals[3] = 7 days;
        
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: amount,
            interval: validIntervals[intervalIndex],
            maxExecutions: 0
        });
        
        vm.prank(user1);
        uint256 planId = strategy.createPlan(params);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        // Invariants
        assertEq(plan.owner, user1, "Owner should be creator");
        assertEq(plan.totalExecutions, 0, "Initial executions should be 0");
        assertEq(plan.totalAmountIn, 0, "Initial amountIn should be 0");
        assertEq(plan.totalAmountOut, 0, "Initial amountOut should be 0");
        assertTrue(plan.isActive, "Plan should be active");
        assertFalse(plan.isPaused, "Plan should not be paused");
        assertGt(plan.createdAt, 0, "CreatedAt should be set");
    }
    
    // ============ Plan Pause/Resume/Stop Tests ============
    
    function test_PausePlan_Success() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.expectEmit(true, true, false, false);
        emit PlanPaused(planId, user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertTrue(plan.isPaused);
        assertTrue(plan.isActive);
    }
    
    function test_ResumePlan_Success() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        vm.expectEmit(true, true, false, false);
        emit PlanResumed(planId, user1);
        
        vm.prank(user1);
        strategy.resumePlan(planId);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertFalse(plan.isPaused);
    }
    
    function test_StopPlan_Success() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.expectEmit(true, true, false, false);
        emit PlanStopped(planId, user1);
        
        vm.prank(user1);
        strategy.stopPlan(planId);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertFalse(plan.isActive);
    }
    
    // ============ Property 4: Owner-Only Modifications ============
    
    function test_PausePlan_RevertOnNonOwner() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.NotPlanOwner.selector, planId, user2));
        strategy.pausePlan(planId);
    }
    
    function test_ResumePlan_RevertOnNonOwner() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.NotPlanOwner.selector, planId, user2));
        strategy.resumePlan(planId);
    }
    
    function test_StopPlan_RevertOnNonOwner() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.NotPlanOwner.selector, planId, user2));
        strategy.stopPlan(planId);
    }
    
    function test_PausePlan_RevertOnAlreadyPaused() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.PlanAlreadyPaused.selector, planId));
        strategy.pausePlan(planId);
    }
    
    function test_ResumePlan_RevertOnNotPaused() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.PlanNotPaused.selector, planId));
        strategy.resumePlan(planId);
    }
    
    function test_StopPlan_RevertOnAlreadyStopped() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.stopPlan(planId);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAStrategy.PlanNotActive.selector, planId));
        strategy.stopPlan(planId);
    }
    
    // ============ canExecute Tests ============
    
    function test_CanExecute_ReturnsTrueForNewPlan() public {
        uint256 planId = _createDefaultPlan(user1);
        assertTrue(strategy.canExecute(planId));
    }
    
    function test_CanExecute_ReturnsFalseForPausedPlan() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        assertFalse(strategy.canExecute(planId));
    }
    
    function test_CanExecute_ReturnsFalseForStoppedPlan() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.stopPlan(planId);
        
        assertFalse(strategy.canExecute(planId));
    }
    
    function test_CanExecute_ReturnsFalseForInsufficientBalance() public {
        // Withdraw all funds
        vm.prank(user1);
        vault.withdraw(address(usdt), INITIAL_BALANCE);
        
        uint256 planId = _createDefaultPlan(user1);
        assertFalse(strategy.canExecute(planId));
    }
    
    // ============ Property 3: Execution Interval Enforcement ============
    
    function test_CanExecute_RespectsInterval() public {
        uint256 planId = _createDefaultPlan(user1);
        
        // First execution should be allowed
        assertTrue(strategy.canExecute(planId));
        
        // Simulate execution by calling performUpkeep
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        // Immediately after, should not be executable
        assertFalse(strategy.canExecute(planId));
        
        // After interval passes, should be executable again
        vm.warp(block.timestamp + 1 hours + 1);
        assertTrue(strategy.canExecute(planId));
    }
    
    // ============ Property 8: Paused Plan Non-Execution ============
    
    function test_PerformUpkeep_SkipsPausedPlans() public {
        uint256 planId = _createDefaultPlan(user1);
        
        vm.prank(user1);
        strategy.pausePlan(planId);
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        
        // Should not revert, just skip
        strategy.performUpkeep(abi.encode(planIds));
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertEq(plan.totalExecutions, 0, "Paused plan should not execute");
    }
    
    // ============ checkUpkeep Tests ============
    
    function test_CheckUpkeep_ReturnsPlansToExecute() public {
        uint256 planId1 = _createDefaultPlan(user1);
        uint256 planId2 = _createDefaultPlan(user2);
        
        (bool upkeepNeeded, bytes memory performData) = strategy.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        
        uint256[] memory planIds = abi.decode(performData, (uint256[]));
        assertEq(planIds.length, 2);
        assertEq(planIds[0], planId1);
        assertEq(planIds[1], planId2);
    }
    
    function test_CheckUpkeep_ExcludesPausedPlans() public {
        uint256 planId1 = _createDefaultPlan(user1);
        _createDefaultPlan(user2);
        
        vm.prank(user1);
        strategy.pausePlan(planId1);
        
        (bool upkeepNeeded, bytes memory performData) = strategy.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        
        uint256[] memory planIds = abi.decode(performData, (uint256[]));
        assertEq(planIds.length, 1);
        assertEq(planIds[0], 2); // Only user2's plan
    }
    
    function test_CheckUpkeep_ReturnsFalseWhenNoPlansReady() public {
        uint256 planId = _createDefaultPlan(user1);
        
        // Execute the plan
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        // Check upkeep immediately after
        (bool upkeepNeeded, ) = strategy.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }
    
    // ============ getUserPlans Tests ============
    
    function test_GetUserPlans_ReturnsAllUserPlans() public {
        vm.startPrank(user1);
        
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 0
        });
        
        strategy.createPlan(params);
        strategy.createPlan(params);
        strategy.createPlan(params);
        
        vm.stopPrank();
        
        uint256[] memory userPlans = strategy.getUserPlans(user1);
        assertEq(userPlans.length, 3);
        assertEq(userPlans[0], 1);
        assertEq(userPlans[1], 2);
        assertEq(userPlans[2], 3);
    }
    
    // ============ getNextExecutionTime Tests ============
    
    function test_GetNextExecutionTime_ReturnsCreatedAtForNewPlan() public {
        uint256 planId = _createDefaultPlan(user1);
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        uint256 nextExecution = strategy.getNextExecutionTime(planId);
        
        assertEq(nextExecution, plan.createdAt);
    }
    
    function test_GetNextExecutionTime_ReturnsCorrectTimeAfterExecution() public {
        uint256 planId = _createDefaultPlan(user1);
        
        // Execute
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        uint256 nextExecution = strategy.getNextExecutionTime(planId);
        assertEq(nextExecution, block.timestamp + 1 hours);
    }
    
    // ============ Admin Tests ============
    
    function test_SetSwapHelper_Success() public {
        address newSwapHelper = makeAddr("newSwapHelper");
        strategy.setSwapHelper(newSwapHelper);
        assertEq(strategy.swapHelper(), newSwapHelper);
    }
    
    function test_SetSwapHelper_RevertOnZeroAddress() public {
        vm.expectRevert("Invalid address");
        strategy.setSwapHelper(address(0));
    }
    
    function test_SetSupportedPair_Success() public {
        MockERC20 btc = new MockERC20("Bitcoin", "BTC", 18);
        
        strategy.setSupportedPair(address(usdt), address(btc), true);
        assertTrue(strategy.supportedPairs(address(usdt), address(btc)));
        
        strategy.setSupportedPair(address(usdt), address(btc), false);
        assertFalse(strategy.supportedPairs(address(usdt), address(btc)));
    }
    
    function test_Pause_BlocksPlanCreation() public {
        strategy.pause();
        
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 10
        });
        
        vm.prank(user1);
        vm.expectRevert();
        strategy.createPlan(params);
    }
    
    function test_Pause_BlocksPerformUpkeep() public {
        uint256 planId = _createDefaultPlan(user1);
        
        strategy.pause();
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        
        vm.expectRevert();
        strategy.performUpkeep(abi.encode(planIds));
    }
    
    // ============ Helper Functions ============
    
    function _createDefaultPlan(address user) internal returns (uint256) {
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: AMOUNT_PER_EXECUTION,
            interval: 1 hours,
            maxExecutions: 0
        });
        
        vm.prank(user);
        return strategy.createPlan(params);
    }
}


// ============ Task 6.2: Integration Tests for Complete Execution Flow ============
// Property 5: Balance Consistency
// Property 6: Max Executions Limit
// Validates: Requirements 4.4, 4.6

contract DCAStrategyIntegrationTest is Test {
    DCAStrategy public strategy;
    DCAVault public vault;
    MockERC20 public usdt;
    MockERC20 public weth;
    MockSwapHelper public swapHelper;
    
    address public owner;
    address public user1;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e18;
    uint256 constant AMOUNT_PER_EXECUTION = 100 * 1e18;
    
    event ExecutionCompleted(
        uint256 indexed planId,
        address indexed owner,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionNumber,
        uint256 price
    );
    event PlanStopped(uint256 indexed planId, address indexed owner);
    event ExecutionFailed(uint256 indexed planId, address indexed owner, string reason);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        
        // Deploy vault
        vault = new DCAVault();
        
        // Deploy strategy
        strategy = new DCAStrategy(address(vault));
        
        // Deploy mock tokens
        usdt = new MockERC20("Tether USD", "USDT", 18);
        weth = new MockERC20("Wrapped ETH", "WETH", 18);
        
        // Deploy mock swap helper
        swapHelper = new MockSwapHelper();
        
        // Setup vault
        vault.setSupportedToken(address(usdt), true);
        vault.setStrategy(address(strategy));
        
        // Setup strategy
        strategy.setSwapHelper(address(swapHelper));
        strategy.setSupportedPair(address(usdt), address(weth), true);
        
        // Setup exchange rate: 1 USDT = 0.0005 WETH (2000 USDT per WETH)
        swapHelper.setExchangeRate(address(usdt), address(weth), 0.0005 * 1e18);
        
        // Mint tokens to user
        usdt.mint(user1, INITIAL_BALANCE);
        
        // Approve and deposit to vault
        vm.startPrank(user1);
        usdt.approve(address(vault), type(uint256).max);
        vault.deposit(address(usdt), INITIAL_BALANCE);
        vm.stopPrank();
    }
    
    // ============ Property 5: Balance Consistency Tests ============
    
    /**
     * @notice Test that vault balance decreases correctly after execution
     */
    function test_ExecutionDecreasesVaultBalance() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        uint256 balanceBefore = vault.getBalance(user1, address(usdt));
        assertEq(balanceBefore, INITIAL_BALANCE);
        
        // Execute plan
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        uint256 balanceAfter = vault.getBalance(user1, address(usdt));
        assertEq(balanceAfter, INITIAL_BALANCE - AMOUNT_PER_EXECUTION);
    }
    
    /**
     * @notice Test that user receives target tokens after execution
     */
    function test_ExecutionTransfersTargetTokens() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        uint256 wethBefore = weth.balanceOf(user1);
        assertEq(wethBefore, 0);
        
        // Execute plan
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        // Expected: 100 USDT * 0.0005 = 0.05 WETH (5e16)
        uint256 expectedWeth = (AMOUNT_PER_EXECUTION * 5e14) / 1e18;
        uint256 wethAfter = weth.balanceOf(user1);
        assertEq(wethAfter, expectedWeth);
    }
    
    /**
     * @notice Test that plan statistics are updated correctly
     */
    function test_ExecutionUpdatesPlanStatistics() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        // Execute plan
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        assertEq(plan.totalExecutions, 1);
        assertEq(plan.totalAmountIn, AMOUNT_PER_EXECUTION);
        
        // Expected: 100 USDT * 0.0005 = 0.05 WETH (5e16)
        uint256 expectedWeth = (AMOUNT_PER_EXECUTION * 5e14) / 1e18;
        assertEq(plan.totalAmountOut, expectedWeth);
        assertEq(plan.lastExecutionTime, block.timestamp);
    }
    
    /**
     * @notice Fuzz test: Balance consistency across multiple executions
     */
    function testFuzz_BalanceConsistency(uint8 numExecutions) public {
        numExecutions = uint8(bound(numExecutions, 1, 50));
        
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        uint256 totalSpent = 0;
        uint256 totalReceived = 0;
        
        for (uint256 i = 0; i < numExecutions; i++) {
            if (!strategy.canExecute(planId)) {
                vm.warp(block.timestamp + 1 hours + 1);
            }
            
            uint256 balanceBefore = vault.getBalance(user1, address(usdt));
            uint256 wethBefore = weth.balanceOf(user1);
            
            if (balanceBefore < AMOUNT_PER_EXECUTION) break;
            
            uint256[] memory planIds = new uint256[](1);
            planIds[0] = planId;
            strategy.performUpkeep(abi.encode(planIds));
            
            uint256 balanceAfter = vault.getBalance(user1, address(usdt));
            uint256 wethAfter = weth.balanceOf(user1);
            
            totalSpent += (balanceBefore - balanceAfter);
            totalReceived += (wethAfter - wethBefore);
        }
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        // Verify consistency
        assertEq(plan.totalAmountIn, totalSpent, "Total amount in should match spent");
        assertEq(plan.totalAmountOut, totalReceived, "Total amount out should match received");
        assertEq(vault.getBalance(user1, address(usdt)), INITIAL_BALANCE - totalSpent, "Vault balance should be consistent");
    }
    
    // ============ Property 6: Max Executions Limit Tests ============
    
    /**
     * @notice Test that plan stops after reaching maxExecutions
     */
    function test_PlanStopsAtMaxExecutions() public {
        uint256 maxExec = 3;
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, maxExec);
        
        // Execute 3 times
        for (uint256 i = 0; i < maxExec; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 hours + 1);
            }
            
            uint256[] memory planIds = new uint256[](1);
            planIds[0] = planId;
            strategy.performUpkeep(abi.encode(planIds));
        }
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        assertEq(plan.totalExecutions, maxExec);
        assertFalse(plan.isActive, "Plan should be inactive after max executions");
    }
    
    /**
     * @notice Test that canExecute returns false after maxExecutions reached
     */
    function test_CannotExecuteAfterMaxExecutions() public {
        uint256 maxExec = 2;
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, maxExec);
        
        // Execute 2 times
        for (uint256 i = 0; i < maxExec; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 hours + 1);
            }
            
            uint256[] memory planIds = new uint256[](1);
            planIds[0] = planId;
            strategy.performUpkeep(abi.encode(planIds));
        }
        
        // Advance time
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Should not be executable
        assertFalse(strategy.canExecute(planId));
    }
    
    /**
     * @notice Test that PlanStopped event is emitted when maxExecutions reached
     */
    function test_EmitsPlanStoppedOnMaxExecutions() public {
        uint256 maxExec = 1;
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, maxExec);
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        
        vm.expectEmit(true, true, false, false);
        emit PlanStopped(planId, user1);
        
        strategy.performUpkeep(abi.encode(planIds));
    }
    
    /**
     * @notice Fuzz test: Max executions limit is respected
     */
    function testFuzz_MaxExecutionsLimit(uint8 maxExec) public {
        maxExec = uint8(bound(maxExec, 1, 20));
        
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, maxExec);
        
        // Try to execute more than maxExec times
        for (uint256 i = 0; i < maxExec + 5; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 hours + 1);
            }
            
            if (!strategy.canExecute(planId)) continue;
            
            uint256[] memory planIds = new uint256[](1);
            planIds[0] = planId;
            strategy.performUpkeep(abi.encode(planIds));
        }
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        assertEq(plan.totalExecutions, maxExec, "Should execute exactly maxExec times");
        assertFalse(plan.isActive, "Plan should be inactive");
    }
    
    /**
     * @notice Test unlimited executions when maxExecutions is 0
     */
    function test_UnlimitedExecutionsWhenMaxIsZero() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        // Execute 10 times
        for (uint256 i = 0; i < 10; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 hours + 1);
            }
            
            uint256[] memory planIds = new uint256[](1);
            planIds[0] = planId;
            strategy.performUpkeep(abi.encode(planIds));
        }
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        
        assertEq(plan.totalExecutions, 10);
        assertTrue(plan.isActive, "Plan should still be active");
    }
    
    // ============ Execution Event Tests ============
    
    /**
     * @notice Test that ExecutionCompleted event is emitted with correct data
     */
    function test_EmitsExecutionCompletedEvent() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        uint256 expectedAmountOut = (AMOUNT_PER_EXECUTION * 5e14) / 1e18;
        uint256 expectedPrice = (AMOUNT_PER_EXECUTION * 1e18) / expectedAmountOut;
        
        vm.expectEmit(true, true, false, true);
        emit ExecutionCompleted(
            planId,
            user1,
            AMOUNT_PER_EXECUTION,
            expectedAmountOut,
            1,
            expectedPrice
        );
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
    }
    
    // ============ Failure Handling Tests ============
    
    /**
     * @notice Test that execution failure is handled gracefully
     * @dev When swap fails, the vault transfer succeeds but swap reverts,
     *      causing the entire execution to fail. The plan remains active.
     */
    function test_ExecutionFailsGracefullyOnSwapFailure() public {
        uint256 planId = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        
        // Make swap fail
        swapHelper.setShouldFail(true, "Swap failed");
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        
        // The execution will fail and emit ExecutionFailed event
        // Note: The try-catch in _executePlan catches the error from vault.transferToStrategy
        // but _executeSwap is called inside the try block, so its failure is caught
        vm.expectEmit(true, true, false, false);
        emit ExecutionFailed(planId, user1, "Swap failed");
        
        strategy.performUpkeep(abi.encode(planIds));
        
        // Plan should still be active
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertTrue(plan.isActive);
        assertEq(plan.totalExecutions, 0, "Execution count should not increase on failure");
    }
    
    /**
     * @notice Test execution skips when insufficient balance
     */
    function test_SkipsExecutionOnInsufficientBalance() public {
        // Create plan with amount larger than balance
        uint256 planId = _createPlan(user1, INITIAL_BALANCE + 1, 1 hours, 0);
        
        assertFalse(strategy.canExecute(planId));
        
        uint256[] memory planIds = new uint256[](1);
        planIds[0] = planId;
        strategy.performUpkeep(abi.encode(planIds));
        
        IDCAStrategy.Plan memory plan = strategy.getPlan(planId);
        assertEq(plan.totalExecutions, 0);
    }
    
    // ============ Multiple Plans Execution Tests ============
    
    /**
     * @notice Test executing multiple plans in single upkeep
     */
    function test_ExecuteMultiplePlansInSingleUpkeep() public {
        address user2 = makeAddr("user2");
        usdt.mint(user2, INITIAL_BALANCE);
        
        vm.startPrank(user2);
        usdt.approve(address(vault), type(uint256).max);
        vault.deposit(address(usdt), INITIAL_BALANCE);
        vm.stopPrank();
        
        uint256 planId1 = _createPlan(user1, AMOUNT_PER_EXECUTION, 1 hours, 0);
        uint256 planId2 = _createPlan(user2, AMOUNT_PER_EXECUTION * 2, 1 hours, 0);
        
        uint256[] memory planIds = new uint256[](2);
        planIds[0] = planId1;
        planIds[1] = planId2;
        
        strategy.performUpkeep(abi.encode(planIds));
        
        IDCAStrategy.Plan memory plan1 = strategy.getPlan(planId1);
        IDCAStrategy.Plan memory plan2 = strategy.getPlan(planId2);
        
        assertEq(plan1.totalExecutions, 1);
        assertEq(plan2.totalExecutions, 1);
        
        assertEq(vault.getBalance(user1, address(usdt)), INITIAL_BALANCE - AMOUNT_PER_EXECUTION);
        assertEq(vault.getBalance(user2, address(usdt)), INITIAL_BALANCE - AMOUNT_PER_EXECUTION * 2);
    }
    
    // ============ Helper Functions ============
    
    function _createPlan(
        address user,
        uint256 amount,
        uint256 interval,
        uint256 maxExec
    ) internal returns (uint256) {
        IDCAStrategy.PlanParams memory params = IDCAStrategy.PlanParams({
            sourceToken: address(usdt),
            targetToken: address(weth),
            amountPerExecution: amount,
            interval: interval,
            maxExecutions: maxExec
        });
        
        vm.prank(user);
        return strategy.createPlan(params);
    }
}
