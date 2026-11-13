<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (AdSelect)

- Every balance change is a row in `public.ledger`; balances are always summed from it, never stored, so totals stay auditable.
- Money-moving actions (daily bonus, activity claims, withdrawals, admin status changes, adjustments) run only through SECURITY DEFINER SQL functions that lock the user's profile row, so the browser can never write balances directly.
- Withdrawals go through the `submitWithdrawal` server function: it calls `request_withdrawal` with an idempotency key, claims `telegram_state` atomically before notifying Telegram, and cancels + refunds if Telegram fails, so each request is notified exactly once.
- Login by username or member ID resolves the email server-side (`signInWithIdentifier`) so emails are never exposed to anonymous visitors.
- Admin access comes only from `public.user_roles` (granted to the admin email in the signup trigger), checked with `has_role` in SQL and in the admin route guard.
- Signed-in screens live under `src/routes/_authenticated/_tabs/*` (bottom-nav layout); the admin dashboard is `src/routes/_authenticated/admin.tsx`.
