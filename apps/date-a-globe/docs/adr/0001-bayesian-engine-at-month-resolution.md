# Bayesian engine at month resolution, run in the browser

We date globes with a Bayesian engine ("B+"): every month since January 1805 carries a likelihood, each answer updates all of them through a model of publisher lag (0–5 years, longer for discovery events) and an assumed 10% misread rate, and the next question is the one with the highest expected information gain weighted by the chance it is visible. It keeps asking while a question is expected to narrow the range by three months or more, up to 15 questions.

We chose it over a half-split binary search, Ulam's liar game and a precomputed decision tree after simulating all four on 112 real events and 1,200 globes each: the half-split was fastest but only 20% right after a single misread, the liar game survived one misread but gave 10–12 year ranges, and a decision tree must be rebuilt whenever an event is added, which conflicts with user submissions going live after review. B+ stayed about 92% right with or without a misread. It runs in the browser because the work per question is small (milliseconds for ~800 events) and it needs no server round trip.

## Consequences

- An event's dates alone don't make a question correct or wrong; the result is a likelihood, so the reveal shows a range and a most likely month, not a single certain year.
- Changing the lag model or misread rate changes every result, so both live in one place and are recalibrated from confirmed printed years.
