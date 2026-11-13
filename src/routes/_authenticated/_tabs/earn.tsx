import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Coins, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { activitiesQuery, dashboardQuery } from "@/lib/queries";
import { formatDuration, money } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/_authenticated/_tabs/earn")({
  head: () => ({
    meta: [
      { title: "Earn — AdSelect" },
      { name: "description", content: "Complete approved AdSelect activities and earn rewards." },
      { property: "og:title", content: "Earn — AdSelect" },
      { property: "og:description", content: "Complete approved AdSelect activities and earn rewards." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(activitiesQuery),
      context.queryClient.ensureQueryData(dashboardQuery),
    ]),
  component: EarnPage,
});

type Session = { session_id: string; started_at: string; duration_seconds: number };

function EarnPage() {
  const { data: activities } = useSuspenseQuery(activitiesQuery);
  const { data: dash } = useSuspenseQuery(dashboardQuery);
  const available = activities.filter((a) => !a.claimed_today);
  const potential = available.reduce((s, a) => s + Number(a.reward), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Earn" subtitle="Open an activity, stay for the timer, then claim your reward. Each one resets daily." />
      <div className="grid grid-cols-2 gap-3 animate-rise">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Earned today</p>
          <p className="mt-1 font-display text-2xl font-semibold text-gold-gradient tabular">{money(dash.earned_today)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Still available</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular">{money(potential)}</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <Panel>
          <EmptyState icon={<Sparkles />} title="No activities right now" body="New earning activities are added regularly. Check back soon." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
}: {
  activity: { id: string; title: string; description: string; url: string | null; reward: number; duration_seconds: number; claimed_today: boolean };
}) {
  const qc = useQueryClient();
  const now = useNow(500);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = session
    ? new Date(session.started_at).getTime() + session.duration_seconds * 1000 - now
    : activity.duration_seconds * 1000;
  const ready = session && remaining <= 0;

  async function start() {
    if (busy) return;
    if (activity.url) window.open(activity.url, "_blank", "noopener,noreferrer");
    setBusy(true);
    const { data, error } = await supabase.rpc("start_activity", { _activity_id: activity.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSession(data as unknown as Session);
  }

  async function claim() {
    if (!session || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_activity", { _session_id: session.session_id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`+${money((data as { amount: number }).amount)} earned`);
    qc.invalidateQueries({ queryKey: ["activities-today"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  }

  const pct = session ? Math.min(100, 100 - (Math.max(remaining, 0) / (session.duration_seconds * 1000)) * 100) : 0;

  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-sans text-base font-bold">{activity.title}</h3>
            {activity.description && <p className="mt-0.5 text-sm text-muted-foreground">{activity.description}</p>}
          </div>
        </div>
        <span className="shrink-0 font-display text-2xl font-semibold text-gold-gradient tabular">+{money(activity.reward)}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> {activity.duration_seconds}s timer
      </div>
      {session && !activity.claimed_today && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full bg-gold-gradient transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mt-4">
        {activity.claimed_today ? (
          <Button variant="surface" className="w-full" disabled>
            <CheckCircle2 className="text-success" /> Completed today
          </Button>
        ) : ready ? (
          <Button variant="gold" className="w-full" onClick={claim} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Claim {money(activity.reward)}
          </Button>
        ) : session ? (
          <Button variant="surface" className="w-full" disabled>
            <Loader2 className="animate-spin" /> {formatDuration(remaining)}
          </Button>
        ) : (
          <Button variant="light" className="w-full" onClick={start} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : activity.url ? <ExternalLink /> : null} Start activity
          </Button>
        )}
      </div>
    </Panel>
  );
}
