import { NextResponse } from "next/server";
import { canEditNote } from "@/lib/collections";
import { DEMO_OPERATOR } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";

/** Body-only edits inside the window. There is no DELETE: notes are the audit trail. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const note = await prisma.collectionNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (!canEditNote(note, DEMO_OPERATOR.name)) {
    return NextResponse.json(
      { error: "Notes can only be edited by their author within 15 minutes of saving." },
      { status: 403 },
    );
  }

  const updated = await prisma.collectionNote.update({ where: { id }, data: { body } });
  return NextResponse.json({ note: updated });
}
