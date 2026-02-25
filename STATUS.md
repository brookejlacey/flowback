# FlowBack — Project Status

## Last Updated
2026-02-24 — Triple-track hackathon strategy implementation

## What's Done

### Core Product (Track 1: Main CRE)
1. **Smart Contract** — FlowBackCampaign.sol deployed to Base Sepolia, 16 tests passing
2. **CRE Workflow** — verify-engagement with log trigger, HTTP fetch, EVM write
3. **Express Backend** — SIWE auth, campaigns, submissions, platforms, metrics, OAuth routes
4. **Prisma Schema** — 6 models (User, PlatformConnection, Campaign, Submission, Verification, MetricSnapshot)
5. **Next.js Frontend** — Landing, campaigns (list + detail), campaigns/create, dashboard pages
6. **OAuth** — YouTube + TikTok OAuth 2.0 flows, token refresh, frontend connect/disconnect UI
7. **Campaign Detail Page** — Full detail view with submissions, on-chain budget, brand withdraw
8. **Clickable Campaign Cards** — Campaign list links to detail pages
9. **E2E Test** — Full payout simulation verified on Base Sepolia fork (15,234 views → 0.152340 USDC)

### Privacy Features (Track 2: Privacy)
10. **Token Encryption** — AES-256-GCM encryption for OAuth tokens at rest
11. **Privacy Architecture** — Metrics verified by CRE DON without exposing credentials on-chain
12. **Selective Disclosure** — Only per-verification view counts stored on-chain, not continuous analytics

### Agent Scaffolding (Track 3: Agents)
13. **FlowBack Skill** — SKILL.md with agent instructions, API endpoints, contract addresses
14. **Heartbeat Routine** — HEARTBEAT.md with periodic campaign monitoring logic
15. **Agent README** — Setup instructions for OpenClaw + Moltbook integration

## What's Next

### Before March 1 (Main + Privacy Tracks)
- [ ] **Set up Supabase PostgreSQL** — Create project, get connection string
- [ ] **Populate `apps/api/.env`** — DATABASE_URL, SESSION_SECRET, OAuth credentials
- [ ] **Get YouTube OAuth credentials** — Google Cloud Console → APIs & Services → OAuth 2.0
- [ ] **Get TikTok OAuth credentials** — TikTok Developer Portal → Login Kit
- [ ] **Run `npx prisma db push`** — Sync schema to Supabase
- [ ] **Test OAuth flow end-to-end** — Connect YouTube, verify tokens encrypted in DB
- [ ] **Deploy backend** — Railway/Render/Vercel (update CRE config backendUrl)
- [ ] **Register CRE workflow** — Chainlink platform, DON feed setup
- [ ] **Record demo video** — 5-min walkthrough of full flow
- [ ] **Submit to Devpost** — Main CRE track + Privacy track

### Before March 8 (Agent Track)
- [ ] **Install OpenClaw** — `curl -fsSL https://openclaw.dev/install.sh | bash`
- [ ] **Register Moltbook agent** — Post claim tweet, register via Chainlink link
- [ ] **Deploy FlowBack skill** — Copy to `~/.openclaw/skills/flowback/`
- [ ] **Test agent heartbeat** — Verify it reads campaigns and checks on-chain events
- [ ] **Agent posts to m/chainlink-official** — Submission post with project description
- [ ] **Register agent (human)** — Use Chainlink registration link from email

## Key Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| FlowBackCampaign (real USDC) | `0x56A512A9Dfa24F0Bb823a782afe3b658627C6496` |
| FlowBackCampaign (MockUSDC) | `0xB4346715Eb4691b1a372ac7FF64D551f66d7be45` |
| MockUSDC | `0x496Ee1c4b1B50C1e4438A588f0eB9B39f65246E7` |
| Real USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Keystone Forwarder | `0x82300bd7c3958625581cc2f77bc6464dcecdf3e5` |
| Deployer wallet | `0x9aB63016DA054f66b013C642b8348aC1b09d84ad` |

## How to Run

```bash
# Backend (port 3001)
cd apps/api && npm run dev

# Frontend (port 3000)
cd apps/web && npm run dev

# Smart contract tests
cd cre/contracts && forge test -vv
```

## Triple-Track Submission Strategy

See [STRATEGY.md](./STRATEGY.md) for full details.

| Track | Deadline | Status |
|-------|----------|--------|
| Main CRE | March 1 | Code complete, needs credentials + deploy |
| Privacy | March 1 | Encryption done, needs pitch writeup |
| Agents | March 8 | Skills scaffolded, needs OpenClaw setup |
