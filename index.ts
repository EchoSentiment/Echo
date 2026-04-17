import { config, getTrackedTokens } from "./src/lib/config.js";
import { createLogger } from "./src/lib/logger.js";
import { fetchTweetsForToken } from "./src/feeds/twitter.js";
import { aggregateMentions, rankByEngagement } from "./src/analysis/mentions.js";
import { analyzeSentiment } from "./src/agent/loop.js";
import { generateScanReport, getLeaderboard, ingestSignals } from "./src/scoring/ranker.js";
import type { TokenMention, Tweet } from "./src/lib/types.js";

const logger = createLogger("echo");
let previousMentions = new Map<string, TokenMention>();

async function scan() {
  const startedAt = Date.now();
  logger.info("---------------- Narrative Scan ------------");

  try {
    const tokens = getTrackedTokens();
    const tweetsByToken = new Map<string, Tweet[]>();
    let totalTweets = 0;
    let failedTokens = 0;

    for (const symbol of tokens) {
      try {
        const tweets = await fetchTweetsForToken(symbol, 50);
        tweetsByToken.set(symbol, tweets);
        totalTweets += tweets.length;
      } catch (err) {
        failedTokens++;
        logger.error("Token feed fetch failed", {
          symbol,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const allTweets = [...tweetsByToken.values()].flat();
    const currentMentions = aggregateMentions(allTweets);
    const ranked = rankByEngagement(currentMentions);

    logger.info(
      `Fetched ${totalTweets} tweets across ${tokens.length} tracked tokens (${failedTokens} failed token feeds)`,
    );
    logger.info(
      `Top narrative: ${ranked[0]?.symbol ?? "none"} (${ranked[0]?.totalEngagement ?? 0} engagement, durability ${(ranked[0]?.durabilityScore ?? 0).toFixed(2)})`,
    );

    const signals = await analyzeSentiment(tokens, tweetsByToken, currentMentions, previousMentions);
    ingestSignals(signals);

    const report = generateScanReport(signals, totalTweets, currentMentions);
    logger.info(report.summary);

    const leaderboard = getLeaderboard();
    if (leaderboard.length > 0) {
      logger.info("---------------- Durability Board ----------");
      for (const signal of leaderboard.slice(0, 5)) {
        logger.info(
          `  ${signal.symbol.padEnd(8)} ${signal.sentiment.toUpperCase().padEnd(8)} ${signal.score}/100  dur=${signal.durability.toFixed(2)}  ${signal.actionHint}`,
        );
      }
    }

    previousMentions = currentMentions;
  } finally {
    const durationMs = Date.now() - startedAt;
    logger.info("Echo scan complete", { durationMs });

    if (durationMs > config.SCAN_INTERVAL_MS) {
      logger.warn("Echo scan exceeded configured interval", {
        durationMs,
        intervalMs: config.SCAN_INTERVAL_MS,
      });
    }
  }
}

async function main() {
  logger.info("Echo starting...");
  logger.info(`Tracking: ${getTrackedTokens().join(", ")} | Interval: ${config.SCAN_INTERVAL_MS / 60000}m`);

  let scanInFlight = false;
  let skippedScans = 0;

  const tick = async () => {
    if (scanInFlight) {
      skippedScans++;
      logger.warn("Skipping narrative scan because the previous scan is still running", {
        skippedScans,
      });
      return;
    }

    scanInFlight = true;
    try {
      await scan();
    } catch (err) {
      logger.error("Narrative scan failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      scanInFlight = false;
    }
  };

  await tick();
  setInterval(() => {
    void tick();
  }, config.SCAN_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
