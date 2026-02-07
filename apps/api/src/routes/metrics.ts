import { Router, Request, Response } from "express";
import { requireCREToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { fetchYouTubeMetrics } from "../connectors/youtube";
import { fetchTikTokMetrics } from "../connectors/tiktok";
import { getValidAccessToken } from "../services/tokenRefresh";

export const metricsRouter = Router();

/**
 * GET /api/metrics/:platform/:videoId
 *
 * Called by CRE DON nodes to fetch engagement metrics.
 * Protected by CRE service token.
 *
 * Returns deterministic data (important for DON consensus):
 * all nodes must get the same response within the cache window.
 */
metricsRouter.get("/:platform/:videoId", requireCREToken, async (req: Request<{ platform: string; videoId: string }>, res: Response) => {
  const { platform, videoId } = req.params;

  try {
    // If USE_MOCK_METRICS is set, return mock data (for testing CRE flow)
    if (process.env.USE_MOCK_METRICS === "true") {
      res.json({
        viewCount: 15234,
        likeCount: 892,
        commentCount: 45,
        shareCount: 12,
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    // Find a platform connection with a valid token for this video's platform.
    // In production, we'd look up the specific creator's connection via the submission.
    // For the hackathon, we find any connection for this platform.
    const submission = await prisma.submission.findFirst({
      where: { videoId, platform: platform as any },
    });

    if (!submission) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    const platformConn = await prisma.platformConnection.findFirst({
      where: { userId: submission.creatorId, platform: platform as any },
    });

    const connection = platformConn;
    if (!connection) {
      res.status(404).json({ error: "No platform connection found" });
      return;
    }

    const accessToken = await getValidAccessToken(connection);

    let metrics;
    switch (platform) {
      case "youtube":
        metrics = await fetchYouTubeMetrics(videoId, accessToken);
        break;
      case "tiktok":
        metrics = await fetchTikTokMetrics(videoId, accessToken);
        break;
      default:
        res.status(400).json({ error: `Unsupported platform: ${platform}` });
        return;
    }

    // Store snapshot for audit trail
    await prisma.metricSnapshot.create({
      data: {
        submissionId: submission.id,
        rawResponse: metrics as any,
      },
    });

    res.json(metrics);
  } catch (error: any) {
    console.error(`[Metrics] Error fetching ${platform}/${videoId}:`, error.message);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});
