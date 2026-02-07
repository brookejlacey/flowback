"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FLOWBACK_ADDRESS,
  FLOWBACK_ABI,
  USDC_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";
import { api } from "@/lib/api";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [step, setStep] = useState<"form" | "approve" | "create" | "done">("form");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [payoutPer1k, setPayoutPer1k] = useState("");
  const [minViews, setMinViews] = useState("");
  const [durationDays, setDurationDays] = useState("");

  const {
    writeContract: approve,
    data: approveTxHash,
    error: approveError,
  } = useWriteContract();
  const {
    writeContract: create,
    data: createTxHash,
    error: createError,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: createConfirmed } = useWaitForTransactionReceipt({
    hash: createTxHash,
  });

  const budgetRaw = budget ? parseUnits(budget, 6) : BigInt(0);
  const payoutRaw = payoutPer1k ? parseUnits(payoutPer1k, 6) : BigInt(0);
  const durationSec = durationDays ? BigInt(Number(durationDays) * 86400) : BigInt(0);

  // After approve confirms, send the create TX
  useEffect(() => {
    if (approveConfirmed && step === "approve") {
      setStep("create");
      create({
        address: FLOWBACK_ADDRESS,
        abi: FLOWBACK_ABI,
        functionName: "createCampaign",
        args: [name, budgetRaw, payoutRaw, BigInt(minViews || "0"), durationSec],
      });
    }
  }, [approveConfirmed]);

  // After create confirms, save to backend and redirect
  useEffect(() => {
    if (createConfirmed && step === "create") {
      setStep("done");
      api
        .createCampaign({
          name,
          budgetUsdc: budgetRaw.toString(),
          payoutPer1kViews: payoutRaw.toString(),
          minViews: Number(minViews),
          platformsAllowed: ["youtube"],
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + Number(durationDays) * 86400 * 1000).toISOString(),
        })
        .catch(() => {})
        .finally(() => router.push("/campaigns"));
    }
  }, [createConfirmed]);

  // Surface errors
  useEffect(() => {
    if (approveError) {
      setError(approveError.message.split("\n")[0]);
      setStep("form");
    }
    if (createError) {
      setError(createError.message.split("\n")[0]);
      setStep("form");
    }
  }, [approveError, createError]);

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Connect your wallet to create a campaign.</p>
      </div>
    );
  }

  function handleSubmit() {
    setError("");
    setStep("approve");
    approve({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [FLOWBACK_ADDRESS, budgetRaw],
    });
  }

  const formValid = name && budget && payoutPer1k && minViews && durationDays;

  return (
    <div className="mx-auto max-w-lg">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
          <CardDescription className="text-zinc-500">
            Set your budget and payout rules. USDC will be locked in the smart
            contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                placeholder="Product Launch Promo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={step !== "form"}
              />
            </div>
            <div>
              <Label>Budget (USDC)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                type="number"
                placeholder="100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={step !== "form"}
              />
            </div>
            <div>
              <Label>Payout per 1,000 views (USDC)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                type="number"
                placeholder="0.01"
                value={payoutPer1k}
                onChange={(e) => setPayoutPer1k(e.target.value)}
                disabled={step !== "form"}
              />
            </div>
            <div>
              <Label>Minimum Views</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                type="number"
                placeholder="1000"
                value={minViews}
                onChange={(e) => setMinViews(e.target.value)}
                disabled={step !== "form"}
              />
            </div>
            <div>
              <Label>Duration (days)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800"
                type="number"
                placeholder="7"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                disabled={step !== "form"}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="pt-2">
              {step === "form" && (
                <Button className="w-full" onClick={handleSubmit} disabled={!formValid}>
                  Approve USDC & Create Campaign
                </Button>
              )}
              {step === "approve" && (
                <Button className="w-full" disabled>
                  {approveTxHash ? "Confirming approval..." : "Approve USDC in wallet..."}
                </Button>
              )}
              {step === "create" && (
                <Button className="w-full" disabled>
                  {createTxHash ? "Confirming on-chain..." : "Confirm campaign in wallet..."}
                </Button>
              )}
              {step === "done" && (
                <Button className="w-full" disabled>
                  Redirecting...
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
