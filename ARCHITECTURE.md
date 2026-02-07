# FlowBack - Architecture Decisions

## What We're Building

Multi-platform creator payment app. Creators link YouTube/TikTok/Twitter → Brands fund campaigns → CRE verifies engagement metrics → Smart contract auto-releases USDC.

**Hackathon**: Chainlink CRE + AI Convergence (Feb 2025, $100K+ prizes)

---

## System Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Express   │────▶│  Chainlink  │────▶│   Smart     │
│   Frontend  │     │   Backend   │     │     CRE     │     │  Contract   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │                   ▼                   │                   ▼
      │             ┌───────────┐             │             ┌───────────┐
      │             │ PostgreSQL│             │             │   USDC    │
      │             └───────────┘             │             │  Payouts  │
      │                   │                   │             └───────────┘
      ▼                   ▼                   │
┌─────────────────────────────────────┐      │
│         Platform OAuth APIs          │◀─────┘
│  YouTube   │   TikTok   │  Twitter   │
└─────────────────────────────────────┘
```

---

## Core Data Flows

### Flow 1: Creator Onboarding
```
Creator connects wallet (SIWE)
    → OAuth to YouTube/TikTok/Twitter
    → Backend stores encrypted tokens in DB
    → Creator sees connected accounts in dashboard
```

### Flow 2: Campaign Creation
```
Brand connects wallet
    → Creates campaign (name, budget, payout rules)
    → Approves USDC spend
    → Calls createCampaign() on smart contract
    → USDC locked in contract
```

### Flow 3: Verification & Payout (CRE)
```
Creator submits video URL
    → Backend validates URL, stores submission
    → Calls requestVerification() on contract
    → Contract emits VerificationRequested event
    
CRE Log Trigger picks up event
    → CRE calls our backend API for metrics
    → Backend fetches from YouTube/TikTok using stored OAuth
    → CRE verifies: viewCount >= minViews?
    → CRE writes verification result to contract
    → Contract auto-transfers USDC to creator
```

---

## Tech Stack Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 (App Router) | Fast, good DX, easy deploy |
| Styling | Tailwind + shadcn/ui | Rapid UI, looks professional |
| Wallet | wagmi + viem | Standard, well-maintained |
| Backend | Express + TypeScript | Simple, flexible |
| ORM | Prisma | Type-safe, migrations |
| Database | PostgreSQL | Reliable, free tier on Supabase/Neon |
| Blockchain | Base Sepolia | Low fees, Coinbase ecosystem |
| Oracle | Chainlink CRE | Hackathon requirement |
| Payments | USDC | Stable, widely held |

---

## Database Schema

```
users
  - id
  - wallet_address (unique)
  - created_at

platform_connections
  - id
  - user_id → users
  - platform (youtube | tiktok | twitter)
  - platform_user_id
  - access_token (encrypted)
  - refresh_token (encrypted)
  - expires_at
  - created_at

campaigns
  - id
  - chain_campaign_id (from smart contract)
  - brand_wallet
  - name
  - budget_usdc
  - payout_per_view
  - min_views
  - min_engagement_rate
  - platforms_allowed[]
  - start_time
  - end_time
  - active
  - created_at

submissions
  - id
  - campaign_id → campaigns
  - creator_id → users
  - platform
  - video_id
  - video_url
  - status (pending | verifying | verified | paid | rejected)
  - created_at

verifications
  - id
  - submission_id → submissions
  - view_count
  - like_count
  - comment_count
  - engagement_rate
  - payout_amount
  - tx_hash
  - verified_at

metric_snapshots (audit trail)
  - id
  - submission_id → submissions
  - raw_response (JSON)
  - fetched_at
```

---

## API Routes

### Auth
```
POST /auth/siwe/nonce     → Generate SIWE nonce
POST /auth/siwe/verify    → Verify signature, create session
GET  /auth/me             → Current user
```

### Platform OAuth
```
GET  /oauth/:platform/url      → Get OAuth redirect URL
GET  /oauth/:platform/callback → Handle OAuth callback
GET  /platforms                 → List user's connected platforms
DELETE /platforms/:id          → Disconnect platform
```

### Campaigns
```
GET  /campaigns                → List active campaigns
GET  /campaigns/:id            → Campaign details
POST /campaigns                → Create campaign (brand only)
```

### Submissions
```
POST /submissions              → Submit video for campaign
GET  /submissions/mine         → Creator's submissions
GET  /submissions/:id          → Submission status
```

### Metrics (Called by CRE)
```
GET /api/metrics/:platform/:videoId
Headers: Authorization: Bearer {CRE_API_TOKEN}
Response: { viewCount, likeCount, commentCount, shareCount, fetchedAt }
```

---

## Smart Contract Interface

```
FlowBackCampaign (Base Sepolia)

State:
  - campaigns: mapping(uint256 => Campaign)
  - verifications: mapping(bytes32 => Verification)
  - campaignCount: uint256

Functions:
  createCampaign(name, budget, payoutPerView, minViews, duration) → campaignId
  requestVerification(campaignId, videoId, platform) → emits VerificationRequested
  withdrawRemaining(campaignId) → brand withdraws unspent budget
  
  // Called by CRE via Keystone Forwarder
  _processReport(bytes report) → internal, decodes and processes verification

Events:
  CampaignCreated(campaignId, brand, budget)
  VerificationRequested(campaignId, creator, videoId, platform)  ← CRE listens
  VerificationSubmitted(verificationId, campaignId, creator, viewCount)
  PayoutReleased(verificationId, creator, amount)

Key: Contract inherits ReceiverTemplate for CRE compatibility
```

---

## Platform API Summary

### YouTube Data API v3
```
Endpoint: GET https://www.googleapis.com/youtube/v3/videos
Params: part=statistics&id={videoId}
Auth: OAuth Bearer token
Returns: viewCount, likeCount, commentCount
Rate Limit: 10,000 units/day (free)
```

### TikTok Display API v2
```
Endpoint: GET https://open.tiktokapis.com/v2/video/query
Auth: OAuth Bearer token
Returns: view_count, like_count, comment_count, share_count
Note: Sandbox mode = no approval needed, limited scope
```

### Twitter API v2
```
Endpoint: GET https://api.twitter.com/2/tweets/:id
Params: tweet.fields=public_metrics
Auth: OAuth 2.0 Bearer
Returns: retweet_count, reply_count, like_count, impression_count
Cost: $200/mo for Basic tier
```

---

## Directory Structure

```
flowback/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing
│   │   │   ├── dashboard/         # Creator dashboard
│   │   │   ├── campaigns/         # Browse/create campaigns
│   │   │   └── api/               # Next.js API routes (if needed)
│   │   ├── components/
│   │   └── lib/
│   │
│   └── api/                 # Express backend
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   ├── services/
│       │   ├── connectors/       # YouTube, TikTok, Twitter
│       │   └── middleware/
│       └── prisma/
│           └── schema.prisma
│
├── cre/                     # Chainlink CRE project
│   ├── contracts/           # Foundry
│   │   └── src/
│   │       └── FlowBackCampaign.sol
│   └── verify-engagement/   # CRE workflow
│       ├── main.ts
│       └── config.staging.json
│
├── packages/
│   └── shared/              # Shared types (optional)
│
└── docs/
    ├── ARCHITECTURE.md      # This file
    ├── CRE_PATTERNS.md      # CRE-specific patterns
    └── SPEC.md              # Requirements
```

---

## Security Considerations

1. **OAuth tokens** - Encrypt at rest (use Prisma encryption or separate secrets manager)
2. **CRE API endpoint** - Validate requests come from CRE (check signature or use auth token)
3. **Smart contract** - Only Keystone Forwarder can call _processReport()
4. **USDC approvals** - Frontend should request exact approval amount, not unlimited

---

## MVP Scope (20 Days)

**In Scope:**
- YouTube integration (fully working)
- TikTok Sandbox (limited but functional)
- Single campaign type (payout per view)
- Base Sepolia testnet
- USDC test tokens

**Out of Scope for MVP:**
- Twitter (requires $200/mo)
- Instagram (complex approval)
- Multiple payout models
- Mainnet deployment
- Mobile app
