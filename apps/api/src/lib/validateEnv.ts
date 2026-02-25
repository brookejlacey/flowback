/**
 * Validate required environment variables at startup.
 * Fails fast with clear error messages instead of cryptic runtime crashes.
 */
export function validateEnv() {
  const required: { key: string; hint: string }[] = [
    {
      key: "DATABASE_URL",
      hint: "Supabase connection string — Dashboard → Settings → Database → Connection string",
    },
    {
      key: "SESSION_SECRET",
      hint: "Random string for session signing — run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    },
  ];

  const warnings: { key: string; hint: string }[] = [
    {
      key: "YOUTUBE_CLIENT_ID",
      hint: "YouTube OAuth won't work — Google Cloud Console → APIs & Services → OAuth 2.0",
    },
    {
      key: "YOUTUBE_CLIENT_SECRET",
      hint: "YouTube OAuth won't work — Google Cloud Console → APIs & Services → OAuth 2.0",
    },
    {
      key: "TIKTOK_CLIENT_KEY",
      hint: "TikTok OAuth won't work — TikTok Developer Portal → Login Kit",
    },
    {
      key: "TIKTOK_CLIENT_SECRET",
      hint: "TikTok OAuth won't work — TikTok Developer Portal → Login Kit",
    },
    {
      key: "CRE_SERVICE_TOKEN",
      hint: "CRE metrics endpoint will reject all requests",
    },
  ];

  const missing = required.filter((v) => !process.env[v.key]);
  if (missing.length > 0) {
    console.error("\n=== MISSING REQUIRED ENV VARS ===\n");
    for (const v of missing) {
      console.error(`  ✗ ${v.key}`);
      console.error(`    ${v.hint}\n`);
    }
    console.error("Copy .env.example to .env and fill in the values above.\n");
    process.exit(1);
  }

  const unset = warnings.filter((v) => !process.env[v.key]);
  if (unset.length > 0) {
    console.warn("\n⚠ Optional env vars not set:\n");
    for (const v of unset) {
      console.warn(`  - ${v.key}: ${v.hint}`);
    }
    console.warn("");
  }
}
