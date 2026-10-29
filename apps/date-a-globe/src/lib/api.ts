"use client";

import { createTRPCProxyClient, httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter, FailureReason } from "@/server/router";

export const api = createTRPCProxyClient<AppRouter>({
  links: [httpLink({ url: "/api/trpc" })],
});

/** The structured reason the server attached to a failed call. */
export function failureOf(error: unknown): FailureReason {
  if (error instanceof TRPCClientError) {
    const failure = (error.data as { failure?: FailureReason } | undefined)?.failure;
    if (failure) return failure;
  }
  return { reason: "failed" };
}
