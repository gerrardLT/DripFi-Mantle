// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDCAStrategy.sol";
import "./interfaces/IDCAVault.sol";

/**
 * @title AutomationCompatibleInterface
 * @notice Chainlink Automation interface
 */
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title ISwapHelper
 * @notice Interface for SwapHelper contract
 */
interface ISwapHelper {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);
    
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut);
}

/**
 * @title DCAStrategy
 * @notice Manages DCA plans and executes swaps via Chainlink Automation
 * @dev Implements AutomationCompatibleInterface for Chainlink Automation
 */
contract DCAStrategy is IDCAStrategy, AutomationCompatibleInterface, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant MIN_INTERVAL = 1 hours;
    uint256 public constant INTERVAL_1_HOUR = 1 hours;
    uint256 public constant INTERVAL_4_HOURS = 4 hours;
    uint256 public constant INTERVAL_1_DAY = 1 days;
    uint256 public constant INTERVAL_1_WEEK = 7 days;

    // ============ State Variables ============

    /// @notice The DCA Vault contract
    IDCAVault public vault;

    /// @notice The swap helper contract
    address public swapHelper;

    /// @notice Plan storage
    mapping(uint256 => Plan) public plans;

    /// @notice User's plan IDs
    mapping(address => uint256[]) private _userPlans;

    /// @notice Supported trading pairs: sourceToken => targetToken => supported
    mapping(address => mapping(address => bool)) public supportedPairs;

    /// @notice Next plan ID
    uint256 public nextPlanId = 1;

    /// @notice Maximum plans to check in single upkeep
    uint256 public maxPlansPerUpkeep = 10;

    // ============ Constructor ============

    constructor(address _vault) Ownable(msg.sender) {
        vault = IDCAVault(_vault);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the swap helper contract
     * @param _swapHelper The swap helper address
     */
    function setSwapHelper(address _swapHelper) external onlyOwner {
        require(_swapHelper != address(0), "Invalid address");
        swapHelper = _swapHelper;
    }

    /**
     * @notice Set supported trading pair
     * @param sourceToken The source token
     * @param targetToken The target token
     * @param supported Whether the pair is supported
     */
    function setSupportedPair(address sourceToken, address targetToken, bool supported) external onlyOwner {
        supportedPairs[sourceToken][targetToken] = supported;
    }

    /**
     * @notice Set max plans per upkeep
     * @param _maxPlans The maximum number of plans
     */
    function setMaxPlansPerUpkeep(uint256 _maxPlans) external onlyOwner {
        maxPlansPerUpkeep = _maxPlans;
    }

    /**
     * @notice Pause the strategy
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the strategy
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Plan Management ============

    /**
     * @inheritdoc IDCAStrategy
     */
    function createPlan(PlanParams calldata params) external whenNotPaused returns (uint256 planId) {
        // Validations
        if (params.amountPerExecution == 0) revert InvalidAmount();
        if (params.interval < MIN_INTERVAL) revert InvalidInterval(params.interval);
        if (!_isValidInterval(params.interval)) revert InvalidInterval(params.interval);
        if (!vault.isSupportedToken(params.sourceToken)) revert UnsupportedToken(params.sourceToken);
        if (!supportedPairs[params.sourceToken][params.targetToken]) {
            revert UnsupportedPair(params.sourceToken, params.targetToken);
        }

        planId = nextPlanId++;

        plans[planId] = Plan({
            planId: planId,
            owner: msg.sender,
            sourceToken: params.sourceToken,
            targetToken: params.targetToken,
            amountPerExecution: params.amountPerExecution,
            interval: params.interval,
            maxExecutions: params.maxExecutions,
            totalExecutions: 0,
            totalAmountIn: 0,
            totalAmountOut: 0,
            lastExecutionTime: 0,
            createdAt: block.timestamp,
            isActive: true,
            isPaused: false
        });

        _userPlans[msg.sender].push(planId);

        emit PlanCreated(
            planId,
            msg.sender,
            params.sourceToken,
            params.targetToken,
            params.amountPerExecution,
            params.interval,
            params.maxExecutions
        );
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function pausePlan(uint256 planId) external {
        Plan storage plan = plans[planId];
        if (plan.owner == address(0)) revert PlanNotFound(planId);
        if (plan.owner != msg.sender) revert NotPlanOwner(planId, msg.sender);
        if (!plan.isActive) revert PlanNotActive(planId);
        if (plan.isPaused) revert PlanAlreadyPaused(planId);

        plan.isPaused = true;
        emit PlanPaused(planId, msg.sender);
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function resumePlan(uint256 planId) external {
        Plan storage plan = plans[planId];
        if (plan.owner == address(0)) revert PlanNotFound(planId);
        if (plan.owner != msg.sender) revert NotPlanOwner(planId, msg.sender);
        if (!plan.isActive) revert PlanNotActive(planId);
        if (!plan.isPaused) revert PlanNotPaused(planId);

        plan.isPaused = false;
        emit PlanResumed(planId, msg.sender);
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function stopPlan(uint256 planId) external {
        Plan storage plan = plans[planId];
        if (plan.owner == address(0)) revert PlanNotFound(planId);
        if (plan.owner != msg.sender) revert NotPlanOwner(planId, msg.sender);
        if (!plan.isActive) revert PlanNotActive(planId);

        plan.isActive = false;
        emit PlanStopped(planId, msg.sender);
    }

    // ============ Queries ============

    /**
     * @inheritdoc IDCAStrategy
     */
    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function getUserPlans(address user) external view returns (uint256[] memory) {
        return _userPlans[user];
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function canExecute(uint256 planId) public view returns (bool) {
        Plan storage plan = plans[planId];

        // Check basic conditions
        if (!plan.isActive || plan.isPaused) return false;

        // Check max executions
        if (plan.maxExecutions > 0 && plan.totalExecutions >= plan.maxExecutions) return false;

        // Check interval
        if (plan.lastExecutionTime > 0) {
            uint256 nextExecution = plan.lastExecutionTime + plan.interval;
            if (block.timestamp < nextExecution) return false;
        }

        // Check user has sufficient balance
        uint256 balance = vault.getBalance(plan.owner, plan.sourceToken);
        if (balance < plan.amountPerExecution) return false;

        return true;
    }

    /**
     * @inheritdoc IDCAStrategy
     */
    function getNextExecutionTime(uint256 planId) external view returns (uint256) {
        Plan storage plan = plans[planId];
        if (plan.lastExecutionTime == 0) {
            return plan.createdAt;
        }
        return plan.lastExecutionTime + plan.interval;
    }

    // ============ Chainlink Automation ============

    /**
     * @notice Check if any plans need execution
     * @dev Called by Chainlink Automation nodes
     * @param checkData Not used, can be empty
     * @return upkeepNeeded True if at least one plan needs execution
     * @return performData Encoded array of plan IDs to execute
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256[] memory plansToExecute = new uint256[](maxPlansPerUpkeep);
        uint256 count = 0;

        // Check all plans (in production, use pagination or off-chain indexing)
        for (uint256 i = 1; i < nextPlanId && count < maxPlansPerUpkeep; i++) {
            if (canExecute(i)) {
                plansToExecute[count] = i;
                count++;
            }
        }

        if (count > 0) {
            // Resize array to actual count
            uint256[] memory result = new uint256[](count);
            for (uint256 i = 0; i < count; i++) {
                result[i] = plansToExecute[i];
            }
            return (true, abi.encode(result));
        }

        return (false, "");
    }

    /**
     * @notice Execute DCA plans
     * @dev Called by Chainlink Automation when checkUpkeep returns true
     * @param performData Encoded array of plan IDs to execute
     */
    function performUpkeep(bytes calldata performData) external override nonReentrant whenNotPaused {
        uint256[] memory planIds = abi.decode(performData, (uint256[]));

        for (uint256 i = 0; i < planIds.length; i++) {
            _executePlan(planIds[i]);
        }
    }

    // ============ Internal Functions ============

    /**
     * @notice Execute a single DCA plan
     * @param planId The plan ID to execute
     */
    function _executePlan(uint256 planId) internal {
        Plan storage plan = plans[planId];

        // Re-check conditions (state may have changed)
        if (!canExecute(planId)) {
            return;
        }

        // Transfer source tokens from vault to this contract
        try vault.transferToStrategy(plan.owner, plan.sourceToken, plan.amountPerExecution) {
            // Execute swap - wrap in try-catch to handle swap failures
            try this.executeSwapExternal(
                plan.sourceToken,
                plan.targetToken,
                plan.amountPerExecution,
                plan.owner
            ) returns (uint256 amountOut) {
                // Update plan state
                plan.totalExecutions++;
                plan.totalAmountIn += plan.amountPerExecution;
                plan.totalAmountOut += amountOut;
                plan.lastExecutionTime = block.timestamp;

                // Check if max executions reached
                if (plan.maxExecutions > 0 && plan.totalExecutions >= plan.maxExecutions) {
                    plan.isActive = false;
                    emit PlanStopped(planId, plan.owner);
                }

                // Calculate price (source per target, scaled by 1e18)
                uint256 price = amountOut > 0 ? (plan.amountPerExecution * 1e18) / amountOut : 0;

                emit ExecutionCompleted(
                    planId,
                    plan.owner,
                    plan.amountPerExecution,
                    amountOut,
                    plan.totalExecutions,
                    price
                );
            } catch Error(string memory reason) {
                // Swap failed - return tokens to vault
                _returnTokensToVault(plan.owner, plan.sourceToken, plan.amountPerExecution);
                emit ExecutionFailed(planId, plan.owner, reason);
            } catch {
                // Swap failed - return tokens to vault
                _returnTokensToVault(plan.owner, plan.sourceToken, plan.amountPerExecution);
                emit ExecutionFailed(planId, plan.owner, "Swap failed");
            }
        } catch Error(string memory reason) {
            emit ExecutionFailed(planId, plan.owner, reason);
        } catch {
            emit ExecutionFailed(planId, plan.owner, "Unknown error");
        }
    }

    /**
     * @notice External wrapper for swap execution (allows try-catch)
     * @dev This function is external to enable try-catch on internal swap logic
     */
    function executeSwapExternal(
        address sourceToken,
        address targetToken,
        uint256 amountIn,
        address recipient
    ) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Only self");
        return _executeSwap(sourceToken, targetToken, amountIn, recipient);
    }

    /**
     * @notice Return tokens to vault on swap failure
     * @param user The user to credit
     * @param token The token to return
     * @param amount The amount to return
     */
    function _returnTokensToVault(address user, address token, uint256 amount) internal {
        // Approve vault to take tokens back
        IERC20(token).forceApprove(address(vault), amount);
        // Deposit back to user's vault balance
        vault.depositFor(user, token, amount);
    }

    /**
     * @notice Execute swap via swap helper
     * @param sourceToken The source token
     * @param targetToken The target token
     * @param amountIn The amount to swap
     * @param recipient The recipient of output tokens
     * @return amountOut The amount of target tokens received
     */
    function _executeSwap(
        address sourceToken,
        address targetToken,
        uint256 amountIn,
        address recipient
    ) internal returns (uint256 amountOut) {
        require(swapHelper != address(0), "Swap helper not set");

        // Approve swap helper to spend source tokens
        IERC20(sourceToken).forceApprove(swapHelper, amountIn);

        // Call SwapHelper.swap() with minAmountOut = 0 to use oracle-based calculation
        // The SwapHelper will handle slippage protection internally
        amountOut = ISwapHelper(swapHelper).swap(
            sourceToken,
            targetToken,
            amountIn,
            0, // minAmountOut: 0 means use oracle-based calculation
            recipient
        );

        return amountOut;
    }

    /**
     * @notice Check if interval is valid
     * @param interval The interval to check
     * @return True if valid
     */
    function _isValidInterval(uint256 interval) internal pure returns (bool) {
        return interval == INTERVAL_1_HOUR ||
               interval == INTERVAL_4_HOURS ||
               interval == INTERVAL_1_DAY ||
               interval == INTERVAL_1_WEEK;
    }
}
