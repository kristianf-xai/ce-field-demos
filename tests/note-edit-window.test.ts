import { afterEach, describe, expect, it } from "vitest";
import * as noteRoute from "@/app/api/notes/[id]/route";
import { NOTE_EDIT_WINDOW_MS } from "@/lib/collections";
import { prisma } from "@/lib/prisma";

// North Star Logistics: a seeded account no other test file writes notes to.
const CUSTOMER_ID = "cus_northstarlog";

const patch = (id: string, body: unknown) =>
  noteRoute.PATCH(
    new Request(`http://localhost/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

const createNote = (data: { authorName?: string; createdAt?: Date } = {}) =>
  prisma.collectionNote.create({
    data: {
      customerId: CUSTOMER_ID,
      authorName: data.authorName ?? "Avery Quinn",
      body: "Original note.",
      createdAt: data.createdAt ?? new Date(),
    },
  });

afterEach(async () => {
  await prisma.collectionNote.deleteMany({ where: { customerId: CUSTOMER_ID } });
});

describe("PATCH /api/notes/[id]", () => {
  it("saves a new body on Avery Quinn's note inside 15 minutes", async () => {
    const note = await createNote({ createdAt: new Date(Date.now() - NOTE_EDIT_WINDOW_MS + 60_000) });
    const response = await patch(note.id, { body: "Corrected: promised to pay Monday." });
    expect(response.status).toBe(200);
    const after = await prisma.collectionNote.findUniqueOrThrow({ where: { id: note.id } });
    expect(after.body).toBe("Corrected: promised to pay Monday.");
  });

  it("returns 403 and keeps the body after 15 minutes or for another author", async () => {
    const stale = await createNote({ createdAt: new Date(Date.now() - NOTE_EDIT_WINDOW_MS - 1_000) });
    const other = await createNote({ authorName: "Another operator" });

    for (const note of [stale, other]) {
      const response = await patch(note.id, { body: "Rewritten." });
      expect(response.status).toBe(403);
      const after = await prisma.collectionNote.findUniqueOrThrow({ where: { id: note.id } });
      expect(after.body).toBe("Original note.");
    }
  });

  it("offers no delete route", () => {
    expect("DELETE" in noteRoute).toBe(false);
  });
});
