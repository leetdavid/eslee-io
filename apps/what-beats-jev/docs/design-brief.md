# What Beats Jev design brief

Status: Approved by the user, including the proposed defaults, with Fluid Functionalism explicitly reaffirmed. Confirmed context lives in [the game glossary](../CONTEXT.md) and [design context](../.impeccable.md); the interview record lives in [the discovery notes](../../../docs/plans/what-beats-jev.md).

The user subsequently changed discovery to first-time winning matchups. Eight original Doop screens now demonstrate the current rule; see [the frame index and verification](./doop-designs.md).

Approval permits visual design on Doop canvas `oJGrvv12x1`. These screens are design prototypes, not a deployed game or a claim that the examples have been evaluated by Jev. No live model calls, database changes, or deployment are authorized by this brief alone.

## 1. Feature summary

A public, anonymous browser game where the player types something that beats the current challenge. Jev decides whether the answer works; accepted answers become the next challenge, and the goal is the longest chain before the first rejection.

The game is a standalone Next.js app at `apps/what-beats-jev`. Shared database verdicts avoid repeated Jev calls, while unfinished runs resume from the same browser without an account.

## 2. Primary user action

Read the current challenge, type a free-form counter of up to 240 characters, and submit it. Keep this action obvious without a landing page, tutorial gate, signup, or leaderboard.

## 3. Design direction

Follow the confirmed whimsical, playful, bright, toy-like direction. The interface should feel like a little logic toy, not a chatbot or an AI dashboard.

Mood candidates were a plastic toy box, a sweet-shop counter, and a tin-toy counter lab. Propose the tin-toy counter lab rather than the first instinct of a generic toy box: enamel-like colors, a clear control area, and each answer joining a visible chain. This gives the whimsy a relationship to the actual game.

Doop's curated inspiration search returned HTTP 403, so no gallery exemplar was retrieved or selected. This proposal derives from the confirmed context and the design-quality principles, with [Fluid Functionalism](https://www.fluidfunctionalism.com/docs) as the component reference. It does not claim to reproduce an unobserved reference page.

### Approved palette

Use a light appearance for the first design. Colors are recorded as hex for review and should become semantic OKLCH tokens when implemented.

The user subsequently requested clear outcome schemes. A successful verdict uses a green challenge surface and success label, while a rejecting verdict uses a red challenge surface, red loss heading, and rejection label. The initial and unresolved states retain the neutral/yellow challenge scheme. Cached verdicts use the same outcome colors. Validation and transport errors do not turn the game into a red loss state.

Success colors: surface `#D8F4E1`, text `#155D36`, edge `#329B60`. Failure colors: surface `#FDE0E0`, text `#A82732`, edge `#D3535C`. Measured text/surface contrast is 6.77:1 for success and 5.64:1 for failure. Text and icons remain redundant cues, not color alone.

| Role | Color | Physical reference |
| --- | --- | --- |
| Page ground | `#F2F4FC` | Pale blue workbench paper |
| Supporting surface | `#E5ECFF` | Light enamel tray |
| Text and outlines | `#252E55` | Stamped blue ink |
| Primary action and focus | `#365CDA` | Cobalt push button |
| Current challenge | `#FFE482` | Yellow game token |
| New-matchup notice | `#FBC8D7` | Pink discovery ticket |

Calculated WCAG contrast is 11.95:1 for ink on the page ground, 11.10:1 on the supporting surface, 10.42:1 on the yellow token, 8.96:1 on the discovery ticket, and 5.17:1 for page-ground text on the cobalt action. These are token-pair checks, not a rendered accessibility audit.

### Approved typography

- [Sour Gummy](https://fonts.google.com/specimen/Sour+Gummy), weights 500, 600, and 700, for short headings and challenge names. Its rounded, irregular forms suit molded toy lettering.
- [Figtree](https://fonts.google.com/specimen/Figtree), weights 400, 500, and 600, for controls, chain entries, and longer free-form challenges. It keeps the text-entry game readable.
- Use a compact product-UI scale: 0.875rem supporting text, 1rem body and controls, 1.25rem emphasis, 2rem section prompts, and up to 4rem for short challenges. Longer challenges use the body family, wrap fully, and have more generous leading rather than being truncated.
- Use tabular numbers for chain length and the character counter. Inputs remain at least 1rem to avoid mobile zoom surprises.

The families were selected after browsing the Google Fonts catalog, and the requested weights were verified through its stylesheet endpoint. Font loading and actual wrapping still need screenshot verification.

### Visual device and components

Make the current challenge the main game piece. The ordered chain shows how the player reached it. Use restrained tactile edges on the challenge and primary control, not shadows or cards around every element.

The implemented app should use Fluid Functionalism's composer or input group, buttons, badges, and an appropriate busy indicator. Doop's self-contained HTML frames will demonstrate the visual and interaction intent; they will not claim to install or run the React registry components.

Unknown challenges must work as text alone. A known starter can have original SVG artwork, but arbitrary submitted phrases must never require a generated illustration or a guessed icon. Motion communicates accepted answers joining the chain, state changes, and submission feedback. It does not fake a lengthy thinking process or provide invented model explanations.

One-line direction: a bright, tactile logic toy where each accepted phrase becomes the next challenge and the first winning result for a matchup gets a small discovery ticket.

## 4. Layout strategy

On roomy viewports, give the current challenge and composer the main area, with the chain alongside as a lighter, secondary column. Chain length is a compact progress indicator, not a large dashboard metric. Avoid an unnecessary navigation system.

On narrower or shorter viewports, move the chain below the play area and adapt spacing and challenge type size. Keep the current challenge, answer control, submit action, and progress understandable. The complete chain remains available; it is not removed to make the layout fit.

Use content-driven reflow, natural page scrolling, and bounded readable widths. Support long phrases, 200% zoom, landscape layouts, and the on-screen keyboard. Do not rely on hover or a fixed-height desktop composition.

## 5. Key states

| State | What the player needs |
| --- | --- |
| Fresh run | A starting challenge, zero accepted answers, a visible answer label, and brief rules |
| Resumed run | The restored challenge and chain, without a signup or a forced new run |
| Checking an unseen matchup | A clear busy state, preserved input, and no duplicate submission |
| Accepted answer | The answer joins the chain, the count advances, and it becomes the next challenge |
| Cached verdict | The same game behavior without a fresh Jev call or artificial wait |
| First winning matchup | A New matchup notice, independent of whether the phrase was seen elsewhere |
| Rejected answer | A clear ended run, the completed chain and count, and a New run action |
| Newly judged loss | The loss state without any discovery notice |
| Empty, over-limit, or repeated input | An inline correction, with the run unchanged and no judging call |
| Technical error | An explanation and Retry action, preserving the run and answer |
| Long content | Fully readable 240-character challenges and a usable long chain without horizontal overflow |

## 6. Interaction model

Confirmed behavior:

- Jev alone judges the relationship between the submitted answer and the current challenge.
- Matchups are ordered pairs. A known phrase against an unseen challenge can still require Jev.
- A saved accepting or rejecting verdict behaves like a fresh one. The first rejection ends the run.
- Global novelty is the first successful result for an ordered matchup. A newly judged loss and replaying a cached win do not qualify; phrase novelty is irrelevant. This replaces the earlier decision at the user's explicit request.
- Case and surrounding whitespace do not create a new identity; original wording remains visible. Synonyms and rewordings remain distinct.
- Phrases already in the current chain, including its starting challenge, cannot be reused. Validation and technical failures do not end the run.
- Unfinished runs are saved locally in the browser, separately from the shared judgment database.

Approved defaults:

- Every run starts with rock. Count accepted answers from zero, excluding the starter.
- Keep runs untimed. Use 240 visible Unicode characters as the limit, counted consistently by the client and server.
- After a loss, keep the chain and failed answer visible until the player chooses New run. Do not silently restart.
- On refresh during a request, restore the last completed run state and allow resubmission rather than restoring a stuck spinner.
- Use a binary Jev Choice with `beats` and `does_not_beat`. Its selected option is the verdict, without an additional confidence gate, another model, or a human override. Exact criteria wording and a live evaluation remain implementation work.
- Establish novelty only when the first successful verdict for a matchup is saved. A technical failure or rejection does not earn a notice. Concurrent requests must not award the same first win to multiple players.
- Do not add personal-best tracking, sharing, completed-run archives, sound, a dark theme, or a public phrase feed to the first design unless requested.

The approved accessibility baseline is WCAG AA, with semantic controls, visible labels, full keyboard access, visible focus, reduced-motion support, and comfortably sized touch targets. Announce results and corrections without relying on color. Retain full free-form text and allow page zoom.

## 7. Content requirements

Use short, authored copy. Jev returns structured decisions, so no screen may imply it generated a custom explanation.

| Location | Proposed copy |
| --- | --- |
| Prompt | What beats {challenge}? |
| Input label | Your answer |
| Input example | e.g. a very persuasive pigeon |
| Primary action | Try this |
| Rules | Anything goes. No repeats. Up to 240 characters. |
| Busy status | Checking this matchup... |
| Accepted result | That works. |
| Novelty | New matchup |
| Novelty detail | First win for this matchup. |
| Loss heading | Chain ended |
| Loss detail | That answer didn't beat {challenge}. |
| Restart | New run |
| Empty input | Enter something that could beat the current challenge. |
| Repeat | Already in this chain. Try a different answer. |
| Length error | Keep your answer within 240 characters. |
| Technical error | Couldn't check this answer. Your chain is safe. Try again. |
| Retry action | Retry |

Use complete templates and correct singular or plural forms for dynamic counts. Long phrases and mixed-direction text must not break the layout. The working title is What Beats Jev, matching the canvas, rather than a confirmed final brand name.

## 8. Recommended references and deliverables

Consult Impeccable's spatial, interaction, responsive, typography, and motion references, along with the better-accessibility, better-typography, better-writing, and better-colors guidance. Consult Fluid Functionalism for the actual component installation and motion conventions, and [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice) for the proposed verdict contract.

On Doop `oJGrvv12x1`, create desktop and narrow-viewport play frames using the same responsive structure, then demonstrate loss, novelty, validation, retry, and long-content states. Clearly mark illustrative verdicts as design examples, not real Jev evaluations. Screenshot-review each frame for fit, hierarchy, contrast, spacing, and alignment before moving on.

## 9. Open questions and implementation dependencies

- The implemented confidence percentage uses Jev's reported Choice confidence, including cached verdicts and losses. It is informational; the no-confidence-gate rule remains unchanged.
- The user approved the brief and its defaults; original Doop screens may now be created.
- Confirm the final public name and deployment domain before publishing.
- Railway PostgreSQL is the approved database provider. Confirm project placement and provision the game database before implementation is considered operational. Do not repurpose Sushiro's infrastructure without explicit approval.
- The TypeSafe skill is installed and loaded, and `TYPESAFE_API_KEY` was verified through an authenticated model-list request. The judgment endpoint and application integration remain untested.
- Pin or explicitly configure the Jev model and judge criteria, and test representative conventional, abstract, and adversarial matchups. A type-safe response is not a guarantee of a correct gameplay judgment.
- Implement atomic matchup reuse and winning-matchup discovery, bounded request behavior, public-facing abuse protection, and safe recovery without exposing secrets or adding player accounts.
- The Next.js application, actual Fluid Functionalism components, TypeSafe integration, generated PostgreSQL migration, browser-local persistence, and automated tests are implemented. Railway is provisioned and migrated; the production application at https://what-beats-jev.vercel.app is deployed and verified.
