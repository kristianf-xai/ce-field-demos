import { describe, expect, it } from "vitest";
import { demoDay } from "@/lib/clock";
import { accountNudgeTarget, formatAmountForPlan, maskDollarFigures } from "@/lib/collections";

describe("amount mask", () => {
  it("formats catalog amounts and masks every other plan id, including figures inside a Nudge body", () => {
    expect(formatAmountForPlan("SCALE", 24900)).toBe("$249.00");
    expect(formatAmountForPlan("PILOT", 24900)).toBe("Upgrade to view amounts");

    const body = "Invoice INV-1043 for $249.00 was due Aug 9, 2026 and is still open.";
    expect(maskDollarFigures("GROWTH", body)).toBe(body);
    expect(maskDollarFigures("PILOT", body)).toBe(
      "Invoice INV-1043 for Upgrade to view amounts was due Aug 9, 2026 and is still open.",
    );
  });
});

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
