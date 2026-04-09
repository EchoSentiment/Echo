import { config } from "../lib/config.js";
import type { Tweet, TokenMention } from "../lib/types.js";

function inferTweetSentiment(tweet: Tweet): number {
  const text = tweet.content.toLowerCase();
  if (/(rug|scam|unlock|dump|exit|avoid|bad fill)/.test(text)) return -0.8;
  if (/(accumulating|breakout|bid|higher|strength|rotation)/.test(text)) return 0.8;
  if (/(lfg|moon|send it|gm)/.test(text)) return 0.2;
  return 0;
}

function computeCredibility(tweet: Tweet): number {
  const followerScore = Math.min(1, Math.log10(tweet.authorFollowers + 10) / 5);
  const engagementScore = Math.min(1, tweet.engagementScore / 400);
  return Number((followerScore * 0.6 + engagementScore * 0.4).toFixed(3));
}

export function scoreNarrativeDurability(mention: TokenMention): number {
  const ageMinutes = Math.max(1, (mention.lastMentioned - mention.firstMentioned) / 60000);
  const persistenceAcrossWindows = Math.min(1, ageMinutes / config.NARRATIVE_HALF_LIFE_MINUTES);
  const raw =
    mention.credibilityScore * config.AUTHOR_CREDIBILITY_WEIGHT +
    mention.sourceDiversity * config.SOURCE_DIVERSITY_WEIGHT +
    persistenceAcrossWindows * config.PERSISTENCE_WEIGHT -
    mention.contradictionRatio * config.CONTRADICTION_PENALTY_WEIGHT;
  return Number(Math.max(0, Math.min(1, raw)).toFixed(3));
}

export function detectContestedNarrative(mention: TokenMention): boolean {
  return mention.contradictionRatio >= config.CONTESTED_CLUSTER_THRESHOLD;
}

export function aggregateMentions(tweets: Tweet[]): Map<string, TokenMention> {
  const map = new Map<string, TokenMention>();
  const authorSets = new Map<string, Set<string>>();

  for (const tweet of tweets) {
    const sentiment = inferTweetSentiment(tweet);
    const credibility = computeCredibility(tweet);

    for (const symbol of tweet.mentionedTokens) {
      const existing = map.get(symbol);
      const authors = authorSets.get(symbol) ?? new Set<string>();
      authors.add(tweet.author);
      authorSets.set(symbol, authors);
      const uniqueAuthors = authors.size;
      const nextMentionCount = (existing?.mentionCount ?? 0) + 1;
      const diversityProxy = Number(
        Math.min(1, uniqueAuthors / Math.max(2, Math.ceil(Math.sqrt(Math.max(1, nextMentionCount))))).toFixed(3),
      );

      if (!existing) {
        map.set(symbol, {
          symbol,
          mentionCount: 1,
          uniqueAuthors,
          bullishMentions: sentiment > 0 ? 1 : 0,
          bearishMentions: sentiment < 0 ? 1 : 0,
          totalEngagement: tweet.engagementScore,
          avgSentiment: sentiment,
          influencerMentions: tweet.authorFollowers >= config.MIN_INFLUENCER_FOLLOWERS ? 1 : 0,
          sourceDiversity: diversityProxy,
          credibilityScore: credibility,
          durabilityScore: 0,
          contradictionRatio: sentiment < 0 ? 1 : 0,
          firstMentioned: tweet.timestamp,
          lastMentioned: tweet.timestamp,
        });
      } else {
        existing.mentionCount++;
        existing.uniqueAuthors = uniqueAuthors;
        if (sentiment > 0) existing.bullishMentions++;
        if (sentiment < 0) existing.bearishMentions++;
        existing.totalEngagement += tweet.engagementScore;
        existing.avgSentiment = Number(
          ((existing.avgSentiment * (existing.mentionCount - 1) + sentiment) / existing.mentionCount).toFixed(3),
        );
        existing.credibilityScore = Number(
          ((existing.credibilityScore * (existing.mentionCount - 1) + credibility) / existing.mentionCount).toFixed(3),
        );
        existing.sourceDiversity = diversityProxy;
        if (tweet.authorFollowers >= config.MIN_INFLUENCER_FOLLOWERS) {
          existing.influencerMentions++;
        }
        if (sentiment < 0) {
          existing.contradictionRatio = Number(
            ((existing.contradictionRatio * (existing.mentionCount - 1) + 1) / existing.mentionCount).toFixed(3),
          );
        } else {
          existing.contradictionRatio = Number(
            ((existing.contradictionRatio * (existing.mentionCount - 1)) / existing.mentionCount).toFixed(3),
          );
        }
        existing.lastMentioned = Math.max(existing.lastMentioned, tweet.timestamp);
        existing.firstMentioned = Math.min(existing.firstMentioned, tweet.timestamp);
      }
    }
  }

  for (const mention of map.values()) {
    mention.durabilityScore = scoreNarrativeDurability(mention);
  }

  return map;
}

export function rankByEngagement(mentions: Map<string, TokenMention>): TokenMention[] {
  return [...mentions.values()].sort((left, right) => {
    const leftScore = left.totalEngagement * 0.5 + left.durabilityScore * 500;
    const rightScore = right.totalEngagement * 0.5 + right.durabilityScore * 500;
    return rightScore - leftScore;
  });
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
