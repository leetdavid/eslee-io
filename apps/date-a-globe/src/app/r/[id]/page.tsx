import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Certificate, type Pin } from "@/components/certificate";
import { CloseIcon } from "@/components/icons";
import { AnotherGlobe, KeepGoing, PrintedYear, ShareButton } from "@/components/result-actions";
import { Trail } from "@/components/scales";
import { dateLabel, KEEP_GOING, monthLabel, yearOf } from "@/engine";
import { currentEvents } from "@/server/events";
import { alsoNew, resultFor } from "@/server/results";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await resultFor((await params).id);
  if (!found) return { title: "Not found" };
  const { result } = found.play;
  return {
    title: `Printed ${result.label}`,
    description: `This globe was most likely printed ${result.label}, ${result.sure}% sure. Date yours in about a dozen questions.`,
  };
}

export default async function ResultPage({ params }: Params) {
  const { id } = await params;
  const found = await resultFor(id);
  if (!found) notFound();
  const { play, events, trial, steps, months } = found;
  const { result, turns, setup } = play;

  const counted = turns
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.answer !== "cant" && !trial.has(t.eventId));
  const lastCounted = counted.at(-1)?.i;
  const pins: Pin[] = counted.flatMap(({ t, i }) => {
    const e = events.get(t.eventId);
    return e
      ? [
          {
            n: i + 1,
            lat: e.lat,
            lon: e.lon,
            last: i === lastCounted,
            setAside: result.setAside.includes(i),
          },
        ]
      : [];
  });
  const skipped = turns.filter((t) => t.answer === "cant").length;
  // Keep going is offered while a question could still narrow the range (a trial question alone doesn't).
  const { engine } = await currentEvents();
  const known = turns.filter((t) => engine.knows(t.eventId));
  const more = engine.next(setup, known, {
    answers: known.filter((t) => t.answer !== "cant").length + KEEP_GOING.answers,
    narrowing: KEEP_GOING.narrowing,
  });
  const canGoOn = more.type === "ask" && more.reason !== "trial";
  const title = (eventId: string) => events.get(eventId)?.title ?? "An event we no longer ask";
  const shown = (eventId: string, turn: number) =>
    turns[turn]?.answer === "yes"
      ? `You saw ${title(eventId)}.`
      : `You didn't see ${title(eventId)}.`;
  const rangeEnd = (end: { month: number; precise: boolean }) =>
    end.precise ? monthLabel(end.month) : String(yearOf(end.month));
  const also = await alsoNew(
    yearOf(result.mostLikely),
    turns.map((t) => t.eventId),
  );

  const rows = turns.map((t, i) => ({
    n: i + 1,
    title: title(t.eventId),
    answer: t.answer,
    window: steps[i] ?? null,
    setAside: result.setAside.includes(i),
    last: i === lastCounted,
  }));

  return (
    <main className="app gap-3">
      <header className="bar">
        <Link href="/" className="ib" aria-label="Back to the start">
          <CloseIcon />
        </Link>
        <div className="qn">
          <b>Dated</b>
          <span>
            {turns.length} questions{skipped ? ` · ${skipped} can't tell` : ""}
            {result.setAside.length ? ` · ${result.setAside.length} set aside` : ""}
          </span>
        </div>
        <ShareButton label={result.label} round />
      </header>

      <Certificate result={result} setup={setup} pins={pins} />

      <p className="text-center text-[13px] text-muted">
        Most likely month: <b className="font-semibold text-ink">{monthLabel(result.mostLikely)}</b>
      </p>

      {canGoOn && <KeepGoing id={play.id} label={result.label} answers={turns.length} />}

      {result.hinge && (
        <section className="tile flex items-center gap-3">
          <span className="badge">{result.hinge.turn + 1}</span>
          <p className="flex-1 text-[#3e3b35] text-[13px] leading-[1.38]">
            <b className="font-semibold text-ink">Hinges on question {result.hinge.turn + 1}.</b>{" "}
            {shown(result.hinge.eventId, result.hinge.turn)} If that was a misread, the answer is{" "}
            {result.hinge.label}.
          </p>
          <Link
            href={`/play?recheck=${play.id}&turn=${result.hinge.turn}`}
            className="flex h-9 flex-none items-center rounded-xl px-3.5 font-semibold text-[13px] shadow-[0_0_0_1.5px_#161513]"
          >
            Re-check
          </Link>
        </section>
      )}

      {(result.notBefore || result.notAfter) && (
        <section className="grid grid-cols-2 gap-2.5">
          <div className="tile">
            <div className="eyebrow mb-1">Not before</div>
            <b className="block font-semibold text-[20px] tracking-[-0.02em]">
              {rangeEnd(result.from)}
            </b>
            {result.notBefore && (
              <p className="mt-1 text-[12.5px] text-muted leading-[1.38]">
                {shown(result.notBefore.eventId, result.notBefore.turn)} Maps changed in{" "}
                {dateLabel(result.notBefore.date)}.
              </p>
            )}
          </div>
          <div className="tile">
            <div className="eyebrow mb-1">Not after</div>
            <b className="block font-semibold text-[20px] tracking-[-0.02em]">
              {result.label.endsWith("today") ? "Today" : rangeEnd(result.to)}
            </b>
            {result.notAfter && (
              <p className="mt-1 text-[12.5px] text-muted leading-[1.38]">
                {shown(result.notAfter.eventId, result.notAfter.turn)} Maps changed in{" "}
                {dateLabel(result.notAfter.date)}, and globes take a year or two to catch up.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="tile">
        <div className="k eyebrow">
          <span>Every answer</span>
          <span>{turns.length} answers</span>
        </div>
        <Trail rows={rows} months={months} />
        {result.setAside.length > 0 && (
          <p className="mt-2 text-[12px] text-muted">
            Struck-through answers were outweighed by the others and set aside.
          </p>
        )}
      </section>

      {also.length > 0 && (
        <section className="tile">
          <div className="eyebrow mb-1">Also new on maps around {yearOf(result.mostLikely)}</div>
          <p className="text-[#3e3b35] text-[14px] leading-[1.42]">{also.join(" · ")}</p>
        </section>
      )}

      <PrintedYear id={play.id} saved={play.printedYear} />

      <div className="mt-2 flex flex-col gap-2.5">
        <ShareButton label={result.label} />
        <AnotherGlobe />
      </div>
    </main>
  );
}
