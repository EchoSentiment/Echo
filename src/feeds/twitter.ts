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
    logger.warn("No Twitter bearer token — using mock data");
    return generateMockTweets(symbol, 20);
  }

  try {
    const query = `(${symbol} OR $${symbol}) -is:retweet lang:en`;
    const params = new URLSearchParams({
      query,
      max_results: Math.min(maxResults, 100).toString(),
      "tweet.fields": "created_at,public_metrics,author_id",
      "expansions": "author_id",
      "user.fields": "username,public_metrics",
    });

    const res = await fetch(`${TWITTER_API}/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${config.TWITTER_BEARER_TOKEN}` },
    });

    if (!res.ok) throw new Error(`Twitter API ${res.status}`);
    const data: TwitterSearchResponse = await res.json();

    const userMap = new Map(
      (data.includes?.users ?? []).map((u) => [u.id, u]),
    );

    return (data.data ?? []).map((t) => {
      const author = userMap.get(t.author_id);
      const engagement = t.public_metrics.like_count + t.public_metrics.retweet_count * 3;

      return {
        id: t.id,
        author: author?.username ?? t.author_id,
        authorFollowers: author?.public_metrics.followers_count ?? 0,
        content: t.text,
        likes: t.public_metrics.like_count,
        retweets: t.public_metrics.retweet_count,
        replies: t.public_metrics.reply_count,
        timestamp: new Date(t.created_at).getTime(),
        mentionedTokens: extractTokenMentions(t.text),
        engagementScore: engagement,
      };
    });
  } catch (err) {
    logger.error(`Failed to fetch tweets for ${symbol}`, err);
    return [];
  }
}

function extractTokenMentions(text: string): string[] {
  const cashtags = text.match(/\$([A-Z]{2,10})/g) ?? [];
  return cashtags.map((t) => t.slice(1));
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

  return Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    const followers = Math.floor(Math.random() * 50000) + 100;
    const likes = Math.floor(Math.random() * 500);
    const rts = Math.floor(Math.random() * 100);

    return {
      id: `mock_${symbol}_${i}`,
      author: `trader_${i}`,
      authorFollowers: followers,
      content: template,
      likes,
      retweets: rts,
      replies: Math.floor(Math.random() * 50),
      timestamp: Date.now() - Math.random() * 3600000,
      mentionedTokens: [symbol],
      engagementScore: likes + rts * 3,
    };
  });
}
