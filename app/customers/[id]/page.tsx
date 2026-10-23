import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/collections/activity-feed";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysPastDue, overdueBook, outstandingCents } from "@/lib/collections";
import { getCustomerAccount } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { isPlanId, planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerAccount(id);
  return { title: customer ? customer.name : "Customer" };
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerAccount(id);
  if (!customer) notFound();

  const overdue = overdueBook(customer.invoices);
  const lastActivityOn = (invoiceId: string) =>
    customer.activities.find((activity) => activity.invoiceId === invoiceId)?.occurredOn;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title={customer.name}
        description={`${customer.contactName} · ${customer.email} · ${isPlanId(customer.plan) ? planLabel(customer.plan) : customer.plan}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">All customers</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Overdue book</CardTitle>
          <CardDescription>
            OVERDUE invoices on this account, most days past due first. Aged against the 23 Aug 2026 clock.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {overdue.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted-foreground">No overdue invoices on this account.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Invoice date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Days past due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((invoice) => {
                  const lastOn = lastActivityOn(invoice.id);
                  return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-mono text-[13px] font-medium hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invoice.issuedOn)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invoice.dueOn)}</TableCell>
                    <TableCell className="text-right">{daysPastDue(invoice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUsd(outstandingCents(invoice))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lastOn ? formatDate(lastOn) : "—"}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Payments, notes, and Nudges on this account, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={customer.activities} />
        </CardContent>
      </Card>
    </div>
  );
}
