# FlowBack — Project Status

## Last Updated
Commit 55d2dc7 — "Add YouTube & TikTok OAuth with token refresh and platform connect UI"

## What's Done
1. **Smart Contract** — FlowBackCampaign.sol deployed to Base Sepolia, 16 tests passing
2. **CRE Workflow** — verify-engagement with log trigger, HTTP fetch, EVM write
3. **Express Backend** — SIWE auth, campaigns, submissions, platforms, metrics, OAuth routes
4. **Prisma Schema** — 6 models (User, PlatformConnection, Campaign, Submission, Verification, MetricSnapshot)
5. **Next.js Frontend** — Landing, campaigns, campaigns/create, dashboard pages
6. **OAuth** — YouTube + TikTok OAuth 2.0 flows, token refresh, frontend connect/disconnect UI
7. **E2E Test** — Full payout simulation verified on Base Sepolia fork (15,234 views → 0.152340 USDC)

## What's Next
- [ ] **Get OAuth credentials**: Google Cloud Console (YouTube Data API v3) + TikTok Developer Portal
- [ ] **Add env vars** to `apps/api/.env`:
  ```
  YOUTUBE_CLIENT_ID=
  YOUTUBE_CLIENT_SECRET=
  YOUTUBE_REDIRECT_URI=http://localhost:3001/oauth/youtube/callback
  TIKTOK_CLIENT_KEY=
  TIKTOK_CLIENT_SECRET=
  TIKTOK_REDIRECT_URI=http://localhost:3001/oauth/tiktok/callback
  ```
- [ ] **Test OAuth flow end-to-end**: start backend, click Connect YouTube on dashboard, authorize, verify tokens stored in DB
- [ ] **CRE deployment**: Register workflow on Chainlink platform, set up DON feed
- [ ] **Polish for hackathon submission**:
  - README with architecture diagram and demo instructions
  - Demo video / screenshots
  - Landing page polish
  - Campaign detail page with submission list
  - Real-time status updates (polling or WebSocket)

## Key Addresses (Base Sepolia)
| Contract | Address |
|----------|---------|
| FlowBackCampaign (MockUSDC) | `0xB4346715Eb4691b1a372ac7FF64D551f66d7be45` |
| FlowBackCampaign (real USDC) | `0x56A512A9Dfa24F0Bb823a782afe3b658627C6496` |
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
