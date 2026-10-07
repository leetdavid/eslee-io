import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/server/router";

const url = process.argv[2];
if (!url) throw new Error("Usage: pnpm test:live <application URL>");
const api = createTRPCProxyClient<AppRouter>({
  links: [httpLink({ url: `${url.replace(/\/$/, "")}/api/trpc` })],
});

const health = await fetch(`${url}/api/health`);
assert.equal(health.status, 200, "The deployed app must have a healthy migrated database");

const paper = await api.matchup.mutate({ challenge: "rock", answer: "paper" });
assert.equal(paper.beats, true, "Jev should recognize the game's introductory convention");
const remembered = await api.matchup.mutate({ challenge: " ROCK ", answer: " Paper " });
assert.equal(remembered.source, "cache");
assert.equal(remembered.isNewMatchup, false);
assert.equal(remembered.confidence, paper.confidence);

const answer = `an industrial rock crusher with hardened steel jaws, serial ${randomUUID()}`;
const concurrent = await Promise.all([
  api.matchup.mutate({ challenge: "rock", answer }),
  api.matchup.mutate({ challenge: "ROCK", answer: answer.toUpperCase() }),
]);
assert.equal(
  concurrent.filter((result) => result.source === "jev").length,
  1,
  "Concurrent cache misses must share one model result",
);
assert.equal(
  concurrent.filter((result) => result.isNewMatchup).length,
  concurrent[0]?.beats ? 1 : 0,
);
assert.equal(concurrent[0]?.confidence, concurrent[1]?.confidence);

const lossInput = { challenge: "rock", answer: "an untouched sandwich on a different planet" };
const loss = await api.matchup.mutate(lossInput);
assert.equal(loss.beats, false, "An unrelated object should be rejected");
assert.equal(loss.isNewMatchup, false);
const repeatedLoss = await api.matchup.mutate(lossInput);
assert.equal(repeatedLoss.source, "cache");
assert.equal(repeatedLoss.isNewMatchup, false);
assert.equal(repeatedLoss.confidence, loss.confidence);

console.log(
  JSON.stringify({
    status: "passed",
    url,
    checks: [
      "health",
      "live Jev",
      "normalized cache reuse",
      "confidence persistence",
      "concurrent first discovery",
      "cached losses",
    ],
  }),
);
