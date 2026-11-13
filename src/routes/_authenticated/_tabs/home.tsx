import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, CalendarCheck, Gift, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccountCard } from "@/components/app/AccountCard";
import { EmptyState, Panel, PanelTitle, Stat } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { dashboardQuery, meQuery, notificationsQuery, type Dashboard } from "@/lib/queries";
import { displayNameFromEmail, formatDateTime, formatDuration, money } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_tabs/home")({
  head: () => ({
    meta: [
      { title: "Home — AdSelect" },
      { name: "description", content: "Your AdSelect balance, daily bonus streak and notifications." },
      { property: "og:title", content: "Home — AdSelect" },
      { property: "og:description", content: "Your AdSelect balance, daily bonus streak and notifications." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(dashboardQuery),
      context.queryClient.ensureQueryData(notificationsQuery),
    ]),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: dash } = useSuspenseQuery(dashboardQuery);
  const { data: notes } = useSuspenseQuery(notificationsQuery);
  const name = displayNameFromEmail(me.user.email);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between animate-rise">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Welcome back</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Hello, <span className="text-gold-gradient">{name}</span>
          </h1>
        </div>
        <Link to="/me" className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient font-display text-xl font-bold text-primary-foreground shadow-gold">
          {name.charAt(0)}
        </Link>
      </header>

      <AccountCard name={name} memberId={me.profile.member_id} balance={Number(dash.balance)} minWithdrawal={Number(dash.min_withdrawal)} />

      <div className="grid gap-5 md:grid-cols-2">
        <DailyBonus dash={dash} />
        <Panel>
          <PanelTitle icon={<TrendingUp />}>Earned today</PanelTitle>
          <p className="font-display text-4xl font-semibold text-gold-gradient tabular">{money(dash.earned_today)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Total earned" value={money(dash.total_earned)} />
            <Stat label="Pending payout" value={money(dash.pending_withdrawals)} />
          </div>
          <Button asChild variant="surface" className="mt-4 w-full">
            <Link to="/earn">Find more activities</Link>
          </Button>
        </Panel>
      </div>

      <Panel>
        <PanelTitle icon={<Bell />}>Notifications</PanelTitle>
        {notes.length === 0 ? (
          <EmptyState icon={<Bell />} title="You're all caught up" />
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{formatDateTime(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DailyBonus({ dash }: { dash: Dashboard }) {
  const qc = useQueryClient();
  const now = useNow();
  const [claiming, setClaiming] = useState(false);
  const nextAt = dash.next_claim_at ? new Date(dash.next_claim_at).getTime() : null;
  const remaining = nextAt ? nextAt - now : 0;
  const canClaim = dash.bonus_enabled && (dash.can_claim || (nextAt !== null && remaining <= 0));

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_daily_bonus");
    setClaiming(false);
    if (error) toast.error(error.message);
    else {
      const r = data as { day: number; amount: number };
      toast.success(`Day ${r.day} bonus claimed: +${money(r.amount)}`);
    }
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  }

  const total = dash.streak_days;
  const progress = Math.min(dash.streak_day, total);

  return (
    <Panel>
      <PanelTitle
        icon={<Gift />}
        action={
          <span className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            <CalendarCheck className="h-3.5 w-3.5" /> Day {progress}/{total}
          </span>
        }
      >
        Daily bonus
      </PanelTitle>

      <div className="grid grid-cols-10 gap-1.5" aria-label={`Streak day ${progress} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-colors",
              i < progress ? "bg-gold-gradient" : i === progress ? "bg-gold/30" : "bg-surface-raised",
            )}
          />
        ))}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next bonus · Day {dash.next_day}
          </p>
          <p className="font-display text-3xl font-semibold tabular">{money(dash.next_amount)}</p>
        </div>
        {!canClaim && nextAt && remaining > 0 && (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Available in</p>
            <p className="font-mono text-xl font-semibold text-gold tabular">{formatDuration(remaining)}</p>
          </div>
        )}
      </div>

      <Button variant="gold" size="lg" className="mt-4 w-full" disabled={!canClaim || claiming} onClick={claim}>
        {claiming && <Loader2 className="animate-spin" />}
        {!dash.bonus_enabled ? "Bonus paused" : canClaim ? "Claim daily bonus" : "Claimed today"}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Miss a day and your streak restarts at Day 1.</p>
    </Panel>
  );
}
