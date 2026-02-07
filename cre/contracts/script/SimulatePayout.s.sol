// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FlowBackCampaign} from "../src/FlowBackCampaign.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Simulates CRE payout by calling onReport from the forwarder address.
///         Uses vm.prank to impersonate the Keystone Forwarder on a fork.
contract SimulatePayoutScript is Script {
    function run() external {
        address contractAddr = vm.envAddress("CONTRACT_ADDRESS");
        address forwarder = vm.envAddress("KEYSTONE_FORWARDER");
        address creator = vm.envAddress("CREATOR_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");

        FlowBackCampaign campaign = FlowBackCampaign(contractAddr);
        IERC20 usdc = IERC20(usdcAddr);

        uint256 viewCount = 15234;

        console.log("--- Before payout ---");
        console.log("Creator USDC balance:", usdc.balanceOf(creator));
        console.log("Campaign remaining:", campaign.getRemainingBudget(0));

        // Encode report: (campaignId, creator, videoId, platform, viewCount)
        bytes memory report = abi.encode(
            uint256(0),
            creator,
            "dQw4w9WgXcQ",
            "youtube",
            viewCount
        );

        // Impersonate the Keystone Forwarder
        vm.prank(forwarder);
        campaign.onReport("", report);

        console.log("--- After payout ---");
        console.log("Creator USDC balance:", usdc.balanceOf(creator));
        console.log("Campaign remaining:", campaign.getRemainingBudget(0));
        console.log("Payout: 15234 views * 0.01/1k = 0.152340 USDC");
    }
}
