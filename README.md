<div align="center">

# Echo

**CT sentiment intelligence for Solana.**
Scans Crypto Twitter every 15 minutes. Scores narratives. Tells you what the market is thinking before the price moves.

[![Build](https://img.shields.io/github/actions/workflow/status/EchoSentiment/EchoSentiment/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/EchoSentiment/EchoSentiment/actions)
![License](https://img.shields.io/badge/license-MIT-blue)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-cc7800?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

Crypto Twitter moves before the chart does. But 99% of it is noise — shills, bots, and emotional reactions. The 1% that matters is specific, credible, and high-engagement.

`Echo` fetches recent tweets about your tracked tokens, aggregates mentions by engagement weight, and passes the data to a Claude agent trained to separate signal from noise. The output is a ranked sentiment leaderboard with confidence scores and one-line action hints.

```
FETCH → AGGREGATE → WEIGHT → REASON → SIGNAL → RANK
```

Works with or without a Twitter API key — falls back to realistic mock data for testing.

---

## Sentiment Dashboard

![Echo Dashboard](assets/preview-dashboard.svg)

---

## Terminal Output

![Echo Terminal](assets/preview-terminal.svg)

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│              Twitter Feed Layer                     │
│   v2 Search API · Engagement scoring               │
│   Fallback: mock data (no API key needed)          │
└───────────────────────┬────────────────────────────┘
                        ▼
┌────────────────────────────────────────────────────┐
│           Mention Aggregator                        │
│   Count · Engagement weight · Influencer flag      │
│   Momentum detection (vs previous cycle)           │
└───────────────────────┬────────────────────────────┘
                        ▼
┌────────────────────────────────────────────────────┐
│          Claude Sentiment Agent                     │
│   get_tweet_sample → get_mention_stats             │
│   → get_narrative_keywords → submit_signal         │
└───────────────────────┬────────────────────────────┘
                        ▼
┌────────────────────────────────────────────────────┐
│              Ranker + Reporter                      │
│   24h rolling history · Leaderboard               │
│   Scan report with top narratives                  │
└────────────────────────────────────────────────────┘
```

---

## Sentiment Types

| Signal | Meaning | Trading Implication |
|--------|---------|---------------------|
| **bullish** | Credible positive consensus | Consider entry |
| **bearish** | Credible negative consensus | Avoid or reduce |
| **hype** | High engagement, possibly unsustainable | Take profit zone |
| **fud** | Fear/uncertainty spreading | Check if substantiated |
| **neutral** | Mixed or low-signal | Wait for clarity |

---

## Scoring Weights

- Accounts 10k+ followers: `3×` engagement weight
- Retweets: `3×` likes weight
- Specific claims ("accumulating", "whale"): quality boost
- Generic posts ("LFG", "gm"): filtered out

---

## Quick Start

```bash
git clone https://github.com/EchoSentiment/EchoSentiment
cd EchoSentiment && bun install
cp .env.example .env
bun run dev
```

No Twitter API key needed — mock data is built in.

---

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
TWITTER_BEARER_TOKEN=...        # optional
TRACKED_TOKENS=SOL,JTO,BONK,WIF,PENGU,JUP,RAY
SCAN_INTERVAL_MS=900000         # 15 min
MIN_ENGAGEMENT_SCORE=50
MIN_INFLUENCER_FOLLOWERS=10000
```

---

## License

MIT

---

*read the room. front-run the narrative.*
