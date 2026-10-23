import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as recordPayment } from "@/app/api/invoices/[id]/payments/route";
import { DEMO_AS_OF } from "@/lib/clock";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICE_CENTS } from "@/lib/plans";

// Alder BioSystems: a seeded OVERDUE invoice no other test file writes to.
const INVOICE_ID = "inv_2003";
const PAID_INVOICE_ID = "inv_1042";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (id: string, body: unknown) =>
  recordPayment(
    new Request(`http://localhost/api/invoices/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params(id),
  );

type InvoiceSnapshot = { id: string; status: string; paidOn: Date | null };
let snapshots: InvoiceSnapshot[] = [];

beforeEach(async () => {
  snapshots = await prisma.invoice.findMany({
    where: { id: { in: [INVOICE_ID, PAID_INVOICE_ID] } },
    select: { id: true, status: true, paidOn: true },
  });
});

afterEach(async () => {
  const ids = [INVOICE_ID, PAID_INVOICE_ID];
  await prisma.activity.deleteMany({ where: { invoiceId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } });
  for (const snapshot of snapshots) {
    await prisma.invoice.update({
      where: { id: snapshot.id },
      data: { status: snapshot.status, paidOn: snapshot.paidOn },
    });
  }
});

describe("POST /api/invoices/[id]/payments", () => {
  it("records the full outstanding balance, marks the invoice paid, and logs the activity", async () => {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: INVOICE_ID } });
    expect(invoice.status).toBe("OVERDUE");

    const response = await post(INVOICE_ID, { method: "ach" });
    expect(response.status).toBe(201);

    const after = await prisma.invoice.findUniqueOrThrow({
      where: { id: INVOICE_ID },
      include: { payments: true, activities: true },
    });
    expect(after.status).toBe("PAID");
    expect(after.paidOn?.toISOString()).toBe(DEMO_AS_OF.toISOString());
    expect(after.payments).toHaveLength(1);
    expect(after.payments[0]).toMatchObject({
      amountCents: invoice.totalCents,
      method: "ach",
      recordedBy: "Avery Quinn",
    });
    expect(Object.values(PLAN_PRICE_CENTS)).toContain(after.payments[0].amountCents);
    expect(after.activities).toHaveLength(1);
    expect(after.activities[0]).toMatchObject({
      type: "PAYMENT_RECORDED",
      status: "recorded",
      actorName: "Avery Quinn",
      amountCents: invoice.totalCents,
      method: "ach",
      customerId: invoice.customerId,
    });
  });

  it("returns 400 and leaves the status alone when nothing is outstanding", async () => {
    const response = await post(PAID_INVOICE_ID, { method: "check" });
    expect(response.status).toBe(400);

    const after = await prisma.invoice.findUniqueOrThrow({
      where: { id: PAID_INVOICE_ID },
      include: { payments: true },
    });
    expect(after.status).toBe("PAID");
    expect(after.payments).toHaveLength(0);
  });

  it("returns 400 and stores nothing when amountCents is not the outstanding balance", async () => {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: INVOICE_ID } });
    for (const amountCents of [invoice.totalCents - 100, invoice.totalCents + 100, "all"]) {
      const response = await post(INVOICE_ID, { method: "cash", amountCents });
      expect(response.status).toBe(400);
    }

    const after = await prisma.invoice.findUniqueOrThrow({
      where: { id: INVOICE_ID },
      include: { payments: true, activities: true },
    });
    expect(after.status).toBe("OVERDUE");
    expect(after.payments).toHaveLength(0);
    expect(after.activities).toHaveLength(0);
  });

  it("rejects a method outside check, ach, card_on_file, and cash", async () => {
    const response = await post(INVOICE_ID, { method: "wire" });
    expect(response.status).toBe(400);
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: INVOICE_ID } });
    expect(after.status).toBe("OVERDUE");
  });
});
