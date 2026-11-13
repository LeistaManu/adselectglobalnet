import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/auth.functions";
import { AuthShell } from "@/components/app/AuthShell";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in — AdSelect" },
      { name: "description", content: "Log in to your AdSelect account with your email, username or user ID." },
      { property: "og:title", content: "Log in — AdSelect" },
      { property: "og:description", content: "Access your AdSelect dashboard and rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signInId = useServerFn(signInWithIdentifier);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const id = identifier.trim();
      if (id.includes("@")) {
        const { error } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (error) throw new Error("Incorrect email or password.");
      } else {
        const res = await signInId({ data: { identifier: id, password } });
        if (!res.ok) throw new Error(res.error);
        const { error } = await supabase.auth.setSession({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        });
        if (error) throw error;
      }
      toast.success("Welcome back!");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in with your email, username or user ID."
      footer={
        <>
          New to AdSelect?{" "}
          <Link to="/register" className="font-semibold text-gold hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email, username or user ID</Label>
          <Input
            id="identifier"
            autoComplete="username"
            placeholder="you@gmail.com · username · AS100001"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-gold hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Log in
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Forgot your user ID?{" "}
          <Link to="/forgot-id" className="text-gold hover:underline">
            Recover it
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
