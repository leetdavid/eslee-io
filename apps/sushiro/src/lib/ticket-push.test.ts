import { describe, expect, it } from "vitest";
import { alertOwed, parsePushSubscription, ticketAlertMessage } from "@/lib/ticket-push";

const keys = { auth: "a".repeat(22), p256dh: "B".repeat(87) };

describe("parsePushSubscription", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc:def",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2-sg2p.notify.windows.com/w/?token=abc",
  ])("accepts a subscription at %s", (endpoint) => {
    expect(parsePushSubscription({ endpoint, expirationTime: null, keys })).toEqual({
      ...keys,
      endpoint,
    });
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.example.com/fcm/send/abc",
    "https://notfcm.googleapis.com/fcm/send/abc",
    "https://evilpush.apple.com/abc",
    "https://localhost:5432/",
    "https://169.254.169.254/latest/meta-data",
    "not a url",
  ])("refuses to push to %s", (endpoint) => {
    expect(parsePushSubscription({ endpoint, keys })).toBeNull();
  });

  it("refuses keys of the wrong size or shape", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc";

    expect(parsePushSubscription({ endpoint, keys: { ...keys, auth: "short" } })).toBeNull();
    expect(
      parsePushSubscription({ endpoint, keys: { ...keys, p256dh: "B".repeat(86) } }),
    ).toBeNull();
    expect(parsePushSubscription({ endpoint, keys: { ...keys, auth: "+".repeat(22) } })).toBeNull();
    expect(parsePushSubscription({ endpoint })).toBeNull();
    expect(parsePushSubscription(null)).toBeNull();
    expect(parsePushSubscription("subscription")).toBeNull();
  });
});

describe("alertOwed", () => {
  const none = { due: false, near: false };

  it("owes nothing while the ticket is still far off", () => {
    expect(alertOwed("waiting", none)).toBeNull();
  });

  it("owes one alert when nearly called and one more when the number is up", () => {
    expect(alertOwed("near", none)).toBe("near");
    expect(alertOwed("near", { due: false, near: true })).toBeNull();
    expect(alertOwed("due", { due: false, near: true })).toBe("due");
    expect(alertOwed("due", { due: true, near: true })).toBeNull();
  });

  it("goes straight to the second alert when the number comes up first", () => {
    expect(alertOwed("due", none)).toBe("due");
  });

  it("stays quiet after the number was up, even if later calls fall back behind it", () => {
    expect(alertOwed("near", { due: true, near: false })).toBeNull();
  });
});

describe("ticketAlertMessage", () => {
  const values = { count: 6, latest: 444, number: "450", store: "Tsuen Wan Plaza" };

  it("says how close a nearly called ticket is", () => {
    expect(ticketAlertMessage("near", "en", values)).toEqual({
      body: "About 6 numbers to go. Now calling 444.",
      title: "Tsuen Wan Plaza: ticket 450 is nearly called",
    });
  });

  it("says the number is up, in the language the alert was turned on in", () => {
    expect(
      ticketAlertMessage("due", "zh-HK", { ...values, latest: 451, store: "荃灣廣場" }),
    ).toEqual({
      body: "分店而家叫緊 451。",
      title: "荃灣廣場 叫到 450 號",
    });
  });
});
