export const PLAN_IDS = ["STARTER", "GROWTH", "SCALE"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/**
 * Catalog prices are frozen. Demos must never invent a fourth price.
 * Cents only — format at the edge with formatUsd.
 */
export const PLAN_PRICE_CENTS: Record<PlanId, number> = {
  STARTER: 4900,
  GROWTH: 9900,
  SCALE: 24900,
};

export const PLAN_LABEL: Record<PlanId, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
};

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export const MASKED_AMOUNT_LABEL = "Upgrade to view amounts";

/** Collections dollar figures show only on the paid catalog. Every other plan id sees the label instead. */
export function amountsVisible(plan: string): boolean {
  return isPlanId(plan);
}

export function planPriceCents(plan: string): number {
  if (!isPlanId(plan)) {
    throw new Error(`Unknown plan "${plan}". Catalog is Starter $49, Growth $99, Scale $249.`);
  }
  return PLAN_PRICE_CENTS[plan];
}

export function planLabel(plan: string): string {
  if (!isPlanId(plan)) {
    throw new Error(`Unknown plan "${plan}".`);
  }
  return PLAN_LABEL[plan];
}
