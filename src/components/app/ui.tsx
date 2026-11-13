import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-3xl border border-border bg-surface p-5 shadow-card animate-rise", className)}>
      {children}
    </section>
  );
}

export function PanelTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {icon && <span className="text-gold [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "gold" | "default" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-semibold tabular", tone === "gold" && "text-gold-gradient")}>{value}</p>
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold [&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-gold/15 text-gold",
  completed: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em]", statusStyles[status] ?? statusStyles.cancelled)}>
      {status}
    </span>
  );
}
