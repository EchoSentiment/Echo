export type Sentiment = "bullish" | "bearish" | "neutral" | "hype" | "fud";
export type NarrativeTier = "emerging" | "confirmed" | "contested" | "decaying";

export interface Tweet {
  id: string;
  author: string;
  authorFollowers: number;
  sourceKind: "twitter" | "mock";
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
  bullishMentions: number;
  bearishMentions: number;
  totalEngagement: number;
  avgSentiment: number;
  influencerMentions: number;
  sourceDiversity: number;
  credibilityScore: number;
  durabilityScore: number;
  contradictionRatio: number;
  firstMentioned: number;
  lastMentioned: number;
}

export interface Narrative {
  id: string;
  label: string;
  keywords: string[];
  tier: NarrativeTier;
  momentum: number;
  tweetCount: number;
  engagementTotal: number;
  tokensAssociated: string[];
  durabilityScore: number;
  detectedAt: number;
  updatedAt: number;
}

export interface SentimentSignal {
  symbol: string;
  sentiment: Sentiment;
  score: number;
  confidence: number;
  narratives: string[];
  topTweets: Tweet[];
  momentum: "accelerating" | "stable" | "decelerating";
  durability: number;
  actionHint: string;
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
