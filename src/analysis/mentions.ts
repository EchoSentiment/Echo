import { config } from "../lib/config.js";
import type { Tweet, TokenMention } from "../lib/types.js";

export function aggregateMentions(tweets: Tweet[]): Map<string, TokenMention> {
  const map = new Map<string, TokenMention>();

  for (const tweet of tweets) {
    for (const symbol of tweet.mentionedTokens) {
      const existing = map.get(symbol);

      if (!existing) {
        map.set(symbol, {
          symbol,
          mentionCount: 1,
          uniqueAuthors: 1,
          totalEngagement: tweet.engagementScore,
          avgSentiment: 0,
          influencerMentions: tweet.authorFollowers >= config.MIN_INFLUENCER_FOLLOWERS ? 1 : 0,
          firstMentioned: tweet.timestamp,
          lastMentioned: tweet.timestamp,
        });
      } else {
        existing.mentionCount++;
        existing.totalEngagement += tweet.engagementScore;
        if (tweet.authorFollowers >= config.MIN_INFLUENCER_FOLLOWERS) {
          existing.influencerMentions++;
        }
        existing.lastMentioned = Math.max(existing.lastMentioned, tweet.timestamp);
        existing.firstMentioned = Math.min(existing.firstMentioned, tweet.timestamp);
      }
    }
  }

  return map;
}

export function rankByEngagement(
  mentions: Map<string, TokenMention>,
): TokenMention[] {
  return [...mentions.values()]
    .sort((a, b) => b.totalEngagement - a.totalEngagement);
}

export function detectMomentum(
  current: TokenMention,
  previous?: TokenMention,
): "accelerating" | "stable" | "decelerating" {
  if (!previous) return "stable";
  const delta = current.mentionCount - previous.mentionCount;
  const pct = delta / (previous.mentionCount || 1);
  if (pct > 0.3) return "accelerating";
  if (pct < -0.3) return "decelerating";
  return "stable";
}
