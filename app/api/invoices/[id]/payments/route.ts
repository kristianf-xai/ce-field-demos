import { NextResponse } from "next/server";
import { DEMO_AS_OF } from "@/lib/clock";
import { isPaymentMethod, outstandingCents, PAYMENT_METHODS } from "@/lib/collections";
import { DEMO_OPERATOR } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (!isPaymentMethod(body.method)) {
    return NextResponse.json(
      { error: `method must be one of ${PAYMENT_METHODS.join(", ")}.` },
      { status: 400 },
    );
  }
  const method = body.method;

  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const amountCents = outstandingCents(invoice);
  if (amountCents <= 0) {
    return NextResponse.json(
      { error: `${invoice.number} has no outstanding balance.` },
      { status: 400 },
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents,
        method,
        recordedBy: DEMO_OPERATOR.name,
        recordedAt: DEMO_AS_OF,
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidOn: DEMO_AS_OF },
    });
    await tx.activity.create({
      data: {
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        type: "PAYMENT_RECORDED",
        status: "recorded",
        actorName: DEMO_OPERATOR.name,
        occurredOn: DEMO_AS_OF,
        amountCents,
        method,
      },
    });
    return created;
  });

  return NextResponse.json(
    { payment, invoice: { id: invoice.id, number: invoice.number, status: "PAID", paidOn: DEMO_AS_OF } },
    { status: 201 },
  );
}
