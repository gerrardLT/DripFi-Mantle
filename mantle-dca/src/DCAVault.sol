// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDCAVault.sol";

/**
 * @title DCAVault
 * @notice Manages user funds for DCA protocol
 * @dev Users deposit source tokens here, which are used for DCA executions
 */
contract DCAVault is IDCAVault, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice User balances: user => token => balance
    mapping(address => mapping(address => uint256)) private _balances;

    /// @notice Supported tokens
    mapping(address => bool) private _supportedTokens;

    /// @notice The DCA Strategy contract address
    address public strategy;

    // ============ Modifiers ============

    modifier onlyStrategy() {
        require(msg.sender == strategy, "DCAVault: caller is not strategy");
        _;
    }

    modifier validToken(address token) {
        if (!_supportedTokens[token]) revert UnsupportedToken(token);
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Admin Functions ============

    /**
     * @notice Set the DCA Strategy contract address
     * @param _strategy The strategy contract address
     */
    function setStrategy(address _strategy) external onlyOwner {
        if (_strategy == address(0)) revert ZeroAddress();
        strategy = _strategy;
    }

    /**
     * @notice Add or remove a supported token
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        _supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @notice Pause the vault
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the vault
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ User Functions ============

    /**
     * @inheritdoc IDCAVault
     */
    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused validToken(token) {
        if (amount == 0) revert InvalidAmount();

        // Transfer tokens from user to vault
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update balance
        _balances[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    /**
     * @inheritdoc IDCAVault
     */
    function withdraw(address token, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        uint256 balance = _balances[msg.sender][token];
        if (balance < amount) {
            revert InsufficientBalance(msg.sender, token, amount, balance);
        }

        // Update balance
        _balances[msg.sender][token] = balance - amount;

        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @inheritdoc IDCAVault
     */
    function getBalance(address user, address token) external view returns (uint256) {
        return _balances[user][token];
    }

    /**
     * @inheritdoc IDCAVault
     */
    function transferToStrategy(
        address user,
        address token,
        uint256 amount
    ) external onlyStrategy nonReentrant whenNotPaused {
        uint256 balance = _balances[user][token];
        if (balance < amount) {
            revert InsufficientBalance(user, token, amount, balance);
        }

        // Update balance
        _balances[user][token] = balance - amount;

        // Transfer to strategy
        IERC20(token).safeTransfer(strategy, amount);

        emit TransferredToStrategy(user, token, amount);
    }

    /**
     * @inheritdoc IDCAVault
     */
    function depositFor(
        address user,
        address token,
        uint256 amount
    ) external onlyStrategy nonReentrant whenNotPaused validToken(token) {
        if (amount == 0) revert InvalidAmount();

        // Transfer tokens from strategy to vault
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update user's balance
        _balances[user][token] += amount;

        emit Deposited(user, token, amount);
    }

    /**
     * @inheritdoc IDCAVault
     */
    function isSupportedToken(address token) external view returns (bool) {
        return _supportedTokens[token];
    }
}
