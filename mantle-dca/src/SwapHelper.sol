// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ISwapRouter
 * @notice Interface for Uniswap V3 SwapRouter
 */
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title IPriceOracle
 * @notice Interface for price oracle
 */
interface IPriceOracle {
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp);
}

/**
 * @title SwapHelper
 * @notice Helper contract for executing swaps via DEX
 */
contract SwapHelper is Ownable {
    using SafeERC20 for IERC20;

    // ============ Events ============

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );
    event SlippageToleranceUpdated(uint256 newTolerance);
    event PoolFeeUpdated(address tokenIn, address tokenOut, uint24 fee);

    // ============ Errors ============

    error SlippageExceeded(uint256 expected, uint256 actual);
    error InvalidAmount();
    error SwapFailed();

    // ============ State Variables ============

    /// @notice The DEX router (Uniswap V3 or equivalent)
    ISwapRouter public router;

    /// @notice The price oracle
    IPriceOracle public priceOracle;

    /// @notice Slippage tolerance in basis points (e.g., 50 = 0.5%)
    uint256 public slippageTolerance = 50;

    /// @notice Pool fees for token pairs: tokenIn => tokenOut => fee
    mapping(address => mapping(address => uint24)) public poolFees;

    /// @notice Default pool fee (0.3%)
    uint24 public constant DEFAULT_POOL_FEE = 3000;

    // ============ Constructor ============

    constructor(address _router, address _priceOracle) Ownable(msg.sender) {
        router = ISwapRouter(_router);
        priceOracle = IPriceOracle(_priceOracle);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the DEX router
     * @param _router The router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid address");
        router = ISwapRouter(_router);
    }

    /**
     * @notice Set the price oracle
     * @param _priceOracle The oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid address");
        priceOracle = IPriceOracle(_priceOracle);
    }

    /**
     * @notice Set slippage tolerance
     * @param _tolerance Tolerance in basis points
     */
    function setSlippageTolerance(uint256 _tolerance) external onlyOwner {
        require(_tolerance <= 1000, "Tolerance too high"); // Max 10%
        slippageTolerance = _tolerance;
        emit SlippageToleranceUpdated(_tolerance);
    }

    /**
     * @notice Set pool fee for a token pair
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param fee The pool fee
     */
    function setPoolFee(address tokenIn, address tokenOut, uint24 fee) external onlyOwner {
        poolFees[tokenIn][tokenOut] = fee;
        emit PoolFeeUpdated(tokenIn, tokenOut, fee);
    }

    // ============ Swap Functions ============

    /**
     * @notice Execute a swap
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The amount to swap
     * @param minAmountOut The minimum output amount (0 to use oracle-based calculation)
     * @param recipient The recipient of output tokens
     * @return amountOut The amount of output tokens received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();

        // Transfer tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate minimum output if not provided
        if (minAmountOut == 0) {
            minAmountOut = _calculateMinOutput(tokenIn, tokenOut, amountIn);
        }

        // Approve router
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        // Get pool fee
        uint24 fee = poolFees[tokenIn][tokenOut];
        if (fee == 0) fee = DEFAULT_POOL_FEE;

        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5 minutes
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });

        try router.exactInputSingle(params) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Refund tokens on failure
            IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
            revert SwapFailed();
        }

        // Verify slippage
        if (amountOut < minAmountOut) {
            revert SlippageExceeded(minAmountOut, amountOut);
        }

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    /**
     * @notice Get a quote for a swap
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The amount to swap
     * @return expectedOut The expected output amount
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut) {
        return _calculateExpectedOutput(tokenIn, tokenOut, amountIn);
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate minimum output based on oracle price and slippage
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @return minOutput The minimum acceptable output
     */
    function _calculateMinOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 minOutput) {
        uint256 expectedOutput = _calculateExpectedOutput(tokenIn, tokenOut, amountIn);
        // Apply slippage tolerance
        minOutput = (expectedOutput * (10000 - slippageTolerance)) / 10000;
    }

    /**
     * @notice Calculate expected output based on oracle prices
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @return expectedOutput The expected output amount
     */
    function _calculateExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 expectedOutput) {
        if (address(priceOracle) == address(0)) {
            // No oracle, return input amount as placeholder
            return amountIn;
        }

        (uint256 priceIn, ) = priceOracle.getPrice(tokenIn);
        (uint256 priceOut, ) = priceOracle.getPrice(tokenOut);

        if (priceOut == 0) return 0;

        // Calculate: amountOut = amountIn * priceIn / priceOut
        expectedOutput = (amountIn * priceIn) / priceOut;
    }
}
