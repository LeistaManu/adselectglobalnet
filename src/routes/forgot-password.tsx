import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — AdSelect" },
      { name: "description", content: "Get a secure link to reset your AdSelect password." },
      { property: "og:title", content: "Reset password — AdSelect" },
      { property: "og:description", content: "Get a secure link to reset your AdSelect password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a secure link to set a new password."
      footer={<Link to="/auth" className="text-gold hover:underline">Back to log in</Link>}
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="h-10 w-10 text-gold" />
          <p className="text-sm text-muted-foreground">If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
