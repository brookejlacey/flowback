import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import {
  generateOAuthState,
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
  fetchYouTubeChannelId,
  getTikTokAuthUrl,
  exchangeTikTokCode,
  fetchTikTokOpenId,
} from "../services/oauth";
import { encrypt } from "../lib/encryption";

export const oauthRouter = Router();

const SUPPORTED_PLATFORMS = ["youtube", "tiktok"] as const;
type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

function isSupportedPlatform(p: string): p is SupportedPlatform {
  return SUPPORTED_PLATFORMS.includes(p as SupportedPlatform);
}

/**
 * GET /oauth/:platform/url
 * Returns the OAuth authorization URL. Stores CSRF state in session.
 */
oauthRouter.get(
  "/:platform/url",
  requireAuth,
  (req: Request<{ platform: string }>, res: Response) => {
    const { platform } = req.params;

    if (!isSupportedPlatform(platform)) {
      res.status(400).json({ error: `Unsupported platform: ${platform}` });
      return;
    }

    const state = generateOAuthState();
    req.session.oauthState = state;

    let url: string;
    switch (platform) {
      case "youtube":
        url = getYouTubeAuthUrl(state);
        break;
      case "tiktok":
        url = getTikTokAuthUrl(state);
        break;
    }

    res.json({ url });
  }
);

/**
 * GET /oauth/:platform/callback
 * Handles OAuth callback from provider. Exchanges code for tokens,
 * fetches platform user ID, upserts PlatformConnection, and redirects
 * to frontend dashboard.
 */
oauthRouter.get(
  "/:platform/callback",
  async (req: Request<{ platform: string }>, res: Response) => {
    const { platform } = req.params;
    const { code, state, error } = req.query as Record<string, string>;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (error) {
      console.error(`[OAuth] ${platform} error: ${error}`);
      res.redirect(
        `${frontendUrl}/dashboard?oauth=error&platform=${platform}`
      );
      return;
    }

    if (!isSupportedPlatform(platform)) {
      res.redirect(
        `${frontendUrl}/dashboard?oauth=error&platform=${platform}`
      );
      return;
    }

    if (!state || state !== req.session.oauthState) {
      console.error("[OAuth] State mismatch");
      res.redirect(
        `${frontendUrl}/dashboard?oauth=error&reason=state_mismatch`
      );
      return;
    }

    delete req.session.oauthState;

    if (!req.session.siwe?.address) {
      res.redirect(
        `${frontendUrl}/dashboard?oauth=error&reason=not_authenticated`
      );
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress: req.session.siwe.address },
      });

      if (!user) {
        res.redirect(
          `${frontendUrl}/dashboard?oauth=error&reason=user_not_found`
        );
        return;
      }

      let accessToken: string;
      let refreshToken: string;
      let expiresAt: Date;
      let platformUserId: string;

      switch (platform) {
        case "youtube": {
          const tokens = await exchangeYouTubeCode(code);
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
          expiresAt = tokens.expiresAt;
          platformUserId = await fetchYouTubeChannelId(tokens.accessToken);
          break;
        }
        case "tiktok": {
          const tokens = await exchangeTikTokCode(code);
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
          expiresAt = tokens.expiresAt;
          platformUserId = await fetchTikTokOpenId(tokens.accessToken);
          break;
        }
      }

      await prisma.platformConnection.upsert({
        where: {
          userId_platform: {
            userId: user.id,
            platform,
          },
        },
        update: {
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          expiresAt,
          platformUserId,
        },
        create: {
          userId: user.id,
          platform,
          platformUserId,
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          expiresAt,
        },
      });

      console.log(
        `[OAuth] ${platform} connected for user ${user.id} (${platformUserId})`
      );
      res.redirect(
        `${frontendUrl}/dashboard?oauth=success&platform=${platform}`
      );
    } catch (err: any) {
      console.error(`[OAuth] ${platform} callback error:`, err.message);
      res.redirect(
        `${frontendUrl}/dashboard?oauth=error&platform=${platform}`
      );
    }
  }
);
