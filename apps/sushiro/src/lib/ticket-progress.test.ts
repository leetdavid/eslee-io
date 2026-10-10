import { describe, expect, it } from "vitest";
import { ticketProgress } from "@/lib/ticket-progress";

describe("ticketProgress", () => {
  it("counts the numbers between the latest call and the ticket", () => {
    expect(ticketProgress("450", ["410", "411", "412"])).toEqual({
      ahead: 38,
      latest: 412,
      state: "waiting",
    });
  });

  it("is near from ten numbers away", () => {
    expect(ticketProgress("450", ["438", "439", "440"]).state).toBe("near");
    expect(ticketProgress("450", ["437", "438", "439"]).state).toBe("waiting");
    // A later number called out of order does not mean this one was missed.
    expect(ticketProgress("450", ["448", "449", "452"])).toEqual({
      ahead: 0,
      latest: 452,
      state: "near",
    });
  });

  it("is due when the number is called or every call is past it", () => {
    expect(ticketProgress("450", ["449", "450", "451"]).state).toBe("due");
    expect(ticketProgress("450-2", [449, 450]).state).toBe("due");
    expect(ticketProgress("450", ["451", "452", "453"]).state).toBe("due");
  });

  it("says nothing without calls, or when the calls belong to another run of numbers", () => {
    expect(ticketProgress("450", [])).toEqual({ ahead: null, latest: null, state: "waiting" });
    expect(ticketProgress("12", ["880", "881"])).toEqual({
      ahead: null,
      latest: 881,
      state: "waiting",
    });
    expect(ticketProgress("abc", ["1"]).ahead).toBeNull();
  });
});
