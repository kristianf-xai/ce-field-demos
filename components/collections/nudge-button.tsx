"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Result = { tone: "ok" | "failed"; text: string };

export function NudgeButton({
  invoiceId,
  invoiceNumber,
  label = "Nudge",
  disabled = false,
  disabledReason,
}: {
  invoiceId?: string;
  invoiceNumber?: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!invoiceId) return;
    setResult(null);
    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/nudge`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        recipient?: string;
        error?: string;
      };
      if (!response.ok) {
        setResult({ tone: "failed", text: payload.error ?? "The Nudge was not sent." });
      } else if (payload.status === "failed") {
        setResult({
          tone: "failed",
          text: `Nudge for ${invoiceNumber} failed: ${payload.error ?? "no usable email on file."}`,
        });
      } else {
        setResult({ tone: "ok", text: `Nudge for ${invoiceNumber} sent to ${payload.recipient}.` });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={send}
        disabled={disabled || !invoiceId || pending}
        title={disabled ? disabledReason : undefined}
      >
        {pending ? "Sending…" : label}
      </Button>
      {disabled && disabledReason ? <p className="text-xs text-muted-foreground">{disabledReason}</p> : null}
      {result ? (
        <p role="status" className={result.tone === "failed" ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
          {result.text}
        </p>
      ) : null}
    </div>
  );
}
