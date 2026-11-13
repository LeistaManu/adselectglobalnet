import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, Loader2, Plus, Search, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Panel, PanelTitle, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatPhone, memberCode, money } from "@/lib/format";
import { cn } from "@/lib/utils";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const adminUsersQuery = {
  queryKey: ["admin", "users"],
  queryFn: async () => unwrap(await supabase.rpc("admin_list_users")),
};

export const adminWithdrawalsQuery = {
  queryKey: ["admin", "withdrawals"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("withdrawals")
        .select("*, profiles(username, email, member_id)")
        .order("created_at", { ascending: false })
        .limit(300),
    ),
};

function Loading() {
  return (
    <div className="flex justify-center py-10 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

/* ---------------- Withdrawals ---------------- */
export function WithdrawalsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminWithdrawalsQuery);
  const [status, setStatus] = useState<string>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, next: "approved" | "completed" | "rejected") {
    let note: string | null = null;
    if (next === "rejected") {
      note = window.prompt("Reason for rejecting (shown to the user):") ?? null;
      if (note === null) return;
    }
    if (next === "completed" && !window.confirm("Confirm you have sent this M-Pesa payment?")) return;
    setBusy(id + next);
    const { error } = await supabase.rpc("admin_update_withdrawal", { _id: id, _status: next, ...(note ? { _note: note } : {}) });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${next}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const list = (data ?? []).filter((w) =>
    status === "all" ? true : status === "pending" ? w.status === "pending" || w.status === "approved" : w.status === status,
  );

  return (
    <Panel>
      <PanelTitle>Withdrawal requests</PanelTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {["pending", "completed", "rejected", "cancelled", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em]",
              status === s ? "bg-gold text-primary-foreground" : "bg-surface-raised text-muted-foreground",
            )}
          >
            {s === "pending" ? "Open" : s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon={<Check />} title="Nothing here" />
      ) : (
        <ul className="space-y-3">
          {list.map((w) => (
            <li key={w.id} className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-semibold tabular">{money(w.amount)}</p>
                  <p className="text-sm font-semibold">M-Pesa {formatPhone(w.phone)}</p>
                  <p className="text-xs text-muted-foreground">
                    @{w.profiles?.username} · {w.profiles?.email} · {w.profiles ? memberCode(w.profiles.member_id) : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.tx_id} · {formatDateTime(w.created_at)} · Telegram: {w.telegram_state}
                  </p>
                  {w.admin_note && <p className="mt-1 text-xs text-muted-foreground/80">Note: {w.admin_note}</p>}
                </div>
                <StatusBadge status={w.status} />
              </div>
              {(w.status === "pending" || w.status === "approved") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {w.status === "pending" && (
                    <Button size="sm" variant="surface" disabled={!!busy} onClick={() => update(w.id, "approved")}>
                      {busy === w.id + "approved" && <Loader2 className="animate-spin" />} Approve
                    </Button>
                  )}
                  <Button size="sm" variant="gold" disabled={!!busy} onClick={() => update(w.id, "completed")}>
                    {busy === w.id + "completed" ? <Loader2 className="animate-spin" /> : <Check />} Mark paid
                  </Button>
                  <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => update(w.id, "rejected")}>
                    {busy === w.id + "rejected" ? <Loader2 className="animate-spin" /> : <X />} Reject & refund
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Users ---------------- */
export function UsersPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminUsersQuery);
  const [q, setQ] = useState("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const list = (data ?? []).filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [u.username, u.email, u.full_name, memberCode(u.member_id)].some((v) => v.toLowerCase().includes(s));
  });

  async function adjust(e: FormEvent, userId: string) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: userId, _amount: Number(amount), _note: note });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Balance adjusted");
    setAdjusting(null);
    setAmount("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <Panel>
      <PanelTitle>Registered users ({data?.length ?? 0})</PanelTitle>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-11" placeholder="Search by name, username, email or ID" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((u) => (
            <li key={u.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {u.full_name} <span className="text-muted-foreground">@{u.username}</span>
                    {u.is_admin && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">Admin</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} · {memberCode(u.member_id)} · {u.referrals} referrals · joined {formatDateTime(u.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold text-gold-gradient tabular">{money(u.balance)}</p>
                  <button className="text-xs font-semibold text-gold hover:underline" onClick={() => setAdjusting(adjusting === u.id ? null : u.id)}>
                    Adjust
                  </button>
                </div>
              </div>
              {adjusting === u.id && (
                <form onSubmit={(e) => adjust(e, u.id)} className="mt-3 grid gap-2 rounded-2xl border border-border bg-background/40 p-3 sm:grid-cols-[120px_1fr_auto]">
                  <Input type="number" step="0.01" placeholder="+/- amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  <Input placeholder="Reason (shown in user's history)" value={note} onChange={(e) => setNote(e.target.value)} required />
                  <Button type="submit" variant="gold" className="h-12" disabled={saving}>
                    {saving && <Loader2 className="animate-spin" />} Apply
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Transactions ---------------- */
export function TransactionsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ledger"],
    queryFn: async () =>
      unwrap(await supabase.from("ledger").select("*, profiles(username)").order("created_at", { ascending: false }).limit(300)),
  });
  return (
    <Panel>
      <PanelTitle>Transaction history</PanelTitle>
      {isLoading ? (
        <Loading />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<Check />} title="No transactions yet" />
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  @{l.profiles?.username} · <span className="text-muted-foreground">{l.description}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.kind.replace("_", " ")} · {formatDateTime(l.created_at)}
                </p>
              </div>
              <span className={cn("shrink-0 font-semibold tabular", Number(l.amount) >= 0 ? "text-success" : "text-foreground")}>
                {Number(l.amount) >= 0 ? "+" : "−"}
                {money(Math.abs(Number(l.amount)))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Activities ---------------- */
export function ActivitiesPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "activities"],
    queryFn: async () => unwrap(await supabase.from("activities").select("*").order("created_at", { ascending: false })),
  });
  const [form, setForm] = useState({ title: "", description: "", url: "", reward: "0.05", duration: "30" });
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("activities").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim() || null,
      reward: Number(form.reward),
      duration_seconds: Number(form.duration),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Activity added");
    setForm({ title: "", description: "", url: "", reward: "0.05", duration: "30" });
    qc.invalidateQueries({ queryKey: ["admin", "activities"] });
    qc.invalidateQueries({ queryKey: ["activities-today"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("activities").update({ active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin", "activities"] });
    qc.invalidateQueries({ queryKey: ["activities-today"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this activity?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin", "activities"] });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle icon={<Plus />}>New earning activity</PanelTitle>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={set("title")} required maxLength={80} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={set("description")} maxLength={300} className="rounded-xl bg-surface" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Link to open (optional)</Label>
            <Input type="url" placeholder="https://..." value={form.url} onChange={set("url")} />
          </div>
          <div className="space-y-1.5">
            <Label>Reward (USD)</Label>
            <Input type="number" step="0.01" min="0" value={form.reward} onChange={set("reward")} required />
          </div>
          <div className="space-y-1.5">
            <Label>Timer (seconds)</Label>
            <Input type="number" min="5" max="3600" value={form.duration} onChange={set("duration")} required />
          </div>
          <Button type="submit" variant="gold" size="lg" className="sm:col-span-2" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Add activity
          </Button>
        </form>
      </Panel>
      <Panel>
        <PanelTitle>All activities</PanelTitle>
        {isLoading ? (
          <Loading />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Plus />} title="No activities yet" body="Add your first activity above." />
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {money(a.reward)} · {a.duration_seconds}s {a.url ? `· ${a.url}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={a.active} onCheckedChange={(v) => toggle(a.id, v)} aria-label="Active" />
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Bonus & settings ---------------- */
export function SettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => unwrap(await supabase.from("app_settings").select("*").single()),
  });
  if (isLoading || !data) return <Loading />;
  return <SettingsForm initial={data} onSaved={() => qc.invalidateQueries()} />;
}

function SettingsForm({
  initial,
  onSaved,
}: {
  initial: { bonus_base: number; bonus_max: number; streak_days: number; bonus_enabled: boolean; referral_reward: number; min_withdrawal: number };
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    bonus_base: String(initial.bonus_base),
    bonus_max: String(initial.bonus_max),
    streak_days: String(initial.streak_days),
    referral_reward: String(initial.referral_reward),
    min_withdrawal: String(initial.min_withdrawal),
    bonus_enabled: initial.bonus_enabled,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        bonus_base: Number(f.bonus_base),
        bonus_max: Number(f.bonus_max),
        streak_days: Number(f.streak_days),
        referral_reward: Number(f.referral_reward),
        min_withdrawal: Number(f.min_withdrawal),
        bonus_enabled: f.bonus_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    onSaved();
  }

  const field = (k: "bonus_base" | "bonus_max" | "streak_days" | "referral_reward" | "min_withdrawal", label: string, step = "0.01") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" step={step} min="0" value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} required />
    </div>
  );

  return (
    <Panel>
      <PanelTitle>Daily bonus & rewards</PanelTitle>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        {field("bonus_base", "Day 1 bonus (USD)")}
        {field("bonus_max", "Final day bonus (USD)")}
        {field("streak_days", "Streak length (days)", "1")}
        {field("referral_reward", "Referral reward (USD)")}
        {field("min_withdrawal", "Minimum withdrawal (USD)")}
        <div className="flex items-center justify-between rounded-xl border border-border px-4">
          <Label htmlFor="enabled">Daily bonus enabled</Label>
          <Switch id="enabled" checked={f.bonus_enabled} onCheckedChange={(v) => setF((s) => ({ ...s, bonus_enabled: v }))} />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Bonus rises evenly from day 1 to the final day, then the streak starts over. Missing a day resets it to day 1.
        </p>
        <Button type="submit" variant="gold" size="lg" className="sm:col-span-2" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </form>
    </Panel>
  );
}

/* ---------------- Notifications ---------------- */
export function NotificationsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () =>
      unwrap(await supabase.from("notifications").select("*, profiles(username)").order("created_at", { ascending: false }).limit(50)),
  });
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      let userId: string | null = null;
      const t = target.trim().replace(/^@/, "").toLowerCase();
      if (t) {
        const { data: p } = await supabase.from("profiles").select("id").eq("username", t).maybeSingle();
        if (!p) throw new Error(`No user with username @${t}`);
        userId = p.id;
      }
      const { error } = await supabase.from("notifications").insert({ user_id: userId, title: title.trim(), body: body.trim() });
      if (error) throw error;
      toast.success(userId ? `Sent to @${t}` : "Sent to all users");
      setTitle("");
      setBody("");
      setTarget("");
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle icon={<Send />}>Send notification</PanelTitle>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Username (leave empty to send to everyone)</Label>
            <Input placeholder="@username" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} className="rounded-xl bg-surface" />
          </div>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
          </Button>
        </form>
      </Panel>
      <Panel>
        <PanelTitle>Recent notifications</PanelTitle>
        {isLoading ? (
          <Loading />
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((n) => (
              <li key={n.id} className="py-2.5 text-sm">
                <p className="font-semibold">{n.title}</p>
                <p className="text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground/70">
                  {n.user_id ? `@${n.profiles?.username ?? "user"}` : "Everyone"} · {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Balance screenshots ---------------- */
export function BalanceProofsPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("applied");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "balance-syncs"],
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("balance_syncs")
          .select("*, profiles(username, email, member_id)")
          .order("created_at", { ascending: false })
          .limit(200),
      );
      const paths = rows.map((r) => r.image_path);
      const urls: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("balance-proofs").createSignedUrls(paths, 60 * 60);
        for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
      }
      return rows.map((r) => ({ ...r, url: urls[r.image_path] ?? null }));
    },
  });

  async function reverse(id: string) {
    if (!window.confirm("Reverse this update? The user's balance goes back to what it was before.")) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_reverse_balance_sync", { _id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Update reversed");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const list = (data ?? []).filter((r) => (status === "all" ? true : r.status === status));

  return (
    <Panel>
      <PanelTitle>Balance screenshots</PanelTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {["applied", "rejected", "reversed", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em]",
              status === s ? "bg-gold text-primary-foreground" : "bg-surface-raised text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon={<Check />} title="Nothing here" />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-background/40 p-4 sm:flex-row">
              {r.url ? (
                <a href={r.url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={r.url} alt="Balance screenshot" className="h-40 w-full rounded-xl object-contain sm:w-40" />
                </a>
              ) : (
                <div className="grid h-40 w-full shrink-0 place-items-center rounded-xl bg-surface-raised text-xs text-muted-foreground sm:w-40">
                  No image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl font-semibold tabular">
                      {r.detected_amount !== null ? money(r.detected_amount) : "—"}
                    </p>
                    {r.status !== "rejected" && r.previous_balance !== null && (
                      <p className="text-xs text-muted-foreground tabular">
                        Was {money(r.previous_balance)} · change {Number(r.adjustment) >= 0 ? "+" : "−"}
                        {money(Math.abs(Number(r.adjustment)))}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  @{r.profiles?.username} · {r.profiles?.email} · {r.profiles ? memberCode(r.profiles.member_id) : ""}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                {r.reason && <p className="mt-1 text-xs text-muted-foreground/80">AI note: {r.reason}</p>}
                {r.status === "applied" && (
                  <Button size="sm" variant="destructive" className="mt-3" disabled={busy === r.id} onClick={() => reverse(r.id)}>
                    {busy === r.id ? <Loader2 className="animate-spin" /> : <X />} Reverse
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
