import { describe, it, expect } from "vitest";
import { aggregateMentions, rankByEngagement, detectMomentum } from "../src/analysis/mentions.js";
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
    const tweets = [
      baseTweet, // 15k followers — influencer
      { ...baseTweet, id: "2", authorFollowers: 500 }, // not influencer
    ];
    const mentions = aggregateMentions(tweets);
    expect(mentions.get("SOL")?.influencerMentions).toBe(1);
  });

  it("sums engagement across mentions", () => {
    const tweets = [
      { ...baseTweet, engagementScore: 100 },
      { ...baseTweet, id: "2", engagementScore: 200 },
    ];
    const mentions = aggregateMentions(tweets);
    expect(mentions.get("SOL")?.totalEngagement).toBe(300);
  });

  it("handles multiple tokens in one tweet", () => {
    const tweet = { ...baseTweet, content: "$SOL and $JTO both looking good", mentionedTokens: ["SOL", "JTO"] };
    const mentions = aggregateMentions([tweet]);
    expect(mentions.has("SOL")).toBe(true);
    expect(mentions.has("JTO")).toBe(true);
  });
});

describe("rankByEngagement", () => {
  it("sorts tokens by total engagement descending", () => {
    const tweets = [
      { ...baseTweet, mentionedTokens: ["SOL"], engagementScore: 100 },
      { ...baseTweet, id: "2", mentionedTokens: ["JTO"], engagementScore: 500 },
    ];
    const mentions = aggregateMentions(tweets);
    const ranked = rankByEngagement(mentions);
    expect(ranked[0].symbol).toBe("JTO");
  });
});

describe("detectMomentum", () => {
  const base: TokenMention = {
    symbol: "SOL", mentionCount: 100, uniqueAuthors: 50,
    totalEngagement: 5000, avgSentiment: 0.3, influencerMentions: 10,
    firstMentioned: Date.now() - 3600000, lastMentioned: Date.now(),
  };

  it("returns accelerating when mentions grew 30%+", () => {
    const current = { ...base, mentionCount: 140 };
    expect(detectMomentum(current, base)).toBe("accelerating");
  });

  it("returns decelerating when mentions dropped 30%+", () => {
    const current = { ...base, mentionCount: 60 };
    expect(detectMomentum(current, base)).toBe("decelerating");
  });

  it("returns stable for minor changes", () => {
    const current = { ...base, mentionCount: 110 };
    expect(detectMomentum(current, base)).toBe("stable");
  });

  it("returns stable when no previous data", () => {
    expect(detectMomentum(base)).toBe("stable");
  });
});
