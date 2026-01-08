// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDCAStrategy
 * @notice Interface for the DCA Strategy contract that manages DCA plans and executions
 */
interface IDCAStrategy {
    // ============ Structs ============

    struct Plan {
        uint256 planId;
        address owner;
        address sourceToken;
        address targetToken;
        uint256 amountPerExecution;
        uint256 interval; // seconds between executions
        uint256 maxExecutions; // 0 = unlimited
        uint256 totalExecutions;
        uint256 totalAmountIn;
        uint256 totalAmountOut;
        uint256 lastExecutionTime;
        uint256 createdAt;
        bool isActive;
        bool isPaused;
    }

    struct PlanParams {
        address sourceToken;
        address targetToken;
        uint256 amountPerExecution;
        uint256 interval;
        uint256 maxExecutions;
    }

    // ============ Events ============

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

    event ExecutionFailed(uint256 indexed planId, address indexed owner, string reason);

    // ============ Errors ============

    error InvalidAmount();
    error InvalidInterval(uint256 interval);
    error PlanNotFound(uint256 planId);
    error NotPlanOwner(uint256 planId, address caller);
    error PlanNotActive(uint256 planId);
    error PlanAlreadyPaused(uint256 planId);
    error PlanNotPaused(uint256 planId);
    error ExecutionTooEarly(uint256 planId, uint256 nextExecutionTime);
    error UnsupportedToken(address token);
    error UnsupportedPair(address sourceToken, address targetToken);

    // ============ Plan Management ============

    /**
     * @notice Create a new DCA plan
     * @param params The plan parameters
     * @return planId The ID of the created plan
     */
    function createPlan(PlanParams calldata params) external returns (uint256 planId);

    /**
     * @notice Pause a DCA plan
     * @param planId The plan ID to pause
     */
    function pausePlan(uint256 planId) external;

    /**
     * @notice Resume a paused DCA plan
     * @param planId The plan ID to resume
     */
    function resumePlan(uint256 planId) external;

    /**
     * @notice Stop a DCA plan permanently
     * @param planId The plan ID to stop
     */
    function stopPlan(uint256 planId) external;

    // ============ Queries ============

    /**
     * @notice Get plan details
     * @param planId The plan ID
     * @return The plan struct
     */
    function getPlan(uint256 planId) external view returns (Plan memory);

    /**
     * @notice Get all plan IDs for a user
     * @param user The user address
     * @return Array of plan IDs
     */
    function getUserPlans(address user) external view returns (uint256[] memory);

    /**
     * @notice Check if a plan can be executed
     * @param planId The plan ID
     * @return True if the plan can be executed
     */
    function canExecute(uint256 planId) external view returns (bool);

    /**
     * @notice Get the next execution time for a plan
     * @param planId The plan ID
     * @return The timestamp of the next execution
     */
    function getNextExecutionTime(uint256 planId) external view returns (uint256);
}
