// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDCAVault
 * @notice Interface for the DCA Vault contract that manages user funds
 */
interface IDCAVault {
    // ============ Events ============

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event TransferredToStrategy(address indexed user, address indexed token, uint256 amount);
    event TokenSupportUpdated(address indexed token, bool supported);

    // ============ Errors ============

    error InsufficientBalance(address user, address token, uint256 required, uint256 available);
    error InvalidAmount();
    error UnsupportedToken(address token);
    error ZeroAddress();

    // ============ Functions ============

    /**
     * @notice Deposit tokens into the vault
     * @param token The token address to deposit
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) external;

    /**
     * @notice Withdraw tokens from the vault
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     */
    function withdraw(address token, uint256 amount) external;

    /**
     * @notice Get user's balance for a specific token
     * @param user The user address
     * @param token The token address
     * @return The balance amount
     */
    function getBalance(address user, address token) external view returns (uint256);

    /**
     * @notice Transfer tokens from user's vault to strategy for execution
     * @dev Only callable by the DCA Strategy contract
     * @param user The user address
     * @param token The token address
     * @param amount The amount to transfer
     */
    function transferToStrategy(address user, address token, uint256 amount) external;

    /**
     * @notice Deposit tokens on behalf of a user (for refunds on failed swaps)
     * @dev Only callable by the DCA Strategy contract
     * @param user The user address to credit
     * @param token The token address
     * @param amount The amount to deposit
     */
    function depositFor(address user, address token, uint256 amount) external;

    /**
     * @notice Check if a token is supported
     * @param token The token address
     * @return True if supported
     */
    function isSupportedToken(address token) external view returns (bool);
}
