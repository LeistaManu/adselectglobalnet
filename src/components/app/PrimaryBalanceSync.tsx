import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp, Loader2, RefreshCw, ScanLine, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, PanelTitle, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { syncBalanceFromScreenshot } from "@/lib/balance.functions";
import { balanceSyncsQuery } from "@/lib/queries";
import { formatDateTime, money } from "@/lib/format";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export function PrimaryBalanceSync({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const sync = useServerFn(syncBalanceFromScreenshot);
  const { data: history } = useSuspenseQuery(balanceSyncsQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "upload" | "read">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError("Upload a PNG, JPG or WebP screenshot."); return; }
    if (f.size > MAX_BYTES) { setError("Screenshot is too large. The limit is 5 MB."); return; }
    setFile(f);
  }

  async function submit() {
    if (!file || busy) return;
    setError(null);
    setBusy("upload");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("balance-proofs").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(null); setError("Upload failed. Please try again."); return; }
    setBusy("read");
    try {
      const res = await sync({ data: { path } });
      if (res.ok) {
        toast.success(`Balance updated to ${money(res.amount)}`);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ["balance-syncs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    }
  }

  return (
    <Panel>
      <PanelTitle icon={<RefreshCw />}>Match primary balance</PanelTitle>
      <p className="text-sm text-muted-foreground">
        Upload a clear screenshot of the balance on your primary account. We read the amount and set your balance here to match it. The
        admin checks every screenshot before paying out.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        aria-label="Balance screenshot"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {preview ? (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-background/40">
          <img src={preview} alt="Your balance screenshot" className="mx-auto max-h-80 w-auto object-contain" />
          <button
            type="button"
            onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
            disabled={!!busy}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground"
            aria-label="Remove screenshot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-gold/40 bg-gold/5 px-4 py-8 text-center transition-colors hover:bg-gold/10"
        >
          <ImageUp className="h-7 w-7 text-gold" />
          <span className="font-semibold">Choose a screenshot</span>
          <span className="text-xs text-muted-foreground">PNG, JPG or WebP · up to 5 MB</span>
        </button>
      )}

      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li>• The full balance must be visible, sharp and not cropped.</li>
        <li>• Edited or unclear screenshots are rejected.</li>
      </ul>

      {error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button variant="gold" size="lg" className="mt-4 w-full" disabled={!file || !!busy} onClick={submit}>
        {busy ? <Loader2 className="animate-spin" /> : <ScanLine />}
        {busy === "upload" ? "Uploading…" : busy === "read" ? "Reading your balance…" : "Update my balance"}
      </Button>

      {history.length > 0 && (
        <ul className="mt-5 divide-y divide-border border-t border-border">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular">
                  {h.status === "rejected" ? "Screenshot not accepted" : `Balance set to ${money(h.detected_amount)}`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(h.created_at)}
                  {h.status === "rejected" && h.reason ? ` · ${h.reason}` : ""}
                </p>
              </div>
              <StatusBadge status={h.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
