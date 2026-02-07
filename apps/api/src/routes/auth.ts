import { Router, Request, Response } from "express";
import { generateNonce, SiweMessage } from "siwe";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

/** POST /auth/siwe/nonce — Generate a nonce for SIWE */
authRouter.post("/siwe/nonce", (req: Request, res: Response) => {
  const nonce = generateNonce();
  req.session.nonce = nonce;
  res.json({ nonce });
});

/** POST /auth/siwe/verify — Verify SIWE signature, create/find user, start session */
authRouter.post("/siwe/verify", async (req: Request, res: Response) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      res.status(400).json({ error: "Missing message or signature" });
      return;
    }

    const siweMessage = new SiweMessage(message);
    const { data: verified } = await siweMessage.verify({
      signature,
      nonce: req.session.nonce,
    });

    // Upsert user by wallet address
    const user = await prisma.user.upsert({
      where: { walletAddress: verified.address.toLowerCase() },
      update: {},
      create: { walletAddress: verified.address.toLowerCase() },
    });

    // Set session
    req.session.siwe = {
      address: verified.address.toLowerCase(),
      chainId: verified.chainId,
    };

    res.json({
      address: user.walletAddress,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("[Auth] SIWE verification failed:", error.message);
    res.status(401).json({ error: "Invalid signature" });
  }
});

/** GET /auth/me — Current authenticated user */
authRouter.get("/me", async (req: Request, res: Response) => {
  if (!req.session.siwe?.address) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: req.session.siwe.address },
    include: { platformConnections: { select: { platform: true, platformUserId: true } } },
  });

  res.json(user);
});

/** POST /auth/logout */
authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
