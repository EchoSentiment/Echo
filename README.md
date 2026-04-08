<div align="center">

# Echo

**Crypto Twitter narrative durability engine for Solana.**
Ranks claims by persistence, credibility, and contradiction instead of raw hype.

[![Build](https://img.shields.io/github/actions/workflow/status/EchoSentiment/Echo/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/EchoSentiment/Echo/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-cc7800?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

Crypto Twitter is useful only when you can separate a durable market narrative from a one-hour engagement spike. A token can trend hard on CT and still fail if the claim came from weak accounts, died after one refresh cycle, or immediately attracted a credible opposing cluster.

`Echo` fetches recent tweets for tracked Solana symbols, models author credibility and source diversity, and then asks a Claude agent to decide whether each narrative is durable, contested, or fading. The output is a ranked board of narrative signals with action hints and explicit durability context.
It is intentionally skeptical of narratives that look large only because the same claim is being echoed in one cluster.

`FETCH -> AGGREGATE -> SCORE DURABILITY -> FLAG CONTESTED -> RANK`

---

Research Board • Terminal Output • At a Glance • Operating Surfaces • How It Works • Example Output • Technical Spec • Risk Controls • Quick Start

## At a Glance

- `Use case`: Solana narrative ranking across Crypto Twitter windows
- `Primary input`: credibility, source diversity, persistence, contradiction
- `Primary failure mode`: mistaking hype loops for durable narratives
- `Best for`: operators who want to know which stories last beyond the first engagement spike

## Research Board

![Echo Dashboard](assets/preview-dashboard.svg)

## Terminal Output

![Echo Terminal](assets/preview-terminal.svg)

## Operating Surfaces

- `Research Board`: shows which narratives are emerging, confirmed, contested, or decaying
- `Durability Model`: scores the claim instead of just the engagement
- `Contradiction Lens`: makes opposing evidence visible before a narrative gets promoted
- `Terminal Output`: prints the actual story state with action context

## Why Echo Exists

The problem with narrative tracking is that engagement is easy to see and hard to interpret. A claim can look huge on CT and still be completely fragile once you inspect who is repeating it and whether any credible counter-argument is growing at the same time.

Echo is built to make those hidden differences explicit. It is less interested in who is shouting loudest and more interested in whether the same claim survives across time, sources, and pushback.

## How It Works

Echo uses a disciplined narrative loop:

1. fetch fresh mentions for the tracked Solana tokens
2. cluster similar claims into one narrative lane
3. score the lane on credibility, diversity, persistence, and contradiction
4. downgrade claims that are viral but narrow, repetitive, or heavily contested
5. rank the remaining narratives into a board the operator can act on

The point is to identify what lasts, not what spikes for one refresh cycle.

## What A Durable Narrative Looks Like

- repeated by more than one quality source cluster
- still alive across multiple windows
- not immediately met by a strong contradictory lane
- supported by evidence instead of only mood

That usually matters more than raw engagement totals.

## Example Output

```text
ECHO // NARRATIVE BOARD

lead narrative     SOL fee compression
durability         0.71
credibility        0.78
source diversity   0.68
contradiction      low
state              confirmed

operator note: claim is persisting across multiple desks without strong pushback
```

## Technical Spec

Echo does not equate engagement with quality. Each token narrative is scored on four dimensions:

`Durability = 0.35 * credibility + 0.30 * source_diversity + 0.20 * persistence - 0.15 * contradiction_ratio`

Where:

- `credibility` blends author reach with observed engagement quality
- `source_diversity` rewards narratives repeated across different accounts and reply chains
- `persistence` increases when the same claim survives multiple windows instead of one spike
- `contradiction_ratio` rises when bearish and bullish evidence clusters stay active together

Operational rules:

- viral posts with weak persistence stay in `hype`, not `bullish`
- narratives above the contradiction threshold are marked `contested`
- score ordering is durability-adjusted, not raw engagement-only
- action hints should cite whether the edge comes from persistence, credibility, or a decaying claim

## Risk Controls

- `credibility weighting`: prevents weak accounts from overpowering the board through raw volume
- `contradiction penalty`: stops contested narratives from being ranked like clean ones
- `persistence requirement`: downgrades stories that only live for one short window
- `cluster skepticism`: filters cases where one social pocket keeps repeating itself

Echo is designed to be skeptical because hype is abundant and durable narratives are rare.

## Architecture

```text
Twitter fetch
  -> mention aggregation
  -> durability + contradiction scoring
  -> Claude narrative review
  -> ranked signal board
```

## Quick Start

```bash
git clone https://github.com/EchoSentiment/Echo
cd Echo && bun install
cp .env.example .env
bun run dev
```

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
TWITTER_BEARER_TOKEN=...
AUTHOR_CREDIBILITY_WEIGHT=0.35
SOURCE_DIVERSITY_WEIGHT=0.30
PERSISTENCE_WEIGHT=0.20
CONTRADICTION_PENALTY_WEIGHT=0.15
NARRATIVE_HALF_LIFE_MINUTES=180
```

## Legitimacy Notes

- Planned commit sequence: [`docs/commit-sequence.md`](docs/commit-sequence.md)
- Draft engineering issues: [`docs/issue-drafts.md`](docs/issue-drafts.md)

## Support Docs

- [Runbook](docs/runbook.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

MIT

---

*read what lasts, not what trends for ten minutes.*
