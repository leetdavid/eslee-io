import { describe, expect, it } from "vitest";
import { parseTicketAlerts } from "@/lib/ticket-alerts";

describe("parseTicketAlerts", () => {
  it("keeps tickets with alerts on and the alerts already shown", () => {
    expect(parseTicketAlerts('{"a":[],"b":["near","due","other"]}')).toEqual({
      a: [],
      b: ["near", "due"],
    });
  });

  it("drops anything that is not in the expected shape", () => {
    expect(parseTicketAlerts(null)).toEqual({});
    expect(parseTicketAlerts("[1,2]")).toEqual({});
    expect(parseTicketAlerts('{"a":true}')).toEqual({});
    expect(parseTicketAlerts("not json")).toEqual({});
  });
});
