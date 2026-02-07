// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IKeystoneForwarder
/// @notice Interface for the Chainlink Keystone Forwarder that delivers CRE reports
interface IKeystoneForwarder {
    function report(
        address receiverAddress,
        bytes calldata rawReport,
        bytes calldata reportContext,
        bytes[] calldata signatures
    ) external;
}
