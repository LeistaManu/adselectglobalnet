import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, PanelTitle } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meQuery } from "@/lib/queries";
import { displayNameFromEmail, formatDateTime, memberCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_tabs/me")({
  head: () => ({
    meta: [
      { title: "My account — AdSelect" },
      { name: "description", content: "Your AdSelect profile, account details and settings." },
      { property: "og:title", content: "My account — AdSelect" },
      { property: "og:description", content: "Your AdSelect profile, account details and settings." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: MePage,
});

function MePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(me.profile.full_name);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const name = displayNameFromEmail(me.user.email);

  async function saveName() {
    setSaving(true);
    const { error } = await supabase.rpc("update_my_name", { _full_name: fullName });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function sendReset() {
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(me.profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) toast.error(error.message);
    else toast.success(`Password reset link sent to ${me.profile.email}`);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const rows: [string, string][] = [
    ["User ID", memberCode(me.profile.member_id)],
    ["Username", `@${me.profile.username}`],
    ["Email", me.profile.email],
    ["Full name", me.profile.full_name],
    ["Referral code", me.profile.referral_code],
    ["Member since", formatDateTime(me.profile.created_at)],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Me" />

      <Panel className="flex items-center gap-4 border-gold/25 bg-card-gradient">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gold-gradient font-display text-3xl font-bold text-primary-foreground shadow-gold">
          {name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{me.profile.email}</p>
          <p className="text-xs tracking-[0.2em] text-gold">{memberCode(me.profile.member_id)}</p>
        </div>
      </Panel>

      <Panel>
        <PanelTitle icon={<UserRound />}>Account information</PanelTitle>
        <dl className="divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel>
        <PanelTitle icon={<Settings />}>Settings</PanelTitle>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <div className="flex gap-2">
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Button variant="gold" onClick={saveName} disabled={saving || fullName.trim() === me.profile.full_name} className="h-12">
              {saving && <Loader2 className="animate-spin" />} Save
            </Button>
          </div>
        </div>
        <Button variant="surface" className="mt-4 w-full" onClick={sendReset} disabled={resetting}>
          {resetting ? <Loader2 className="animate-spin" /> : <KeyRound />} Email me a password reset link
        </Button>
      </Panel>

      {me.isAdmin && (
        <Button asChild variant="gold" size="lg" className="w-full">
          <Link to="/admin">
            <ShieldCheck /> Open admin dashboard
          </Link>
        </Button>
      )}

      <Button variant="destructive" size="lg" className="w-full" onClick={signOut}>
        <LogOut /> Log out
      </Button>
    </div>
  );
}
