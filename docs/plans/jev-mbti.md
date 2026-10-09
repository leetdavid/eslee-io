# Jev MBTI discovery

Status: Live at https://jev-mbti.vercel.app on an isolated Railway database, verified end to end in production. The user approved every frame on Doop canvas `l2R2l7AW3M`, including the grade, the "참 잘했어요" stamp, and the "Lore Jev read" chips, and approved provisioning and deployment. See the [design brief](../../apps/jev-mbti/docs/design-brief.md), the [frame index and implementation notes](../../apps/jev-mbti/docs/doop-designs.md), and the [deployment runbook](../../apps/jev-mbti/docs/deployment.md). Production runs on Gemini 2.5 Flash by the user's choice.

## Implementation decisions

- The pipeline has three stages. Gemini chooses axes, refuses unsafe questions, and selects lore topics; that draft is signed so the next step can't be forged. Jev places all 16 types with one Score request per type, in parallel, at about 0.5 seconds. Gemini then streams the review, which any viewer's browser starts and which polling shows to everyone.
- Each axis has seven Score levels written by the LLM. Each level is a concrete situation on one fixed scenario, calibrated so that only the one or two most extreme stereotypes reach either end.
- The lore library covers 16 types across 17 topics plus 8 letters, in both languages, with sources in `apps/jev-mbti/src/lore/SOURCES.md`. Four delegated research attempts produced no files, so the library was written directly from the cited Korean sources and broad community consensus.
- The team's AI Gateway is on the free tier, which blocks every Gemini 3.x model. Offered gateway credit or the existing OpenRouter balance for Gemini 3.8 Flash, the user chose to stay on `google/gemini-2.5-flash`, which is now the default. Axes take 7 to 14 seconds with a small thinking budget and reviews about 7 seconds. `JEV_MBTI_LLM_MODEL` switches models, and an `openrouter:` prefix routes through OpenRouter.
- At the user's request, free OpenRouter models were evaluated as an option. None was usable: the `openrouter/free` router took 37 seconds or more per axis request and often timed out, Nemotron 3 Super refused every question, and Gemma 4 31B was rate-limited upstream. The full comparison is in the deployment runbook.
- A live evaluation (`pnpm evaluate:model`) checks direction (F above T for crying, J above P for trip planning), custom ends, forced two-axis charts, refusal of a question about a named coworker, and review streaming. It passed on Gemini 2.5 Flash.

## Confirmed direction

These come directly from the user's request and answers.

- Build a website that uses Jev.
- A visitor asks a question, and each of the 16 MBTI types is placed on one axis or on two axes (x and y). Both chart kinds are supported.
- Visitors can define the axes but usually won't need to. Axes are suggested automatically.
- Korean social media information about MBTI types is fed into Jev to improve placements.
- The site is bilingual and works in Korean and English.
- An LLM is used after Jev to explain and correct placements.
- Design the frontend on Doop canvas `l2R2l7AW3M` first, then implement after the user approves.
- Don't ask the user obvious questions. Obvious choices are recorded below as proposed defaults, and the user can override them.
- The LLM is a fast model such as Gemini 3.8 Flash. AI Gateway lists it as `google/gemini-3.8-flash`, priced at $0.75 per million input tokens and $3.75 per million output tokens.
- The review is automatic and can correct placements. Jev's chart appears first. The LLM then reviews every type, writes an explanation for each one in both languages, and moves any type it disagrees with. A corrected type still shows a faint marker at Jev's placement. A toggle switches between Jev's placements alone and the reviewed chart. The site's hook is the contrast between Jev's fast first judgment and the LLM's slower second look.
- Lore comes from a curated lore library. Korean MBTI content is researched once (Naver blogs, namu.wiki, Instagram and X meme formats, and community posts) and rewritten in the project's own words. The library is bilingual, organized by type and lore topic, and includes letter lore. Sources are listed, and the library lives in the repo for the user to review and edit. Each chart sends Jev only the topics relevant to its question. Live per-question search, such as the Naver Search API, was considered and deferred. It would capture question-specific memes but would need API keys, add latency and noise, and require translating English questions into Korean searches.
- Charts are saved and shareable. Each chart gets a chart link that opens in the viewer's language. A question with the same question identity and the same axes reuses the saved chart instantly at no cost. Links show a share image as their preview in KakaoTalk, Instagram DMs, and X, and visitors can also download the image. The home page shows example charts chosen by the owner, and there is no public feed of visitors' questions. Charts are stored in a small, isolated Railway PostgreSQL database, following What Beats Jev.
- The visual direction is a notebook with red-pen corrections (첨삭). The chart is a graph-paper notebook page, and Jev places the 16 types as die-cut stickers. The review arrives as a teacher's red pen, adding circles, arrows to corrected positions, and handwritten margin notes that hold explanations. Colors come from stationery: cool white paper, a pale blue grid, navy ink, a red correction pen, and four sticker colors for the type groups. Text uses Pretendard, and notes use a Korean handwriting face.

## Proposed defaults

These apply unless the user objects.

### Platform

- The site is a standalone Next.js app at `apps/jev-mbti`. "Jev MBTI" is the working title because it matches the canvas. It deploys to Vercel like What Beats Jev, and all credentials stay server-side.
- It is public and anonymous, with no accounts.
- The LLM is called through Vercel AI Gateway with the AI SDK, following `packages/payload`.
- The site is public, so it includes request budgets and question moderation, and it refuses hateful, sexual, or harassing questions. Budgets apply only to new charts. Reusing a saved chart is free and is not rate-limited.
- The public name and domain must be confirmed before publishing.

### Judgments

- Jev decides placements and the LLM writes the axes, because Jev cannot generate text. For each question the LLM chooses one axis or two.
- Each placement is a Jev Score per type per axis, with that type's lore in Jev's state. Text sent to Jev is English-normalized because Jev is most accurate in English. An evaluation set will confirm this choice.
- Only the 16 four-letter types are used. The -A and -T variants are ignored.
- The lore library paraphrases and summarizes rather than copying posts verbatim. It keeps the playful tone of Korean MBTI culture but leaves out demeaning content about real groups of people.
- If the review fails, Jev's chart stays usable and the review can be retried. A failed review never removes or hides placements.
- The review ends with a one-line teacher's summary (총평), which also appears on the share image.

### Charts and sharing

- A saved chart is fixed once it exists, so there are no re-rolls. The only later change is its review arriving. If a review fails, any viewer can retry it. Once a review succeeds, it is final.
- Generated chart text, such as axis labels, explanations, and the summary, is stored in both languages so a chart reads correctly in either interface language.
- The chart page shows everything in the viewer's language, including the question, with the original wording beneath a translated one. Link previews use the question's language; Save image uses the viewer's.

### Interface

- UI components come from Fluid Functionalism, as in What Beats Jev, re-themed to the notebook direction. Every typeface must include Hangul.
- The interface follows the browser's language, falls back to English, and has a visible language toggle.
- Asking: a single question box with an Auto, one-axis, or two-axis control, and optional custom axis ends behind "Set axes yourself". Questions can be up to 120 visible characters. Because a saved chart is fixed, changing the axes on a chart creates a new chart.
- A chart moves through these states: suggesting axes, Jev placing, review writing (the red pen arrives), and complete. Separate states cover a failed review with Retry, a refused question, a rate limit, and a missing chart.
- Corrected types get red-pen margin notes on the chart itself. Every type's explanation also appears when its sticker is selected and in a list below the chart.
- Jev's confidence appears in each type's detail rather than on the chart, so the page stays readable.
- After the review, the reviewed chart is shown by default, and the toggle shows Jev's placements alone.
- Mobile and desktop both get first-class layouts, with WCAG AA as the accessibility baseline.
- Excluded from the first version: highlighting the visitor's own type, quadrant names on two-axis charts, accounts, a public feed, re-rolls, dark mode, and live search.

## Open decisions, breadth-first

1. LLM role: decided. The review runs automatically, can correct placements, and keeps Jev's original placements visible.
2. Lore source: decided. A curated lore library lives in the repo, and live search is deferred.
3. Persistence and sharing: decided. Chart links, share images, reuse of saved charts, and owner-picked example charts, with no public feed.
4. Visual direction: decided. A notebook with red-pen corrections (첨삭), built on Fluid Functionalism.

Every area has an answer. The remaining design-level details appear as defaults above, and the user can veto them before design starts.

## Observed facts

- Doop canvas `l2R2l7AW3M` is named "Jev MBTI" and is empty, with no frames, style guides, or pinned references.
- `TYPESAFE_API_KEY` is present in the root `.env` and in What Beats Jev's `.env.local`. Values were not printed.
- No LLM provider key is set in the local env files. `.env.example` lists `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`. `packages/payload` calls AI Gateway with the model `openai/gpt-5-nano`, and `apps/yomi` uses Gemini 3 through `@ai-sdk/google`.
- What Beats Jev pins `jev-1.13.0` through `@typesafe-ai/sdk` ^0.6.0 and uses a binary Choice. It sets the precedent for server-only keys, an isolated Railway PostgreSQL project, and Vercel deployment.
- No i18n library is installed in any app.
- On October 9, 2026, Doop's inspiration search returned HTTP 403 for three queries, the same failure What Beats Jev hit. No gallery exemplar is available, so the design brief must come from the design principles.

## Jev integration facts

Sources: [Score](https://docs.typesafe.ai/primitives/score), [Models](https://docs.typesafe.ai/models), [API](https://docs.typesafe.ai/api), [State](https://docs.typesafe.ai/concepts/state), and [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

- A Score rates state against 2 to 10 ordered level descriptions. It returns a fractional `score`, which is the probability-weighted position, along with per-level `probabilities` and a `confidence`. This fits placing a type along an axis.
- Jev judges each level separately. Levels should describe concrete situations rather than degrees. Each Score covers a single dimension, so the x and y axes need separate Score questions.
- Score positions between levels are not numerically calibrated. They work for ordering and approximate placement but not for exact magnitudes.
- `jev-1.13.0` allows 64k tokens per request, of which 32k can go to state plus the longest question. It costs $0.042 per million input tokens, output tokens are free, and rate limits are about 80 requests and 100k tokens per second, adjusted dynamically.
- Jev is primarily trained in English. Korean is accepted but with lower accuracy.
- Irrelevant state reduces accuracy, so each question should receive only the lore it needs.
- Jev cannot generate text. Axis labels, level descriptions, and explanations must come from code or an LLM.

## Current readiness

9/10. The site is live, tested (29 tests, typecheck, Biome, production build), and verified end to end in production with real Jev and LLM output. The home page features the six example questions from the approved design. One decision remains with the user: the public name and a custom domain.

A rough cost per chart is about $0.03, almost all of it LLM output. It assumes about 2k tokens of lore per Jev Score and a review that writes about 4k tokens of explanations in both languages. Jev's share is about $0.001.
