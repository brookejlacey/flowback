import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const submissionRouter = Router();

/** POST /submissions — Creator submits a video for a campaign */
submissionRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  const { campaignId, platform, videoUrl } = req.body;
  const creatorAddress = req.session.siwe!.address;

  // Extract video ID from URL
  const videoId = extractVideoId(platform, videoUrl);
  if (!videoId) {
    res.status(400).json({ error: "Invalid video URL" });
    return;
  }

  // Find creator
  const creator = await prisma.user.findUnique({
    where: { walletAddress: creatorAddress },
  });

  if (!creator) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check for duplicate submission
  const existing = await prisma.submission.findUnique({
    where: {
      campaignId_creatorId_videoId: {
        campaignId,
        creatorId: creator.id,
        videoId,
      },
    },
  });

  if (existing) {
    res.status(409).json({ error: "Already submitted this video for this campaign" });
    return;
  }

  const submission = await prisma.submission.create({
    data: {
      campaignId,
      creatorId: creator.id,
      platform,
      videoId,
      videoUrl,
      status: "pending",
    },
  });

  res.status(201).json({
    submissionId: submission.id,
    status: submission.status,
    videoId: submission.videoId,
  });
});

/** GET /submissions/mine — Creator's submissions */
submissionRouter.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const creator = await prisma.user.findUnique({
    where: { walletAddress: req.session.siwe!.address },
  });

  if (!creator) {
    res.json([]);
    return;
  }

  const submissions = await prisma.submission.findMany({
    where: { creatorId: creator.id },
    include: {
      campaign: { select: { name: true } },
      verification: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(submissions);
});

/** GET /submissions/:id — Submission status */
submissionRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { verification: true, campaign: { select: { name: true } } },
  });

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  res.json(submission);
});

function extractVideoId(platform: string, url: string): string | null {
  try {
    if (platform === "youtube") {
      const parsed = new URL(url);
      // Handle youtube.com/watch?v=ID and youtu.be/ID
      if (parsed.hostname.includes("youtube.com")) {
        return parsed.searchParams.get("v");
      }
      if (parsed.hostname === "youtu.be") {
        return parsed.pathname.slice(1);
      }
    }

    if (platform === "tiktok") {
      // Handle tiktok.com/@user/video/ID
      const match = url.match(/video\/(\d+)/);
      return match ? match[1] : null;
    }

    return null;
  } catch {
    return null;
  }
}
