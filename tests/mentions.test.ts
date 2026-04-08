import { describe, it, expect } from "vitest";
import { aggregateMentions, rankByEngagement, detectMomentum, scoreNarrativeDurability, detectContestedNarrative } from "../src/analysis/mentions.js";
import type { Tweet, TokenMention } from "../src/lib/types.js";

const baseTweet: Tweet = {
  id: "1",
  author: "trader1",
  authorFollowers: 15000,
  content: "$SOL looking strong, accumulating here",
  likes: 120,
  retweets: 40,
  replies: 15,
  timestamp: Date.now(),
  mentionedTokens: ["SOL"],
  engagementScore: 240,
};

describe("aggregateMentions", () => {
  it("counts mentions correctly", () => {
    const tweets = [baseTweet, { ...baseTweet, id: "2" }];
    const mentions = aggregateMentions(tweets);
    expect(mentions.get("SOL")?.mentionCount).toBe(2);
  });

  it("tracks influencer mentions separately", () => {
    const tweets = [baseTweet, { ...baseTweet, id: "2", authorFollowers: 500 }];
    const mentions = aggregateMentions(tweets);
    expect(mentions.get("SOL")?.influencerMentions).toBe(1);
  });

  it("computes a durability score", () => {
    const mentions = aggregateMentions([baseTweet]);
    expect(mentions.get("SOL")?.durabilityScore).toBeGreaterThanOrEqual(0);
  });
});

describe("rankByEngagement", () => {
  it("prefers stronger durability when engagement is similar", () => {
    const tweets = [
      { ...baseTweet, mentionedTokens: ["SOL"], engagementScore: 180, replies: 18 },
      { ...baseTweet, id: "2", mentionedTokens: ["JTO"], engagementScore: 170, replies: 0, content: "$JTO moon lfg" },
    ];
    const mentions = aggregateMentions(tweets);
    const ranked = rankByEngagement(mentions);
    expect(ranked[0].symbol).toBe("SOL");
  });
});

describe("detectMomentum", () => {
  const base: TokenMention = {
    symbol: "SOL",
    mentionCount: 100,
    uniqueAuthors: 50,
    totalEngagement: 5000,
    avgSentiment: 0.3,
    influencerMentions: 10,
    sourceDiversity: 0.7,
    credibilityScore: 0.8,
    durabilityScore: 0.6,
    contradictionRatio: 0.1,
    firstMentioned: Date.now() - 3600000,
    lastMentioned: Date.now(),
  };

  it("returns accelerating when mentions grew 30%+", () => {
    const current = { ...base, mentionCount: 140 };
    expect(detectMomentum(current, base)).toBe("accelerating");
  });

  it("returns decelerating when mentions dropped 30%+", () => {
    const current = { ...base, mentionCount: 60 };
    expect(detectMomentum(current, base)).toBe("decelerating");
  });
});

describe("durability helpers", () => {
  it("marks contested narratives when contradiction is high", () => {
    const mention: TokenMention = {
      symbol: "BONK",
      mentionCount: 30,
      uniqueAuthors: 18,
      totalEngagement: 900,
      avgSentiment: 0,
      influencerMentions: 3,
      sourceDiversity: 0.5,
      credibilityScore: 0.4,
      durabilityScore: 0,
      contradictionRatio: 0.5,
      firstMentioned: Date.now() - 3600000,
      lastMentioned: Date.now(),
    };
    mention.durabilityScore = scoreNarrativeDurability(mention);
    expect(detectContestedNarrative(mention)).toBe(true);
  });
});
