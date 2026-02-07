const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetcher(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  getNonce: () => fetcher("/auth/siwe/nonce", { method: "POST" }),
  verifySiwe: (message: string, signature: string) =>
    fetcher("/auth/siwe/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature }),
    }),
  getMe: () => fetcher("/auth/me"),
  logout: () => fetcher("/auth/logout", { method: "POST" }),

  // Campaigns
  getCampaigns: () => fetcher("/campaigns"),
  getCampaign: (id: string) => fetcher(`/campaigns/${id}`),
  createCampaign: (data: any) =>
    fetcher("/campaigns", { method: "POST", body: JSON.stringify(data) }),

  // Submissions
  submitVideo: (data: { campaignId: string; platform: string; videoUrl: string }) =>
    fetcher("/submissions", { method: "POST", body: JSON.stringify(data) }),
  getMySubmissions: () => fetcher("/submissions/mine"),
  getSubmission: (id: string) => fetcher(`/submissions/${id}`),

  // Platforms
  getPlatforms: () => fetcher("/platforms"),
  disconnectPlatform: (id: string) =>
    fetcher(`/platforms/${id}`, { method: "DELETE" }),

  // OAuth
  getOAuthUrl: (platform: string) => fetcher(`/oauth/${platform}/url`),
};
