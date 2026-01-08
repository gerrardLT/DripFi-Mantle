// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockERC20.sol";

/**
 * @title MockSwapHelper
 * @notice Mock swap helper for testing DCA execution
 */
contract MockSwapHelper {
    using SafeERC20 for IERC20;

    /// @notice Exchange rate: targetToken per sourceToken (scaled by 1e18)
    mapping(address => mapping(address => uint256)) public exchangeRates;

    /// @notice Whether to fail swaps
    bool public shouldFail;

    /// @notice Failure message
    string public failureMessage;

    event SwapExecuted(
        address indexed sourceToken,
        address indexed targetToken,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    /**
     * @notice Set exchange rate for a pair
     * @param sourceToken The source token
     * @param targetToken The target token
     * @param rate The exchange rate (targetToken per sourceToken, scaled by 1e18)
     */
    function setExchangeRate(address sourceToken, address targetToken, uint256 rate) external {
        exchangeRates[sourceToken][targetToken] = rate;
    }

    /**
     * @notice Set whether swaps should fail
     * @param _shouldFail Whether to fail
     * @param _message The failure message
     */
    function setShouldFail(bool _shouldFail, string memory _message) external {
        shouldFail = _shouldFail;
        failureMessage = _message;
    }

    /**
     * @notice Execute a swap
     * @param sourceToken The source token
     * @param targetToken The target token
     * @param amountIn The amount of source tokens
     * @param minAmountOut The minimum amount of target tokens
     * @param recipient The recipient of target tokens
     * @return amountOut The amount of target tokens received
     */
    function swap(
        address sourceToken,
        address targetToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        if (shouldFail) {
            revert(failureMessage);
        }

        // Transfer source tokens from caller
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate output based on exchange rate
        uint256 rate = exchangeRates[sourceToken][targetToken];
        if (rate == 0) {
            rate = 1e18; // Default 1:1 rate
        }
        amountOut = (amountIn * rate) / 1e18;

        require(amountOut >= minAmountOut, "Slippage too high");

        // Mint target tokens to recipient (mock behavior)
        MockERC20(targetToken).mint(recipient, amountOut);

        emit SwapExecuted(sourceToken, targetToken, amountIn, amountOut, recipient);

        return amountOut;
    }

    /**
     * @notice Get quote for a swap
     * @param sourceToken The source token
     * @param targetToken The target token
     * @param amountIn The amount of source tokens
     * @return amountOut The expected amount of target tokens
     */
    function getQuote(
        address sourceToken,
        address targetToken,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        uint256 rate = exchangeRates[sourceToken][targetToken];
        if (rate == 0) {
            rate = 1e18;
        }
        return (amountIn * rate) / 1e18;
    }
}
