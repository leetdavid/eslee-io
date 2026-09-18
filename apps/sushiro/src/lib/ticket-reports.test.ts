import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  eventTime,
  exactTicketSeen,
  fromHongKongInput,
  hongKongInput,
  parseTicketReport,
  ticketKey,
} from "@/lib/ticket-reports";
import { privateTicketResponse, sameOrigin, ticketOwner } from "@/lib/ticket-reports.server";

const now = new Date("2026-09-18T10:30:00.000Z");

describe("ticket submissions", () => {
  it("records just-now at server time and ignores submitted ownership fields", () => {
    const result = parseTicketReport(
      { storeId: 20, ticketNumber: " 001-1 ", takenAt: null, ownerHash: "someone-else" },
      now,
    );
    expect(result).toEqual({
      success: true,
      data: {
        storeId: 20,
        ticketNumber: "001-1",
        ticketKey: "1-1",
        takenAt: now,
        queueDate: "2026-09-18",
      },
    });
  });

  it("preserves actual ticket-taking time rather than replacing it with submission time", () => {
    const result = parseTicketReport(
      { storeId: 20, ticketNumber: "123", takenAt: "2026-09-18T10:00:00.000Z" },
      now,
    );
    expect(result.success && result.data.takenAt.toISOString()).toBe("2026-09-18T10:00:00.000Z");
  });

  it("rejects invalid branches, numbers, missing times, and future or old events", () => {
    expect(parseTicketReport({}, now).success).toBe(false);
    expect(
      parseTicketReport({ storeId: 1.5, ticketNumber: "-1", takenAt: null }, now).success,
    ).toBe(false);
    for (const takenAt of ["2026-09-18T10:31:00.000Z", "2026-09-17T10:29:00.000Z", "tomorrow"]) {
      expect(parseTicketReport({ storeId: 20, ticketNumber: "123", takenAt }, now).success).toBe(
        false,
      );
    }
    expect(eventTime("2026-09-18T09:59:00.000Z", new Date("2026-09-18T10:00:00Z"), now)).toBeNull();
  });
});

describe("Hong Kong event times", () => {
  it("converts independently of the browser timezone and keeps sub-minute waits possible", () => {
    expect(hongKongInput(now)).toBe("2026-09-18T18:30:00");
    expect(fromHongKongInput("2026-09-18T18:30:21")).toBe("2026-09-18T10:30:21.000Z");
    expect(fromHongKongInput("2026-09-18T18:30")).toBe("2026-09-18T10:30:00.000Z");
    expect(fromHongKongInput("2026-02-30T18:30")).toBeNull();
    const report = parseTicketReport(
      { storeId: 20, ticketNumber: "12", takenAt: null },
      new Date("2026-09-18T16:05:00Z"),
    );
    expect(report.success && report.data.queueDate).toBe("2026-09-19");
  });
});

describe("exact feed sightings", () => {
  const report = {
    ticketKey: "123",
    takenAt: new Date("2026-09-18T10:00:00Z"),
    queueDate: "2026-09-18",
  };
  it("matches zero-padded exact numbers, but never assumes a passed number was called", () => {
    expect(exactTicketSeen(report, ["0123"], now)).toBe(true);
    expect(exactTicketSeen(report, [124, "8123"], now)).toBe(false);
    expect(exactTicketSeen(report, ["123-1"], now)).toBe(false);
    expect(ticketKey("001-1")).not.toBe(ticketKey("001"));
  });
  it("does not match observations from another Hong Kong day or before ticket-taking", () => {
    expect(exactTicketSeen(report, [123], new Date("2026-09-18T09:59:00Z"))).toBe(false);
    expect(exactTicketSeen(report, [123], new Date("2026-09-19T10:30:00Z"))).toBe(false);
  });
});

describe("anonymous report ownership", () => {
  it("uses an opaque HttpOnly session with a hashed database identifier", () => {
    const owner = ticketOwner(new NextRequest("https://sushiro.example/api/tickets"));
    const response = privateTicketResponse(NextResponse.json({ reports: [] }), owner);
    expect(owner.token).toHaveLength(43);
    expect(owner.hash).toHaveLength(64);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const again = ticketOwner(
      new NextRequest("https://sushiro.example/api/tickets", {
        headers: { cookie: `sushiro-ticket-session=${owner.token}` },
      }),
    );
    expect(again).toEqual({ ...owner, fresh: false });
    expect(ticketOwner(new NextRequest("https://sushiro.example/api/tickets")).hash).not.toBe(
      owner.hash,
    );
  });
  it("rejects cross-origin submissions", () => {
    expect(
      sameOrigin(
        new NextRequest("https://sushiro.example/api/tickets", {
          headers: { origin: "https://sushiro.example" },
        }),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new NextRequest("https://sushiro.example/api/tickets", {
          headers: { origin: "https://elsewhere.example" },
        }),
      ),
    ).toBe(false);
  });
});
