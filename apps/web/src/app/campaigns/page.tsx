"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Campaign {
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
}

export default function CampaignsPage() {
  const { isConnected } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatUsdc = (amount: string) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-1 text-zinc-400">
            Browse active campaigns or create your own
          </p>
        </div>
        {isConnected && (
          <Link href="/campaigns/create">
            <Button>Create Campaign</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400">No active campaigns yet.</p>
            {isConnected && (
              <Link href="/campaigns/create">
                <Button className="mt-4" variant="outline">
                  Create the first one
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="border-zinc-800 bg-zinc-900/50 transition hover:border-zinc-700"
            >
              <CardHeader>
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <CardDescription className="text-zinc-500">
                  by {campaign.brandWallet.slice(0, 6)}...
                  {campaign.brandWallet.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Budget</span>
                    <span className="font-mono">
                      ${formatUsdc(campaign.budgetUsdc)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payout</span>
                    <span className="font-mono">
                      ${formatUsdc(campaign.payoutPer1kViews)}/1k views
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Min views</span>
                    <span className="font-mono">
                      {campaign.minViews.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Ends</span>
                    <span>
                      {new Date(campaign.endTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1 pt-2">
                    {campaign.platformsAllowed.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
