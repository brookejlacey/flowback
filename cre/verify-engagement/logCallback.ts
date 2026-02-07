/**
 * Log Trigger Callback — handles VerificationRequested events
 *
 * 1. Decode event data (campaignId, creator, videoId, platform)
 * 2. Fetch engagement metrics from our backend API
 * 3. Read campaign config from contract (minViews, payoutPer1kViews)
 * 4. Calculate payout
 * 5. Submit verification report to contract via Keystone Forwarder
 */

import { Runtime, Seri, EvmClient, HttpClient } from "@anthropic/cre-sdk";
import {
  decodeEventLog,
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  parseAbiParameters,
  zeroAddress,
} from "viem";

// ABI fragments used for encoding/decoding
const VERIFICATION_REQUESTED_ABI = [
  {
    type: "event",
    name: "VerificationRequested",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "videoId", type: "string", indexed: false },
      { name: "platform", type: "string", indexed: false },
    ],
  },
] as const;

const GET_CAMPAIGN_ABI = [
  {
    type: "function",
    name: "getCampaign",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "brand", type: "address" },
          { name: "name", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "spent", type: "uint256" },
          { name: "payoutPer1kViews", type: "uint256" },
          { name: "minViews", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

interface CallbackContext {
  evmClient: EvmClient;
  httpClient: HttpClient;
  contractAddress: string;
  backendUrl: string;
  gasLimit: number;
}

interface MetricsResponse {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  fetchedAt: string;
}

export async function logCallback(
  runtime: Runtime,
  payload: any,
  ctx: CallbackContext
): Promise<void> {
  // ─── Step 1: Decode the event ───
  const decoded = decodeEventLog({
    abi: VERIFICATION_REQUESTED_ABI,
    topics: payload.topics,
    data: payload.data,
  });

  const campaignId = decoded.args.campaignId;
  const creator = decoded.args.creator;
  const videoId = decoded.args.videoId;
  const platform = decoded.args.platform;

  console.log(
    `[FlowBack] Verification requested: campaign=${campaignId}, creator=${creator}, video=${videoId}, platform=${platform}`
  );

  // ─── Step 2: Fetch metrics from our backend ───
  const apiToken = await runtime.getSecret("CRE_SERVICE_TOKEN");

  const metricsResponse = await ctx.httpClient
    .sendRequest(
      runtime,
      async () => ({
        url: `${ctx.backendUrl}/api/metrics/${platform}/${videoId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }),
      Seri.consensus.identicalAggregation, // All DON nodes must get same result
      {
        cacheSettings: {
          store: true,
          maxAge: 60, // Cache for 60s to reduce API pressure
        },
      }
    )
    .call();

  const metrics: MetricsResponse = JSON.parse(metricsResponse.body);

  console.log(
    `[FlowBack] Metrics fetched: views=${metrics.viewCount}, likes=${metrics.likeCount}`
  );

  // ─── Step 3: Read campaign config from contract ───
  const getCampaignCalldata = encodeFunctionData({
    abi: GET_CAMPAIGN_ABI,
    functionName: "getCampaign",
    args: [campaignId],
  });

  const campaignResult = await ctx.evmClient.callContract(runtime, {
    call: {
      from: zeroAddress,
      to: ctx.contractAddress as `0x${string}`,
      data: getCampaignCalldata,
    },
    blockNumber: Seri.constants.lastFinalizedBlockNumber,
  });

  const campaignData = decodeFunctionResult({
    abi: GET_CAMPAIGN_ABI,
    functionName: "getCampaign",
    data: campaignResult.data as `0x${string}`,
  });

  const campaign = campaignData;
  const minViews = Number(campaign.minViews);
  const payoutPer1kViews = Number(campaign.payoutPer1kViews);
  const remaining = Number(campaign.budget) - Number(campaign.spent);

  // ─── Step 4: Calculate payout ───
  let payoutAmount = 0;
  if (metrics.viewCount >= minViews) {
    payoutAmount = Math.floor(
      (metrics.viewCount * payoutPer1kViews) / 1000
    );
    if (payoutAmount > remaining) {
      payoutAmount = remaining;
    }
  }

  console.log(
    `[FlowBack] Verification result: views=${metrics.viewCount}, minViews=${minViews}, payout=${payoutAmount}`
  );

  // ─── Step 5: Encode and submit report ───
  // Report format must match what _processReport expects:
  // abi.encode(campaignId, creator, videoId, platform, viewCount)
  const reportData = encodeAbiParameters(
    parseAbiParameters(
      "uint256 campaignId, address creator, string videoId, string platform, uint256 viewCount"
    ),
    [
      campaignId,
      creator as `0x${string}`,
      videoId,
      platform,
      BigInt(metrics.viewCount),
    ]
  );

  // Generate signed report via CRE runtime
  const reportResponse = await runtime
    .report({
      payload: Seri.utils.hexToBase64(reportData),
      keyId: "default",
      hashAlgorithm: "keccak256",
      signatureAlgorithm: "ecdsa",
    })
    .call();

  // Submit to contract via Keystone Forwarder
  const result = await ctx.evmClient.writeReport(runtime, {
    receiverAddress: ctx.contractAddress,
    report: reportResponse,
    gasConfig: { gasLimit: ctx.gasLimit },
  });

  console.log(
    `[FlowBack] Report submitted. TX: ${result.txHash}, payout: ${payoutAmount} (${payoutAmount / 1_000_000} USDC)`
  );
}
