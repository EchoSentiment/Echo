import type { SentimentSignal, ScanReport } from "../lib/types.js";

const signalHistory: SentimentSignal[] = [];

export function ingestSignals(signals: SentimentSignal[]) {
  signalHistory.push(...signals);
  const cutoff = Date.now() - 24 * 3600 * 1000;
  while (signalHistory.length > 0 && signalHistory[0].generatedAt < cutoff) {
    signalHistory.shift();
  }
}

export function generateScanReport(
  newSignals: SentimentSignal[],
  tweetsAnalyzed: number,
): ScanReport {
  const topSignals = [...newSignals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const bullishCount = newSignals.filter((s) => s.sentiment === "bullish" || s.sentiment === "hype").length;
  const bearishCount = newSignals.filter((s) => s.sentiment === "bearish" || s.sentiment === "fud").length;

  const allNarratives = newSignals.flatMap((s) => s.narratives);
  const narrativeFreq = new Map<string, number>();
  for (const n of allNarratives) {
    narrativeFreq.set(n, (narrativeFreq.get(n) ?? 0) + 1);
  }

  const topNarratives = [...narrativeFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => n);

  return {
    scannedAt: Date.now(),
    tweetsAnalyzed,
    tokensTracked: newSignals.length,
    topSignals,
    emergingNarratives: [],
    summary: `${tweetsAnalyzed} tweets · ${newSignals.length} tokens · ${bullishCount} bullish / ${bearishCount} bearish · top narratives: ${topNarratives.join(", ")}`,
  };
}

export function getLeaderboard(): SentimentSignal[] {
  const latest = new Map<string, SentimentSignal>();
  for (const s of signalHistory) {
    latest.set(s.symbol, s);
  }
  return [...latest.values()].sort((a, b) => b.score - a.score);
}
