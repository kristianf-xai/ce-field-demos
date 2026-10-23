import { NextResponse } from "next/server";
import { DEMO_AS_OF } from "@/lib/clock";
import { nudgeEmailProblem, nudgeTemplate, outstandingCents } from "@/lib/collections";
import { DEMO_OPERATOR } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, payments: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status !== "OVERDUE") {
    return NextResponse.json({ error: `${invoice.number} is not overdue.` }, { status: 400 });
  }

  const recipient = invoice.customer.email.trim();
  const message = nudgeTemplate({
    contactName: invoice.customer.contactName,
    invoiceNumber: invoice.number,
    outstandingCents: outstandingCents(invoice),
    dueOn: invoice.dueOn,
    senderName: DEMO_OPERATOR.name,
    workspaceName: DEMO_OPERATOR.workspace,
  });

  const problem = nudgeEmailProblem(recipient);

  const activity = await prisma.activity.create({
    data: {
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      type: "NUDGE_SENT",
      status: problem ? "failed" : "sent",
      actorName: DEMO_OPERATOR.name,
      occurredOn: DEMO_AS_OF,
      channel: "email",
      detail: problem ? `Not sent. ${problem}\n\n${message}` : message,
    },
  });

  if (problem) {
    return NextResponse.json({ status: "failed", error: problem, recipient, activity });
  }
  return NextResponse.json({ status: "sent", recipient, activity }, { status: 201 });
}
