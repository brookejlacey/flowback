/**
 * E2E Test — Full FlowBack flow with mock metrics
 *
 * Tests: SIWE auth → Create campaign → Submit video → CRE metrics fetch → Verification
 *
 * Prerequisites:
 *   - Backend running on localhost:3001
 *   - USE_MOCK_METRICS=true in .env
 *   - Database connected (Supabase)
 *
 * Run: npx tsx scripts/e2e-test.ts
 */

import { Wallet } from "ethers";
import { SiweMessage } from "siwe";
import { prisma } from "../src/lib/prisma";

const API = "http://localhost:3001";
let cookies = "";

// ── Helpers ──

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
      ...opts.headers,
    },
    ...opts,
  });

  // Capture session cookie
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const match = c.match(/connect\.sid=[^;]+/);
    if (match) cookies = match[0];
  }

  const body = await res.json();
  return { status: res.status, body };
}

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
}

function fail(label: string, detail?: any) {
  console.error(`  [FAIL] ${label}`, detail || "");
  process.exit(1);
}

// ── Tests ──

async function main() {
  console.log("\n=== FlowBack E2E Test ===\n");

  // 0. Health check
  const health = await api("/health");
  if (health.status !== 200) fail("Health check", health);
  pass("Health check OK");

  // 1. SIWE Auth — generate wallet, get nonce, sign, verify
  console.log("\n--- Step 1: SIWE Authentication ---");

  const wallet = Wallet.createRandom();
  const address = wallet.address;
  console.log(`  Test wallet: ${address}`);

  const { body: nonceBody } = await api("/auth/siwe/nonce", { method: "POST" });
  if (!nonceBody.nonce) fail("Get nonce", nonceBody);
  pass(`Got nonce: ${nonceBody.nonce.slice(0, 8)}...`);

  const siweMessage = new SiweMessage({
    domain: "localhost",
    address,
    statement: "Sign in to FlowBack",
    uri: "http://localhost:3001",
    version: "1",
    chainId: 84532, // Base Sepolia
    nonce: nonceBody.nonce,
  });

  const messageStr = siweMessage.prepareMessage();
  const signature = await wallet.signMessage(messageStr);

  const { status: authStatus, body: authBody } = await api("/auth/siwe/verify", {
    method: "POST",
    body: JSON.stringify({ message: messageStr, signature }),
  });
  if (authStatus !== 200) fail("SIWE verify", authBody);
  pass(`Authenticated as ${authBody.address}`);

  // Verify /auth/me works
  const { body: meBody } = await api("/auth/me");
  if (meBody.walletAddress !== address.toLowerCase()) fail("Auth/me mismatch", meBody);
  pass("Session persisted (/auth/me)");

  // 2. Create Campaign
  console.log("\n--- Step 2: Create Campaign ---");

  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const { status: campStatus, body: campaign } = await api("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      chainCampaignId: 0,
      name: "E2E Test Campaign",
      budgetUsdc: "10000000", // 10 USDC
      payoutPer1kViews: "10000", // $0.01 per 1k views
      minViews: 1000,
      platformsAllowed: ["youtube"],
      startTime: now.toISOString(),
      endTime: endDate.toISOString(),
    }),
  });
  if (campStatus !== 201) fail("Create campaign", campaign);
  pass(`Campaign created: ${campaign.id} — "${campaign.name}"`);

  // Verify it shows in list
  const { body: campList } = await api("/campaigns");
  const found = campList.find((c: any) => c.id === campaign.id);
  if (!found) fail("Campaign not in list");
  pass("Campaign appears in GET /campaigns");

  // Verify detail endpoint
  const { body: campDetail } = await api(`/campaigns/${campaign.id}`);
  if (campDetail.name !== "E2E Test Campaign") fail("Campaign detail wrong", campDetail);
  pass("Campaign detail endpoint works");

  // 3. Submit Video
  console.log("\n--- Step 3: Submit Video ---");

  const { status: subStatus, body: submission } = await api("/submissions", {
    method: "POST",
    body: JSON.stringify({
      campaignId: campaign.id,
      platform: "youtube",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    }),
  });
  if (subStatus !== 201) fail("Submit video", submission);
  pass(`Submission created: ${submission.submissionId} — videoId: ${submission.videoId}`);

  // Verify duplicate rejected
  const { status: dupStatus } = await api("/submissions", {
    method: "POST",
    body: JSON.stringify({
      campaignId: campaign.id,
      platform: "youtube",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    }),
  });
  if (dupStatus !== 409) fail("Duplicate not rejected", dupStatus);
  pass("Duplicate submission correctly rejected (409)");

  // Verify in /submissions/mine
  const { body: mySubmissions } = await api("/submissions/mine");
  if (mySubmissions.length === 0) fail("No submissions in /mine");
  pass(`/submissions/mine returns ${mySubmissions.length} submission(s)`);

  // 4. Mock Metrics (simulating CRE DON call)
  console.log("\n--- Step 4: CRE Metrics Fetch (Mock) ---");

  const creToken = process.env.CRE_SERVICE_TOKEN || "flowback-cre-token-2026";

  const { status: metricStatus, body: metrics } = await api(
    `/api/metrics/youtube/${submission.videoId}`,
    { headers: { Authorization: `Bearer ${creToken}` } }
  );
  if (metricStatus !== 200) fail("Metrics fetch", metrics);
  if (metrics.viewCount !== 15234) fail("Wrong mock view count", metrics);
  pass(`Mock metrics returned: ${metrics.viewCount} views, ${metrics.likeCount} likes`);

  // Verify auth is required
  const { status: noAuthStatus } = await api(`/api/metrics/youtube/${submission.videoId}`);
  if (noAuthStatus !== 401) fail("Metrics endpoint not protected");
  pass("Metrics endpoint requires CRE token (401 without)");

  // 5. Simulate CRE Verification (what the DON would write after metrics check)
  console.log("\n--- Step 5: Simulate CRE Verification ---");

  // Calculate payout: 15234 views * $0.01/1k = $0.15234 = 152340 micro-USDC
  const payoutAmount = Math.floor((metrics.viewCount / 1000) * 10000); // payoutPer1kViews = 10000

  const verification = await prisma.verification.create({
    data: {
      submissionId: submission.submissionId,
      viewCount: metrics.viewCount,
      likeCount: metrics.likeCount,
      commentCount: metrics.commentCount,
      engagementRate: (metrics.likeCount + metrics.commentCount) / metrics.viewCount,
      payoutAmount: BigInt(payoutAmount),
      txHash: "0xe2e_test_simulated_tx_hash",
    },
  });
  pass(`Verification created: ${verification.id}`);
  pass(`Payout: ${payoutAmount} micro-USDC ($${(payoutAmount / 1_000_000).toFixed(6)})`);

  // Update submission status
  await prisma.submission.update({
    where: { id: submission.submissionId },
    data: { status: "verified" },
  });
  pass("Submission status updated to 'verified'");

  // 6. Verify final state
  console.log("\n--- Step 6: Verify Final State ---");

  const { body: finalSubmission } = await api(`/submissions/${submission.submissionId}`);
  if (finalSubmission.status !== "verified") fail("Status not verified", finalSubmission.status);
  if (!finalSubmission.verification) fail("No verification attached");
  if (finalSubmission.verification.viewCount !== 15234) fail("View count mismatch");
  pass("Submission shows verified with correct view count");

  const { body: finalCampaign } = await api(`/campaigns/${campaign.id}`);
  if (finalCampaign.submissions.length !== 1) fail("Campaign should have 1 submission");
  if (finalCampaign.submissions[0].verification.viewCount !== 15234) fail("Campaign submission verification mismatch");
  pass("Campaign detail shows submission with verification data");

  // 7. Cleanup
  console.log("\n--- Cleanup ---");
  await prisma.verification.delete({ where: { id: verification.id } });
  await prisma.submission.delete({ where: { id: submission.submissionId } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.user.delete({ where: { walletAddress: address.toLowerCase() } });
  pass("Test data cleaned up");

  console.log("\n=== ALL TESTS PASSED ===\n");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  prisma.$disconnect();
  process.exit(1);
});
