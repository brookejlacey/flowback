import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// ─── State Generation ────────────────────────────────────────────────────────

export function generateOAuthState(): string {
  return crypto.randomUUID();
}

// ─── YouTube (Google) OAuth 2.0 ──────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

export function getYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri:
      process.env.YOUTUBE_REDIRECT_URI ||
      "http://localhost:3001/oauth/youtube/callback",
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string): Promise<OAuthTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri:
        process.env.YOUTUBE_REDIRECT_URI ||
        "http://localhost:3001/oauth/youtube/callback",
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`YouTube token exchange failed: ${err}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function fetchYouTubeChannelId(
  accessToken: string
): Promise<string> {
  const url = `${YOUTUBE_CHANNELS_URL}?part=id&mine=true`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`YouTube channel fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("No YouTube channel found for this account");
  }

  return data.items[0].id;
}

export async function refreshYouTubeToken(
  refreshToken: string
): Promise<OAuthTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`YouTube token refresh failed: ${err}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// ─── TikTok OAuth (Login Kit v2) ────────────────────────────────────────────

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: "code",
    scope: "user.info.basic,video.list",
    redirect_uri:
      process.env.TIKTOK_REDIRECT_URI ||
      "http://localhost:3001/oauth/tiktok/callback",
    state,
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string): Promise<OAuthTokens> {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri:
        process.env.TIKTOK_REDIRECT_URI ||
        "http://localhost:3001/oauth/tiktok/callback",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TikTok token exchange failed: ${err}`);
  }

  const data: any = await response.json();

  if (data.error) {
    throw new Error(
      `TikTok token error: ${data.error_description || data.error}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function fetchTikTokOpenId(accessToken: string): Promise<string> {
  const url = `${TIKTOK_USERINFO_URL}?fields=open_id,display_name`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`TikTok user info fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  if (data.error?.code) {
    throw new Error(`TikTok user info error: ${data.error.message}`);
  }

  return data.data.user.open_id;
}

export async function refreshTikTokToken(
  refreshToken: string
): Promise<OAuthTokens> {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TikTok token refresh failed: ${err}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
