import { detectContestedNarrative } from "../analysis/mentions.js";
import type { SentimentSignal, ScanReport, Narrative, TokenMention } from "../lib/types.js";

const signalHistory: SentimentSignal[] = [];

export function ingestSignals(signals: SentimentSignal[]) {
  signalHistory.push(...signals);
  const cutoff = Date.now() - 24 * 3600 * 1000;
  while (signalHistory.length > 0 && signalHistory[0].generatedAt < cutoff) {
    signalHistory.shift();
  }
}

export function generateEmergingNarratives(mentions: Map<string, TokenMention>): Narrative[] {
  return [...mentions.values()]
    .filter((mention) => mention.durabilityScore >= 0.45)
    .sort((a, b) => b.durabilityScore - a.durabilityScore)
    .slice(0, 3)
    .map((mention) => ({
      id: `${mention.symbol.toLowerCase()}-${mention.lastMentioned}`,
      label: `${mention.symbol} narrative`,
      keywords: [mention.symbol, detectContestedNarrative(mention) ? "contested" : "confirmed"],
      tier: detectContestedNarrative(mention) ? "contested" : "confirmed",
      momentum: Number((mention.mentionCount / Math.max(1, mention.uniqueAuthors)).toFixed(2)),
      tweetCount: mention.mentionCount,
      engagementTotal: mention.totalEngagement,
      tokensAssociated: [mention.symbol],
      durabilityScore: mention.durabilityScore,
      detectedAt: mention.firstMentioned,
      updatedAt: mention.lastMentioned,
    }));
}

export function generateScanReport(
  newSignals: SentimentSignal[],
  tweetsAnalyzed: number,
  mentions: Map<string, TokenMention>,
): ScanReport {
  const topSignals = [...newSignals]
    .sort((a, b) => b.score + b.durability * 20 - (a.score + a.durability * 20))
    .slice(0, 5);

  const bullishCount = newSignals.filter((s) => s.sentiment === "bullish" || s.sentiment === "hype").length;
  const bearishCount = newSignals.filter((s) => s.sentiment === "bearish" || s.sentiment === "fud").length;

  const narratives = generateEmergingNarratives(mentions);
  const topNarratives = narratives.map((n) => `${n.label}:${n.durabilityScore.toFixed(2)}`).join(", ");

  return {
    scannedAt: Date.now(),
    tweetsAnalyzed,
    tokensTracked: newSignals.length,
    topSignals,
    emergingNarratives: narratives,
    summary: `${tweetsAnalyzed} tweets | ${newSignals.length} tokens | ${bullishCount} bullish / ${bearishCount} bearish | narratives ${topNarratives}`,
  };
}

export function getLeaderboard(): SentimentSignal[] {
  const latest = new Map<string, SentimentSignal>();
  for (const signal of signalHistory) {
    latest.set(signal.symbol, signal);
  }
  return [...latest.values()].sort((a, b) => b.score + b.durability * 20 - (a.score + a.durability * 20));
}
