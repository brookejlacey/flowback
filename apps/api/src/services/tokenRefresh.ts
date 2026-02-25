import { PlatformConnection } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { refreshYouTubeToken, refreshTikTokToken } from "./oauth";
import { decrypt, encrypt } from "../lib/encryption";

const BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer

/**
 * Returns a valid access token for the given platform connection.
 * If the token has expired (or will expire within 5 minutes),
 * refreshes it, updates the database, and returns the new token.
 */
export async function getValidAccessToken(
  connection: PlatformConnection
): Promise<string> {
  const decryptedAccessToken = decrypt(connection.accessToken);

  if (
    !connection.expiresAt ||
    connection.expiresAt.getTime() > Date.now() + BUFFER_MS
  ) {
    return decryptedAccessToken;
  }

  if (!connection.refreshToken) {
    throw new Error(
      `Token expired and no refresh token available for ${connection.platform}`
    );
  }

  const decryptedRefreshToken = decrypt(connection.refreshToken);

  console.log(
    `[TokenRefresh] Refreshing ${connection.platform} token for connection ${connection.id}`
  );

  let newTokens;
  switch (connection.platform) {
    case "youtube":
      newTokens = await refreshYouTubeToken(decryptedRefreshToken);
      break;
    case "tiktok":
      newTokens = await refreshTikTokToken(decryptedRefreshToken);
      break;
    default:
      throw new Error(
        `Token refresh not implemented for ${connection.platform}`
      );
  }

  await prisma.platformConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(newTokens.accessToken),
      refreshToken: encrypt(newTokens.refreshToken),
      expiresAt: newTokens.expiresAt,
    },
  });

  return newTokens.accessToken;
}
