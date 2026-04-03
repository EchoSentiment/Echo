import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-5-20251001"),
  SCAN_INTERVAL_MS: z.coerce.number().default(900000),    // 15 min
  MIN_ENGAGEMENT_SCORE: z.coerce.number().default(50),    // likes + retweets*3
  MIN_INFLUENCER_FOLLOWERS: z.coerce.number().default(10000),
  TRACKED_TOKENS: z.string().default("SOL,JTO,BONK,WIF,PENGU,JUP,RAY"),
  MAX_TWEETS_PER_CYCLE: z.coerce.number().default(500),
  SENTIMENT_HISTORY_HOURS: z.coerce.number().default(24),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid config: ${missing}`);
  }
  return result.data;
}

export const config = loadConfig();

export function getTrackedTokens(): string[] {
  return config.TRACKED_TOKENS.split(",").map((s) => s.trim()).filter(Boolean);
}
