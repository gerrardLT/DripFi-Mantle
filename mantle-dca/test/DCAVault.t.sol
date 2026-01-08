// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DCAVault.sol";
import "./mocks/MockERC20.sol";

/**
 * @title DCAVaultTest
 * @notice Unit tests for DCAVault contract
 * @dev Property 1: Deposit-Withdraw Round Trip
 *      Validates: Requirements 1.2, 1.3
 */
contract DCAVaultTest is Test {
    DCAVault public vault;
    MockERC20 public usdt;
    MockERC20 public usdc;
    
    address public owner;
    address public user1;
    address public user2;
    address public strategy;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e18;
    
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event TransferredToStrategy(address indexed user, address indexed token, uint256 amount);
    event TokenSupportUpdated(address indexed token, bool supported);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        strategy = makeAddr("strategy");
        
        // Deploy vault
        vault = new DCAVault();
        
        // Deploy mock tokens
        usdt = new MockERC20("Tether USD", "USDT", 18);
        usdc = new MockERC20("USD Coin", "USDC", 18);
        
        // Setup supported tokens
        vault.setSupportedToken(address(usdt), true);
        vault.setSupportedToken(address(usdc), true);
        
        // Set strategy
        vault.setStrategy(strategy);
        
        // Mint tokens to users
        usdt.mint(user1, INITIAL_BALANCE);
        usdt.mint(user2, INITIAL_BALANCE);
        usdc.mint(user1, INITIAL_BALANCE);
        
        // Approve vault
        vm.prank(user1);
        usdt.approve(address(vault), type(uint256).max);
        vm.prank(user1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        usdt.approve(address(vault), type(uint256).max);
    }
    
    // ============ Deposit Tests ============
    
    function test_Deposit_Success() public {
        uint256 amount = 1000 * 1e18;
        
        vm.expectEmit(true, true, false, true);
        emit Deposited(user1, address(usdt), amount);
        
        vm.prank(user1);
        vault.deposit(address(usdt), amount);
        
        assertEq(vault.getBalance(user1, address(usdt)), amount);
        assertEq(usdt.balanceOf(address(vault)), amount);
        assertEq(usdt.balanceOf(user1), INITIAL_BALANCE - amount);
    }
    
    function test_Deposit_MultipleTokens() public {
        uint256 usdtAmount = 500 * 1e18;
        uint256 usdcAmount = 300 * 1e18;
        
        vm.startPrank(user1);
        vault.deposit(address(usdt), usdtAmount);
        vault.deposit(address(usdc), usdcAmount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(user1, address(usdt)), usdtAmount);
        assertEq(vault.getBalance(user1, address(usdc)), usdcAmount);
    }
    
    function test_Deposit_RevertOnZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert(IDCAVault.InvalidAmount.selector);
        vault.deposit(address(usdt), 0);
    }
    
    function test_Deposit_RevertOnUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS", 18);
        unsupportedToken.mint(user1, 1000 * 1e18);
        
        vm.prank(user1);
        unsupportedToken.approve(address(vault), type(uint256).max);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IDCAVault.UnsupportedToken.selector, address(unsupportedToken)));
        vault.deposit(address(unsupportedToken), 100 * 1e18);
    }
    
    // ============ Withdraw Tests ============
    
    function test_Withdraw_Success() public {
        uint256 depositAmount = 1000 * 1e18;
        uint256 withdrawAmount = 400 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), depositAmount);
        
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(user1, address(usdt), withdrawAmount);
        
        vm.prank(user1);
        vault.withdraw(address(usdt), withdrawAmount);
        
        assertEq(vault.getBalance(user1, address(usdt)), depositAmount - withdrawAmount);
        assertEq(usdt.balanceOf(user1), INITIAL_BALANCE - depositAmount + withdrawAmount);
    }
    
    function test_Withdraw_FullAmount() public {
        uint256 amount = 1000 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), amount);
        
        vm.prank(user1);
        vault.withdraw(address(usdt), amount);
        
        assertEq(vault.getBalance(user1, address(usdt)), 0);
        assertEq(usdt.balanceOf(user1), INITIAL_BALANCE);
    }
    
    function test_Withdraw_RevertOnInsufficientBalance() public {
        uint256 depositAmount = 100 * 1e18;
        uint256 withdrawAmount = 200 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), depositAmount);
        
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IDCAVault.InsufficientBalance.selector,
                user1,
                address(usdt),
                withdrawAmount,
                depositAmount
            )
        );
        vault.withdraw(address(usdt), withdrawAmount);
    }
    
    function test_Withdraw_RevertOnZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert(IDCAVault.InvalidAmount.selector);
        vault.withdraw(address(usdt), 0);
    }
    
    // ============ Property 1: Deposit-Withdraw Round Trip ============
    
    function testFuzz_DepositWithdrawRoundTrip(uint256 amount) public {
        // Bound amount to reasonable range
        amount = bound(amount, 1, INITIAL_BALANCE);
        
        uint256 userBalanceBefore = usdt.balanceOf(user1);
        
        // Deposit
        vm.prank(user1);
        vault.deposit(address(usdt), amount);
        
        // Withdraw same amount
        vm.prank(user1);
        vault.withdraw(address(usdt), amount);
        
        // User should have same balance as before
        assertEq(usdt.balanceOf(user1), userBalanceBefore);
        assertEq(vault.getBalance(user1, address(usdt)), 0);
    }
    
    // ============ TransferToStrategy Tests ============
    
    function test_TransferToStrategy_Success() public {
        uint256 depositAmount = 1000 * 1e18;
        uint256 transferAmount = 100 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), depositAmount);
        
        vm.expectEmit(true, true, false, true);
        emit TransferredToStrategy(user1, address(usdt), transferAmount);
        
        vm.prank(strategy);
        vault.transferToStrategy(user1, address(usdt), transferAmount);
        
        assertEq(vault.getBalance(user1, address(usdt)), depositAmount - transferAmount);
        assertEq(usdt.balanceOf(strategy), transferAmount);
    }
    
    function test_TransferToStrategy_RevertOnNonStrategy() public {
        uint256 amount = 100 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), amount);
        
        vm.prank(user2);
        vm.expectRevert("DCAVault: caller is not strategy");
        vault.transferToStrategy(user1, address(usdt), amount);
    }
    
    function test_TransferToStrategy_RevertOnInsufficientBalance() public {
        uint256 depositAmount = 100 * 1e18;
        uint256 transferAmount = 200 * 1e18;
        
        vm.prank(user1);
        vault.deposit(address(usdt), depositAmount);
        
        vm.prank(strategy);
        vm.expectRevert(
            abi.encodeWithSelector(
                IDCAVault.InsufficientBalance.selector,
                user1,
                address(usdt),
                transferAmount,
                depositAmount
            )
        );
        vault.transferToStrategy(user1, address(usdt), transferAmount);
    }
    
    // ============ Admin Tests ============
    
    function test_SetStrategy_Success() public {
        address newStrategy = makeAddr("newStrategy");
        vault.setStrategy(newStrategy);
        assertEq(vault.strategy(), newStrategy);
    }
    
    function test_SetStrategy_RevertOnZeroAddress() public {
        vm.expectRevert(IDCAVault.ZeroAddress.selector);
        vault.setStrategy(address(0));
    }
    
    function test_SetSupportedToken_Success() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 18);
        
        vm.expectEmit(true, false, false, true);
        emit TokenSupportUpdated(address(newToken), true);
        
        vault.setSupportedToken(address(newToken), true);
        assertTrue(vault.isSupportedToken(address(newToken)));
        
        vault.setSupportedToken(address(newToken), false);
        assertFalse(vault.isSupportedToken(address(newToken)));
    }
    
    function test_Pause_BlocksDeposits() public {
        vault.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        vault.deposit(address(usdt), 100 * 1e18);
    }
    
    function test_Unpause_AllowsDeposits() public {
        vault.pause();
        vault.unpause();
        
        vm.prank(user1);
        vault.deposit(address(usdt), 100 * 1e18);
        
        assertEq(vault.getBalance(user1, address(usdt)), 100 * 1e18);
    }
}
