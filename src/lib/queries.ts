import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Dashboard = {
  balance: number;
  total_earned: number;
  earned_today: number;
  total_withdrawn: number;
  pending_withdrawals: number;
  streak_day: number;
  next_day: number;
  next_amount: number;
  can_claim: boolean;
  next_claim_at: string | null;
  streak_days: number;
  bonus_enabled: boolean;
  min_withdrawal: number;
  referral_reward: number;
  referral_count: number;
  referral_earnings: number;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
    if (error || !profile) throw new Error(error?.message ?? "Profile not found");
    const isAdmin = unwrap(await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }));
    return { user: u.user, profile, isAdmin: Boolean(isAdmin) };
  },
});

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => unwrap(await supabase.rpc("get_my_dashboard")) as unknown as Dashboard,
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () =>
    unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)),
});

export const activitiesQuery = queryOptions({
  queryKey: ["activities-today"],
  queryFn: async () => unwrap(await supabase.rpc("get_activities_today")),
});

export const withdrawalsQuery = queryOptions({
  queryKey: ["withdrawals"],
  queryFn: async () =>
    unwrap(await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(100)),
});

export const ledgerQuery = queryOptions({
  queryKey: ["ledger"],
  queryFn: async () =>
    unwrap(await supabase.from("ledger").select("*").order("created_at", { ascending: false }).limit(100)),
});

export const referralsQuery = queryOptions({
  queryKey: ["referrals"],
  queryFn: async () => unwrap(await supabase.rpc("my_referrals")),
});

export const balanceSyncsQuery = queryOptions({
  queryKey: ["balance-syncs"],
  queryFn: async () =>
    unwrap(await supabase.from("balance_syncs").select("*").order("created_at", { ascending: false }).limit(10)),
});
