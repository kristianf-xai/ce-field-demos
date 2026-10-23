import { describe, expect, it } from "vitest";
import { demoDay } from "@/lib/clock";
import { catalogMrrCents, collectionsKpi, percentChange } from "@/lib/dashboard";

describe("catalogMrrCents", () => {
  it("sums only catalog plan prices", () => {
    expect(
      catalogMrrCents([{ plan: "STARTER" }, { plan: "GROWTH" }, { plan: "SCALE" }]),
    ).toBe(4900 + 9900 + 24900);
  });
});

describe("percentChange", () => {
  it("returns null when the prior period is empty and current is not", () => {
    expect(percentChange(9900, 0)).toBeNull();
  });

  it("computes a real lift without inventing a baseline", () => {
    expect(percentChange(19800, 9900)).toBe(100);
  });
});

describe("collectionsKpi", () => {
  it("totals overdue catalog balances net of payments and counts overdue invoices", () => {
    const kpi = collectionsKpi(
      [
        { status: "OVERDUE", plan: "SCALE", totalCents: 24900 },
        { status: "OVERDUE", plan: "GROWTH", totalCents: 9900, payments: [] },
        { status: "OPEN", plan: "STARTER", totalCents: 4900 },
        { status: "PAID", plan: "SCALE", totalCents: 24900, payments: [{ amountCents: 24900 }] },
      ],
      [],
    );
    expect(kpi.overdueCents).toBe(24900 + 9900);
    expect(kpi.overdueCount).toBe(2);
  });

  it("counts activities on the demo day and in the 7 days ending it", () => {
    const kpi = collectionsKpi(
      [],
      [
        { occurredOn: demoDay("2026-08-23") },
        { occurredOn: demoDay("2026-08-23") },
        { occurredOn: demoDay("2026-08-17") },
        { occurredOn: demoDay("2026-08-16") },
      ],
    );
    expect(kpi.activitiesToday).toBe(2);
    expect(kpi.activitiesThisWeek).toBe(3);
  });
});
