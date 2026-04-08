import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-5-20251001"),
  SCAN_INTERVAL_MS: z.coerce.number().default(900_000),
  MIN_ENGAGEMENT_SCORE: z.coerce.number().default(50),
  MIN_INFLUENCER_FOLLOWERS: z.coerce.number().default(10_000),
  TRACKED_TOKENS: z.string().default("SOL,JTO,BONK,WIF,PENGU,JUP,RAY"),
  MAX_TWEETS_PER_CYCLE: z.coerce.number().default(500),
  SENTIMENT_HISTORY_HOURS: z.coerce.number().default(24),
  AUTHOR_CREDIBILITY_WEIGHT: z.coerce.number().default(0.35),
  SOURCE_DIVERSITY_WEIGHT: z.coerce.number().default(0.3),
  PERSISTENCE_WEIGHT: z.coerce.number().default(0.2),
  CONTRADICTION_PENALTY_WEIGHT: z.coerce.number().default(0.15),
  NARRATIVE_HALF_LIFE_MINUTES: z.coerce.number().default(180),
  CONTESTED_CLUSTER_THRESHOLD: z.coerce.number().default(0.33),
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
