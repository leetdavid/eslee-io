# Doop designs and verification

Canvas: `oJGrvv12x1`, named "what beats jev". All eight original screens use the same responsive HTML structure and approved theme. The source Fluid Functionalism page remains unchanged in its own reference frame.

## Current discovery rule

New means the first successful result for a particular ordered matchup across the game. Show New matchup only to the request that records that first win. A fresh losing matchup and replaying a cached win never receive the notice. Whether an answer phrase was used in another matchup is irrelevant.

Cache both accepting and rejecting verdicts. Technical failures do not create a verdict or a discovery. Concurrent identical requests must not duplicate the first-win notice.

This replaces the earlier phrase-based novelty decision at the user's explicit request. The glossary, design brief, canvas guide, and example states have been updated.

## Frames

| Screen | Frame ID | Dimensions | Current render |
| --- | --- | --- | --- |
| Fresh play, desktop | `F0mcHmsVkp` | 1280 by 820 | [PNG](https://doop.design/i/F0mcHmsVkp.png?scale=2) |
| Fresh play, narrow | `-FAa8EHDPa` | 390 by 844 | [PNG](https://doop.design/i/-FAa8EHDPa.png?scale=2) |
| First winning matchup | `X014wAdba-` | 1280 by 820 | [PNG](https://doop.design/i/X014wAdba-.png?scale=2) |
| Loss without discovery | `qlJKjzY9-_` | 390 by 1000 | [PNG](https://doop.design/i/qlJKjzY9-_.png?scale=2) |
| Retry without losing progress | `jNlYir222v` | 1280 by 820 | [PNG](https://doop.design/i/jNlYir222v.png?scale=2) |
| Repeated phrase | `-JSBQaLbGB` | 390 by 1060 | [PNG](https://doop.design/i/-JSBQaLbGB.png?scale=2) |
| 240-character challenge | `QQ3IrzE76p` | 320 by 1460 | [PNG](https://doop.design/i/QQ3IrzE76p.png?scale=2) |
| Checking an unseen matchup | `-PDzH2NV6E` | 1280 by 820 | [PNG](https://doop.design/i/-PDzH2NV6E.png?scale=2) |
| Fluid Functionalism reference | `o-P8KXg6K_` | 1280 by 6000 | [PNG](https://doop.design/i/o-P8KXg6K_.png?scale=2) |

Original screens are arranged as paired desktop and narrow states in four rows. The imported reference is separate. Image URLs render the current frame content, not an immutable historical screenshot.

## Fluid Functionalism grounding

The actual [InputMessage](https://www.fluidfunctionalism.com/docs/input-message), [Button](https://www.fluidfunctionalism.com/docs/button), [Badge](https://www.fluidfunctionalism.com/docs/badge), and [motion](https://www.fluidfunctionalism.com/docs/motion) documentation and registry source were inspected. Registry files were read with `pnpm dlx shadcn@latest view`; no components were installed into the app.

- Composer anatomy follows the Surface-2 container, single hairline shadow edge, textarea, and footer-slot arrangement. The counter measures Unicode graphemes and the textarea grows with content.
- Button anatomy follows the inset surface and 1px shadow-spread collapse on press, with primary-action, checking, and retry states. This preserves the library's press behavior rather than substituting a generic scale animation.
- Discovery uses a compact, solid badge with dark foreground, themed with the approved pink. It appears only on the first winning-matchup example.
- Keyboard send follows Enter and Shift+Enter conventions, with IME composition excluded from Enter submission. Native form controls, labels, focus styles, and reduced-motion CSS are included.
- No attachments, chat queue, model picker, generated explanations, or arbitrary mock judging were added.

The HTML frames are visual and interaction prototypes, not an installed React application. The Next.js implementation must use actual Fluid Functionalism registry components, adapting their composition for the visible Try this and Retry actions rather than shipping these HTML replicas as the component library.

## Screenshot review

Every original frame was screenshot-reviewed after completion and after the final corrections.

| Check | Verdict |
| --- | --- |
| Fit | Complete content fits each artboard; the 320px long-text example remains readable without truncation. Excess loss-frame height was removed. |
| Spacing | Controls are tightly grouped; play and chain areas are separated without decorative nested cards. |
| Hierarchy | Current challenge and answer action dominate; chain length is secondary; loss is explicit and carries no discovery badge. |
| Contrast | Dark ink stays readable on all approved surfaces; the cobalt action has a measured 5.17:1 token-pair contrast. |
| Alignment | Labels, composer, challenge, and chain rows share consistent edges; narrow states reflow rather than shrink the desktop composition. |
| Realism | Concrete example chains and phrases are used; all example verdicts are explicitly labeled illustrative. |
| Logos | No third-party logo slots or invented company marks appear in the original screens. The game title remains provisional. |

Corrections included replacing a glyph that rendered as a colored emoji with SVG artwork, properly hiding SVG elements in different states, keeping decorative marks away from long text, distinguishing Retry from normal submission, and preventing discovery notices on losses.

## Browser checks

The prototype was exercised in an isolated browser tab with seven states at widths 240, 280, 320, 390, 768, 1280, and 1440 pixels. All 49 layout checks had zero horizontal document overflow. Discovery notices appeared only in the first-winning-matchup state at every width.

Additional DOM/form checks passed:

- Empty input, a case-and-whitespace variant of rock, and a 241-character entry showed corrections while keeping chain length at zero.
- The astronaut emoji sequence `👩‍🚀` counted as one visible character.
- The long challenge contains exactly 240 visible characters.
- Valid input explicitly reports that live Jev judging is not connected, rather than inventing a verdict.

An initial animation-frame-based probe stalled in the browser environment. It was canceled and replaced with synchronous layout and form checks, which completed. Full native-keyboard, screen-reader, real-device keyboard, and cross-browser audits remain unperformed; the programmatic focus probe did not verify the focus indicator. These checks are not a claim of complete WCAG conformance.

## Implementation status

The first-win, loss, and long-content design examples now include the requested confidence gauge. Their sample values are illustrative; the real application uses Jev's actual reported confidence and the saved value for cached results.

The canvas frames remain illustrative design prototypes. The real Next.js application now exists under `apps/what-beats-jev` and uses the installed Fluid Functionalism components, live Jev, transactional PostgreSQL caching, reported confidence, and browser-local run persistence.

Railway PostgreSQL is provisioned in the game's isolated project, migrations are applied, and daily/weekly backups are configured. The production application is live at https://what-beats-jev.vercel.app and passed real Jev, database-cache, confidence, concurrency, browser-recovery, and accessibility checks. See [deployment](./deployment.md) for resource ownership and release evidence.
