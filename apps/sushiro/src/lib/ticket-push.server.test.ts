import { createECDH, createPublicKey, randomBytes, randomUUID, verify } from "node:crypto";
import { sushiroTicketAlert as alerts, sushiroTicketReport as reports } from "@eslee/db/schema";
import { eq, like } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import type { PushSubscriptionKeys, TicketPush } from "@/lib/ticket-push";
import {
  ownTicketPushes,
  pushKeys,
  removeTicketPush,
  saveTicketPush,
  sendTicketAlerts,
} from "@/lib/ticket-push.server";
import { hongKongInput } from "@/lib/ticket-reports";

// A subscription as a browser would hand it over, with a real key so it can be encrypted to.
function browserSubscription(): PushSubscriptionKeys {
  const browser = createECDH("prime256v1");
  browser.generateKeys();
  return {
    auth: randomBytes(16).toString("base64url"),
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
    p256dh: browser.getPublicKey("base64url"),
  };
}

function signingKey() {
  const curve = createECDH("prime256v1");
  let key = curve.generateKeys();

  // One key in 256 starts with a zero byte and comes out short.
  while (curve.getPrivateKey().length !== 32) {
    key = curve.generateKeys();
  }

  return { privateKey: curve.getPrivateKey("base64url"), publicKey: key.toString("base64url") };
}

describe("pushKeys", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off until a private key of the right shape is configured", () => {
    vi.stubEnv("SUSHIRO_VAPID_PRIVATE_KEY", undefined);
    expect(pushKeys()).toBeNull();
    vi.stubEnv("SUSHIRO_VAPID_PRIVATE_KEY", "not-a-key");
    expect(pushKeys()).toBeNull();
    // Zero is not a valid private key on the curve.
    vi.stubEnv("SUSHIRO_VAPID_PRIVATE_KEY", "A".repeat(43));
    expect(pushKeys()).toBeNull();
  });

  it("works out the public key browsers subscribe with, and signs pushes that it verifies", () => {
    const { privateKey, publicKey } = signingKey();
    vi.stubEnv("SUSHIRO_VAPID_PRIVATE_KEY", privateKey);

    const keys = pushKeys();
    expect(keys).toEqual({ privateKey, publicKey });
    if (!keys) return;

    const subscription = browserSubscription();
    const request = webpush.generateRequestDetails(
      { endpoint: subscription.endpoint, keys: subscription },
      JSON.stringify({ title: "Ticket 450 is nearly called" }),
      { vapidDetails: { ...keys, subject: "https://sushiro.eslee.io" } },
    );
    const authorization = String(request.headers.Authorization);
    const [, token = "", key = ""] = /^vapid t=([^,]+), k=(.+)$/.exec(authorization) ?? [];
    const [header = "", claims = "", signature = ""] = token.split(".");
    const point = Buffer.from(publicKey, "base64url");

    expect(key).toBe(publicKey);
    expect(request.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toMatchObject({
      aud: "https://fcm.googleapis.com",
      sub: "https://sushiro.eslee.io",
    });
    expect(
      verify(
        "sha256",
        Buffer.from(`${header}.${claims}`),
        {
          dsaEncoding: "ieee-p1363",
          key: createPublicKey({
            format: "jwk",
            key: {
              crv: "P-256",
              kty: "EC",
              x: point.subarray(1, 33).toString("base64url"),
              y: point.subarray(33).toString("base64url"),
            },
          }),
        },
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });
});

const testUrl = process.env.SUSHIRO_TEST_DATABASE_URL;

describe.skipIf(!testUrl)("pushed ticket alerts", () => {
  const owner = `push-test-${randomUUID()}`;
  const now = new Date();
  const far = [{ id: 16, storeQueue: ["410", "411"], storeStatus: "OPEN" }];
  const close = [{ id: 16, storeQueue: ["443", "444"], storeStatus: "OPEN" }];
  const closed = [{ id: 16, storeQueue: ["443", "444"], storeStatus: "CLOSED" }];
  const up = [{ id: 16, storeQueue: ["450", "451"], storeStatus: "OPEN" }];
  let db: typeof import("@/lib/db").db;
  let sent: { push: TicketPush; to: PushSubscriptionKeys }[] = [];

  const send = async (to: PushSubscriptionKeys, push: TicketPush) => {
    sent.push({ push, to });
    return "sent" as const;
  };

  async function track(ticketNumber: string, ownerHash = owner) {
    const [report] = await db
      .insert(reports)
      .values({
        ownerHash,
        queueDate: hongKongInput(now).slice(0, 10),
        storeId: 16,
        storeName: "荃灣廣場店",
        storeNameEn: "Tsuen Wan Plaza",
        takenAt: now,
        ticketKey: ticketNumber,
        ticketNumber,
      })
      .returning({ id: reports.id });
    if (!report) throw new Error("The ticket was not saved");
    return report.id;
  }

  const stored = async (id: string) =>
    (await db.select().from(alerts).where(eq(alerts.reportId, id)))[0];

  beforeAll(async () => {
    vi.stubEnv("SUSHIRO_DATABASE_URL", testUrl);
    ({ db } = await import("@/lib/db"));
  });

  afterEach(async () => {
    sent = [];
    // Removing the tickets removes their alerts with them.
    await db.delete(reports).where(like(reports.ownerHash, "push-test-%"));
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await db.$client.end();
  });

  it("pushes once when a ticket is nearly called and once more when its number is up", async () => {
    const id = await track("450");
    const subscription = browserSubscription();
    expect(await saveTicketPush(id, owner, subscription, "en")).toBe(true);
    expect(await ownTicketPushes(owner)).toEqual([id]);

    expect(await sendTicketAlerts(far, now, send)).toBe(0);
    expect(await sendTicketAlerts(close, now, send)).toBe(1);
    expect(await sendTicketAlerts(close, now, send)).toBe(0);
    expect(await sendTicketAlerts(up, now, send)).toBe(1);
    expect(await sendTicketAlerts(up, now, send)).toBe(0);
    expect(await sendTicketAlerts(close, now, send)).toBe(0);

    expect(sent).toEqual([
      {
        push: {
          body: "About 6 numbers to go. Now calling 444.",
          kind: "near",
          ticket: id,
          title: "Tsuen Wan Plaza: ticket 450 is nearly called",
        },
        to: expect.objectContaining(subscription),
      },
      {
        push: {
          body: "The branch is calling 451.",
          kind: "due",
          ticket: id,
          title: "Tsuen Wan Plaza: ticket 450 is up",
        },
        to: expect.objectContaining(subscription),
      },
    ]);
  });

  it("only stores a push for the owner's own waiting ticket, and only they can remove it", async () => {
    const id = await track("450");
    const subscription = browserSubscription();

    expect(await saveTicketPush(id, "someone-else", subscription, "en")).toBe(false);
    expect(await saveTicketPush(randomUUID(), owner, subscription, "en")).toBe(false);
    expect(await stored(id)).toBeUndefined();

    expect(await saveTicketPush(id, owner, subscription, "en")).toBe(true);
    await removeTicketPush(id, "someone-else");
    expect(await stored(id)).toBeDefined();
    await removeTicketPush(id, owner);
    expect(await stored(id)).toBeUndefined();

    await db.update(reports).set({ leftAt: now }).where(eq(reports.id, id));
    expect(await saveTicketPush(id, owner, subscription, "en")).toBe(false);
  });

  it("keeps one destination per ticket, and keeps what was already sent when it changes", async () => {
    const id = await track("450");
    await saveTicketPush(id, owner, browserSubscription(), "en");
    await sendTicketAlerts(close, now, send);

    const replacement = browserSubscription();
    await saveTicketPush(id, owner, replacement, "zh-HK");

    expect(await stored(id)).toMatchObject({ ...replacement, language: "zh-HK", nearSentAt: now });
    expect(await sendTicketAlerts(close, now, send)).toBe(0);
    await sendTicketAlerts(up, now, send);
    expect(sent[1]?.push.title).toBe("荃灣廣場店 叫到 450 號");
  });

  it("tries a failed push again on the next look, and forgets a subscription that is gone", async () => {
    const id = await track("450");
    await saveTicketPush(id, owner, browserSubscription(), "en");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const failing = vi.fn().mockRejectedValue(new Error("Push service unavailable"));
    expect(await sendTicketAlerts(close, now, failing)).toBe(0);
    expect(console.error).toHaveBeenCalledOnce();
    expect(await stored(id)).toMatchObject({ nearSentAt: null });
    expect(await sendTicketAlerts(close, now, send)).toBe(1);

    expect(await sendTicketAlerts(up, now, async () => "gone")).toBe(0);
    expect(await stored(id)).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("stays quiet for a closed branch, a ticket already called, and a ticket the owner left", async () => {
    const called = await track("450");
    const left = await track("451");
    const waiting = await track("452");
    for (const id of [called, left, waiting]) {
      await saveTicketPush(id, owner, browserSubscription(), "en");
    }
    await db.update(reports).set({ calledAt: now }).where(eq(reports.id, called));
    await db.update(reports).set({ leftAt: now }).where(eq(reports.id, left));

    expect(await sendTicketAlerts(closed, now, send)).toBe(0);
    expect(await sendTicketAlerts(close, now, send)).toBe(1);
    expect(sent.map(({ push }) => push.ticket)).toEqual([waiting]);
  });

  it("removes a destination once its ticket's day is over", async () => {
    const id = await track("450");
    await saveTicketPush(id, owner, browserSubscription(), "en");

    await sendTicketAlerts(far, new Date(now.valueOf() + 23 * 60 * 60_000), send);
    expect(await stored(id)).toBeDefined();
    await sendTicketAlerts(far, new Date(now.valueOf() + 25 * 60 * 60_000), send);
    expect(await stored(id)).toBeUndefined();
  });
});
