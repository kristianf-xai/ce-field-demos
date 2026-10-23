"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { DisputeStatusBadge } from "@/components/status-badge";

export type OpenDisputeNotice = {
  id: string;
  customerName: string;
  invoiceNumber: string;
  status: string;
};

export function NoticeBell({
  openDisputeCount,
  openDisputes,
}: {
  openDisputeCount: number;
  openDisputes: OpenDisputeNotice[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // The focused link unmounts with the panel, so focus would fall to body.
      const focusInPanel = panel.current?.contains(document.activeElement) ?? false;
      setOpen(false);
      if (focusInPanel) trigger.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open exceptions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-5" />
        {openDisputeCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
        ) : null}
      </button>
      {open ? (
        <div
          ref={panel}
          className="absolute top-11 right-0 z-30 w-80 rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-[var(--shadow-card)]"
        >
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Open exceptions
          </p>
          {openDisputes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No open disputes in this book.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {openDisputes.map((dispute) => (
                <li key={dispute.id}>
                  <Link
                    href={`/disputes/${dispute.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <span>
                      <span className="block text-sm font-medium">{dispute.customerName}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {dispute.invoiceNumber} · {dispute.id}
                      </span>
                    </span>
                    <DisputeStatusBadge status={dispute.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/disputes"
            onClick={() => setOpen(false)}
            className="mt-2 inline-block px-2 text-xs font-medium text-indigo hover:underline"
          >
            Dispute queue →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
