import { DEMO_AS_OF } from "@/lib/clock";
import { daysBetween } from "@/lib/dates";

type InvoiceLike = {
  status: string;
  dueOn: Date;
  totalCents: number;
};

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

export function outstandingCents(invoice: Pick<InvoiceLike, "totalCents">) {
  return invoice.totalCents;
}
