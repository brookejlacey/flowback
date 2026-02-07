import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const platformRouter = Router();

/** GET /platforms — List user's connected platforms */
platformRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { walletAddress: req.session.siwe!.address },
    include: {
      platformConnections: {
        select: {
          id: true,
          platform: true,
          platformUserId: true,
          createdAt: true,
        },
      },
    },
  });

  res.json(user?.platformConnections || []);
});

/** DELETE /platforms/:id — Disconnect a platform */
platformRouter.delete("/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { walletAddress: req.session.siwe!.address },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Ensure the connection belongs to this user
  const connection = await prisma.platformConnection.findFirst({
    where: { id: req.params.id, userId: user.id },
  });

  if (!connection) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }

  await prisma.platformConnection.delete({ where: { id: req.params.id } });

  res.json({ ok: true });
});

/**
 * OAuth routes would go here:
 *   GET /oauth/:platform/url     → Generate OAuth redirect URL
 *   GET /oauth/:platform/callback → Handle OAuth callback
 *
 * For now these are stubs — YouTube OAuth will be wired up
 * when we have CLIENT_ID and CLIENT_SECRET configured.
 */
