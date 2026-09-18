# Queue-now estimation experiment

The first model estimates the duration from taking a ticket now until it is called. It is an offline baseline, calibrated against reconstructed queue-clearance outcomes. Private-pilot observations are required to measure accuracy against actual waits.

## Run it

From the repository root, with `DATABASE_URL` in the root `.env`:

```bash
pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18
```

Dates use Hong Kong time. `--from` is inclusive and `--to` is exclusive. The runner performs a read-only database transaction, prints JSON, and closes its connection. It accepts at most 31 days and 500,000 snapshots, failing explicitly if the result would be truncated. `--help` lists the arguments and examples.

The output includes the fitted parameters, chronological split dates, baseline comparisons, per-branch test metrics, excluded/censored counts, and optional pilot evaluation.

## Model

For an open branch accepting tickets:

1. Look back 30 minutes, using only observations available at the prediction time and on the same Hong Kong date.
2. Require at least 15 minutes of observed progression, three captures, and no capture gap exceeding 7.5 minutes. This gap threshold accommodates the existing five-minute archive; revisit freshness requirements when one-minute capture is operating.
3. Extract the greatest candidate ticket number, excluding the observed 8xxx sequence and treating suffixes as references to the same base ticket. Retain the highest number seen within the window so calls of older tickets do not create negative progress.
4. Divide the ticket-number advancement by elapsed minutes to estimate the calling rate.
5. Calculate an unscaled estimate as `(waiting groups + 1) / calling rate`.
6. Fit one multiplicative correction using the median ratio of reconstructed duration to unscaled estimate on training days.
7. On separate calibration days, choose the finite-sample 90th-percentile absolute residual. Use that radius around the point estimate and round range endpoints outward to five minutes.

The interval method borrows split-conformal calibration. Its usual coverage guarantees require assumptions about the calibration and future observations that are not established here. Temporally correlated proxy outcomes do not prove 90% coverage of real waits. This first model also uses one pooled error radius; it has not learned branch- or condition-specific uncertainty.

### Source assumptions

- The official API exposes `waitingGroup`, but the current archive does not store it. The experiment uses a category count only when the three category counts are identical. In a live check, those counts matched `waitingGroup` for all 44 stores. They must not be summed.
- The meaning of upstream `wait` still needs independent confirmation. Its values occur in five-unit steps and the API separately exposes group counts and time-related fields. The runner compares it as a candidate minute estimate, explicitly labelled `upstreamWaitAssumedMinutes`.
- Observed ordinary-looking tickets include `001` through `1414`, so a three-digit-only parser would be wrong. The separate-looking sequence spans values such as `8040` through `8404`.
- Tickets also have suffixes, such as `347-1` and `8401-2`. Excluding numbers at or above 8000 and deduplicating suffixes are experimental hypotheses, not documented upstream rules.
- Ticket skips, recalls, reservations, queue resets and separate service streams can break the inferred relationship between numbers and groups served. A number advancing by ten does not independently establish ten completed calls.

## Reconstructed outcomes

At each eligible positive-queue snapshot, create a hypothetical new ticket at `frontier + waiting groups + 1`. Find when later snapshots first reach or pass that number. Preserve the interval between the last below-target observation and the first at-or-above-target observation; use its midpoint as the training label.

These labels measure inferred clearance under ordering and queue-count assumptions. They do not identify an actual issued ticket or its actual call time. The model can therefore agree with these labels and still be wrong for a diner.

Outcomes unresolved before closure, a data gap, the Hong Kong date boundary or 180 minutes are censored. They are counted, not assigned zero. Empty queues and cases without usable progression are outside this benchmark. Consequently, reported error and coverage apply to the usable cohort, not every branch/time combination.

Use at most one candidate per five-minute bucket to prevent increased capture frequency from simply multiplying the number of overlapping labels. Split dates in chronological order: approximately 60% training, 20% calibration and 20% testing. Drop training/calibration outcomes extending into the next partition. Features never use future captures.

## First experiment

Command: `pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18`.

- 204,864 snapshots across 44 branches.
- 58,786 eligible positive-queue candidate snapshots.
- 9,897 candidates lacked usable progression; 5,202 outcomes were censored.
- 43,687 reconstructed outcomes remained.
- Training: 1 through 10 September, 26,314 outcomes.
- Calibration: 11 through 13 September, 9,877 outcomes.
- Testing: 14 through 17 September, 7,496 outcomes across 43 branches.

All dates are in 2026 and use Hong Kong time. The first training date is partial. The calibration period includes a weekend; the held-out test dates are weekdays. This experiment does not establish weekend performance or annual seasonality.

| Candidate | Mean absolute error | Median absolute error | Within 5 minutes | Within 10 minutes |
| --- | ---: | ---: | ---: | ---: |
| Upstream `wait`, assumed minutes | 13.24 min | 7.40 min | 40.4% | 64.9% |
| Unscaled queue/throughput | 18.60 min | 8.89 min | 32.6% | 54.2% |
| Fitted queue/throughput | 15.71 min | 8.41 min | 33.9% | 56.0% |

The fitted scale is approximately 0.8667. Its calibration radius is 51.72 minutes. After clipping at zero and rounding, median range width on the test set is 80 minutes, with 95.4% proxy coverage.

That width is too large to justify presenting this baseline as useful queue-now guidance. Upstream `wait` is the stronger point baseline on this proxy test. None of these measurements are errors against real observed waits, and no pilot data was supplied.

The held-out results are recorded as the first experiment. Further model choices informed by them need a fresh holdout or prospective pilot evaluation; repeatedly tuning against these four dates would turn them into development data.

## Second experiment protocol

Before running the next comparison, fix these choices:

- Predict the correction to upstream `wait`, provisionally treated as minutes, with an intercept and two standardized features: `log(1 + upstream wait)` and the difference between log throughput estimate and log upstream wait.
- Fit one model shared across branches with Huber loss, a fixed 10-minute Huber threshold, ridge penalty 1 on the two slopes, and ten reweighting iterations. Feature scaling uses training observations only. These settings are not selected by trying alternatives against the test dates.
- Compare the upstream baseline, the first fitted-throughput baseline, and the corrected upstream prediction. Compare pooled range calibration with fixed predicted-wait bands ending at 15, 30, and 60 minutes, plus a longer-wait band. Use the pooled fallback when a band has fewer than 200 calibration examples.
- Use expanding training history, the preceding two days for calibration, and the next day for testing. Start after five training days and two calibration days. Purge outcomes crossing a split boundary.
- Report point error, range coverage, width, and interval score. At 90% nominal coverage, the interval score is width plus 20 times the distance outside the interval when a prediction misses. A wider interval cannot improve this score without a cost.
- Reuse only 1 through 17 September for this retrospective comparison. The earlier inspection of these dates means this is development evidence, not a fresh final holdout. Preserve later data and independently collected pilot waits for prospective validation.

## Rolling comparison results

```bash
pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18 --rolling
```

The comparison evaluates 23,558 proxy outcomes over ten next-day folds, 8 through 17 September. Each fold learns only from earlier dates. No folds were skipped, and every candidate is scored on the same cases. These results differ from the first experiment's four-day test cohort and should not be compared across cohorts as an improvement percentage.

| Candidate | Mean absolute error | Median absolute error | Within 10 min | Range coverage | Median range width | Mean interval score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Upstream, pooled range | 16.32 min | 7.53 min | 60.7% | 90.6% | 65 min | 159.26 |
| Throughput v1, pooled range | 19.13 min | 9.35 min | 52.2% | 90.4% | 70 min | 175.08 |
| Corrected upstream, pooled range | 15.03 min | 7.40 min | 60.3% | 90.7% | 60 min | 143.74 |
| Upstream, adaptive range | 16.32 min | 7.53 min | 60.7% | 92.8% | 50 min | 112.45 |
| Corrected upstream, adaptive range | 15.03 min | 7.40 min | 60.3% | 93.0% | 45 min | 104.95 |

Interpretation:

- The correction lowers mean absolute proxy error on all ten test dates. Relative to the upstream point baseline, overall mean error falls about 7.9%, and the 90th-percentile absolute error falls from 36.98 to 30.29 minutes.
- Typical precision changes little. Median error falls from 7.53 to 7.40 minutes, while the fraction within ten minutes falls slightly from 60.7% to 60.3%. This does not meet the original preference for consistently five- to ten-minute errors.
- A substantial part of the range improvement comes from calibration by predicted-wait band. With the same upstream point predictions, adaptive ranges reduce median width from 65 to 50 minutes. Adding the correction brings it to 45 minutes.
- The corrected adaptive model has 93.0% aggregate proxy coverage, with daily proxy coverage between 91.1% and 96.6%. These are not confidence bounds or guarantees for actual diner waits or every individual branch.
- Range width is still substantial. The model is a candidate for pilot comparison, not evidence that it is ready for the grid.

The fixed-split command also evaluates the upstream adaptive and corrected adaptive candidates against supplied pilot records. Keep later pilot observations out of fitting and calibration, and check their excluded counts. `--rolling` is a retrospective proxy comparison and does not accept `--pilot`.

## Private pilot

Keep a local JSON file, for example `apps/sushiro/.cache/pilot.json`. `.cache` is already ignored by Git. This is the format, with illustrative values rather than real observations:

```json
[
  {
    "storeId": 20,
    "ticket": "123",
    "takenAt": "2026-09-18T18:00:00+08:00",
    "calledAt": "2026-09-18T18:23:00+08:00"
  }
]
```

Record the actual call time, not when someone later notices the ticket or gets seated. Note unusual circumstances separately, particularly reservations, recalls, split tickets or cancellations. Seeing the official app's displayed wait alongside the source response would also help confirm the meaning of `wait`.

After capturing real observations and allowing the snapshot history to cover their ticket-taking times:

```bash
pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-19 --pilot .cache/pilot.json
```

The pilot path is relative to `apps/sushiro`, where the package command runs. Choose dates covering the observations. Rows before the reported test period are excluded to keep pilot evaluation later than model fitting and calibration. Timestamps require a timezone; duplicate rows and calls before ticket issuance are rejected. Pilot data is evaluated independently and is not used to fit this model.

Inspect excluded counts alongside the metrics. The current feature extractor can withhold an estimate when history is stale, the branch is not issuing tickets, or ticket progression is missing. A few successful observations are not evidence of accuracy across all branches and queue conditions.

## Next evidence needed

1. Confirm `wait` units and ticket-sequence semantics, including the purpose of 8xxx values and suffixes.
2. Collect `waitingGroup` explicitly and inspect the richer raw queue fields during service.
3. Put the agreed one-minute collection cadence into operation, recording the distinction between retrieval time and source freshness.
4. Collect pilot waits across different branches, busy and quiet conditions, and weekdays/weekends. Compare the official estimate and this baseline on the same cases.
5. Use those findings to decide whether a corrected official estimate, a more stable throughput model, or another model can produce sufficiently narrow, well-covered ranges.
