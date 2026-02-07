"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FLOWBACK_ADDRESS, FLOWBACK_ABI } from "@/lib/contracts";
import { api } from "@/lib/api";

interface Submission {
  id: string;
  platform: string;
  videoId: string;
  videoUrl: string;
  status: string;
  createdAt: string;
  campaign: { name: string };
  verification?: {
    viewCount: number;
    payoutAmount: string;
    txHash: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  verifying: "bg-blue-500/20 text-blue-400",
  verified: "bg-green-500/20 text-green-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit video form
  const [campaignId, setCampaignId] = useState("");
  const [chainCampaignId, setChainCampaignId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  // On-chain verification request
  const { writeContract, data: txHash, error: txError } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConnected) return;
    api
      .getMySubmissions()
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isConnected]);

  // After on-chain TX confirms
  useEffect(() => {
    if (txConfirmed) {
      setSubmitMsg("Verification requested on-chain! CRE will pick it up shortly.");
      setSubmitting(false);
    }
  }, [txConfirmed]);

  useEffect(() => {
    if (txError) {
      setSubmitMsg(`TX failed: ${txError.message.split("\n")[0]}`);
      setSubmitting(false);
    }
  }, [txError]);

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Connect your wallet to see your dashboard.</p>
      </div>
    );
  }

  function extractVideoId(url: string): string | null {
    try {
      if (platform === "youtube") {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
        if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
      }
      if (platform === "tiktok") {
        const match = url.match(/video\/(\d+)/);
        return match ? match[1] : null;
      }
    } catch {}
    return null;
  }

  async function handleSubmitVideo() {
    setSubmitMsg("");
    setSubmitting(true);

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setSubmitMsg("Invalid video URL");
      setSubmitting(false);
      return;
    }

    try {
      // 1. Submit to backend
      await api.submitVideo({ campaignId, platform, videoUrl });

      // 2. Call requestVerification on-chain (emits event for CRE)
      writeContract({
        address: FLOWBACK_ADDRESS,
        abi: FLOWBACK_ABI,
        functionName: "requestVerification",
        args: [BigInt(chainCampaignId || "0"), videoId, platform],
      });
    } catch (e: any) {
      setSubmitMsg(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        <p className="mt-1 text-zinc-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      {/* Submit Video */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Submit Video for Verification</CardTitle>
          <CardDescription className="text-zinc-500">
            Paste your video URL. This will request on-chain verification via
            Chainlink CRE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Campaign ID (database)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                placeholder="cuid from /campaigns"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              />
            </div>
            <div>
              <Label>Chain Campaign ID (on-chain)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                type="number"
                placeholder="0"
                value={chainCampaignId}
                onChange={(e) => setChainCampaignId(e.target.value)}
              />
            </div>
            <div>
              <Label>Platform</Label>
              <select
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div>
              <Label>Video URL</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>

          {submitMsg && (
            <p className={`mt-3 text-sm ${submitMsg.includes("fail") || submitMsg.includes("Invalid") ? "text-red-400" : "text-green-400"}`}>
              {submitMsg}
            </p>
          )}

          <Button
            className="mt-4"
            onClick={handleSubmitVideo}
            disabled={submitting || !campaignId || !videoUrl}
          >
            {submitting
              ? txHash
                ? "Confirming on-chain..."
                : "Submitting..."
              : "Submit & Request Verification"}
          </Button>
        </CardContent>
      </Card>

      <Separator className="border-zinc-800" />

      {/* Submissions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Your Submissions</h2>
        {loading ? (
          <p className="text-zinc-400">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-zinc-400">No submissions yet. Submit a video above!</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <Card key={sub.id} className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{sub.campaign.name}</p>
                    <p className="text-sm text-zinc-400">
                      {sub.platform} &middot; {sub.videoId}
                    </p>
                    {sub.verification && (
                      <p className="mt-1 text-sm text-zinc-300">
                        {sub.verification.viewCount.toLocaleString()} views
                        &middot; $
                        {(Number(sub.verification.payoutAmount) / 1_000_000).toFixed(2)}{" "}
                        USDC
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
        )}
      </div>
    </div>
  );
}
