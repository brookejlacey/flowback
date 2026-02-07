# Chainlink CRE Bootcamp - Key Takeaways

Reference for Claude Code when implementing CRE workflows. These are extracted from official Chainlink CRE bootcamp sessions (Jan 2025).

---

## Source

Full bootcamp transcripts were provided by user but are too large to include here. Key patterns and syntax are documented in:
- `../CRE_PATTERNS.md` - Implementation patterns
- `../ARCHITECTURE.md` - Full workflow code examples

If stuck on CRE implementation, ask user to re-share the bootcamp transcripts.

---

## Quick Reference

### CLI Commands
```bash
seri init                           # New project
seri version                        # Check version
seri workflow simulate my-workflow  # Dry run
seri workflow simulate my-workflow --broadcast  # On-chain TX
```

### Two-Step EVM Write (CRITICAL)
```typescript
// Step 1: Sign
const report = await runtime.report({
  payload: Seri.utils.hexToBase64(data),
  keyId: "default",
  hashAlgorithm: "keccak256",
  signatureAlgorithm: "ecdsa",
}).call();

// Step 2: Submit via forwarder
const result = await evmClient.writeReport(runtime, {
  receiverAddress: contractAddress,
  report: report,
  gasConfig: { gasLimit: 500000 },
});
```

### Log Trigger
```typescript
evmClient.logTrigger({
  addresses: [contractAddress],
  topics: [keccak256(eventSignature)],
  confidence: "finalized"
});
```

### HTTP with Consensus
```typescript
httpClient.sendRequest(
  runtime,
  () => ({ url, method, headers }),
  Seri.consensus.identicalAggregation
).call();
```

### Secrets
```yaml
# secrets.yaml - name MUST differ from env var
MY_SECRET:
  type: env
  key: MY_SECRET_VAR
```

```typescript
const value = await runtime.getSecret("MY_SECRET");
```

### Contract Must Implement
```solidity
contract MyContract is ReceiverTemplate {
    constructor(address forwarder) ReceiverTemplate(forwarder) {}
    
    function _processReport(bytes metadata, bytes report) internal override {
        // Handle CRE reports
    }
}
```

---

## Common Pitfalls from Bootcamp

1. **Secret name collision** - Secret name in code ≠ env var name
2. **Missing --broadcast** - Without this flag, TX won't execute on-chain
3. **Wrong forwarder address** - Each network has different Keystone Forwarder
4. **Gas too low** - Start with 500,000, adjust as needed
5. **Consensus strategy** - Use `identicalAggregation` for metrics, `medianAggregation` for prices
