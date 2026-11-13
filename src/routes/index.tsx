import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Gift, Smartphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AdSelect — Earn daily rewards, cash out to M-Pesa" },
      { name: "description", content: "Join AdSelect to claim daily bonuses, complete activities, invite friends and withdraw to M-Pesa." },
      { property: "og:title", content: "AdSelect — Earn daily rewards" },
      { property: "og:description", content: "Claim daily bonuses, complete activities and cash out to M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Log in</Link>
        </Button>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-2">
        <div className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Premium rewards</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
            Earn every day. <span className="text-gold-gradient">Cash out</span> to M-Pesa.
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Claim your daily bonus, complete simple activities and invite friends. Your balance grows from real, recorded rewards only.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link to="/register">Create free account</Link>
            </Button>
            <Button asChild variant="surface" size="lg">
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <div className="relative mx-auto aspect-[1.6] w-full max-w-sm overflow-hidden rounded-3xl border border-gold/25 bg-card-gradient p-6 shadow-card">
            <div className="flex items-center justify-between">
              <Logo withText={false} />
              <span className="text-xs uppercase tracking-[0.25em] text-gold">Virtual card</span>
            </div>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">Available balance</p>
            <p className="mt-1 font-display text-4xl font-semibold text-gold-gradient">$0.00</p>
            <p className="absolute bottom-6 left-6 text-sm tracking-[0.2em] text-foreground/80">YOUR NAME</p>
          </div>
          <ul className="mx-auto mt-8 grid max-w-sm gap-3">
            {[
              { icon: Gift, t: "30-day daily bonus streak" },
              { icon: Users, t: "Referral rewards for every friend" },
              { icon: Smartphone, t: "Withdraw straight to M-Pesa" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
                <Icon className="h-4 w-4 text-gold" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
