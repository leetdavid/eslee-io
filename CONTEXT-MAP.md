# Context map

## Contexts

- [Sushiro Queue Map](./apps/sushiro/CONTEXT.md) describes the public queue-status viewer for Sushiro stores in Hong Kong. Its [design context](./apps/sushiro/.impeccable.md) lives alongside the app.
- [What Beats Jev](./apps/what-beats-jev/CONTEXT.md) describes the answer-chaining web game planned as its own Next.js app. Its [design context](./apps/what-beats-jev/.impeccable.md), approved [design brief](./apps/what-beats-jev/docs/design-brief.md), and [Doop frame index](./apps/what-beats-jev/docs/doop-designs.md) live alongside the app.
- [Jev MBTI](./apps/jev-mbti/CONTEXT.md) describes the bilingual site, live at https://jev-mbti.vercel.app, that places the 16 MBTI types on one or two axes for a visitor's question. Its [discovery notes](./docs/plans/jev-mbti.md), [design context](./apps/jev-mbti/.impeccable.md), [design brief](./apps/jev-mbti/docs/design-brief.md), [Doop frame index](./apps/jev-mbti/docs/doop-designs.md), and [deployment runbook](./apps/jev-mbti/docs/deployment.md) record agreed decisions.

## Relationships

These are separate products in the same monorepo. No shared domain behavior has been agreed. What Beats Jev and Jev MBTI both use Jev, but they share no data or rules.
