import { config, getTrackedTokens } from "./src/lib/config.js";
import { createLogger } from "./src/lib/logger.js";
import { fetchTweetsForToken } from "./src/feeds/twitter.js";
import { aggregateMentions, rankByEngagement } from "./src/analysis/mentions.js";
import { analyzeSentiment } from "./src/agent/loop.js";
import { ingestSignals, generateScanReport, getLeaderboard } from "./src/scoring/ranker.js";
import type { Tweet, TokenMention } from "./src/lib/types.js";

const logger = createLogger("echo");
let previousMentions = new Map<string, TokenMention>();

async function scan() {
  logger.info("─── Sentiment scan ───────────────────────────────");

  const tokens = getTrackedTokens();
  const tweetsByToken = new Map<string, Tweet[]>();
  let totalTweets = 0;

  for (const symbol of tokens) {
    const tweets = await fetchTweetsForToken(symbol, 50);
    tweetsByToken.set(symbol, tweets);
    totalTweets += tweets.length;
  }

  const allTweets = [...tweetsByToken.values()].flat();
  const currentMentions = aggregateMentions(allTweets);
  const ranked = rankByEngagement(currentMentions);

  logger.info(`Fetched ${totalTweets} tweets across ${tokens.length} tokens`);
  logger.info(`Top mention: ${ranked[0]?.symbol ?? "none"} (${ranked[0]?.totalEngagement ?? 0} engagement)`);

  const signals = await analyzeSentiment(tokens, tweetsByToken, currentMentions, previousMentions);
  ingestSignals(signals);

  const report = generateScanReport(signals, totalTweets);
  logger.info(report.summary);

  const leaderboard = getLeaderboard();
  if (leaderboard.length > 0) {
    logger.info("─── Sentiment Leaderboard ────────────────────────");
    for (const s of leaderboard.slice(0, 5)) {
      logger.info(`  ${s.symbol.padEnd(8)} ${s.sentiment.toUpperCase().padEnd(8)} ${s.score}/100  ${s.actionHint}`);
    }
  }

  previousMentions = currentMentions;
}

async function main() {
  logger.info("Echo starting...");
  logger.info(`Tracking: ${getTrackedTokens().join(", ")} | Interval: ${config.SCAN_INTERVAL_MS / 60000}m`);

  await scan();
  setInterval(scan, config.SCAN_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
