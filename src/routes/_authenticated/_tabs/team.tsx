import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Share2, UserPlus, Users } from "lucide-react";
import { EmptyState, PageHeader, Panel, PanelTitle, Stat } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { dashboardQuery, meQuery, referralsQuery } from "@/lib/queries";
import { formatDateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_tabs/team")({
  head: () => ({
    meta: [
      { title: "Team — AdSelect" },
      { name: "description", content: "Invite friends to AdSelect with your referral link and track your rewards." },
      { property: "og:title", content: "Team — AdSelect" },
      { property: "og:description", content: "Invite friends to AdSelect and earn referral rewards." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(dashboardQuery),
      context.queryClient.ensureQueryData(referralsQuery),
    ]),
  component: TeamPage,
});

function TeamPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: dash } = useSuspenseQuery(dashboardQuery);
  const { data: refs } = useSuspenseQuery(referralsQuery);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/register?ref=${me.profile.referral_code}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  }
  async function share() {
    const text = `Join me on AdSelect and earn daily rewards. Use my code ${me.profile.referral_code}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "AdSelect", text, url: link });
      } catch {
        /* cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Team" subtitle={`Earn ${money(dash.referral_reward)} for every friend who joins with your link.`} />

      <Panel className="border-gold/25 bg-card-gradient">
        <PanelTitle icon={<UserPlus />}>Your referral link</PanelTitle>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2 pl-4">
          <p className="min-w-0 flex-1 truncate text-sm tabular">{link}</p>
          <Button size="icon" variant="surface" onClick={copy} aria-label="Copy link">
            <Copy />
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Code <span className="font-bold tracking-[0.2em] text-gold">{me.profile.referral_code}</span>
          </p>
          <Button variant="gold" onClick={share}>
            <Share2 /> Invite friends
          </Button>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total referrals" value={dash.referral_count} />
        <Stat label="Referral rewards" value={money(dash.referral_earnings)} tone="gold" />
      </div>

      <Panel>
        <PanelTitle icon={<Users />}>Your team</PanelTitle>
        {refs.length === 0 ? (
          <EmptyState icon={<Users />} title="No referrals yet" body="Share your link — friends appear here as soon as they sign up." />
        ) : (
          <ul className="divide-y divide-border">
            {refs.map((r) => (
              <li key={r.username} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-raised font-bold text-gold">
                    {r.username.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold">@{r.username}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-success">Joined</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
