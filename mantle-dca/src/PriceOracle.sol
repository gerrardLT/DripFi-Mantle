// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AggregatorV3Interface
 * @notice Chainlink Price Feed interface
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracle
 * @notice Wrapper for Chainlink Price Feeds
 */
contract PriceOracle is Ownable {
    // ============ Events ============

    event PriceFeedUpdated(address indexed token, address indexed feed);
    event StalePriceThresholdUpdated(uint256 newThreshold);

    // ============ Errors ============

    error PriceFeedNotSet(address token);
    error StalePrice(address token, uint256 lastUpdate);
    error InvalidPrice(address token);

    // ============ State Variables ============

    /// @notice Token to Chainlink price feed mapping
    mapping(address => AggregatorV3Interface) public priceFeeds;

    /// @notice Stale price threshold in seconds (default 1 hour)
    uint256 public stalePriceThreshold = 1 hours;

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Admin Functions ============

    /**
     * @notice Set price feed for a token
     * @param token The token address
     * @param feed The Chainlink price feed address
     */
    function setPriceFeed(address token, address feed) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(feed != address(0), "Invalid feed");
        priceFeeds[token] = AggregatorV3Interface(feed);
        emit PriceFeedUpdated(token, feed);
    }

    /**
     * @notice Set stale price threshold
     * @param threshold The threshold in seconds
     */
    function setStalePriceThreshold(uint256 threshold) external onlyOwner {
        require(threshold >= 5 minutes, "Threshold too low");
        stalePriceThreshold = threshold;
        emit StalePriceThresholdUpdated(threshold);
    }

    // ============ Price Functions ============

    /**
     * @notice Get the price of a token in USD
     * @param token The token address
     * @return price The price (8 decimals)
     * @return timestamp The timestamp of the price update
     */
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp) {
        AggregatorV3Interface feed = priceFeeds[token];
        if (address(feed) == address(0)) revert PriceFeedNotSet(token);

        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();

        if (answer <= 0) revert InvalidPrice(token);

        return (uint256(answer), updatedAt);
    }

    /**
     * @notice Check if price data is stale
     * @param token The token address
     * @return True if price is stale
     */
    function isPriceStale(address token) external view returns (bool) {
        AggregatorV3Interface feed = priceFeeds[token];
        if (address(feed) == address(0)) return true;

        (
            /* uint80 roundId */,
            /* int256 answer */,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();

        return (block.timestamp - updatedAt) > stalePriceThreshold;
    }

    /**
     * @notice Get expected output for a swap based on oracle prices
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @return expectedOut The expected output amount
     */
    function getExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut) {
        (uint256 priceIn, uint256 timestampIn) = this.getPrice(tokenIn);
        (uint256 priceOut, uint256 timestampOut) = this.getPrice(tokenOut);

        // Check for stale prices
        if ((block.timestamp - timestampIn) > stalePriceThreshold) {
            revert StalePrice(tokenIn, timestampIn);
        }
        if ((block.timestamp - timestampOut) > stalePriceThreshold) {
            revert StalePrice(tokenOut, timestampOut);
        }

        if (priceOut == 0) return 0;

        // Both prices are in USD with 8 decimals
        // amountOut = amountIn * priceIn / priceOut
        expectedOut = (amountIn * priceIn) / priceOut;
    }

    /**
     * @notice Get the decimals of a price feed
     * @param token The token address
     * @return The number of decimals
     */
    function getDecimals(address token) external view returns (uint8) {
        AggregatorV3Interface feed = priceFeeds[token];
        if (address(feed) == address(0)) revert PriceFeedNotSet(token);
        return feed.decimals();
    }
}
