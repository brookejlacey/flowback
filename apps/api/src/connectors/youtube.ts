export interface VideoMetrics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  fetchedAt: string;
}

/**
 * Fetch video metrics from YouTube Data API v3.
 * Uses OAuth token from stored platform connection.
 */
export async function fetchYouTubeMetrics(
  videoId: string,
  accessToken: string
): Promise<VideoMetrics> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const stats = data.items[0].statistics;

  return {
    viewCount: parseInt(stats.viewCount || "0", 10),
    likeCount: parseInt(stats.likeCount || "0", 10),
    commentCount: parseInt(stats.commentCount || "0", 10),
    shareCount: 0, // YouTube doesn't expose share count
    fetchedAt: new Date().toISOString(),
  };
}
