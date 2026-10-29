# Date a Globe

This context describes a web app that dates a globe or world map printed since 1805 by asking yes/no questions about what it shows, and the community-fed database of map changes those questions come from.

## Dating

**Globe**:
The physical globe or printed map the player is dating. "Globe" covers world maps and regional maps too.
_Avoid_: map (as the general term), object

**Event**:
A change that shows on globes, with the dates maps began, and possibly stopped, showing it, such as Botswana appearing or Constantinople becoming Istanbul.
_Avoid_: fact, datapoint, clue

**Span**:
One stretch of time during which globes show an event's feature. Most events have one span; a feature that came and went has several.
_Avoid_: range (for an event), period

**Regional event**:
An event that only shows on detailed or regional maps of its area, never on globes or world maps. It is asked only when the player is dating a regional map of that area.
_Avoid_: minor event, local event

**Discovery event**:
An event dated from when land or water was first charted, not from a political change. Maps took much longer to show these than ordinary changes.
_Avoid_: exploration event

**Question**:
The yes/no prompt an event becomes when asked, such as "Is there a country called Botswana?". Yes always means the feature is shown.
_Avoid_: clue, test

**Can't see**:
The answer for a feature the player can't find or read on their globe. It removes no years, and it tells the engine that area may be off the globe.
_Avoid_: skip, unknown

**Misread**:
An answer that disagrees with the globe's true printing date. The engine expects a few and absorbs them.
_Avoid_: lie, wrong answer, error

**Set aside**:
What happens to a misread once a tie-breaker question shows it was wrong. It stays visible on the result.
_Avoid_: deleted, ignored

**Publisher lag**:
The delay between a change happening and globes showing it, usually zero to five years.
_Avoid_: map age, delay

**Range**:
The stretch of time the result says the globe was most likely printed in, the shortest one holding 90% of the likelihood. Its ends are given to the month only where the answers can tell months apart; otherwise to the year.
_Avoid_: window, estimate, confidence interval

**Most likely month**:
The single month with the highest likelihood, shown beneath the range.
_Avoid_: best guess, answer

## Presentation

**Plate**:
The graphic beside each question: a small globe turned to the place, with a magnifier showing the feature and its period name.
_Avoid_: lens image, illustration

**Reveal**:
The result screen. It is the only screen styled in the era the globe comes from.
_Avoid_: answer screen, certificate

**Era look**:
One of five visual styles for the reveal, each matching how globes looked in its years: engraver's plate, imperial atlas, interwar, Cold War classroom, web map.
_Avoid_: theme, room, skin

## Growing the database

**Submission**:
An event sent in by a user, waiting for checks and review before it can be asked.
_Avoid_: suggestion, contribution

**Maintainer**:
Someone with the Maintain or Admin role on the eslee-io GitHub repository. Only maintainers review submissions.
_Avoid_: admin, moderator, reviewer

**Trial**:
The period after approval when an event is asked on its first globes with extra caution, so its answers can be compared with results before it counts fully.
_Avoid_: beta, probation
