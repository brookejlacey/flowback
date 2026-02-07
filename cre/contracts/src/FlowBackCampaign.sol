// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReceiverTemplate} from "./ReceiverTemplate.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title FlowBackCampaign
/// @notice Manages creator payment campaigns with CRE-verified engagement metrics.
///         Brands deposit USDC, creators submit content, CRE verifies views,
///         and the contract auto-releases payments.
contract FlowBackCampaign is ReceiverTemplate, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct Campaign {
        address brand;
        string name;
        uint256 budget;          // Total USDC deposited (6 decimals)
        uint256 spent;           // USDC paid out so far
        uint256 payoutPer1kViews; // USDC per 1000 views (6 decimals)
        uint256 minViews;        // Minimum views to qualify
        uint64 startTime;
        uint64 endTime;
        bool active;
    }

    struct Verification {
        uint256 campaignId;
        address creator;
        string videoId;
        string platform;
        uint256 viewCount;
        uint256 payoutAmount;
        bool processed;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public owner;

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;

    mapping(bytes32 => Verification) public verifications;
    mapping(bytes32 => bool) public submissionExists;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event CampaignCreated(uint256 indexed campaignId, address indexed brand, uint256 budget);
    event VerificationRequested(
        uint256 indexed campaignId,
        address indexed creator,
        string videoId,
        string platform
    );
    event VerificationSubmitted(
        bytes32 indexed verificationId,
        uint256 indexed campaignId,
        address creator,
        uint256 viewCount
    );
    event PayoutReleased(bytes32 indexed verificationId, address indexed creator, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId, uint256 refundAmount);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error NotOwner();
    error CampaignNotActive(uint256 campaignId);
    error CampaignExpired(uint256 campaignId);
    error CampaignNotExpired(uint256 campaignId);
    error NotCampaignBrand(uint256 campaignId);
    error InvalidBudget();
    error InvalidDuration();
    error InvalidPayoutRate();
    error SubmissionAlreadyExists(bytes32 submissionId);
    error VerificationAlreadyProcessed(bytes32 verificationId);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(
        address _keystoneForwarder,
        address _usdc
    ) ReceiverTemplate(_keystoneForwarder) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    // ──────────────────────────────────────────────
    //  Campaign Management
    // ──────────────────────────────────────────────

    /// @notice Brand creates a campaign and deposits USDC
    /// @dev Caller must have approved this contract to spend `budget` USDC
    function createCampaign(
        string calldata name,
        uint256 budget,
        uint256 payoutPer1kViews,
        uint256 minViews,
        uint64 duration
    ) external whenNotPaused returns (uint256 campaignId) {
        if (budget == 0) revert InvalidBudget();
        if (duration == 0) revert InvalidDuration();
        if (payoutPer1kViews == 0) revert InvalidPayoutRate();

        campaignId = campaignCount++;

        campaigns[campaignId] = Campaign({
            brand: msg.sender,
            name: name,
            budget: budget,
            spent: 0,
            payoutPer1kViews: payoutPer1kViews,
            minViews: minViews,
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp) + duration,
            active: true
        });

        usdc.safeTransferFrom(msg.sender, address(this), budget);

        emit CampaignCreated(campaignId, msg.sender, budget);
    }

    /// @notice Creator submits a video for verification
    /// @dev Emits VerificationRequested which CRE log trigger listens for
    function requestVerification(
        uint256 campaignId,
        string calldata videoId,
        string calldata platform
    ) external whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];
        if (!campaign.active) revert CampaignNotActive(campaignId);
        if (block.timestamp > campaign.endTime) revert CampaignExpired(campaignId);

        bytes32 submissionId = keccak256(
            abi.encodePacked(campaignId, msg.sender, videoId)
        );
        if (submissionExists[submissionId]) revert SubmissionAlreadyExists(submissionId);
        submissionExists[submissionId] = true;

        emit VerificationRequested(campaignId, msg.sender, videoId, platform);
    }

    /// @notice Brand withdraws remaining budget after campaign ends
    function withdrawRemaining(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (msg.sender != campaign.brand) revert NotCampaignBrand(campaignId);
        if (block.timestamp <= campaign.endTime) revert CampaignNotExpired(campaignId);

        uint256 remaining = campaign.budget - campaign.spent;
        campaign.active = false;
        campaign.spent = campaign.budget; // Prevent double withdrawal

        if (remaining > 0) {
            usdc.safeTransfer(campaign.brand, remaining);
        }

        emit CampaignClosed(campaignId, remaining);
    }

    // ──────────────────────────────────────────────
    //  CRE Report Processing
    // ──────────────────────────────────────────────

    /// @notice Called by Keystone Forwarder with CRE verification results
    /// @dev Report format: abi.encode(campaignId, creator, videoId, platform, viewCount)
    function _processReport(
        bytes calldata,
        bytes calldata report
    ) internal override nonReentrant whenNotPaused {
        (
            uint256 campaignId,
            address creator,
            string memory videoId,
            string memory platform,
            uint256 viewCount
        ) = abi.decode(report, (uint256, address, string, string, uint256));

        bytes32 verificationId = keccak256(
            abi.encodePacked(campaignId, creator, videoId)
        );

        if (verifications[verificationId].processed) {
            revert VerificationAlreadyProcessed(verificationId);
        }

        Campaign storage campaign = campaigns[campaignId];

        // Calculate payout: (views / 1000) * payoutPer1kViews
        uint256 payoutAmount = 0;
        if (viewCount >= campaign.minViews) {
            payoutAmount = (viewCount * campaign.payoutPer1kViews) / 1000;

            // Cap at remaining budget
            uint256 remaining = campaign.budget - campaign.spent;
            if (payoutAmount > remaining) {
                payoutAmount = remaining;
            }
        }

        verifications[verificationId] = Verification({
            campaignId: campaignId,
            creator: creator,
            videoId: videoId,
            platform: platform,
            viewCount: viewCount,
            payoutAmount: payoutAmount,
            processed: true
        });

        emit VerificationSubmitted(verificationId, campaignId, creator, viewCount);

        if (payoutAmount > 0) {
            campaign.spent += payoutAmount;
            usdc.safeTransfer(creator, payoutAmount);
            emit PayoutReleased(verificationId, creator, payoutAmount);
        }
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getVerification(bytes32 verificationId) external view returns (Verification memory) {
        return verifications[verificationId];
    }

    function getRemainingBudget(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        return campaign.budget - campaign.spent;
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
