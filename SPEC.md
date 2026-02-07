# FlowBack - Product Spec

## Hackathon Context

**Event**: Chainlink CRE + AI Convergence Hackathon  
**Deadline**: ~20 days from now  
**Prizes**: $100K+ pool, CRE-specific track  
**Judging Focus**: Novel CRE usage, working demo, real-world utility

---

## One-Liner

Trustless creator payments: YouTube/TikTok views verified by Chainlink → USDC auto-released.

---

## Problem

Brands pay creators based on self-reported metrics. This creates:
- Fraud (inflated numbers)
- Payment delays (manual verification)
- Disputes (no source of truth)
- Platform lock-in (brand deals per platform)

---

## Solution

1. Creators connect social accounts via OAuth
2. Brands create campaigns with payout rules (e.g., $0.01/1000 views)
3. Creators submit content
4. Chainlink CRE verifies metrics directly from platform APIs
5. Smart contract auto-releases USDC

**Key Innovation**: CRE's log trigger + HTTP capability + EVM write = trustless verification pipeline.

---

## User Stories

### Creator
- [ ] Connect wallet (SIWE)
- [ ] Link YouTube account (OAuth)
- [ ] Link TikTok account (OAuth)
- [ ] Browse available campaigns
- [ ] Join a campaign
- [ ] Submit video URL for verification
- [ ] View submission status
- [ ] See earnings and payout history
- [ ] Withdraw to wallet (if needed, or auto-transfer)

### Brand
- [ ] Connect wallet
- [ ] Create campaign (set budget, rules, duration)
- [ ] Deposit USDC to campaign
- [ ] View campaign stats (participants, submissions, spend)
- [ ] Close campaign early and withdraw remaining funds

### System (CRE)
- [ ] Detect VerificationRequested event
- [ ] Fetch video metrics from platform API
- [ ] Verify metrics meet campaign requirements
- [ ] Calculate payout amount
- [ ] Submit verification to smart contract
- [ ] Trigger USDC transfer

---

## MVP Features (Must Have)

1. **Wallet Auth**: SIWE (Sign In With Ethereum)
2. **YouTube OAuth**: Connect account, fetch video stats
3. **Campaign Creation**: Brand creates campaign, deposits USDC
4. **Video Submission**: Creator submits YouTube video URL
5. **CRE Verification**: Log trigger → metrics fetch → payout
6. **Auto Payout**: USDC transferred to creator on verification

---

## Nice to Have (Time Permitting)

- TikTok integration (Sandbox mode)
- Multiple videos per campaign
- Engagement rate thresholds (not just views)
- Campaign leaderboard
- Creator profiles
- Notification system

---

## Out of Scope for MVP

- Twitter/X (requires paid API)
- Instagram (complex business verification)
- Mobile app
- Mainnet deployment
- Fiat on/off ramp
- Multi-chain support

---

## Demo Flow (5-Minute Video)

**Structure the demo around the verification flow:**

### 0:00-0:30 - Problem Statement
- Show manual verification pain (spreadsheets, disputes)
- Quick stats on creator economy

### 0:30-1:30 - Creator Setup
- Connect wallet
- OAuth to YouTube
- Show connected account in dashboard

### 1:30-2:30 - Brand Creates Campaign
- Create "Product Launch" campaign
- Set: $100 budget, $0.01/1000 views, 1000 min views
- Approve and deposit USDC (show TX)

### 2:30-3:30 - Creator Submits Video
- Browse campaigns, join one
- Submit YouTube video URL
- Show "Pending Verification" status

### 3:30-4:30 - CRE Magic (The Hero Moment)
- Show contract event in block explorer
- Show CRE picking it up (simulation logs or dashboard)
- Show metrics being verified
- Show payout TX

### 4:30-5:00 - Result + Closing
- Creator dashboard shows payment received
- Quick recap: trustless, instant, multi-platform
- Call to action: GitHub, live demo link

---

## Technical Requirements

### Frontend
- Responsive (works on mobile browser for demo)
- Fast loading (Next.js static where possible)
- Clear loading states during TX/verification
- Error handling with user-friendly messages

### Backend
- OAuth token refresh handling
- Rate limiting on metrics endpoint
- Request logging (for debugging CRE issues)
- Health check endpoint

### Smart Contract
- Reentrancy protection
- Campaign state validation
- Emergency pause function
- Events for all state changes

### CRE Workflow
- Finalized block confidence for payouts
- Error handling with meaningful logs
- Gas estimation that works

---

## Success Metrics (For Judges)

1. **Works end-to-end**: Video submission → verification → payout (live demo)
2. **Novel CRE usage**: Log trigger + HTTP + EVM write pattern
3. **Real utility**: Solves actual creator economy problem
4. **Code quality**: Clean, documented, deployable
5. **Demo quality**: Clear narrative, no crashes

---

## Payout Calculation

```
payoutAmount = (viewCount / 1000) * payoutPer1kViews

If payoutAmount > remainingBudget:
    payoutAmount = remainingBudget
    
If viewCount < minViews:
    payoutAmount = 0
    status = "rejected"
```

**All amounts in USDC (6 decimals)**

---

## API Contracts

### Metrics Endpoint (CRE calls this)

```
GET /api/metrics/:platform/:videoId
Authorization: Bearer {CRE_SERVICE_TOKEN}

Response 200:
{
  "viewCount": 15234,
  "likeCount": 892,
  "commentCount": 45,
  "shareCount": 12,
  "fetchedAt": "2025-02-05T12:00:00Z"
}

Response 401:
{ "error": "Unauthorized" }

Response 404:
{ "error": "Video not found" }

Response 429:
{ "error": "Rate limited", "retryAfter": 60 }
```

### Submission Request

```
POST /submissions
Authorization: Bearer {user_session}

Body:
{
  "campaignId": 1,
  "platform": "youtube",
  "videoUrl": "https://youtube.com/watch?v=abc123"
}

Response 201:
{
  "submissionId": "sub_xyz",
  "status": "pending",
  "videoId": "abc123"
}
```

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Auth
SESSION_SECRET=...

# YouTube
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...

# TikTok
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...

# CRE
CRE_SERVICE_TOKEN=...

# Blockchain
PRIVATE_KEY=...
BASE_SEPOLIA_RPC=https://...
USDC_ADDRESS=0x...
CONTRACT_ADDRESS=0x...
```

---

## Timeline Suggestion

| Days | Focus |
|------|-------|
| 1-3 | Smart contract + deploy |
| 4-6 | CRE workflow (log trigger → write) |
| 7-10 | Backend (OAuth, metrics API) |
| 11-14 | Frontend (wallet, OAuth flow, submission) |
| 15-17 | Integration testing |
| 18-19 | Demo video + polish |
| 20 | Submit |

**Parallel tracks possible**: Contract + CRE can be tested with mocks while OAuth is built.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CRE doesn't work | Have video of simulation working, explain architecture |
| YouTube rate limits | Cache aggressively, use test videos |
| OAuth complexity | Focus on YouTube only, skip TikTok if time short |
| Gas issues | Use high gasLimit, have backup funds |
| Demo fails live | Pre-record key flows, do hybrid demo |
