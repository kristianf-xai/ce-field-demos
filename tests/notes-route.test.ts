import { afterEach, describe, expect, it } from "vitest";
import { POST as saveNote } from "@/app/api/customers/[id]/notes/route";
import { prisma } from "@/lib/prisma";

// Northstar Fabrication: a seeded account no other test file writes notes or activity to.
const CUSTOMER_ID = "cus_northstarfab";
const INVOICE_ID = "inv_2001";

const post = (customerId: string, body: unknown) =>
  saveNote(
    new Request(`http://localhost/api/customers/${customerId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: customerId }) },
  );

const feed = () =>
  prisma.activity.findMany({
    where: { customerId: CUSTOMER_ID },
    include: { note: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

afterEach(async () => {
  await prisma.activity.deleteMany({ where: { customerId: CUSTOMER_ID } });
  await prisma.collectionNote.deleteMany({ where: { customerId: CUSTOMER_ID } });
});

describe("POST /api/customers/[id]/notes", () => {
  it("saves the note first in the feed, attributed to Avery Quinn, with a NOTE_ADDED activity", async () => {
    expect(await feed()).toHaveLength(0);

    const first = await post(CUSTOMER_ID, { body: "Left a voicemail for accounts payable." });
    expect(first.status).toBe(201);
    const second = await post(CUSTOMER_ID, { body: "  Promised to pay by Friday.  " });
    expect(second.status).toBe(201);

    const activities = await feed();
    expect(activities).toHaveLength(2);
    expect(activities[0]).toMatchObject({ type: "NOTE_ADDED", actorName: "Avery Quinn", invoiceId: null });
    expect(activities[0].note).toMatchObject({
      authorName: "Avery Quinn",
      body: "Promised to pay by Friday.",
    });
    expect(activities[0].note?.createdAt).toBeInstanceOf(Date);
  });

  it("returns 400 for a blank body and leaves the feed unchanged", async () => {
    for (const body of ["", "   ", undefined]) {
      const response = await post(CUSTOMER_ID, { body });
      expect(response.status).toBe(400);
    }
    expect(await feed()).toHaveLength(0);
    expect(await prisma.collectionNote.count({ where: { customerId: CUSTOMER_ID } })).toBe(0);
  });

  it("ties the note to an invoice on the account and refuses another account's invoice", async () => {
    const response = await post(CUSTOMER_ID, { body: "Asked about INV-2001.", invoiceId: INVOICE_ID });
    expect(response.status).toBe(201);
    const [activity] = await feed();
    expect(activity.invoiceId).toBe(INVOICE_ID);
    expect(activity.note?.invoiceId).toBe(INVOICE_ID);

    const foreign = await post(CUSTOMER_ID, { body: "Wrong account.", invoiceId: "inv_1043" });
    expect(foreign.status).toBe(400);
    expect(await feed()).toHaveLength(1);
  });
});
