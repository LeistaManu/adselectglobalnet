import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Reading = {
  is_balance_screenshot: boolean;
  is_clear: boolean;
  amount: number | null;
  currency: string | null;
  reason: string;
};

const PROMPT = `You verify screenshots of a user's balance on their primary AdSelect earning account.
Look at the image and decide:
- is_balance_screenshot: true only if it is a genuine app/website screenshot that shows an account balance figure.
- is_clear: true only if the balance figure is sharp, fully visible, not cropped, not blurred, and unambiguous.
- amount: the main/available balance as a plain number (e.g. 12.5), or null if you cannot read it with certainty.
- currency: ISO code of that balance (USD for "$"), or null if not shown.
- reason: one short sentence for the user explaining what you saw, or what is wrong with the image.
Never guess digits. Return JSON.`;

function extractText(res: unknown): string {
  const out = (res as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] }).output ?? [];
  for (const item of out) {
    for (const c of item.content ?? []) {
      if (c.type === "output_text" && c.text) return c.text;
    }
  }
  return "";
}

export const syncBalanceFromScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) return { ok: false as const, error: "Invalid screenshot." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: used } = await supabaseAdmin.from("balance_syncs").select("id").eq("image_path", data.path).limit(1);
    if (used?.length) return { ok: false as const, error: "This screenshot was already submitted. Upload a new one." };

    const { data: file, error: dlError } = await supabase.storage.from("balance-proofs").download(data.path);
    if (dlError || !file) return { ok: false as const, error: "We couldn't open your screenshot. Please upload it again." };
    const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    let reading: Reading;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              { type: "input_image", image_url: `data:${mime};base64,${b64}`, detail: "high" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "balance_reading",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["is_balance_screenshot", "is_clear", "amount", "currency", "reason"],
              properties: {
                is_balance_screenshot: { type: "boolean" },
                is_clear: { type: "boolean" },
                amount: { type: ["number", "null"] },
                currency: { type: ["string", "null"] },
                reason: { type: "string" },
              },
            },
          },
        },
      });
      reading = JSON.parse(extractText(res)) as Reading;
    } catch (e) {
      if (e instanceof GatewayError) console.error("Balance screenshot reading failed", e.code, e.httpStatus, e.ids);
      else console.error("Balance screenshot reading failed", e);
      return { ok: false as const, error: "We couldn't read your screenshot right now. Please try again in a minute." };
    }

    const currency = (reading.currency ?? "").toUpperCase();
    let problem: string | null = null;
    if (!reading.is_balance_screenshot) problem = "This doesn't look like a screenshot of your account balance.";
    else if (!reading.is_clear || reading.amount === null || !Number.isFinite(reading.amount))
      problem = "The balance isn't clear enough to read. Upload a sharp, uncropped screenshot.";
    else if (reading.amount < 0 || reading.amount > 1_000_000) problem = "The balance shown isn't valid.";
    else if (currency && currency !== "USD") problem = "The screenshot must show your balance in US dollars ($).";

    const { data: row, error } = await supabaseAdmin.rpc("system_record_balance_sync", {
      _user_id: userId,
      _image_path: data.path,
      _amount: reading.amount ?? 0,
      _ok: problem === null,
      _reason: problem ?? reading.reason ?? "",
    });
    if (error || !row) {
      console.error("Recording balance update failed", error);
      return { ok: false as const, error: "We couldn't update your balance. Please try again." };
    }
    if (problem) return { ok: false as const, error: `${problem} ${reading.reason ?? ""}`.trim() };
    return { ok: true as const, amount: Number(row.detected_amount), previous: Number(row.previous_balance) };
  });
