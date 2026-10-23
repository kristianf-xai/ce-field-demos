import { describe, expect, it } from "vitest";
import { demoDay } from "@/lib/clock";
import { accountNudgeTarget } from "@/lib/collections";

describe("accountNudgeTarget", () => {
  it("picks the most-past-due overdue invoice and skips other statuses", () => {
    const invoices = [
      { id: "recent", status: "OVERDUE", dueOn: demoDay("2026-08-20") },
      { id: "open", status: "OPEN", dueOn: demoDay("2026-07-01") },
      { id: "oldest", status: "OVERDUE", dueOn: demoDay("2026-08-01") },
    ];
    expect(accountNudgeTarget(invoices)?.id).toBe("oldest");
  });

  it("has no target when nothing is overdue", () => {
    expect(accountNudgeTarget([{ id: "paid", status: "PAID", dueOn: demoDay("2026-07-01") }])).toBeUndefined();
  });
});
