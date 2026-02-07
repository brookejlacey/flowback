"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        Trustless Creator
        <br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
          Payments
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        YouTube and TikTok views verified by Chainlink CRE. USDC auto-released
        to creators. No middlemen, no disputes, no delays.
      </p>

      <div className="mt-10 flex gap-4">
        {isConnected ? (
          <>
            <Link href="/campaigns">
              <Button size="lg">Browse Campaigns</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                Creator Dashboard
              </Button>
            </Link>
          </>
        ) : (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <Button size="lg" onClick={show}>
                Connect Wallet to Start
              </Button>
            )}
          </ConnectKitButton.Custom>
        )}
      </div>

      <div className="mt-20 grid max-w-4xl gap-8 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
          <div className="mb-3 text-2xl">1</div>
          <h3 className="mb-2 font-semibold">Brands Fund Campaigns</h3>
          <p className="text-sm text-zinc-400">
            Set budget, payout rules, and deposit USDC. Funds locked in smart
            contract.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
          <div className="mb-3 text-2xl">2</div>
          <h3 className="mb-2 font-semibold">Creators Submit Content</h3>
          <p className="text-sm text-zinc-400">
            Link YouTube/TikTok, submit video URL, and wait for automatic
            verification.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
          <div className="mb-3 text-2xl">3</div>
          <h3 className="mb-2 font-semibold">CRE Verifies & Pays</h3>
          <p className="text-sm text-zinc-400">
            Chainlink verifies views on-chain. USDC auto-transferred to creator
            wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
