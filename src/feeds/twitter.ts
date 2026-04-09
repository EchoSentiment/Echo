import { createLogger } from "../lib/logger.js";
import { config } from "../lib/config.js";
import type { Tweet } from "../lib/types.js";

const logger = createLogger("twitter");

const TWITTER_API = "https://api.twitter.com/2";

interface TwitterApiTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    impression_count: number;
  };
  author_id: string;
}

interface TwitterApiUser {
  id: string;
  username: string;
  public_metrics: { followers_count: number };
}

interface TwitterSearchResponse {
  data: TwitterApiTweet[];
  includes: { users: TwitterApiUser[] };
  meta: { result_count: number; next_token?: string };
}

export async function fetchTweetsForToken(
  symbol: string,
  maxResults = 100,
): Promise<Tweet[]> {
  if (!config.TWITTER_BEARER_TOKEN) {
    if (!config.ALLOW_MOCK_DATA) {
      logger.warn(`No Twitter bearer token for ${symbol} - returning empty feed`);
      return [];
    }

    logger.warn("No Twitter bearer token - using explicit mock data");
    return generateMockTweets(symbol, 20);
  }

  try {
    const query = `(${symbol} OR $${symbol}) -is:retweet lang:en`;
    const params = new URLSearchParams({
      query,
      max_results: Math.min(maxResults, 100).toString(),
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "username,public_metrics",
    });

    const res = await fetch(`${TWITTER_API}/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${config.TWITTER_BEARER_TOKEN}` },
    });

    if (!res.ok) throw new Error(`Twitter API ${res.status}`);
    const data: TwitterSearchResponse = await res.json();

    const userMap = new Map(
      (data.includes?.users ?? []).map((user) => [user.id, user]),
    );

    return (data.data ?? []).map((tweet) => {
      const author = userMap.get(tweet.author_id);
      const engagement = tweet.public_metrics.like_count + tweet.public_metrics.retweet_count * 3;

      return {
        id: tweet.id,
        author: author?.username ?? tweet.author_id,
        authorFollowers: author?.public_metrics.followers_count ?? 0,
        sourceKind: "twitter",
        content: tweet.text,
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
        timestamp: new Date(tweet.created_at).getTime(),
        mentionedTokens: extractTokenMentions(tweet.text, symbol),
        engagementScore: engagement,
      };
    });
  } catch (err) {
    logger.error(`Failed to fetch tweets for ${symbol}`, err);
    return [];
  }
}

function extractTokenMentions(text: string, fallbackSymbol: string): string[] {
  const cashtags = text.match(/\$([A-Z]{2,10})/g) ?? [];
  const mentions = new Set(cashtags.map((value) => value.slice(1)));
  const plainSymbol = new RegExp(`\\b${fallbackSymbol}\\b`, "i");
  if (plainSymbol.test(text)) mentions.add(fallbackSymbol.toUpperCase());
  return [...mentions];
}

function generateMockTweets(symbol: string, count: number): Tweet[] {
  const templates = [
    `$${symbol} looking really strong here, accumulating`,
    `$${symbol} breaking out, this is the move`,
    `Not sure about $${symbol} at these levels, might wait`,
    `$${symbol} fundamentals are solid, long term hold`,
    `$${symbol} chart looks terrible, be careful`,
    `Huge $${symbol} news incoming, stay tuned`,
    `$${symbol} whale just accumulated 2M tokens`,
    `$${symbol} daily close above resistance is bullish`,
  ];

  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 17;
    const followers = 100 + (seed * 97) % 50000;
    const likes = (seed * 29) % 500;
    const retweets = (seed * 13) % 100;
    const replies = (seed * 11) % 50;
    const ageMs = ((seed * 7919) % 3600) * 1000;

    return {
      id: `mock_${symbol}_${index}`,
      author: `trader_${index}`,
      authorFollowers: followers,
      sourceKind: "mock",
      content: template,
      likes,
      retweets,
      replies,
      timestamp: Date.now() - ageMs,
      mentionedTokens: [symbol],
      engagementScore: likes + retweets * 3,
    };
  });
}
