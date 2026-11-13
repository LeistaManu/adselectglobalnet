/** "makiwale@gmail.com" -> "Makiwale", "david2026@gmail.com" -> "David2026". */
export function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) return "Friend";
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "Friend";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

/** Returns 2547XXXXXXXX / 2541XXXXXXXX, or null if not a valid Kenyan M-Pesa number. */
export function normalizeKePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  return null;
}

export function formatPhone(normalized: string): string {
  return normalized.replace(/^254(\d{3})(\d{3})(\d{3})$/, "+254 $1 $2 $3");
}

export function memberCode(memberId: number | string): string {
  return `AS${memberId}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
