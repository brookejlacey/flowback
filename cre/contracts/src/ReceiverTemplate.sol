// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReceiverTemplate
/// @notice Base contract for receiving CRE reports via the Keystone Forwarder.
///         Contracts must inherit this and implement _processReport().
abstract contract ReceiverTemplate {
    address public immutable keystoneForwarder;

    error UnauthorizedForwarder(address caller);

    constructor(address _keystoneForwarder) {
        keystoneForwarder = _keystoneForwarder;
    }

    /// @notice Called by the Keystone Forwarder to deliver a CRE report
    /// @param metadata Workflow metadata (workflow ID, execution ID, etc.)
    /// @param report The ABI-encoded report payload
    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != keystoneForwarder) {
            revert UnauthorizedForwarder(msg.sender);
        }
        _processReport(metadata, report);
    }

    /// @notice Override this to handle incoming CRE reports
    function _processReport(bytes calldata metadata, bytes calldata report) internal virtual;
}
