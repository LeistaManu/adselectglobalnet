import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { checkUsernameAvailable } from "@/lib/auth.functions";
import { AuthShell } from "@/components/app/AuthShell";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s.ref === "string" && s.ref ? { ref: s.ref.slice(0, 16) } : {},
  head: () => ({
    meta: [
      { title: "Create account — AdSelect" },
      { name: "description", content: "Create your free AdSelect account and start earning daily rewards." },
      { property: "og:title", content: "Join AdSelect" },
      { property: "og:description", content: "Create a free account, claim daily bonuses and cash out to M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(255),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be 20 characters or less")
      .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and _"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function RegisterPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const checkUsername = useServerFn(checkUsernameAvailable);
  const [form, setForm] = useState({ fullName: "", email: "", username: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setLoading(true);
    try {
      const v = parsed.data;
      const { available } = await checkUsername({ data: { username: v.username } });
      if (!available) throw new Error("That username is taken. Try another one.");
      const { data, error } = await supabase.auth.signUp({
        email: v.email.toLowerCase(),
        password: v.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: v.fullName, username: v.username.toLowerCase(), ref: ref ?? null },
        },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success("Account created. Check your email to confirm, then log in.");
        navigate({ to: "/auth" });
        return;
      }
      toast.success("Welcome to AdSelect!");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle={ref ? `You were invited with code ${ref.toUpperCase()}.` : "Start earning in under a minute."}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth" className="font-semibold text-gold hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" id="fullName">
          <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} required />
        </Field>
        <Field label="Email address" id="email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Username" id="username">
          <Input id="username" autoComplete="username" value={form.username} onChange={set("username")} required />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} required />
        </Field>
        <Field label="Confirm password" id="confirm">
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
        </Field>
        {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
    </AuthShell>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
