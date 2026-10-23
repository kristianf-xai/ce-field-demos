import { afterEach, describe, expect, it } from "vitest";
import { POST as sendNudge } from "@/app/api/invoices/[id]/nudge/route";
import { formatDate } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { prisma } from "@/lib/prisma";

// Blue Harbor Bank: a seeded OVERDUE invoice no other test file writes to.
const INVOICE_ID = "inv_2009";
const CUSTOMER_ID = "cus_blueharbor";
const PAID_INVOICE_ID = "inv_1044";

const post = (id: string) =>
  sendNudge(new Request(`http://localhost/api/invoices/${id}/nudge`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

afterEach(async () => {
  await prisma.activity.deleteMany({ where: { invoiceId: { in: [INVOICE_ID, PAID_INVOICE_ID] } } });
});

describe("POST /api/invoices/[id]/nudge", () => {
  it("logs NUDGE_SENT as sent by email from Avery Quinn with the fixed template", async () => {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: INVOICE_ID },
      include: { customer: true },
    });

    const response = await post(INVOICE_ID);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ status: "sent", recipient: invoice.customer.email });

    const activities = await prisma.activity.findMany({ where: { invoiceId: INVOICE_ID } });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      customerId: CUSTOMER_ID,
      type: "NUDGE_SENT",
      status: "sent",
      channel: "email",
      actorName: "Avery Quinn",
    });
    expect(activities[0].detail).toContain(invoice.number);
    expect(activities[0].detail).toContain(formatUsd(invoice.totalCents));
    expect(activities[0].detail).toContain(formatDate(invoice.dueOn));
  });

  it("refuses an invoice that is not overdue and logs nothing", async () => {
    const response = await post(PAID_INVOICE_ID);
    expect(response.status).toBe(400);
    expect(await prisma.activity.count({ where: { invoiceId: PAID_INVOICE_ID } })).toBe(0);
  });
});
