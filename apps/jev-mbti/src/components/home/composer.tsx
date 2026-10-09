"use client";

import { Ban, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ProgressSteps, type Step } from "@/components/progress-steps";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { InputMessage } from "@/components/ui/input-message";
import { TabItem, Tabs, TabsList } from "@/components/ui/tabs";
import { api, failureOf } from "@/lib/api";
import type { Bilingual } from "@/lib/chart";
import { type Locale, MESSAGES } from "@/lib/i18n";
import {
  type AxisMode,
  checkAsk,
  countCharacters,
  MAX_AXIS_END_LENGTH,
  MAX_QUESTION_LENGTH,
  type QuestionIssue,
} from "@/lib/question";
import type { FailureReason } from "@/server/router";

type Ends = { low: string; high: string };
type Phase =
  | { step: "idle" }
  | { step: "axes" }
  | { step: "placing"; axes: { low: Bilingual; high: Bilingual }[] };

export type ComposerPrefill = { question?: string; mode?: AxisMode; axes?: Ends[] };

export function Composer({ locale, prefill }: { locale: Locale; prefill?: ComposerPrefill }) {
  const t = MESSAGES[locale];
  const router = useRouter();
  const fieldId = useId();
  const [question, setQuestion] = useState(prefill?.question ?? "");
  const [mode, setMode] = useState<AxisMode>(prefill?.mode ?? "auto");
  const [axesOpen, setAxesOpen] = useState(Boolean(prefill?.axes?.length));
  const [axes, setAxes] = useState<Ends[]>(() =>
    [0, 1].map((index) => prefill?.axes?.[index] ?? { low: "", high: "" }),
  );
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [issue, setIssue] = useState<QuestionIssue | null>(null);
  const [failure, setFailure] = useState<FailureReason | null>(null);
  const busy = phase.step !== "idle";
  const axisCount = mode === "two" ? 2 : 1;

  const issueText = (value: QuestionIssue) =>
    value.code === "empty"
      ? t.emptyQuestion
      : value.code === "tooLong"
        ? t.tooLong(value.max)
        : value.code === "axisEndMissing"
          ? t.axisEndMissing
          : t.axisEndTooLong(value.max);

  async function submit(text: string) {
    if (busy) return;
    const input = {
      question: text,
      mode: axesOpen && mode === "auto" ? ("one" as const) : mode,
      ...(axesOpen ? { axes: axes.slice(0, axisCount) } : {}),
    };
    const checked = checkAsk(input);
    setFailure(null);
    if (!checked.ok) {
      setIssue(checked.issue);
      return;
    }
    setIssue(null);
    setPhase({ step: "axes" });
    try {
      const suggested = await api.suggest.mutate(input);
      if (suggested.kind === "existing") {
        router.push(`/c/${suggested.id}`);
        return;
      }
      setPhase({ step: "placing", axes: suggested.axes });
      const { id } = await api.place.mutate({ draft: suggested.draft });
      router.push(`/c/${id}?new=1`);
    } catch (error) {
      setFailure(failureOf(error));
      setPhase({ step: "idle" });
    }
  }

  const steps: Step[] =
    phase.step === "idle"
      ? []
      : [
          {
            key: "axes",
            label: phase.step === "axes" ? t.stepAxes : t.stepAxesDone,
            description:
              phase.step === "placing"
                ? phase.axes
                    .map((axis) => t.axisArrow(axis.low[locale], axis.high[locale]))
                    .join(" · ")
                : undefined,
            status: phase.step === "axes" ? "active" : "complete",
          },
          { key: "jev", label: t.stepJev, status: phase.step === "placing" ? "active" : "pending" },
        ];

  const count = countCharacters(question.trim());

  return (
    <div className="composer-wrap">
      <InputMessage
        aria-label={t.questionLabel}
        value={question}
        onValueChange={(value) => {
          setQuestion(value);
          setIssue(null);
        }}
        onSend={(value) => void submit(value)}
        placeholder={t.questionPlaceholder}
        sendLabel={t.submit}
        disabled={busy}
        minRows={2}
        maxRows={5}
        textareaProps={{ id: fieldId, "aria-describedby": `${fieldId}-hint`, enterKeyHint: "send" }}
        leftSlot={
          <Tabs value={mode} onValueChange={(value) => setMode(value as AxisMode)} size="compact">
            <TabsList aria-label={t.axisModeLabel}>
              <TabItem value="auto" label={t.modeAuto} />
              <TabItem value="one" label={t.modeOne} />
              <TabItem value="two" label={t.modeTwo} />
            </TabsList>
          </Tabs>
        }
        rightSlot={
          <span
            className="num"
            style={{
              fontSize: 13,
              color: count > MAX_QUESTION_LENGTH ? "var(--warn)" : "var(--ink-soft)",
            }}
          >
            {count}/{MAX_QUESTION_LENGTH}
          </span>
        }
      />
      <p className="composer-hint" id={`${fieldId}-hint`}>
        {t.enterHint}
      </p>
      <Accordion
        type="single"
        collapsible
        value={axesOpen ? "axes" : ""}
        onValueChange={(value: string) => setAxesOpen(value === "axes")}
      >
        <AccordionItem value="axes">
          <AccordionTrigger>{t.setAxesYourself}</AccordionTrigger>
          <AccordionContent>
            <div className="axis-fields">
              {axes.slice(0, axisCount).map((ends, index) => (
                <fieldset key={index === 0 ? "x" : "y"}>
                  <legend>
                    {axisCount === 2 ? (index === 0 ? t.horizontal : t.vertical) : t.modeOne}
                  </legend>
                  <div className="pair">
                    {(["low", "high"] as const).map((end) => (
                      <input
                        key={end}
                        className="text-field"
                        aria-label={
                          end === "low"
                            ? t.axisLowLabel(index === 0 ? t.horizontal : t.vertical)
                            : t.axisHighLabel(index === 0 ? t.horizontal : t.vertical)
                        }
                        placeholder={end === "low" ? t.axisLowPlaceholder : t.axisHighPlaceholder}
                        maxLength={MAX_AXIS_END_LENGTH * 2}
                        value={ends[end]}
                        disabled={busy}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAxes((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, [end]: value } : item,
                            ),
                          );
                          setIssue(null);
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {issue ? (
        <p role="alert" className="inline-note" style={{ fontSize: 14 }}>
          {issueText(issue)}
        </p>
      ) : null}
      {failure ? (
        <div style={{ marginTop: 12 }}>
          {failure.reason === "refused" ? (
            <Banner status="warning" icon={Ban} role="alert">
              <BannerTitle>{t.refused}</BannerTitle>
              <BannerDescription>{t.refusedDetail}</BannerDescription>
            </Banner>
          ) : failure.reason === "rateLimited" ? (
            <Banner status="warning" icon={Clock} role="alert">
              <BannerTitle>{t.rateLimited(failure.retryAfterMinutes)}</BannerTitle>
              <BannerDescription>{t.rateLimitedDetail}</BannerDescription>
            </Banner>
          ) : (
            <Banner status="warning" role="alert">
              <BannerTitle>{t.failedToCreate}</BannerTitle>
            </Banner>
          )}
        </div>
      ) : null}
      {steps.length ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <ProgressSteps title={question.trim()} steps={steps} />
        </div>
      ) : null}
    </div>
  );
}
