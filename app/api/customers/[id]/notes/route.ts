import { NextResponse } from "next/server";
import { DEMO_AS_OF } from "@/lib/clock";
import { DEMO_OPERATOR } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "A note needs a body." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  let invoiceId: string | null = null;
  if (payload.invoiceId !== undefined && payload.invoiceId !== null && payload.invoiceId !== "") {
    if (typeof payload.invoiceId !== "string") {
      return NextResponse.json({ error: "invoiceId must be a string." }, { status: 400 });
    }
    const invoice = await prisma.invoice.findFirst({
      where: { id: payload.invoiceId, customerId: customer.id },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "That invoice is not on this account." }, { status: 400 });
    }
    invoiceId = invoice.id;
  }

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.collectionNote.create({
      data: { customerId: customer.id, invoiceId, authorName: DEMO_OPERATOR.name, body },
    });
    await tx.activity.create({
      data: {
        customerId: customer.id,
        invoiceId,
        type: "NOTE_ADDED",
        status: "recorded",
        actorName: DEMO_OPERATOR.name,
        occurredOn: DEMO_AS_OF,
        noteId: created.id,
      },
    });
    return created;
  });

  return NextResponse.json({ note }, { status: 201 });
}
