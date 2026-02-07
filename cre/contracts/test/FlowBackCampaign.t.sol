// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {FlowBackCampaign} from "../src/FlowBackCampaign.sol";
import {ReceiverTemplate} from "../src/ReceiverTemplate.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC for testing (6 decimals like real USDC)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FlowBackCampaignTest is Test {
    FlowBackCampaign public campaign;
    MockUSDC public usdc;

    address public forwarder = address(0xF0);
    address public brand = address(0xB1);
    address public creator = address(0xC1);
    address public deployer = address(this);

    uint256 constant BUDGET = 100_000_000; // 100 USDC (6 decimals)
    uint256 constant PAYOUT_PER_1K = 10_000; // 0.01 USDC per 1000 views
    uint256 constant MIN_VIEWS = 1_000;
    uint64 constant DURATION = 7 days;

    function setUp() public {
        usdc = new MockUSDC();
        campaign = new FlowBackCampaign(forwarder, address(usdc));

        // Fund brand with USDC
        usdc.mint(brand, 1_000_000_000); // 1000 USDC
    }

    // ──────────────────────────────────────────────
    //  Campaign Creation
    // ──────────────────────────────────────────────

    function test_CreateCampaign() public {
        vm.startPrank(brand);
        usdc.approve(address(campaign), BUDGET);

        vm.expectEmit(true, true, false, true);
        emit FlowBackCampaign.CampaignCreated(0, brand, BUDGET);

        uint256 campaignId = campaign.createCampaign(
            "Test Campaign",
            BUDGET,
            PAYOUT_PER_1K,
            MIN_VIEWS,
            DURATION
        );
        vm.stopPrank();

        assertEq(campaignId, 0);
        assertEq(usdc.balanceOf(address(campaign)), BUDGET);

        FlowBackCampaign.Campaign memory c = campaign.getCampaign(0);
        assertEq(c.brand, brand);
        assertEq(c.budget, BUDGET);
        assertEq(c.spent, 0);
        assertEq(c.payoutPer1kViews, PAYOUT_PER_1K);
        assertEq(c.minViews, MIN_VIEWS);
        assertTrue(c.active);
    }

    function test_CreateCampaign_RevertZeroBudget() public {
        vm.startPrank(brand);
        usdc.approve(address(campaign), BUDGET);
        vm.expectRevert(FlowBackCampaign.InvalidBudget.selector);
        campaign.createCampaign("Bad", 0, PAYOUT_PER_1K, MIN_VIEWS, DURATION);
        vm.stopPrank();
    }

    function test_CreateCampaign_RevertZeroDuration() public {
        vm.startPrank(brand);
        usdc.approve(address(campaign), BUDGET);
        vm.expectRevert(FlowBackCampaign.InvalidDuration.selector);
        campaign.createCampaign("Bad", BUDGET, PAYOUT_PER_1K, MIN_VIEWS, 0);
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────
    //  Verification Request
    // ──────────────────────────────────────────────

    function test_RequestVerification() public {
        _createCampaign();

        vm.prank(creator);
        vm.expectEmit(true, true, false, true);
        emit FlowBackCampaign.VerificationRequested(0, creator, "vid123", "youtube");
        campaign.requestVerification(0, "vid123", "youtube");
    }

    function test_RequestVerification_RevertDuplicate() public {
        _createCampaign();

        vm.startPrank(creator);
        campaign.requestVerification(0, "vid123", "youtube");

        bytes32 subId = keccak256(abi.encodePacked(uint256(0), creator, "vid123"));
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.SubmissionAlreadyExists.selector, subId
        ));
        campaign.requestVerification(0, "vid123", "youtube");
        vm.stopPrank();
    }

    function test_RequestVerification_RevertInactive() public {
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.CampaignNotActive.selector, 99
        ));
        vm.prank(creator);
        campaign.requestVerification(99, "vid123", "youtube");
    }

    function test_RequestVerification_RevertExpired() public {
        _createCampaign();

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.CampaignExpired.selector, 0
        ));
        campaign.requestVerification(0, "vid123", "youtube");
    }

    // ──────────────────────────────────────────────
    //  CRE Report Processing (Verification + Payout)
    // ──────────────────────────────────────────────

    function test_ProcessReport_PayoutAboveMinViews() public {
        _createCampaign();

        uint256 viewCount = 50_000; // 50k views
        // Expected payout: 50000 * 10000 / 1000 = 500_000 (0.50 USDC)
        uint256 expectedPayout = (viewCount * PAYOUT_PER_1K) / 1000;

        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", viewCount
        );

        uint256 creatorBalBefore = usdc.balanceOf(creator);

        // Simulate forwarder calling onReport
        vm.prank(forwarder);
        campaign.onReport("", report);

        assertEq(usdc.balanceOf(creator) - creatorBalBefore, expectedPayout);

        FlowBackCampaign.Campaign memory c = campaign.getCampaign(0);
        assertEq(c.spent, expectedPayout);
    }

    function test_ProcessReport_RejectedBelowMinViews() public {
        _createCampaign();

        uint256 viewCount = 500; // Below MIN_VIEWS (1000)

        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", viewCount
        );

        uint256 creatorBalBefore = usdc.balanceOf(creator);

        vm.prank(forwarder);
        campaign.onReport("", report);

        // No payout
        assertEq(usdc.balanceOf(creator), creatorBalBefore);

        bytes32 vId = keccak256(abi.encodePacked(uint256(0), creator, "vid123"));
        FlowBackCampaign.Verification memory v = campaign.getVerification(vId);
        assertTrue(v.processed);
        assertEq(v.payoutAmount, 0);
    }

    function test_ProcessReport_CappedAtRemainingBudget() public {
        _createCampaign();

        // Massive view count that would exceed budget
        uint256 viewCount = 100_000_000; // 100M views
        // Would be: 100M * 10000 / 1000 = 1_000_000_000 (1000 USDC) but budget is 100 USDC
        uint256 expectedPayout = BUDGET; // Capped at budget

        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", viewCount
        );

        vm.prank(forwarder);
        campaign.onReport("", report);

        assertEq(usdc.balanceOf(creator), expectedPayout);
    }

    function test_ProcessReport_RevertDuplicate() public {
        _createCampaign();

        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", uint256(5000)
        );

        vm.prank(forwarder);
        campaign.onReport("", report);

        bytes32 vId = keccak256(abi.encodePacked(uint256(0), creator, "vid123"));
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.VerificationAlreadyProcessed.selector, vId
        ));
        campaign.onReport("", report);
    }

    function test_ProcessReport_RevertUnauthorized() public {
        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", uint256(5000)
        );

        vm.prank(address(0xBAD));
        vm.expectRevert(abi.encodeWithSelector(
            ReceiverTemplate.UnauthorizedForwarder.selector, address(0xBAD)
        ));
        campaign.onReport("", report);
    }

    // ──────────────────────────────────────────────
    //  Withdraw Remaining
    // ──────────────────────────────────────────────

    function test_WithdrawRemaining() public {
        _createCampaign();

        // Process a small payout first
        bytes memory report = abi.encode(
            uint256(0), creator, "vid123", "youtube", uint256(5000)
        );
        vm.prank(forwarder);
        campaign.onReport("", report);

        uint256 spent = campaign.getCampaign(0).spent;
        uint256 expectedRefund = BUDGET - spent;

        // Fast forward past campaign end
        vm.warp(block.timestamp + DURATION + 1);

        uint256 brandBalBefore = usdc.balanceOf(brand);

        vm.prank(brand);
        campaign.withdrawRemaining(0);

        assertEq(usdc.balanceOf(brand) - brandBalBefore, expectedRefund);
        assertFalse(campaign.getCampaign(0).active);
    }

    function test_WithdrawRemaining_RevertNotBrand() public {
        _createCampaign();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.NotCampaignBrand.selector, 0
        ));
        campaign.withdrawRemaining(0);
    }

    function test_WithdrawRemaining_RevertNotExpired() public {
        _createCampaign();

        vm.prank(brand);
        vm.expectRevert(abi.encodeWithSelector(
            FlowBackCampaign.CampaignNotExpired.selector, 0
        ));
        campaign.withdrawRemaining(0);
    }

    // ──────────────────────────────────────────────
    //  Pause
    // ──────────────────────────────────────────────

    function test_Pause_BlocksCreation() public {
        campaign.pause();

        vm.startPrank(brand);
        usdc.approve(address(campaign), BUDGET);
        vm.expectRevert();
        campaign.createCampaign("Test", BUDGET, PAYOUT_PER_1K, MIN_VIEWS, DURATION);
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _createCampaign() internal returns (uint256) {
        vm.startPrank(brand);
        usdc.approve(address(campaign), BUDGET);
        uint256 id = campaign.createCampaign(
            "Test Campaign",
            BUDGET,
            PAYOUT_PER_1K,
            MIN_VIEWS,
            DURATION
        );
        vm.stopPrank();
        return id;
    }
}
