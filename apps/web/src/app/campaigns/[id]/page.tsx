"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FLOWBACK_ADDRESS, FLOWBACK_ABI } from "@/lib/contracts";
import { api } from "@/lib/api";

interface Submission {
  id: string;
  platform: string;
  videoId: string;
  videoUrl: string;
  status: string;
  createdAt: string;
  creator: { walletAddress: string };
  verification?: {
    viewCount: number;
    payoutAmount: string;
    txHash: string;
  };
}

interface CampaignDetail {
  id: string;
  chainCampaignId: number | null;
  brandWallet: string;
  name: string;
  budgetUsdc: string;
  payoutPer1kViews: string;
  minViews: number;
  platformsAllowed: string[];
  startTime: string;
  endTime: string;
  active: boolean;
  _count: { submissions: number };
  submissions?: Submission[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  verifying: "bg-blue-500/20 text-blue-400",
  verified: "bg-green-500/20 text-green-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { address, isConnected } = useAccount();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Read on-chain remaining budget
  const { data: remainingBudget } = useReadContract({
    address: FLOWBACK_ADDRESS,
    abi: FLOWBACK_ABI,
    functionName: "getRemainingBudget",
    args: campaign?.chainCampaignId != null ? [BigInt(campaign.chainCampaignId)] : undefined,
    query: { enabled: campaign?.chainCampaignId != null },
  });

  // Withdraw remaining (brand only)
  const { writeContract: withdraw, data: withdrawTxHash, error: withdrawError } = useWriteContract();
  const { isSuccess: withdrawConfirmed } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  useEffect(() => {
    api
      .getCampaign(id)
      .then(setCampaign)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const formatUsdc = (amount: string) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  const isExpired = campaign ? new Date(campaign.endTime) < new Date() : false;
  const isBrand = campaign && address
    ? campaign.brandWallet.toLowerCase() === address.toLowerCase()
    : false;
  const daysLeft = campaign
    ? Math.max(0, Math.ceil((new Date(campaign.endTime).getTime() - Date.now()) / 86400000))
    : 0;

  if (loading) {
    return <p className="py-20 text-center text-zinc-400">Loading campaign...</p>;
  }

  if (error || !campaign) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-400">{error || "Campaign not found"}</p>
        <Link href="/campaigns">
          <Button variant="outline" className="mt-4">Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/campaigns" className="text-sm text-zinc-500 hover:text-zinc-300">
            &larr; All Campaigns
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-zinc-400">
            by {campaign.brandWallet.slice(0, 6)}...{campaign.brandWallet.slice(-4)}
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.active && !isExpired ? (
            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400">
              {isExpired ? "Expired" : "Closed"}
            </Badge>
          )}
          {campaign.platformsAllowed.map((p) => (
            <Badge key={p} variant="secondary">{p}</Badge>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Total Budget</p>
            <p className="mt-1 text-2xl font-bold font-mono">
              ${formatUsdc(campaign.budgetUsdc)}
            </p>
            <p className="text-xs text-zinc-500">USDC</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Remaining</p>
            <p className="mt-1 text-2xl font-bold font-mono">
              {remainingBudget != null
                ? `$${(Number(remainingBudget) / 1_000_000).toFixed(2)}`
                : `$${formatUsdc(campaign.budgetUsdc)}`}
            </p>
            <p className="text-xs text-zinc-500">USDC on-chain</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Payout Rate</p>
            <p className="mt-1 text-2xl font-bold font-mono">
              ${formatUsdc(campaign.payoutPer1kViews)}
            </p>
            <p className="text-xs text-zinc-500">per 1,000 views</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">
              {isExpired ? "Ended" : "Time Left"}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono">
              {isExpired ? "Expired" : `${daysLeft}d`}
            </p>
            <p className="text-xs text-zinc-500">
              Min {campaign.minViews.toLocaleString()} views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Brand Actions */}
      {isBrand && isExpired && campaign.chainCampaignId != null && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Campaign Ended</p>
              <p className="text-sm text-zinc-400">
                Withdraw remaining USDC from the contract.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                withdraw({
                  address: FLOWBACK_ADDRESS,
                  abi: [{
                    type: "function",
                    name: "withdrawRemaining",
                    inputs: [{ name: "campaignId", type: "uint256" }],
                    outputs: [],
                    stateMutability: "nonpayable",
                  }],
                  functionName: "withdrawRemaining",
                  args: [BigInt(campaign.chainCampaignId!)],
                });
              }}
              disabled={!!withdrawTxHash}
            >
              {withdrawConfirmed
                ? "Withdrawn!"
                : withdrawTxHash
                ? "Confirming..."
                : "Withdraw Remaining"}
            </Button>
          </CardContent>
          {withdrawError && (
            <p className="px-6 pb-4 text-sm text-red-400">
              {withdrawError.message.split("\n")[0]}
            </p>
          )}
        </Card>
      )}

      {/* Creator CTA */}
      {isConnected && !isBrand && campaign.active && !isExpired && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Want to earn from this campaign?</p>
              <p className="text-sm text-zinc-400">
                Submit your {campaign.platformsAllowed.join("/")} video from
                your dashboard.
              </p>
            </div>
            <Link href={`/dashboard?campaignId=${campaign.id}&chainCampaignId=${campaign.chainCampaignId}`}>
              <Button>Submit Video</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Separator className="border-zinc-800" />

      {/* Submissions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Submissions ({campaign._count?.submissions ?? 0})
        </h2>
        {campaign.submissions && campaign.submissions.length > 0 ? (
          <div className="space-y-3">
            {campaign.submissions.map((sub) => (
              <Card key={sub.id} className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium font-mono text-sm">
                      {sub.creator.walletAddress.slice(0, 6)}...
                      {sub.creator.walletAddress.slice(-4)}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {sub.platform} &middot; {sub.videoId}
                    </p>
                    {sub.verification && (
                      <p className="mt-1 text-sm text-zinc-300">
                        {sub.verification.viewCount.toLocaleString()} views
                        &middot; ${(Number(sub.verification.payoutAmount) / 1_000_000).toFixed(2)} USDC
                        {sub.verification.txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${sub.verification.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-400 hover:underline"
                          >
                            TX
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                  <Badge className={statusColors[sub.status] || ""}>
                    {sub.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}
