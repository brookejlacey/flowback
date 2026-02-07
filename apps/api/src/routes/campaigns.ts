import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const campaignRouter = Router();

/** GET /campaigns — List active campaigns */
campaignRouter.get("/", async (_req: Request, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(campaigns.map(c => ({
    ...c,
    budgetUsdc: c.budgetUsdc.toString(),
    payoutPer1kViews: c.payoutPer1kViews.toString(),
  })));
});

/** GET /campaigns/:id — Campaign details with submission count */
campaignRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { submissions: true } } },
  });

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json({
    ...campaign,
    budgetUsdc: campaign.budgetUsdc.toString(),
    payoutPer1kViews: campaign.payoutPer1kViews.toString(),
  });
});

/** POST /campaigns — Create a campaign (brand only, after on-chain TX) */
campaignRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  const { chainCampaignId, name, budgetUsdc, payoutPer1kViews, minViews, platformsAllowed, startTime, endTime } = req.body;

  const campaign = await prisma.campaign.create({
    data: {
      chainCampaignId,
      brandWallet: req.session.siwe!.address,
      name,
      budgetUsdc: BigInt(budgetUsdc),
      payoutPer1kViews: BigInt(payoutPer1kViews),
      minViews,
      platformsAllowed,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  });

  res.status(201).json({
    ...campaign,
    budgetUsdc: campaign.budgetUsdc.toString(),
    payoutPer1kViews: campaign.payoutPer1kViews.toString(),
  });
});
