import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { overdueBook, outstandingCents } from "@/lib/collections";
import { getCustomers } from "@/lib/data";
import { formatUsd, sumCents } from "@/lib/money";
import { isPlanId, planLabel } from "@/lib/plans";

export const metadata = {
  title: "Customers",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Accounts"
        title="Customers"
        description="Every account in the Fieldnote book. Open one to work its overdue invoices."
      />

      <Card className="overflow-hidden py-0">
        <CardContent className="px-0 py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Overdue invoices</TableHead>
                <TableHead className="text-right">Overdue balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const overdue = overdueBook(customer.invoices);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{customer.contactName}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isPlanId(customer.plan) ? planLabel(customer.plan) : customer.plan}
                    </TableCell>
                    <TableCell className="text-right">{overdue.length}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUsd(sumCents(overdue.map(outstandingCents)))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
