import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-id")({
  head: () => ({
    meta: [
      { title: "Recover user ID — AdSelect" },
      { name: "description", content: "Get a sign-in link by email to view your AdSelect user ID and username." },
      { property: "og:title", content: "Recover user ID — AdSelect" },
      { property: "og:description", content: "Get a sign-in link by email to view your AdSelect user ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotId,
});

function ForgotId() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/me` },
    });
    setLoading(false);
    // Don't reveal whether the email is registered.
    if (error && !/signups not allowed|not found/i.test(error.message)) setError(error.message);
    else setSent(true);
  }

  return (
    <AuthShell
      title="Forgot your ID?"
      subtitle="You can always log in with your email. We'll also send a one-tap sign-in link — your user ID and username are shown in the ME tab."
      footer={<Link to="/auth" className="text-gold hover:underline">Back to log in</Link>}
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="h-10 w-10 text-gold" />
          <p className="text-sm text-muted-foreground">If {email} is registered, a sign-in link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Email me a sign-in link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
