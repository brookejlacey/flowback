/**
 * FlowBack CRE Verify-Engagement Workflow
 *
 * Listens for VerificationRequested events on-chain, fetches engagement
 * metrics from our backend, verifies they meet campaign thresholds,
 * and writes the result back to the contract via Keystone Forwarder.
 *
 * Flow: Log Trigger → HTTP Fetch Metrics → EVM Read Campaign → Report → EVM Write
 */

import {
  SeriHandler,
  Config,
  Runtime,
  Seri,
  EvmClient,
  HttpClient,
} from "@anthropic/cre-sdk"; // CRE SDK types (resolved at build time by seri CLI)

import { logCallback } from "./logCallback";

// ABI fragment for the VerificationRequested event
const VERIFICATION_REQUESTED_EVENT =
  "VerificationRequested(uint256 indexed campaignId, address indexed creator, string videoId, string platform)";

export function initWorkflow(config: Config): SeriHandler[] {
  const evmConfig = config.evms[0];
  const contractAddress = evmConfig.contractAddress;

  // Create EVM client for the target chain
  const evmClient = Seri.evm.newClient({
    chainSelectorName: evmConfig.chainSelectorName,
  });

  // Create HTTP client for backend API calls
  const httpClient = Seri.http.newClient();

  // Compute event signature hash for log trigger
  const eventHash = Seri.utils.keccak256(VERIFICATION_REQUESTED_EVENT);

  // Set up log trigger: watch for VerificationRequested events
  const logTrigger = evmClient.logTrigger({
    addresses: [contractAddress],
    topics: [eventHash],
    confidence: "finalized", // Wait for finality — we're handling money
  });

  return [
    {
      trigger: logTrigger,
      callback: (runtime: Runtime, payload: any) =>
        logCallback(runtime, payload, {
          evmClient,
          httpClient,
          contractAddress,
          backendUrl: config.backendUrl,
          gasLimit: evmConfig.gasLimit,
        }),
    },
  ];
}
