"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/lib/collections";

export function RecordPayment({
  invoiceId,
  invoiceNumber,
  amountLabel,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("check");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "The payment was not recorded.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="space-y-3" role="alertdialog" aria-labelledby="record-payment-confirm">
        <p id="record-payment-confirm" className="text-sm font-medium">
          Record {amountLabel} payment against {invoiceNumber}?
        </p>
        <p className="text-xs text-muted-foreground">
          Method: {PAYMENT_METHOD_LABEL[method]}. The full outstanding balance is recorded.
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={commit} disabled={pending}>
            {pending ? "Recording…" : "Confirm payment"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="payment-method">Payment method</Label>
        <select
          id="payment-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          {PAYMENT_METHODS.map((id) => (
            <option key={id} value={id}>
              {PAYMENT_METHOD_LABEL[id]}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={() => setConfirming(true)}>
        Record payment
      </Button>
    </div>
  );
}
