import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/Logo";
import { Stat } from "@/components/app/ui";
import {
  ActivitiesPanel,
  NotificationsPanel,
  SettingsPanel,
  TransactionsPanel,
  UsersPanel,
  WithdrawalsPanel,
  adminUsersQuery,
  adminWithdrawalsQuery,
} from "@/components/admin/AdminPanels";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Admin — AdSelect" },
      { name: "description", content: "AdSelect administrator dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const tabs = [
  { key: "withdrawals", label: "Withdrawals" },
  { key: "users", label: "Users" },
  { key: "transactions", label: "Transactions" },
  { key: "activities", label: "Activities" },
  { key: "settings", label: "Daily bonus" },
  { key: "notifications", label: "Notifications" },
] as const;

function AdminPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("withdrawals");
  const { data: users } = useQuery(adminUsersQuery);
  const { data: withdrawals } = useQuery(adminWithdrawalsQuery);
  const open = (withdrawals ?? []).filter((w) => w.status === "pending" || w.status === "approved");
  const liabilities = (users ?? []).reduce((s, u) => s + Number(u.balance), 0);
  const paid = (withdrawals ?? []).filter((w) => w.status === "completed").reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16 pt-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Admin</span>
        </div>
        <Link to="/me" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={users?.length ?? "—"} />
        <Stat label="Open withdrawals" value={`${open.length} · ${money(open.reduce((s, w) => s + Number(w.amount), 0))}`} tone="gold" />
        <Stat label="User balances" value={money(liabilities)} />
        <Stat label="Paid out" value={money(paid)} />
      </div>

      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors",
              tab === t.key ? "bg-gold-gradient text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "withdrawals" && <WithdrawalsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "transactions" && <TransactionsPanel />}
      {tab === "activities" && <ActivitiesPanel />}
      {tab === "settings" && <SettingsPanel />}
      {tab === "notifications" && <NotificationsPanel />}
    </div>
  );
}
