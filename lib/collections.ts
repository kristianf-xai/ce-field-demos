import { DEMO_AS_OF } from "@/lib/clock";
import { daysBetween, formatDate } from "@/lib/dates";
import { formatUsd, sumCents } from "@/lib/money";
import { amountsVisible, MASKED_AMOUNT_LABEL } from "@/lib/plans";

type InvoiceLike = {
  status: string;
  dueOn: Date;
  totalCents: number;
  payments?: { amountCents: number }[];
};

export const PAYMENT_METHODS = ["check", "ach", "card_on_file", "cash"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  check: "Check",
  ach: "ACH",
  card_on_file: "Card on file",
  cash: "Cash",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export const ACTIVITY_LABEL: Record<string, string> = {
  PAYMENT_RECORDED: "Payment recorded",
  NOTE_ADDED: "Note added",
  NUDGE_SENT: "Nudge",
};

/** Stand-in for the PRD's unspecified edit window. Measured from createdAt, not the demo clock. */
export const NOTE_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditNote(
  note: { authorName: string; createdAt: Date },
  editorName: string,
  now: Date = new Date(),
) {
  return note.authorName === editorName && now.getTime() - note.createdAt.getTime() < NOTE_EDIT_WINDOW_MS;
}

export function daysPastDue(invoice: Pick<InvoiceLike, "status" | "dueOn">, asOf: Date = DEMO_AS_OF) {
  if (invoice.status !== "OVERDUE") return 0;
  return Math.max(0, daysBetween(asOf, invoice.dueOn));
}

/** Only OVERDUE invoices, most days past due first. */
export function overdueBook<T extends Pick<InvoiceLike, "status" | "dueOn">>(invoices: T[], asOf: Date = DEMO_AS_OF) {
  return invoices
    .filter((invoice) => invoice.status === "OVERDUE")
    .sort((a, b) => daysPastDue(b, asOf) - daysPastDue(a, asOf));
}

export function formatAmountForPlan(plan: string, cents: number) {
  return amountsVisible(plan) ? formatUsd(cents) : MASKED_AMOUNT_LABEL;
}

/** Replaces dollar figures in stored copy, such as a Nudge body, for plans that cannot see amounts. */
export function maskDollarFigures(plan: string, text: string) {
  return amountsVisible(plan) ? text : text.replace(/\$[\d,]+(\.\d{2})?/g, MASKED_AMOUNT_LABEL);
}

/** The account-level Nudge goes to the most-past-due overdue invoice. */
export function accountNudgeTarget<T extends Pick<InvoiceLike, "status" | "dueOn">>(
  invoices: T[],
  asOf: Date = DEMO_AS_OF,
): T | undefined {
  return overdueBook(invoices, asOf)[0];
}

/** Why a Nudge cannot be emailed, or null when the on-file address looks deliverable. */
export function nudgeEmailProblem(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "No email on file.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `"${trimmed}" is not an email address.`;
  return null;
}

/** Fixed v1 reminder. No custom composition. */
export function nudgeTemplate(input: {
  contactName: string;
  invoiceNumber: string;
  outstandingCents: number;
  dueOn: Date;
  senderName: string;
  workspaceName: string;
}) {
  return [
    `Hi ${input.contactName},`,
    `Invoice ${input.invoiceNumber} for ${formatUsd(input.outstandingCents)} was due ${formatDate(input.dueOn)} and is still open.`,
    "Please arrange payment, or reply if something is holding it up.",
    `${input.senderName}, ${input.workspaceName}`,
  ].join("\n");
}

/** What the customer still owes. Only OPEN and OVERDUE invoices carry a balance. */
export function outstandingCents(invoice: Pick<InvoiceLike, "status" | "totalCents" | "payments">) {
  if (invoice.status !== "OPEN" && invoice.status !== "OVERDUE") return 0;
  const paid = sumCents((invoice.payments ?? []).map((payment) => payment.amountCents));
  return Math.max(0, invoice.totalCents - paid);
}
