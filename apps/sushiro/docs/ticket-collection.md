# Ticket collection

Open `/tickets`, or choose "Track my ticket" in a branch's detail sheet. A `storeId` query parameter prefills that branch. The page follows the shared Cantonese/English language preference.

## Flow

1. Select a branch and enter the complete ticket number.
2. Choose "Just now" or enter the ticket-taking time within the past 24 hours. Inputs explicitly use Hong Kong time, independently of the browser's timezone.
3. The page shows the saved ticket, elapsed time and current called numbers.
4. Optionally report when the ticket was called, including a retrospective time. The reported call time can be edited.
5. "I left the queue" ends tracking without inventing a completed wait.

Reports are stored on the server and linked to an anonymous browser session. Returning on the same browser restores the latest 20 reports. Clearing that browser's cookies removes its ability to access those reports.

## Event provenance

The `sushiro_ticket_report` table deliberately separates:

| Field | Meaning |
| --- | --- |
| `taken_at` | User-reported ticket-taking time, or server time when "Just now" is submitted |
| `submitted_at` | When the report was stored |
| `called_at` | The user's reported actual call time |
| `call_reported_at` | When the user saved or edited that call time |
| `first_seen_called_at` | When the server first found the exact ticket in the returned feed |
| `last_checked_at` | When an unmatched ticket was last checked against an open branch's feed |
| `left_at` | When the user said they left the queue |

A feed sighting does not set or overwrite `called_at`. Its timestamp is the time the server observed the response, which may have come from the existing short-lived queue cache. It is not the source's exact call timestamp.

Matching uses branch, Hong Kong date and the normalized complete ticket number. Leading zeroes are normalized; suffixes remain distinct. A higher called number does not prove that a smaller ticket was called. Automatic matching stops across the Hong Kong date boundary to avoid matching a reused ticket on the next day.

The page checks once per minute while open. Matching is also hooked into the existing queue-snapshot collector for background checks. Its current Railway configuration runs every five minutes; the previously discussed one-minute background collection still requires a separate scheduler update. Exact matches may be missed between captures, which is why user-reported calls remain useful.

## Ownership and retries

An opaque, HttpOnly, SameSite cookie identifies the browser session. Only its SHA-256 hash is stored with the report. API responses omit the ownership hash. Updates require the same browser session and same-origin requests.

The unique key is owner, branch, Hong Kong ticket date and normalized ticket number. Retrying a submission returns the existing report rather than resetting its ticket-taking time. Reports from different browsers remain separate submissions; analysis should account for duplicate real-world tickets and conflicting reports before treating them as independent observations.

Human reports are self-reported observations, not independently verified ground truth. For model evaluation, use the user's `called_at` and `taken_at` together, retain the reporting timestamps, and examine cancellations and duplicate reports. Source sightings should be analysed separately.

## Database migration

`packages/db/drizzle/0006_sushiro_ticket_reports.sql` creates the report table and indexes. It was generated with Drizzle and applied using `pnpm -F @eslee/db db:migrate`.

## Verification

- Targeted tests cover timestamp bounds, Hong Kong date conversion, complete-number matching, session cookies and same-origin checks.
- Browser checks cover submission, a retrospective ticket-taking time, call confirmation with a retrospective time, leaving the queue, persistence after reload, and preserving form input after a failed request.
- The interface was checked at 320px and 390px widths. The browser accessibility audit reported no WCAG 2 A/AA violations on the tested mobile screen.
- A second isolated browser could neither list nor update the first browser's report.
- A database-backed reconciliation check recorded an exact feed sighting without changing the user-reported call time. Repeating it left the first sighting unchanged.
- Temporary browser test reports were removed after verification.
