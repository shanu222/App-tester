import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { paymentStatusTone, PAYMENT_STATUS_LABELS } from "@/lib/managed-testing/labels";
import type { ManagedPaymentStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";

type PaymentRow = {
  publicId: string;
  packageName: string;
  amountLabel: string;
  methodLabel: string | null;
  status: string;
  transactionReference: string;
  developerReference: string | null;
  createdAt: string;
  campaignPublicId: string | null;
  active?: boolean;
};

type ActivePackage = {
  packageName: string;
  testerCount: number;
  campaignPublicId: string | null;
  assigned: number;
  remaining: number;
} | null;

export function PaymentsPackagesPanel({
  payments,
  activePackage,
  allocation,
}: {
  payments: PaymentRow[];
  activePackage: ActivePackage;
  allocation: { purchased: number; assigned: number; remaining: number };
}) {
  return (
    <Card id="payments-packages" className="scroll-mt-6">
      <CardHeader
        title="Payments & Packages"
        description="Managed testing purchases stay inactive until TestLoop approves the payment."
        action={
          <Link href="/managed-testing">
            <Button variant="secondary" size="sm">
              View packages
            </Button>
          </Link>
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-control border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">Active package</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{activePackage?.packageName || "None"}</p>
        </div>
        <div className="rounded-control border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">Testers purchased</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{allocation.purchased}</p>
        </div>
        <div className="rounded-control border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">Remaining allocation</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{allocation.remaining}</p>
        </div>
      </div>
      {payments.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No package payments yet.</p>
      ) : (
        <TableWrap className="mt-5">
          <Table>
            <thead>
              <tr>
                <Th>Package</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Reference</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <Tr key={row.publicId}>
                  <Td className="font-medium">{row.packageName}</Td>
                  <Td>{row.amountLabel}</Td>
                  <Td>{row.methodLabel || "—"}</Td>
                  <Td>{formatDateTime(row.createdAt)}</Td>
                  <Td>
                    <Badge tone={paymentStatusTone(row.status as ManagedPaymentStatus)}>
                      {PAYMENT_STATUS_LABELS[row.status as ManagedPaymentStatus] || row.status}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs">{row.developerReference || row.transactionReference}</Td>
                  <Td>
                    <Link className="text-sm font-medium text-brand hover:underline" href={`/managed-testing/payments/${row.publicId}`}>
                      View details
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}
