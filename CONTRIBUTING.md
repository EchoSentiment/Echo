# Contributing

## Local Setup

```bash
bun install
cp .env.example .env
bun run dev
```

## Contribution Rules

- keep clustering, scoring, and board-copy changes separate
- update tests when durability or contradiction rules change
- keep README language focused on narrative persistence, not generic sentiment

## Pull Request Notes

- explain which narrative dimension changed
- include a sample board or output block when ranking behavior changes
- update the runbook if operator interpretation changed
