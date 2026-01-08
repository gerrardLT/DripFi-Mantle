// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/DCAVault.sol";
import "../src/DCAStrategy.sol";
import "../src/SwapHelper.sol";
import "../src/PriceOracle.sol";

/**
 * @title DeployScript
 * @notice Deployment script for DripFi-Mantle Protocol
 */
contract DeployScript is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deploying to Mantle Sepolia Testnet...");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PriceOracle
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));

        // 2. Deploy DCAVault
        DCAVault vault = new DCAVault();
        console.log("DCAVault deployed at:", address(vault));

        // 3. Deploy SwapHelper (with placeholder addresses, will configure later)
        // Using deployer as placeholder for router and oracle
        SwapHelper swapHelper = new SwapHelper(deployer, address(priceOracle));
        console.log("SwapHelper deployed at:", address(swapHelper));

        // 4. Deploy DCAStrategy
        DCAStrategy strategy = new DCAStrategy(address(vault));
        console.log("DCAStrategy deployed at:", address(strategy));

        // 5. Configure contracts
        
        // Set strategy in vault
        vault.setStrategy(address(strategy));
        console.log("Strategy set in vault");

        // Set swap helper in strategy
        strategy.setSwapHelper(address(swapHelper));
        console.log("SwapHelper set in strategy");

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\n========================================");
        console.log("=== DripFi-Mantle Protocol Deployment ===");
        console.log("========================================");
        console.log("PriceOracle:", address(priceOracle));
        console.log("DCAVault:", address(vault));
        console.log("SwapHelper:", address(swapHelper));
        console.log("DCAStrategy:", address(strategy));
        console.log("========================================");
        console.log("\nNext steps:");
        console.log("1. Add supported tokens: vault.setSupportedToken(tokenAddress, true)");
        console.log("2. Add trading pairs: strategy.setSupportedPair(source, target, true)");
        console.log("3. Configure DEX router: swapHelper.setRouter(routerAddress)");
        console.log("4. Configure price feeds: priceOracle.setPriceFeed(token, feedAddress)");
        console.log("5. Register with Chainlink Automation");
        console.log("========================================\n");
    }
}
