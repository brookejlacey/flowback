import { VideoMetrics } from "./youtube";

/**
 * Fetch video metrics from TikTok Display API v2 (Sandbox mode).
 */
export async function fetchTikTokMetrics(
  videoId: string,
  accessToken: string
): Promise<VideoMetrics> {
  const url = "https://open.tiktokapis.com/v2/video/query/";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: { video_ids: [videoId] },
      fields: ["view_count", "like_count", "comment_count", "share_count"],
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  if (!data.data?.videos || data.data.videos.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const video = data.data.videos[0];

  return {
    viewCount: video.view_count || 0,
    likeCount: video.like_count || 0,
    commentCount: video.comment_count || 0,
    shareCount: video.share_count || 0,
    fetchedAt: new Date().toISOString(),
  };
}
