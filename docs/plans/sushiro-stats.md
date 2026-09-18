# Sushiro meal planning and Stats discovery

Status: Model-first queue-now work is agreed. Broader planning and Stats details remain open.

## First-version direction

The first version answers: "If I take a ticket now, how long until it is called?" Build and evaluate the estimation model first. Once validated, show its output on the existing grid cards.

The first version shows one current estimated duration range per branch, with all Hong Kong branches available by default. Use current queue counts and recent ticket progression, validate against private-pilot observations, and retain the agreed one-minute collection cadence and 90% range-coverage target.

Weekday schedules, special-day adjustments, and monthly patterns are later planning possibilities rather than the proposed first estimation feature. The separate Stats requirement has not been withdrawn; its delivery scope and sequencing remain undecided.

"Today's conditions" referred to live queue counts and ticket progression. The user also raised weather as a possible input, but it is not an agreed first-version dependency.

## Model-first progress

An offline throughput baseline and evaluation runner now exist. See [the model experiment and pilot instructions](../../apps/sushiro/docs/queue-estimation.md).

The first chronological backtest used 204,864 snapshots and 7,496 held-out reconstructed outcomes. The fitted throughput model has an 8.41-minute median proxy error, 56.0% within ten minutes, and a median calibrated range width of 80 minutes. Upstream `wait`, assumed to be minutes, performs better as a point baseline. These are proxy measurements, not real-wait validation. No private-pilot observations have been supplied, and the results do not establish the requested accuracy.

A subsequent rolling comparison uses ten next-day folds and 23,558 proxy outcomes on 8 through 17 September. A three-coefficient, regularized upstream correction lowers mean proxy error from the source baseline's 16.32 to 15.03 minutes. Adaptive ranges yield 93.0% proxy coverage with 45-minute median width. The fraction within ten minutes remains approximately 60%, so this improves large errors and ranges without establishing the desired typical precision. This is retrospective development evidence; later days and pilot observations remain needed for independent validation. See the model report for the comparison protocol and all baselines.

## Broader product direction and agreed constraints

- The primary question is: "If I want to eat Sushiro today, approximately when should I queue?"
- Future-day planning is secondary, such as choosing a quieter time to visit a particular branch on Saturday.
- A dedicated Plan a meal page should provide queue-timing guidance using time estimates calculated from historical data.
- Plan a meal should be split by days of the week.
- Support both weekday browsing and specific-date lookup. Stats should have a date picker to inspect a particular day's statistics.
- Use two main pages: Plan a meal provides recurring weekday schedules; Stats has Daily history and Patterns views.
- Plan a meal is organized around the day of the week, not a date-specific forecast calendar. This supersedes the earlier By date and Typical week split and the proposed seven-date planning window.
- Explore adjustments or separate profiles for special days, and potentially for months or seasons. The categories and initial scope are not yet agreed.
- Daily history shows recorded queue data for a selected past date. Patterns summarizes historical observations, including weekday patterns and branch comparisons.
- Each view should have a bookmarkable URL that can preserve the selected branch, weekday, or historical date where applicable.
- Branch selection on Plan a meal is optional. The page must provide useful planning information before the visitor selects any branches.
- Show all Hong Kong branches by default. Do not use visitor location data or provide location-based results in the current scope.
- An estimated wait runs from taking a ticket until that ticket is called. Label the prediction as estimated time until called, rather than time until seated.
- Show one overall estimate per branch by default. Seating-category selection is not required.
- A seating-specific estimate may be an optional addition if inexpensive. It is a low priority and should not consume substantial effort or block the overall branch estimates.
- The user's initial near-term point-estimate preference was errors within five minutes where possible, up to ten minutes acceptable, and fifteen minutes too much. This remains a preference for precision, separate from the subsequently agreed duration-range format and 90% coverage target.
- Present estimated waits as duration ranges. Wider ranges such as 20 to 50 minutes are acceptable when uncertainty is higher; do not add a separate "rough estimate" label simply because a range is wide.
- The earlier five- to ten-minute accuracy preference remains a precision goal, while the later range decision allows uncertainty to be visible. A displayed range is not a guarantee that every actual wait falls inside it.
- Target 90% coverage for displayed waiting-duration ranges: approximately nine out of ten comparable observed waits should fall within the predicted bounds. Check coverage against independent validation observations and measure range width alongside it. This is a target, not an accuracy result already achieved.
- Collect additional real ticket-taking and call-time observations to help validate the estimates. The collection method and recruitment scope remain undecided.
- The preferred estimation direction uses automatically collected ticket progression and queue counts, then tests predictions against private-pilot observations. The pilot provides an independent accuracy check; it is not the only source from which estimates can be developed.
- Increase snapshot collection from approximately every five minutes to every minute during opening hours. The user accepts the roughly fivefold increase in snapshots during those hours.
- Stats should generally be a static, informational page. This describes the presentation; data refresh and calculation schedules remain undecided.
- Stats is a separate page for exploring actual observed queue statistics and finding interesting patterns. Forward-looking timing guidance belongs on Plan a meal.

## Assumptions to check

- The user expects seating-category estimates to be similar enough that an overall branch estimate is useful. A later data check found identical category counts in all 60,511 open-store snapshots with positive `wait` examined; this supports keeping the interface simple, but does not measure actual category-specific waiting durations.
- Investigate how estimates change over time. Regular recalculation and smaller adjustments to a stable model are possibilities, with the choice depending on evidence.

## Estimation and later planning proposals

The user proposed estimated queue waits for successive time slots, such as 6:00 PM and 6:15 PM. Each slot represents taking a ticket, with the estimated wait ending when that ticket is called. Waits are presented as ranges; a 15-minute slot interval and the method for choosing range bounds remain under consideration.

The dedicated Plan a meal page supersedes the earlier suggestion to make the store detail sheet the main planning interface. A desired-eating-time input has not been agreed.

Each weekday should expose its time-slot schedule. Defaulting to today's weekday is proposed. Whether to adjust today's remaining slots using live conditions, alongside the recurring weekday profile, is undecided. The two-page organization is confirmed; Plan no longer needs separate By date and Typical week views. Branch selection is optional and all Hong Kong branches appear by default; the presentation of multiple branches remains undecided.

Start from historical branch/weekday/time-slot patterns. Special-day profiles or adjustments and monthly patterns are possible refinements. The history inspected so far is entirely from September, so the dataset does not yet establish month-to-month differences. More granular profiles need sufficient representative history and validation.

Keep overall estimates attached to individual branches in the all-Hong-Kong overview. Optional manually chosen area and branch filters are under consideration. Location-based filtering is out of scope.

For validation, use private-pilot observations recording branch, ticket number, ticket-taking time, and actual call time. Include the date in both event timestamps. The collection interface remains undecided. A pilot would test assumptions about reconstructing waits, while wider sampling would be needed to assess accuracy across branches and conditions.

A candidate baseline divides the number of waiting groups ahead of a new ticket by a validated ticket-call rate. This assumes compatible counts, queue ordering, and reasonably stable throughput. Ticket skips, recalls, multiple numbering sequences, missing calls, and changing service rates must be investigated. Future time slots also require estimates of the queue and call rate at the future joining time.

Compare this candidate with the official wait estimate if the source field's meaning is confirmed. Develop historical branch/weekday/time-slot baselines and evaluate adjustments from today's conditions. Retain independently observed pilot waits for validation; success against reconstructed labels alone does not establish real waiting-time accuracy.

One-minute capture during opening hours is agreed to observe ticket progression more closely. It does not by itself guarantee the accuracy target. Collection behavior outside opening hours and retention of richer upstream fields still need to be determined.

## Existing data and behavior

- The grid already displays a trailing six-hour queue chart. The Stats navigation item is disabled.
- Queue snapshots contain collection time, store identity, `wait`, seating-category counts, called ticket numbers, store status, and ticketing status. Source-field meanings are under investigation as described below.
- An initial read-only database check confirms an approximately five-minute median cadence in the existing history; details follow below. One-minute collection during opening hours is the agreed target.
- The collected fields do not include individual ticket issuance times or actual seating times. Waiting groups and changes in called tickets need validation before they can support duration estimates.
- Snapshots store separate table, counter, and pair waiting-group counts, but called ticket numbers are stored in one array without explicit category metadata. Whether ticket progression can be linked to seating categories needs investigation.
- The existing chart aggregation replaces inactive-store counts with zero. Statistical analysis must distinguish these periods from an active store with no waiting groups.

### Initial history coverage check

A read-only query of the configured database found:

- 174,328 store snapshots across 44 branches and 3,962 distinct capture timestamps.
- First capture: `2026-09-01T10:05:51.559Z`. Last capture at the time of inspection: `2026-09-15T06:15:07.318Z`.
- Coverage spans 15 Hong Kong calendar dates, with partial first and last days. Most weekdays have only two historical occurrences.
- Over the seven days ending at the latest capture, median capture spacing is about 5.00 minutes, the 95th percentile is 5.57 minutes, and the longest gap is 12.34 minutes. One gap exceeds 7.5 minutes.
- These are collection timestamps, not individual ticket issuance or call timestamps. Coverage and cadence do not establish waiting-time prediction accuracy.

At the initial coverage check, no model had been evaluated. The later offline experiment is summarized above. Collecting independent ticket-taking and call-time observations is agreed. The first snapshot containing a called ticket gives a sampled observation time, not necessarily its exact call time; validation preserves that distinction.

### Ticket progression and source-field investigation

A subsequent read-only investigation of the growing dataset and public source endpoints found:

- All 60,511 examined open-store snapshots with positive `wait` have `wait` divisible by five. All three seating-category counts are identical in every one of those snapshots.
- The official store-list endpoint exposes a separate `waitingGroup` field, plus `wait`, `waitTimeCounter`, `waitTimeCap`, and `waitShowType`. The app currently discards `waitingGroup` and the extra wait-related fields. One live example has `wait = 5`, `waitingGroup = 1`, and each category count equal to 1.
- This is strong evidence that `wait` may be an upstream waiting-duration estimate rather than a group count. Its meaning and units still require confirmation. The current app labels and the earlier glossary mapping of `wait` to waiting groups must not be treated as source documentation. The glossary now defines the business term without that unverified field mapping; application code remains unchanged.
- Stored called-ticket arrays contain at most three values in the examined dataset. At Ma On Shan on 17 September, the array changes from `[347, 348, 349]` around 20:20 Hong Kong time to `[361, 362, 363]` around 20:25. Counting only newly visible array entries would miss numeric progression between captures; numeric progression itself still needs checking against skips and actual calls.
- Another Ma On Shan sequence includes `[331, 8402, 332]` followed by `[8401, 332, 333]`. A simple maximum-ticket difference is not a valid universal call-count calculation.
- The raw group-queues endpoint also exposes `boothQueue`, `counterQueue`, `mixedQueue`, reservation queue fields, `storeCounterQueue`, `storeBoothQueue`, and `separateQueue`, which the current parser discards. Their contents and meanings during service need investigation before deciding what additional data to retain.

Source endpoints inspected:

- `https://sushipass.sushiro.com.hk/api/2.0/info/storelist?latitude=22&longitude=114&numresults=100&region=HK`
- `https://sushipass.sushiro.com.hk/api/2.0/remote/groupqueues?region=HK&storeid=20`

Code references:

- `packages/db/src/schema/sushiro-schema.ts`
- `apps/sushiro/src/app/api/cron/queue-snapshots/route.ts`
- `apps/sushiro/src/app/api/queues/history/route.ts`
- `apps/sushiro/src/app/api/queues/charts/route.ts`
- `apps/sushiro/src/components/app-navigation.tsx`

## Open decisions

- Decide the Stats scope and delivery sequence alongside the queue-now estimates.
- Confirm the time-slot interval and how the estimated time until called is presented.
- How optional manual area and branch filtering works.
- How to present time-slot schedules for multiple branches clearly.
- Whether a low-effort seating-category option is justified after the overall branch estimates work.
- How the five- to ten-minute precision preference applies across forecast horizons alongside the 90% range-coverage target.
- How to collect and retain the private pilot's observed waits.
- How to evaluate predictions against observed waits across branches, queue conditions, and forecast horizons.
- How narrow useful ranges should be, and how to validate 90% coverage and range width across branches and conditions.
- What to show when there is insufficient evidence even for a useful broad range, or the branch is not issuing tickets.
- What history can support the first version, and whether additional observations are needed.
- Confirm source-field meanings, especially `wait` versus `waitingGroup`, before modeling or correcting the current UI.
- Determine whether richer upstream queue fields support reliable call-rate reconstruction.
- Collection behavior outside opening hours and retention of richer upstream snapshots.
- Which estimation method and update cadence the evidence supports.
- Which observed statistics and charts belong on Stats.
- How secondary future-day planning fits into a later iteration.
- Whether to adjust today's remaining time slots from live queue conditions or keep the planner entirely based on historical weekday profiles.
- Which special-day categories to support and what history is sufficient to distinguish them from ordinary weekdays.
- When monthly or seasonal profiles have enough supporting history to be useful.
