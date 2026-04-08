# Echo Issue Drafts

## Ticker collisions are still leaking low-quality mentions into durable clusters

Short tickers and meme aliases can still inflate the wrong token narrative. Add a stricter alias resolver before durability scoring runs.

## Contested narratives need a stronger cap before we surface bullish action hints

Right now a token can score well on engagement and still keep a bullish hint even when contradiction ratio is elevated. We should clamp confidence when bearish evidence remains active.

Backlog note: test both issues on mixed CT and Telegram samples before revising the main durability weights.
