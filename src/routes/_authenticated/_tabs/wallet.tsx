import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Receipt } from "lucide-react";
import { CashOutDialog } from "@/components/app/CashOutDialog";
import { PrimaryBalanceSync } from "@/components/app/PrimaryBalanceSync";
import { EmptyState, PageHeader, Panel, PanelTitle, Stat, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { balanceSyncsQuery, dashboardQuery, ledgerQuery, meQuery, withdrawalsQuery } from "@/lib/queries";
import { formatDateTime, formatPhone, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_tabs/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — AdSelect" },
      { name: "description", content: "Your AdSelect balance, earnings and M-Pesa withdrawal history." },
      { property: "og:title", content: "Wallet — AdSelect" },
      { property: "og:description", content: "Your AdSelect balance, earnings and withdrawal history." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dashboardQuery),
      context.queryClient.ensureQueryData(withdrawalsQuery),
      context.queryClient.ensureQueryData(ledgerQuery),
      context.queryClient.ensureQueryData(balanceSyncsQuery),
      context.queryClient.ensureQueryData(meQuery),
    ]),
  component: WalletPage,
});

const filters = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
] as const;

function WalletPage() {
  const { data: dash } = useSuspenseQuery(dashboardQuery);
  const { data: withdrawals } = useSuspenseQuery(withdrawalsQuery);
  const { data: ledger } = useSuspenseQuery(ledgerQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");

  const shown = withdrawals.filter((w) =>
    filter === "all" ? true : filter === "pending" ? w.status === "pending" || w.status === "approved" : w.status === "completed",
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Wallet" />

      <Panel className="border-gold/25 bg-card-gradient">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Available balance</p>
        <p className="mt-1 font-display text-5xl font-semibold text-gold-gradient tabular">{money(dash.balance)}</p>
        <CashOutDialog
          balance={Number(dash.balance)}
          minWithdrawal={Number(dash.min_withdrawal)}
          trigger={(open) => (
            <Button variant="light" size="xl" className="mt-5 w-full" onClick={open}>
              Cash out <ArrowUpRight />
            </Button>
          )}
        />
      </Panel>

      <PrimaryBalanceSync userId={me.user.id} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total earned" value={money(dash.total_earned)} />
        <Stat label="Withdrawn" value={money(dash.total_withdrawn)} />
        <Stat label="Pending" value={money(dash.pending_withdrawals)} />
      </div>

      <Panel>
        <PanelTitle icon={<Receipt />}>Withdrawals</PanelTitle>
        <div className="mb-4 flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors",
                filter === f.key ? "bg-gold text-primary-foreground" : "bg-surface-raised text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={<Receipt />} title="No withdrawals here yet" />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold tabular">{money(w.amount)} · <span className="text-muted-foreground">{formatPhone(w.phone)}</span></p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.tx_id} · {formatDateTime(w.created_at)}
                  </p>
                  {w.admin_note && w.status !== "pending" && <p className="text-xs text-muted-foreground/80">{w.admin_note}</p>}
                </div>
                <StatusBadge status={w.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelTitle icon={<History />}>Transaction history</PanelTitle>
        {ledger.length === 0 ? (
          <EmptyState icon={<History />} title="No transactions yet" body="Claim your daily bonus to get started." />
        ) : (
          <ul className="divide-y divide-border">
            {ledger.map((l) => {
              const credit = Number(l.amount) >= 0;
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", credit ? "bg-success/15 text-success" : "bg-surface-raised text-muted-foreground")}>
                      {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{l.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 font-semibold tabular", credit ? "text-success" : "text-foreground")}>
                    {credit ? "+" : "−"}
                    {money(Math.abs(Number(l.amount)))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
