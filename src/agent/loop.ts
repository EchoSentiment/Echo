import Anthropic from "@anthropic-ai/sdk";
import { config } from "../lib/config.js";
import { createLogger } from "../lib/logger.js";
import type { Tweet, TokenMention, SentimentSignal } from "../lib/types.js";
import { ECHO_SYSTEM } from "./prompts.js";
import { detectMomentum } from "../analysis/mentions.js";

const logger = createLogger("agent");
const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: "get_tweet_sample",
    description: "Returns a sample of tweets for a specific token, sorted by engagement",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string" },
        limit: { type: "number" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_mention_stats",
    description: "Returns mention count, engagement totals, and influencer mention count for a token",
    input_schema: {
      type: "object" as const,
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
    },
  },
  {
    name: "get_narrative_keywords",
    description: "Extracts the most common phrases and keywords from tweets about a token",
    input_schema: {
      type: "object" as const,
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
    },
  },
  {
    name: "submit_signal",
    description: "Submit a completed sentiment signal for a token",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string" },
        sentiment: { type: "string", enum: ["bullish", "bearish", "neutral", "hype", "fud"] },
        score: { type: "number" },
        confidence: { type: "number" },
        narratives: { type: "array", items: { type: "string" } },
        actionHint: { type: "string" },
      },
      required: ["symbol", "sentiment", "score", "confidence", "narratives", "actionHint"],
    },
  },
];

export async function analyzeSentiment(
  tokens: string[],
  tweetsByToken: Map<string, Tweet[]>,
  mentionsByToken: Map<string, TokenMention>,
  previousMentions: Map<string, TokenMention>,
): Promise<SentimentSignal[]> {
  const signals: SentimentSignal[] = [];

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Analyze CT sentiment for these Solana tokens: ${tokens.join(", ")}. Use the available tools to fetch tweet samples, engagement stats, and narrative keywords for each. Submit a signal for any token with confidence >= 0.5.`,
    },
  ];

  for (let i = 0; i < 16; i++) {
    const response = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 2048,
      system: ECHO_SYSTEM,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: unknown;

      switch (block.name) {
        case "get_tweet_sample": {
          const input = block.input as { symbol: string; limit?: number };
          const tweets = tweetsByToken.get(input.symbol) ?? [];
          result = tweets
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, input.limit ?? 10)
            .map((t) => ({
              author: t.author,
              followers: t.authorFollowers,
              content: t.content.slice(0, 200),
              engagement: t.engagementScore,
              age: `${Math.round((Date.now() - t.timestamp) / 60000)}m ago`,
            }));
          break;
        }

        case "get_mention_stats": {
          const input = block.input as { symbol: string };
          const mention = mentionsByToken.get(input.symbol);
          result = mention ?? { symbol: input.symbol, mentionCount: 0, note: "no data" };
          break;
        }

        case "get_narrative_keywords": {
          const input = block.input as { symbol: string };
          const tweets = tweetsByToken.get(input.symbol) ?? [];
          const words = tweets
            .flatMap((t) => t.content.toLowerCase().split(/\s+/))
            .filter((w) => w.length > 3 && !["this", "that", "with", "from", "have"].includes(w));
          const freq = new Map<string, number>();
          for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
          result = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word, count]) => ({ word, count }));
          break;
        }

        case "submit_signal": {
          const input = block.input as {
            symbol: string; sentiment: SentimentSignal["sentiment"];
            score: number; confidence: number; narratives: string[]; actionHint: string;
          };

          if (input.confidence >= 0.5) {
            const tweets = tweetsByToken.get(input.symbol) ?? [];
            const mention = mentionsByToken.get(input.symbol);
            const prev = previousMentions.get(input.symbol);

            const signal: SentimentSignal = {
              symbol: input.symbol,
              sentiment: input.sentiment,
              score: input.score,
              confidence: input.confidence,
              narratives: input.narratives,
              topTweets: tweets.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 3),
              momentum: mention ? detectMomentum(mention, prev) : "stable",
              actionHint: input.actionHint,
              generatedAt: Date.now(),
            };

            signals.push(signal);
            logger.info(`[SIGNAL] ${signal.symbol} → ${signal.sentiment.toUpperCase()} (${signal.score}/100, conf ${signal.confidence.toFixed(2)}) | ${signal.actionHint}`);
          }

          result = { accepted: true };
          break;
        }

        default:
          result = { error: "unknown tool" };
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return signals;
}
