import { NoteEditor } from "@/components/collections/note-editor";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_LABEL, isPaymentMethod, PAYMENT_METHOD_LABEL } from "@/lib/collections";
import { formatDate, formatTime } from "@/lib/dates";
import { formatUsd } from "@/lib/money";

export type FeedActivity = {
  id: string;
  type: string;
  status: string;
  actorName: string;
  occurredOn: Date;
  createdAt: Date;
  amountCents: number | null;
  method: string | null;
  channel: string | null;
  detail: string | null;
  invoice: { number: string } | null;
  note: { id: string; body: string; authorName: string; createdAt: Date; updatedAt: Date } | null;
};

export function ActivityFeed({
  activities,
  editableNoteIds = [],
}: {
  activities: FeedActivity[];
  editableNoteIds?: string[];
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No collections activity on this account yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="rounded-lg border border-border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {ACTIVITY_LABEL[activity.type] ?? activity.type}
              {activity.invoice ? (
                <span className="font-mono text-xs text-muted-foreground"> · {activity.invoice.number}</span>
              ) : null}
            </p>
            <Badge variant={activity.status === "failed" ? "danger" : "muted"}>{activity.status}</Badge>
          </div>
          <ActivityDetail activity={activity} />
          {activity.note && editableNoteIds.includes(activity.note.id) ? (
            <NoteEditor noteId={activity.note.id} body={activity.note.body} />
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {activity.actorName} · {formatDate(activity.occurredOn)} ·{" "}
            <time dateTime={activity.createdAt.toISOString()}>{formatTime(activity.createdAt)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}

function ActivityDetail({ activity }: { activity: FeedActivity }) {
  if (activity.type === "NOTE_ADDED" && activity.note) {
    return <p className="mt-1 text-sm whitespace-pre-line">{activity.note.body}</p>;
  }
  if (activity.type === "PAYMENT_RECORDED" && activity.amountCents !== null) {
    const method = isPaymentMethod(activity.method) ? PAYMENT_METHOD_LABEL[activity.method] : activity.method;
    return (
      <p className="mt-1 text-sm">
        {formatUsd(activity.amountCents)} by {method}
      </p>
    );
  }
  if (activity.type === "NUDGE_SENT") {
    return (
      <div className="mt-1 space-y-1 text-sm">
        <p className="text-xs text-muted-foreground">Channel: {activity.channel ?? "email"}</p>
        {activity.detail ? <p className="whitespace-pre-line">{activity.detail}</p> : null}
      </div>
    );
  }
  return activity.detail ? <p className="mt-1 text-sm whitespace-pre-line">{activity.detail}</p> : null;
}
