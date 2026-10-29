import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlateView } from "@/components/plate-view";
import { ReviewActions } from "@/components/review/actions";
import { GitHubButton, SignOutButton } from "@/components/review/sign-in";
import { dateLabel } from "@/engine";
import type { GameEvent } from "@/lib/events";
import type { Check, Checks } from "@/server/checks";
import { getDatabase } from "@/server/database";
import { signInEnabled } from "@/server/github-env";
import { currentReviewer } from "@/server/maintainers";
import { TRIAL_GLOBES } from "@/server/plays";
import { queue, queueCounts, reviewEvent, STATUSES, type Status } from "@/server/review";

export const metadata: Metadata = { title: "Review events", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: Record<Status, string> = {
  waiting: "Waiting",
  trial: "On trial",
  live: "Live",
  rejected: "Rejected",
};

function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-[60px] items-center gap-[18px] border-[rgba(22,21,19,.1)] border-b bg-[#f6f5f1] px-[26px]">
        <Link href="/" className="brand">
          {/* biome-ignore lint/performance/noImgElement: a vector icon */}
          <img src="/brand/icon-small.svg" width={30} height={30} alt="" />
          <span className="word">
            date <i>a</i> globe
          </span>
        </Link>
        <span className="h-[22px] w-px bg-[rgba(22,21,19,.15)]" />
        <span className="font-semibold text-[16px]">Events</span>
        <div className="ml-auto flex items-center gap-4">{right}</div>
      </header>
      {children}
    </div>
  );
}

function Card({ state, children }: { state: string; children: ReactNode }) {
  return (
    <main className="grid min-h-[calc(100dvh-60px)] place-items-center p-6">
      <section className="w-full max-w-[440px]">
        <div className="mono mb-2.5 text-[10.5px] text-faint uppercase tracking-[0.12em]">
          {state}
        </div>
        <div className="rounded-[20px] bg-white p-[34px] pb-7 shadow-[0_0_0_1px_rgba(22,21,19,.1)]">
          {children}
        </div>
      </section>
    </main>
  );
}

const checkRows = (checks: Partial<Checks> & { research?: string }) => {
  const rows: Check[] = [];
  if (checks.research)
    rows.push({
      status: "warn",
      label: checks.research === "conflict" ? "Sources disagree" : "Unsure date",
      detail: "From the research: see the notes before approving.",
    });
  for (const k of ["duplicate", "dates", "pin", "clash"] as const)
    if (checks[k]) rows.push(checks[k] as Check);
  return rows;
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  if (!signInEnabled)
    return (
      <Shell>
        <Card state="Sign-in is off here">
          <h1 className="font-semibold text-[26px] tracking-[-0.03em]">
            Reviewing happens on the live site
          </h1>
          <p className="mt-2 text-[14.5px] text-muted leading-[1.45]">
            Preview deployments have no GitHub sign-in. Open dateaglobe.eslee.io/review instead.
          </p>
        </Card>
      </Shell>
    );

  const reviewer = await currentReviewer();
  if (!reviewer)
    return (
      <Shell
        right={
          <Link href="/" className="text-[13.5px] text-muted underline underline-offset-[3px]">
            Back to the game
          </Link>
        }
      >
        <Card state="Signed out">
          {/* biome-ignore lint/performance/noImgElement: a vector icon */}
          <img
            src="/brand/icon.svg"
            width={72}
            height={72}
            alt="Date a Globe app icon"
            className="mb-5"
          />
          <h1 className="font-semibold text-[26px] tracking-[-0.03em]">Review sent-in events</h1>
          <p className="mt-2 text-[14.5px] text-muted leading-[1.45]">
            Sign in to check the events people have sent, start trials and keep the live set honest.
          </p>
          <GitHubButton />
          <p className="mt-5 border-[rgba(22,21,19,.08)] border-t pt-3.5 text-[#6e6a62] text-[12.5px] leading-[1.45]">
            Only <b className="font-semibold text-ink">maintainers</b> of the eslee-io repository on
            GitHub can review. Anyone can play and send events without signing in.
          </p>
        </Card>
      </Shell>
    );

  if (!reviewer.isMaintainer)
    return (
      <Shell>
        <Card state="Signed in, not a maintainer">
          <h1 className="font-semibold text-[26px] tracking-[-0.03em]">
            You can&apos;t review yet
          </h1>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#f6f5f1] px-3 py-2.5 text-[13.5px]">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#c9d7de] font-semibold text-[#3e6474] text-[12px]">
              {reviewer.login.slice(0, 2).toUpperCase()}
            </span>
            {reviewer.login}
            <span className="ml-auto text-[#6e6a62] text-[12.5px]">via GitHub</span>
          </div>
          <span className="mt-3.5 inline-flex h-6 items-center rounded-[7px] bg-no px-2.5 font-semibold text-[#7a1e14] text-[12px]">
            Not a maintainer of eslee-io
          </span>
          <p className="mt-2 text-[14.5px] text-muted leading-[1.45]">
            Reviewing is open to people with the Maintain or Admin role on the repository. Your sent
            events still go into the queue as usual.
          </p>
          <div className="mt-[22px] flex gap-2.5">
            <Link
              href="/"
              className="flex h-[46px] flex-1 items-center justify-center rounded-[13px] bg-ink font-medium text-[#f5f1e6] text-[14.5px]"
            >
              Back to the game
            </Link>
            <SignOutButton className="h-[46px] flex-1 rounded-[13px] font-medium text-[14.5px] shadow-[0_0_0_1px_rgba(22,21,19,.2)]" />
          </div>
        </Card>
      </Shell>
    );

  const { tab, id } = await searchParams;
  const status: Status = STATUSES.includes(tab as Status) ? (tab as Status) : "waiting";
  const db = await getDatabase();
  const [counts, list] = await Promise.all([queueCounts(db), queue(db, status)]);
  const selected = (id && (await reviewEvent(db, id))) || list[0] || null;

  const sources = (selected?.sources ?? []) as { url: string; says: string }[];
  const spans = (selected?.spans ?? []) as GameEvent["spans"];
  const checks = checkRows((selected?.checks ?? {}) as Partial<Checks> & { research?: string });
  const plateEvent: GameEvent | null = selected
    ? {
        id: selected.id,
        title: selected.title,
        kind: selected.kind as GameEvent["kind"],
        question: selected.question,
        hint: selected.hint,
        spans,
        region: selected.region as GameEvent["region"],
        lat: selected.lat,
        lon: selected.lon,
        size: selected.size as GameEvent["size"],
        regional: selected.regional,
        trial: selected.status === "trial",
      }
    : null;

  return (
    <Shell
      right={
        <>
          <span className="text-[13px] text-muted">{reviewer.login}</span>
          <SignOutButton className="text-[13px] text-muted underline underline-offset-[3px]" />
        </>
      }
    >
      <nav className="flex gap-1 border-[rgba(22,21,19,.08)] border-b bg-[#f6f5f1] px-[26px] pb-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/review?tab=${s}`}
            className={`flex h-9 items-center gap-1.5 rounded-[10px] px-3 font-semibold text-[14px] ${s === status ? "bg-white shadow-[0_0_0_1px_rgba(22,21,19,.12)]" : "text-muted"}`}
          >
            {TABS[s]} <span className="font-normal text-[12px] text-faint">{counts[s]}</span>
          </Link>
        ))}
      </nav>
      <div className="grid min-h-[calc(100dvh-110px)] grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-1 border-[rgba(22,21,19,.08)] border-r bg-[#f6f5f1] p-2.5">
          {list.length === 0 && <p className="p-4 text-[14px] text-muted">Nothing here.</p>}
          {list.map((e) => {
            const c = checkRows((e.checks ?? {}) as Partial<Checks> & { research?: string });
            const worst = c.find((x) => x.status === "fail") ?? c.find((x) => x.status === "warn");
            const first = (e.spans as GameEvent["spans"])[0];
            return (
              <Link
                key={e.id}
                href={`/review?tab=${status}&id=${e.id}`}
                className={`block rounded-[14px] px-3.5 py-3 ${selected?.id === e.id ? "bg-white shadow-[0_0_0_1.5px_#161513]" : ""}`}
              >
                <b className="block font-semibold text-[14px]">{e.title}</b>
                <span className="text-[12px] text-muted">
                  {first
                    ? `${dateLabel(first.from)}–${first.until ? dateLabel(first.until) : "today"}`
                    : ""}{" "}
                  ·{" "}
                  {e.origin === "submission"
                    ? `sent ${e.createdAt.toISOString().slice(0, 10)}`
                    : "researched"}
                  {status === "trial" ? ` · ${e.trialAnswers}/${TRIAL_GLOBES} answers` : ""}
                </span>
                {worst ? (
                  <span className={`chip ${worst.status} mt-1.5`}>{worst.label}</span>
                ) : (
                  c.length > 0 && <span className="chip pass mt-1.5">✓ Checks passed</span>
                )}
              </Link>
            );
          })}
        </aside>
        {selected && plateEvent ? (
          <section className="flex flex-col gap-4 p-7">
            <div>
              <h1 className="font-semibold text-[26px] tracking-[-0.03em]">{selected.title}</h1>
              <p className="text-[13.5px] text-muted">
                {selected.kind} ·{" "}
                {selected.origin === "submission"
                  ? `sent by ${selected.senderName ?? "someone anonymous"}`
                  : "from the research"}{" "}
                · {selected.id}
                {selected.reviewedBy ? ` · last reviewed by ${selected.reviewedBy}` : ""}
              </p>
              {selected.reviewNote && (
                <p className="mt-1 text-[#7a1e14] text-[13px]">{selected.reviewNote}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="tile">
                  <div className="eyebrow mb-1">How it will be asked</div>
                  <p className="font-semibold text-[17px] leading-[1.25]">{selected.question}</p>
                  <p className="mt-1 text-[13px] text-muted">{selected.hint}</p>
                  <PlateView event={plateEvent} />
                </div>
                <div className="tile">
                  <div className="eyebrow mb-2">Record</div>
                  <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[13.5px]">
                    <dt className="text-muted">On maps</dt>
                    <dd className="font-semibold">
                      {spans
                        .map(
                          (s) => `${dateLabel(s.from)} – ${s.until ? dateLabel(s.until) : "today"}`,
                        )
                        .join(", ")}
                    </dd>
                    <dt className="text-muted">Where</dt>
                    <dd>
                      {selected.lat.toFixed(1)}°, {selected.lon.toFixed(1)}° · {selected.region}
                    </dd>
                    <dt className="text-muted">Size</dt>
                    <dd>
                      {selected.size}
                      {selected.regional ? " · regional maps only" : ""}
                    </dd>
                    {status === "trial" && (
                      <>
                        <dt className="text-muted">Trial</dt>
                        <dd>
                          {selected.trialAgreements} of {selected.trialAnswers} agree,{" "}
                          {TRIAL_GLOBES} needed
                        </dd>
                      </>
                    )}
                  </dl>
                  {selected.notes && (
                    <p className="mt-3 border-[rgba(22,21,19,.08)] border-t pt-2 text-[12.5px] text-muted leading-[1.45]">
                      {selected.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {checks.length > 0 && (
                  <div className="tile">
                    <div className="eyebrow mb-2">Automatic checks</div>
                    <div className="flex flex-col gap-2.5">
                      {checks.map((c) => (
                        <div
                          key={c.label}
                          className="grid grid-cols-[150px_1fr] items-start gap-3 text-[13px] leading-[1.38]"
                        >
                          <span className={`chip ${c.status} justify-self-start`}>{c.label}</span>
                          <span>{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="tile">
                  <div className="eyebrow mb-2">Sources</div>
                  <div className="flex flex-col gap-3">
                    {sources.map((s) => (
                      <div key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="block truncate font-semibold text-[13.5px] underline underline-offset-2"
                        >
                          {s.url.replace(/^https?:\/\//, "")}
                        </a>
                        {s.says && (
                          <p className="mt-1 rounded-[10px] bg-[#f6f5f1] px-3 py-2 text-[#3e3b35] text-[12.5px] leading-[1.45]">
                            “{s.says}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <ReviewActions
              key={selected.id}
              id={selected.id}
              status={selected.status as Status}
              edit={{
                title: selected.title,
                kind: selected.kind as GameEvent["kind"],
                question: selected.question,
                hint: selected.hint,
                spans,
                region: selected.region as GameEvent["region"],
                lat: selected.lat,
                lon: selected.lon,
                size: selected.size as GameEvent["size"],
                regional: selected.regional,
              }}
            />
          </section>
        ) : (
          <section className="grid place-items-center text-[14px] text-muted">
            Pick an event on the left.
          </section>
        )}
      </div>
    </Shell>
  );
}
