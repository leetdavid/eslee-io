# What Beats Jev discovery

Status: Implemented, pushed, deployed, and verified at https://what-beats-jev.vercel.app. The user authorized full implementation and production deployment. See [deployment](../../apps/what-beats-jev/docs/deployment.md) for resource ownership, release evidence, and operating instructions.

## Confirmed direction

- Build a web game with the chaining mechanic of What Beats Rock.
- The game is its own Next.js app in this monorepo at `apps/what-beats-jev`, independent of the portfolio and Sushiro.
- The first release is for public casual players, not a private experiment for friends.
- The first release is completely anonymous, with no required player identity or account.
- There is no leaderboard. Public rankings are not part of the agreed scope.
- The player types something that beats the current challenge. Rock followed by paper is the introductory example.
- Answers are free-form text and may describe potentially anything, including creative, absurd, or metaphorical counters. The maximum is 240 visible Unicode characters per answer.
- If the judge accepts the answer, that answer becomes the next challenge.
- A phrase already in the current chain cannot be reused in that run, including the starting challenge. A phrase known elsewhere in the game is still allowed if it has not appeared in the current chain.
- The first "doesn't beat" verdict ends the run, whether it comes from Jev or the saved database verdict.
- Empty, over-limit, or repeated input is blocked before judging and does not end the run. Technical errors preserve the run and allow retrying.
- The goal is to build the longest chain before losing.
- Every run starts with rock. Chain length starts at zero and counts accepted answers, excluding the starter. Runs are untimed.
- Jev, TypeSafe AI's System One model, supplies judgments instead of an LLM. It is not a human judge or a chatbot.
- The TypeSafe skill is installed for OpenCode at `.agents/skills/typesafe-ai` and must be used when working on this project. Only the Skills CLI installation method was used.
- Jev is the sole authority on whether an answer beats the current challenge. Do not add a hard-coded relationship list, a separate realism filter, or another judge to override that decision. Input constraints such as the length limit are separate from judging the relationship.
- Save Jev's judgments per ordered matchup: the current challenge plus the proposed answer. Reuse a saved verdict for that matchup instead of calling Jev again.
- Host the game's database on Railway PostgreSQL in its own `what-beats-jev` project in the David Lee workspace. The database is provisioned and migrated, with daily and weekly backups.
- Phrase identity ignores capitalization and surrounding whitespace across matchup caching, novelty, and the no-repeat rule. Preserve the player's original wording for display. Synonyms and rewordings remain distinct phrases.
- New means the first successful result for an ordered matchup across the game. A familiar phrase can earn a New matchup notice against an unseen challenge if it wins. A newly judged loss and replaying a cached win never earn the notice.
- This explicitly replaces the user's earlier phrase-based novelty decision. Both accepting and rejecting matchup verdicts remain cached; no global first-phrase notice is required.
- Save unfinished runs in browser-local storage and resume them in the same browser after a refresh or return visit. This is separate from the shared database of answers and matchup verdicts and does not require a player identity.
- Use Fluid Functionalism for frontend UI components.
- Show Jev's reported confidence as a percentage after completed verdicts, including cached results and losses. It is not win probability and does not change the verdict or discovery rules.
- The theme should be whimsical and playful.
- The recommended bright, toy-like direction was accepted, with expressive typography and tactile controls supported by Fluid Functionalism interactions.
- Responsive design must provide first-class support for desktop, mobile, and any viewport. Neither phone nor desktop is the privileged experience.
- Design work belongs on Doop canvas `oJGrvv12x1`, currently named "what beats jev".

## Discovery approach

Ask one question at a time, with a recommendation. Cover the major decisions before exploring any one area in detail. Record confirmed terminology in [the game glossary](../../apps/what-beats-jev/CONTEXT.md). Record decisions here as they are agreed; create ADRs only for consequential trade-offs that need a lasting explanation.

Discovery was completed before implementation. The user subsequently authorized the full implementation and deployment. Keep this game's [design context](../../apps/what-beats-jev/.impeccable.md) separate from Sushiro.

## Open decisions, breadth-first

1. Judge: the approved binary Choice's selected option is the verdict, without an extra confidence gate. The implementation pins `jev-1.13.0` and has passed real judgment and cache-reuse checks.
2. Players: public casual players, untimed runs, and first-class support across viewports are confirmed.
3. Game structure: a leaderboard is excluded, and unfinished runs resume in the same browser. Personal-best tracking, sharing, and completed-run archives are excluded from the first design.
4. Rules: answers are free-form, up to 240 visible Unicode characters, with no repeated phrases in a run. Phrase identity ignores case and surrounding whitespace without merging synonyms. Start at rock and count accepted answers from zero.
5. Pace and failure: the first rejection ends the run; invalid or repeated input is blocked without loss, and technical errors allow retrying. Keep the completed chain visible after loss, with a New run action. Restore the last completed state rather than a stuck pending request after refresh.
6. First-version scope: anonymous play, database-backed matchup reuse, first-winning-matchup discovery, and browser-local persistence are implemented; accounts and a leaderboard are excluded. Public-facing request budgets and safe service-error handling are included.
7. Design: the detailed light-theme palette, typography, accessibility baseline, and Fluid Functionalism component foundation are approved.
8. Delivery: the standalone Next.js app, isolated Railway PostgreSQL, Vercel project, server-only variables, and GitHub connection are configured. The production deployment is Ready and has passed live API and browser verification.

## Observed facts

- The monorepo uses TypeScript, PNPM, and Turborepo, with existing Next.js apps.
- At the start, no Jev implementation or Fluid Functionalism reference was found in the searched repository source and documentation.
- Doop canvas `oJGrvv12x1` started empty. It now contains eight reviewed original screens, an unchanged Fluid Functionalism source frame, and an approved canvas guide. See [the frame index and checks](../../apps/what-beats-jev/docs/doop-designs.md).
- Doop's inspiration search returned HTTP 403 when gathering bright, playful consumer-app references. No gallery exemplar has been selected; the canvas itself remains accessible.
- Sushiro's glossary and design context live in `apps/sushiro/CONTEXT.md` and `apps/sushiro/.impeccable.md`. They were moved from the monorepo root at the user's request, with their contents unchanged.
- [Fluid Functionalism's documentation](https://www.fluidfunctionalism.com/docs) describes shadcn-compatible components with Radix and Base UI variants, shared motion, and theme tokens. Primitive selection is not yet decided.
- The existing root Railway configuration and project `sushiro-queue-collector` own Sushiro production/preview PostgreSQL, Redis, a queue collector, and a cache gateway. They are not a generic game database configuration.
- The user approved the separate Railway project in the David Lee workspace. Resource IDs and ownership are recorded in the deployment guide; Sushiro infrastructure was not reused.

## Jev integration facts

Sources: the user's [TypeSafe announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [introduction](https://docs.typesafe.ai/introduction), [Noul documentation](https://docs.typesafe.ai/primitives/noul), [Choice documentation](https://docs.typesafe.ai/primitives/choice), and [JavaScript SDK documentation](https://docs.typesafe.ai/sdk/javascript).

- Jev evaluates supplied state against typed questions. It returns structured values, not free-form generated text.
- Choice selects among predefined options; Score rates against predefined levels; Noul returns the probability that a yes/no proposition is true.
- Noul was considered as an alternative. It returns a value from 0 to 1 rather than a boolean and has no separate confidence field.
- The approved binary Choice allows Jev to select acceptance or rejection directly. The documentation defines `choice` as the option with the highest probability, avoiding a separately tuned confidence threshold. Live winning, losing, normalized-cache, and concurrent-discovery checks have passed.
- Choice and Score return probability distributions and a separate confidence value.
- The game needs an explicit way to turn model output into acceptance or rejection while keeping Jev as the sole judge of the relationship. Type-safe output does not guarantee a correct gameplay judgment.
- Any playful reactions or explanations must not assume Jev can improvise prose. Prewritten reactions or predefined reason categories are possibilities, not yet agreed features.
- The TypeScript-compatible JavaScript SDK `@typesafe-ai/sdk` is installed and used only in server-side modules. Model-list and judgment requests have succeeded using `TYPESAFE_API_KEY`; credential values were not printed.

## Current readiness

10/10. The agreed scope is implemented, reviewed, pushed to main, and deployed with verified live Jev, caching, confidence, persistence, and anonymous play.

## Agreed reuse and novelty behavior

| Submission | Judgment source | New-matchup notice |
| --- | --- | --- |
| Unseen matchup that wins | Jev, then save the accepting verdict | Yes |
| Unseen matchup that loses | Jev, then save the rejecting verdict | No |
| Previously judged winning matchup | Saved accepting verdict | No |
| Previously judged losing matchup | Saved rejecting verdict | No |

Whether the phrase appeared in another matchup is irrelevant. Technical failures do not earn a notice, and concurrent requests must not award the same first win more than once. Phrase identity ignores case and surrounding whitespace.

## Confidence display

The [TypeSafe confidence documentation](https://docs.typesafe.ai/confidence) distinguishes a Choice answer's `confidence` from its `probabilities`. Reported confidence is a 0-to-1 measure of how clearly the selected option stands above an even split, not the probability that the answer wins or that the verdict is correct.

For a binary Choice, an 80% probability for the selected outcome corresponds to 60% reported confidence. The implemented UI shows the actual confidence field after each completed verdict, including losses and cached verdicts, storing the original value with the verdict. This remains informational and does not introduce a confidence gate or change who wins.
