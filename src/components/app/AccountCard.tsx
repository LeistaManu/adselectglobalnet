import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { CashOutDialog } from "./CashOutDialog";
import { memberCode, money } from "@/lib/format";

export function AccountCard({
  name,
  memberId,
  balance,
  minWithdrawal,
}: {
  name: string;
  memberId: number;
  balance: number;
  minWithdrawal: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card-gradient p-6 shadow-card animate-rise">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-gold/15" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full border border-gold/10" />
      <div className="flex items-center justify-between">
        <Logo withText={false} />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">AdSelect · Virtual</span>
      </div>
      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Available balance</p>
      <p className="mt-1 font-display text-5xl font-semibold text-gold-gradient tabular sm:text-6xl">{money(balance)}</p>
      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Card holder</p>
          <p className="mt-0.5 text-lg font-semibold uppercase tracking-[0.15em]">{name}</p>
          <p className="text-xs tracking-[0.2em] text-muted-foreground tabular">{memberCode(memberId)}</p>
        </div>
        <CashOutDialog
          balance={balance}
          minWithdrawal={minWithdrawal}
          trigger={(open) => (
            <Button variant="light" size="lg" onClick={open} className="tracking-[0.18em] uppercase">
              Cash out <ArrowUpRight />
            </Button>
          )}
        />
      </div>
    </div>
  );
}
