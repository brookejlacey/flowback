// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FlowBackCampaign} from "../src/FlowBackCampaign.sol";

contract DeployScript is Script {
    function run() external {
        // Base Sepolia USDC
        address usdc = vm.envAddress("USDC_ADDRESS");
        // Keystone Forwarder address for Base Sepolia
        address forwarder = vm.envAddress("KEYSTONE_FORWARDER");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY_ENV");

        vm.startBroadcast(deployerKey);

        FlowBackCampaign campaign = new FlowBackCampaign(forwarder, usdc);
        console.log("FlowBackCampaign deployed at:", address(campaign));

        vm.stopBroadcast();
    }
}
