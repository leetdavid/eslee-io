"use client";

import {
  ThinkingStep,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from "@/components/ui/thinking-steps";

export type Step = {
  key: string;
  label: string;
  description?: string;
  status: "complete" | "active" | "pending";
};

/** Real progress only: each step reflects a request that has started or finished. */
export function ProgressSteps({ title, steps }: { title: string; steps: Step[] }) {
  return (
    <div role="status" aria-live="polite">
      <ThinkingSteps defaultOpen className="w-full">
        <ThinkingStepsHeader>{title}</ThinkingStepsHeader>
        <ThinkingStepsContent>
          {steps.map((step, index) => (
            <ThinkingStep
              key={step.key}
              label={step.label}
              description={step.description}
              status={step.status}
              isLast={index === steps.length - 1}
            />
          ))}
        </ThinkingStepsContent>
      </ThinkingSteps>
    </div>
  );
}
