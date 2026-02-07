# CRE Patterns - Undocumented Stuff from Bootcamp

CRE (Chainlink Runtime Environment) is new. This doc covers patterns from the Jan 2025 bootcamp that aren't in public docs yet.

**Full bootcamp transcripts available at:** `/bootcamp-transcripts/` (use if stuck)

---

## Core Concepts

| Concept | What It Is |
|---------|-----------|
| **Workflow** | TypeScript code compiled to WASM, runs on DON nodes |
| **Trigger** | Event that starts workflow (HTTP, Log, Cron) |
| **Capability** | Actions workflow can take (HTTP request, EVM read/write) |
| **DON** | Decentralized Oracle Network - multiple nodes run your code |

---

## Project Structure

```
cre-project/
├── .env                    # Private keys, API keys (gitignored)
├── secrets.yaml            # Maps secret names → env vars
├── project.yaml            # CRE project config
│
└── verify-engagement/      # Workflow directory
    ├── main.ts             # Entry point (exports initWorkflow)
    ├── logCallback.ts      # Handler for log trigger
    ├── config.staging.json # Contract addresses, chain config
    └── workflow.yaml       # Environment settings
```

---

## Pattern 1: initWorkflow Entry Point

Every workflow exports `initWorkflow()` that returns handlers.

```typescript
export function initWorkflow(config: Config): SeriHandler[] {
  // Setup triggers
  // Return array of { trigger, callback } pairs
}
```

**Key point**: This function runs once at setup. Callbacks run when triggered.

---

## Pattern 2: Log Trigger

Watches for events emitted by a smart contract.

```typescript
const eventHash = Seri.utils.keccak256("VerificationRequested(uint256,address,string)");

const logTrigger = evmClient.logTrigger({
  addresses: [contractAddress],
  topics: [eventHash],         // First topic = event signature hash
  confidence: "finalized"      // Wait for finality (important for payments)
});
```

**Confidence levels:**
- `"finalized"` - Safest, use for anything involving money
- `"safe"` - Good balance
- `"latest"` - Fast but risky (could reorg)

**Callback receives:**
- `payload.topics[]` - Indexed event params (bytes)
- `payload.data` - Non-indexed params (bytes)
- Use viem's `decodeEventLog` to parse

---

## Pattern 3: Two-Step EVM Write (Critical!)

CRE cannot write directly to your contract. Must go through Keystone Forwarder.

**Step 1: Generate signed report**
```typescript
const reportResponse = await runtime.report({
  payload: Seri.utils.hexToBase64(encodedData),
  keyId: "default",
  hashAlgorithm: "keccak256",
  signatureAlgorithm: "ecdsa"
}).call();
```

**Step 2: Submit via forwarder**
```typescript
const result = await evmClient.writeReport(runtime, {
  receiverAddress: contractAddress,
  report: reportResponse,
  gasConfig: { gasLimit: 500000 }
});
```

**Your contract must:**
1. Inherit `ReceiverTemplate`
2. Implement `_processReport(bytes metadata, bytes report)`
3. Constructor takes forwarder address

---

## Pattern 4: EVM Read

Call view functions before deciding to write.

```typescript
const result = await evmClient.callContract(runtime, {
  call: {
    from: zeroAddress,              // Always zero address
    to: contractAddress,
    data: encodedCallData           // Use viem encodeFunctionData
  },
  blockNumber: Seri.constants.lastFinalizedBlockNumber
});
```

**Block number options:**
- `lastFinalizedBlockNumber` - Safest
- `latestBlockNumber` - Most recent
- Specific number as bigint

---

## Pattern 5: HTTP Capability

All DON nodes call APIs independently, then reach consensus.

```typescript
const response = await httpClient.sendRequest(
  runtime,
  async () => ({
    url: "https://our-backend.com/api/metrics/youtube/abc123",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  }),
  Seri.consensus.identicalAggregation   // All nodes must get same result
).call();
```

**Consensus strategies:**
- `identicalAggregation` - All must match (use for metrics, binary data)
- `medianAggregation` - Returns median (use for prices)
- `commonPrefixAggregation` - Longest common prefix

---

## Pattern 6: HTTP Cache Settings

Prevent duplicate API calls (important for POST/PUT or rate-limited APIs):

```typescript
await httpClient.sendRequest(
  runtime,
  fetchFunction,
  consensus,
  {
    cacheSettings: {
      store: true,
      maxAge: 60   // seconds
    }
  }
).call();
```

First node makes request and caches. Other nodes use cached result for consensus.

---

## Pattern 7: Secrets

**secrets.yaml** (project root):
```yaml
YOUTUBE_TOKEN:
  type: env
  key: YOUTUBE_TOKEN_ENV    # MUST differ from secret name
```

**.env:**
```
YOUTUBE_TOKEN_ENV=actual_token_value
```

**In code:**
```typescript
const token = await runtime.getSecret("YOUTUBE_TOKEN");
```

**Critical**: Secret name (`YOUTUBE_TOKEN`) cannot match env var name (`YOUTUBE_TOKEN_ENV`). This is a known gotcha.

---

## Pattern 8: Config Files

**config.staging.json:**
```json
{
  "evms": [{
    "contractAddress": "0x...",
    "chainSelectorName": "base-testnet-sepolia",
    "gasLimit": 500000
  }],
  "backendUrl": "https://flowback-api.com"
}
```

**Chain selector names** (exact strings):
- `ethereum-testnet-sepolia`
- `base-testnet-sepolia`
- `arbitrum-testnet-sepolia`
- `polygon-testnet-amoy`

---

## Pattern 9: Smart Contract Template

```solidity
import "./ReceiverTemplate.sol";

contract MyContract is ReceiverTemplate {
    constructor(address forwarder) ReceiverTemplate(forwarder) {}
    
    function _processReport(
        bytes calldata metadata,
        bytes calldata report
    ) internal override {
        // Decode and handle report
        (uint256 id, address user, uint256 amount) = 
            abi.decode(report, (uint256, address, uint256));
    }
}
```

**Keystone Forwarder addresses:**
- Look up current addresses in Chainlink docs for each network
- Different per testnet/mainnet

---

## CLI Commands

```bash
# Setup
seri version              # Check CLI version
seri login                # Authenticate
seri init                 # Initialize new project

# Development
seri workflow simulate my-workflow              # Dry run (no TX)
seri workflow simulate my-workflow --broadcast  # Actually sends TX

# For hackathon: Must use --broadcast to prove on-chain execution
```

**Log trigger simulation prompts for:**
1. TX hash containing the event
2. Event index in that TX (usually 0)

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| "Secret not found" | Add `secrets_path` to workflow.yaml |
| "Secret name collision" | Make secret name ≠ env var name |
| "Gas estimation failed" | Increase gasLimit in config |
| TX fails silently | Check contract has correct forwarder address |
| Metrics don't match | Use `identicalAggregation` + ensure API returns consistent response |

---

## FlowBack-Specific Notes

1. **Our backend acts as OAuth proxy** - CRE calls our API, we call YouTube/TikTok with stored tokens

2. **Metrics endpoint must be deterministic** - Same videoId should return same metrics within cache window (for DON consensus)

3. **Use finalized confidence** - No payout on unfinalized blocks

4. **Index campaignId and creator in event** - Makes log filtering efficient:
   ```solidity
   event VerificationRequested(
       uint256 indexed campaignId,
       address indexed creator,
       string videoId,
       string platform
   );
   ```

5. **Report prefix routing** - If contract handles multiple report types, prefix bytes:
   ```typescript
   // In CRE
   const data = "0x01" + verificationData.slice(2); // 0x01 = verification type
   
   // In contract
   if (report[0] == 0x01) { handleVerification(...) }
   ```
