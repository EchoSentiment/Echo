export type Sentiment = "bullish" | "bearish" | "neutral" | "hype" | "fud";
export type NarrativeTier = "emerging" | "trending" | "peaking" | "fading";

export interface Tweet {
  id: string;
  author: string;
  authorFollowers: number;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: number;
  mentionedTokens: string[];
  engagementScore: number;
}

export interface TokenMention {
  symbol: string;
  mint?: string;
  mentionCount: number;
  uniqueAuthors: number;
  totalEngagement: number;
  avgSentiment: number;        // -1.0 to +1.0
  influencerMentions: number;  // accounts > 10k followers
  firstMentioned: number;
  lastMentioned: number;
}

export interface Narrative {
  id: string;
  label: string;               // e.g. "AI agents", "RWA", "DePIN"
  keywords: string[];
  tier: NarrativeTier;
  momentum: number;            // velocity of mention growth
  tweetCount: number;
  engagementTotal: number;
  tokensAssociated: string[];
  detectedAt: number;
  updatedAt: number;
}

export interface SentimentSignal {
  symbol: string;
  sentiment: Sentiment;
  score: number;               // 0-100
  confidence: number;
  narratives: string[];
  topTweets: Tweet[];
  momentum: "accelerating" | "stable" | "decelerating";
  actionHint: string;          // Claude's one-line trading hint
  generatedAt: number;
}

export interface ScanReport {
  scannedAt: number;
  tweetsAnalyzed: number;
  tokensTracked: number;
  topSignals: SentimentSignal[];
  emergingNarratives: Narrative[];
  summary: string;
}
