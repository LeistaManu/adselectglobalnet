import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTelegram(text: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!lovableKey || !telegramKey || !chatId) throw new Error("Telegram is not configured");
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Telegram request failed [${res.status}]: ${body}`);
  const json = JSON.parse(body) as { ok?: boolean; description?: string };
  if (!json.ok) throw new Error(`Telegram error: ${json.description ?? body}`);
}

export const submitWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        phone: z.string().trim().min(9).max(20),
        amount: z.number().positive().max(1_000_000),
        key: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: w, error } = await context.supabase.rpc("request_withdrawal", {
      _phone: data.phone,
      _amount: data.amount,
      _key: data.key,
    });
    if (error || !w) return { ok: false as const, error: error?.message ?? "Could not submit withdrawal." };

    const summary = { tx_id: w.tx_id, amount: Number(w.amount), phone: w.phone, created_at: w.created_at };
    if (w.telegram_state === "sent") return { ok: true as const, withdrawal: summary };
    if (w.status !== "pending") {
      return { ok: false as const, error: "This request was cancelled. Please submit a new withdrawal." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Claim the notification so it is sent exactly once, even if the request is retried.
    const { data: claimed } = await supabaseAdmin
      .from("withdrawals")
      .update({ telegram_state: "sending" })
      .eq("id", w.id)
      .eq("telegram_state", "unsent")
      .select("id");
    if (!claimed?.length) return { ok: true as const, withdrawal: summary };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, email")
      .eq("id", w.user_id)
      .single();

    const date = new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(w.created_at));

    const text = [
      "<b>NEW WITHDRAWAL REQUEST</b>",
      "",
      `• Username: ${esc(profile?.username ?? "-")}`,
      `• Email: ${esc(profile?.email ?? "-")}`,
      `• M-Pesa Number: +${esc(w.phone)}`,
      `• Amount: $${Number(w.amount).toFixed(2)}`,
      `• Transaction ID: <code>${esc(w.tx_id)}</code>`,
      `• Date: ${esc(date)} (EAT)`,
      "• Status: PENDING",
    ].join("\n");

    try {
      await sendTelegram(text);
      await supabaseAdmin
        .from("withdrawals")
        .update({ telegram_state: "sent", updated_at: new Date().toISOString() })
        .eq("id", w.id);
      return { ok: true as const, withdrawal: summary };
    } catch (e) {
      console.error("Withdrawal notification failed", e);
      await supabaseAdmin.rpc("system_cancel_withdrawal", { _id: w.id });
      return {
        ok: false as const,
        error:
          "We couldn't reach the payments team, so this request was cancelled and your balance was restored. Please try again shortly.",
      };
    }
  });
