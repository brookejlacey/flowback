# FlowBack — Hackathon Strategy (Triple-Track)

## Updated Timeline

| Track | Deadline | Submission Method | Prize Pool |
|-------|----------|-------------------|------------|
| **Main CRE Track** | March 1 (extended) | Human submits via Devpost | $100K+ |
| **Privacy Track** | March 1 | Human submits via Devpost | Part of main pool |
| **Agents Track (NEW)** | March 8 | Agent posts to m/chainlink-official on Moltbook | Separate pool |

---

## Track 1: Main CRE Track (Core Product)

**What it is**: Creator payment verification via Chainlink CRE.

**Status**: 85% complete. Smart contract deployed, CRE workflow written, backend + frontend done.

**Remaining work**:
- Get OAuth credentials (YouTube + TikTok)
- Spin up PostgreSQL (Supabase)
- Populate .env files
- Register CRE workflow on Chainlink platform
- Add campaign detail page
- End-to-end test
- Record demo video

---

## Track 2: Privacy Track (Low-Effort Add-On)

### Why NOT ZK Proofs

Claude Desktop suggested SP1/Risc0 ZK proofs. **Pushing back on this hard:**

- ZK circuit + prover + on-chain verifier = a whole second project
- Half-baked ZK will hurt more than help with judges
- The time is better spent polishing core functionality

### What to Do Instead

FlowBack **already has** meaningful privacy properties. Lean into them:

| Privacy Property | Already True? | Extra Work |
|-----------------|---------------|------------|
| OAuth tokens stored server-side (never on-chain) | Yes | None |
| Metrics only exposed to CRE DON nodes during verification | Yes | None |
| Contract stores per-verification data, not ongoing analytics | Yes | None |
| Encrypted token storage (`encryptedAccessToken` field exists) | Schema yes, crypto no | ~1 hour |
| Creator controls which campaigns to join (selective disclosure) | Yes | None |

**Privacy pitch**: "Privacy-preserving creator verification — metrics are verified by Chainlink's decentralized oracle network without exposing raw API credentials or continuous analytics data on-chain. OAuth tokens are encrypted at rest and never touch the blockchain."

**This is honest, true today, and requires minimal additional work.**

---

## Track 3: Agents Track (Biggest Edge)

### Why This Matters Most

- **Separate prize pool** with less competition (most teams won't do this)
- **Extra week** (March 8 vs March 1)
- **Same project** = zero conflict with other tracks
- Demonstrates advanced CRE integration

### What is Moltbook?

- "Reddit for AI agents" — launched Jan 2026, 1.6M+ agents
- Humans can observe only — agents post, comment, vote
- Built on **OpenClaw** (open-source agent framework)
- Has "submolts" (like subreddits)
- **m/chainlink-official** = where hackathon agent submissions go

### Agent Architecture: Autonomous Campaign Manager

**NOT a notification bot.** The FlowBack Agent should be an autonomous campaign manager:

1. Accept campaign briefs from brands via Moltbook posts/comments
2. Match creators to campaigns based on content profiles
3. Trigger verifications via CRE when content is posted
4. Post verification results and campaign analytics to Moltbook
5. Respond to questions about FlowBack

### Agent Tech Stack

- **OpenClaw** — agent framework with "skills" (markdown instruction files)
- **CRE Agent Skills** — OpenClaw skills that invoke Chainlink CRE workflows
- **Moltbook API** — agent registers, posts to m/chainlink-official

### Agent Setup

1. Install OpenClaw locally
2. Create FlowBack skill (SKILL.md + HEARTBEAT.md)
3. Register agent on Moltbook (requires "claim tweet")
4. Agent reads moltbook.com/skill.md to learn platform rules
5. Agent heartbeats every ~4 hours

### Registration

- Agent registers itself on Moltbook
- Human registers agent via Chainlink's registration link
- Human posts "claim tweet" to prove ownership

---

## Execution Priority

### Phase 1: Ship the Core (Now → March 1)

| # | Task | Effort | Blocks |
|---|------|--------|--------|
| 1 | Set up Supabase PostgreSQL + populate .env | 30 min | Everything |
| 2 | Get YouTube OAuth credentials (Google Cloud Console) | 1 hr | OAuth demo |
| 3 | Get TikTok OAuth credentials (TikTok Developer Portal) | 1 hr | OAuth demo |
| 4 | Update CRE config with real backend URL | 5 min | CRE pipeline |
| 5 | Register CRE workflow on Chainlink platform | 30 min | Live verification |
| 6 | Build campaign detail page | 1 hr | UI completeness |
| 7 | End-to-end test full flow | 2 hr | Demo proof |
| 8 | Record demo video | 1 hr | Submission |

### Phase 2: Privacy Angle (Low-Effort Add)

| # | Task | Effort |
|---|------|--------|
| 1 | Implement encrypted token storage (crypto layer) | 1 hr |
| 2 | Add privacy section to submission/pitch | 30 min |

### Phase 3: Agent Track (March 1-8)

| # | Task | Effort |
|---|------|--------|
| 1 | Research & install OpenClaw | 2 hr |
| 2 | Register Moltbook agent | 30 min |
| 3 | Build FlowBack skill (SKILL.md, HEARTBEAT.md) | 4 hr |
| 4 | Connect agent to CRE workflow triggers | 2 hr |
| 5 | Agent posts submission to m/chainlink-official | 1 hr |

---

## Key Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| FlowBackCampaign (real USDC) | `0x56A512A9Dfa24F0Bb823a782afe3b658627C6496` |
| FlowBackCampaign (MockUSDC) | `0xB4346715Eb4691b1a372ac7FF64D551f66d7be45` |
| MockUSDC | `0x496Ee1c4b1B50C1e4438A588f0eB9B39f65246E7` |
| Real USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Keystone Forwarder | `0x82300bd7c3958625581cc2f77bc6464dcecdf3e5` |
| Deployer wallet | `0x9aB63016DA054f66b013C642b8348aC1b09d84ad` |

---

## Pushback Log

### Claude Desktop Suggestion: ZK Proofs for Privacy Track
**Rejected.** SP1/Risc0 integration is a multi-week project, not a bolt-on. Half-baked ZK hurts more than it helps. Instead: lean into existing privacy properties + add encrypted token storage.

### Claude Desktop Suggestion: Agent as "Monitoring Bot"
**Upgraded.** A bot that "monitors and posts updates" is boring and won't win. Build an autonomous campaign manager that actively matches creators to campaigns and manages the verification lifecycle.
