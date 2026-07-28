"use client";

import { TextareaField, useField, useFormFields } from "@payloadcms/ui";
import type { TextareaFieldClientComponent } from "payload";
import { useState } from "react";

export const ExcerptField: TextareaFieldClientComponent = (props) => {
  const { setValue } = useField<string>({ path: props.path });
  const title = useFormFields(([fields]) => fields.title?.value);
  const content = useFormFields(([fields]) => fields.content?.value);
  const [error, setError] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateExcerpt = async () => {
    setError(undefined);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/posts/generate-excerpt", {
        body: JSON.stringify({ content, title }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { excerpt?: unknown };

      if (!response.ok || typeof data.excerpt !== "string") {
        throw new Error("Unable to generate an excerpt.");
      }

      setValue(data.excerpt);
    } catch {
      setError("Unable to generate an excerpt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="excerpt-field">
      <div className="excerpt-field__action">
        <button
          className="excerpt-field__button"
          disabled={isGenerating || (!title && !content)}
          onClick={generateExcerpt}
          type="button"
        >
          {isGenerating ? "Writing excerpt..." : "Generate with AI"}
        </button>
      </div>
      <TextareaField {...props} />
      {error && (
        <p className="excerpt-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
