import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const GENERIC_ERROR = "Incorrect login details. Check your username/ID and password.";

/** Sign in with a username or member ID (e.g. AS100001). Email sign-in happens in the browser. */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ identifier: z.string().trim().min(1).max(255), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.identifier.trim();
    const numeric = id.replace(/^as/i, "");
    const query = supabaseAdmin.from("profiles").select("email");
    const { data: row } = /^\d{6,12}$/.test(numeric)
      ? await query.eq("member_id", Number(numeric)).maybeSingle()
      : await query.eq("username", id.toLowerCase().replace(/^@/, "")).maybeSingle();
    if (!row?.email) return { ok: false as const, error: GENERIC_ERROR };

    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: res, error } = await client.auth.signInWithPassword({ email: row.email, password: data.password });
    if (error || !res.session) return { ok: false as const, error: GENERIC_ERROR };
    return {
      ok: true as const,
      access_token: res.session.access_token,
      refresh_token: res.session.refresh_token,
    };
  });

export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ username: z.string().trim().min(3).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username.toLowerCase())
      .maybeSingle();
    return { available: !row };
  });
