import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitWithdrawal } from "@/lib/withdraw.functions";
import { formatPhone, money, normalizeKePhone } from "@/lib/format";

export const WITHDRAW_SUCCESS_MESSAGE =
  "Your withdrawal request has been submitted successfully! Your payment is awaiting processing. You will receive your money through M-Pesa once the administrator completes the payment.";

export function CashOutDialog({
  balance,
  minWithdrawal,
  trigger,
}: {
  balance: number;
  minWithdrawal: number;
  trigger: (open: () => void) => ReactNode;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(submitWithdrawal);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [done, setDone] = useState<{ tx_id: string; amount: number; phone: string } | null>(null);

  function reset() {
    setPhone("");
    setAmount("");
    setError(null);
    setDone(null);
    setKey(crypto.randomUUID());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const normalized = normalizeKePhone(phone);
    if (!normalized) { setError("Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678."); return; }
    const value = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0) return setError("Withdrawal amount must be greater than zero.");
    if (value > balance) { setError(`Insufficient funds. Your available balance is ${money(balance)}.`); return; }
    if (value < minWithdrawal) { setError(`Minimum withdrawal is ${money(minWithdrawal)}.`); return; }

    setLoading(true);
    try {
      const res = await submit({ data: { phone: normalized, amount: value, key } });
      if (!res.ok) {
        setError(res.error);
        setKey(crypto.randomUUID());
        return;
      }
      setDone(res.withdrawal);
      toast.success("Withdrawal request submitted");
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setLoading(false);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    }
  }

  return (
    <>
      {trigger(() => {
        reset();
        setOpen(true);
      })}
      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="max-w-md rounded-3xl border-gold/20 bg-surface">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <DialogTitle className="text-2xl">Request submitted</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {WITHDRAW_SUCCESS_MESSAGE}
              </DialogDescription>
              <div className="w-full space-y-2 rounded-2xl border border-border bg-background/50 p-4 text-left text-sm">
                <Row k="Transaction ID" v={done.tx_id} />
                <Row k="Amount" v={money(done.amount)} />
                <Row k="M-Pesa" v={formatPhone(done.phone)} />
                <Row k="Status" v="PENDING" />
              </div>
              <Button variant="gold" size="lg" className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Cash out</DialogTitle>
                <DialogDescription>Withdraw your earnings to M-Pesa.</DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-gold/25 bg-card-gradient p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Available balance</p>
                <p className="mt-1 font-display text-3xl font-semibold text-gold-gradient tabular">{money(balance)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Minimum withdrawal {money(minWithdrawal)}</p>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mpesa">M-Pesa phone number</Label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mpesa"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0712 345 678"
                      className="pl-11"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount">Amount (USD $)</Label>
                    <button type="button" className="text-xs font-semibold text-gold hover:underline" onClick={() => setAmount(balance.toFixed(2))}>
                      Max
                    </button>
                  </div>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" variant="gold" size="xl" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Withdraw
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold tabular">{v}</span>
    </div>
  );
}
