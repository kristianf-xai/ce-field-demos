"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({
  customerId,
  invoices,
}: {
  customerId: string;
  invoices: { id: string; number: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, invoiceId: invoiceId || undefined }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "The note was not saved.");
        return;
      }
      setBody("");
      setInvoiceId("");
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      <div className="space-y-1.5">
        <Label htmlFor="account-note">Collection note</Label>
        <Textarea
          id="account-note"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Promise to pay, dispute context, who you spoke with."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-note-invoice">Invoice (optional)</Label>
        <select
          id="account-note-invoice"
          value={invoiceId}
          onChange={(event) => setInvoiceId(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <option value="">Whole account</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.number}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}
