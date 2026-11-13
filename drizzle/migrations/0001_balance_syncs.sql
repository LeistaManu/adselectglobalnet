CREATE TABLE public.balance_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('applied', 'rejected', 'reversed')),
  detected_amount numeric,
  previous_balance numeric,
  adjustment numeric,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz
);
CREATE INDEX balance_syncs_user_idx ON public.balance_syncs (user_id, created_at DESC);
CREATE INDEX balance_syncs_created_idx ON public.balance_syncs (created_at DESC);

GRANT SELECT ON public.balance_syncs TO authenticated;
GRANT ALL ON public.balance_syncs TO service_role;
ALTER TABLE public.balance_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own balance syncs or admin" ON public.balance_syncs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Called only by the server after the screenshot has been read; never by the browser.
CREATE OR REPLACE FUNCTION public.system_record_balance_sync(_user_id uuid, _image_path text, _amount numeric, _ok boolean, _reason text)
RETURNS public.balance_syncs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare _bal numeric; _amt numeric := round(_amount, 2); _adj numeric; _row public.balance_syncs;
begin
  perform 1 from public.profiles where id = _user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if not _ok or _amt is null or _amt < 0 then
    insert into public.balance_syncs (user_id, image_path, status, detected_amount, reason)
      values (_user_id, _image_path, 'rejected', _amt, coalesce(_reason, ''))
      returning * into _row;
    return _row;
  end if;
  select coalesce(sum(amount), 0) into _bal from public.ledger where user_id = _user_id;
  _adj := _amt - _bal;
  insert into public.balance_syncs (user_id, image_path, status, detected_amount, previous_balance, adjustment, reason)
    values (_user_id, _image_path, 'applied', _amt, _bal, _adj, coalesce(_reason, ''))
    returning * into _row;
  if _adj <> 0 then
    insert into public.ledger (user_id, amount, kind, description, ref_id)
      values (_user_id, _adj, 'adjustment', 'Balance matched to primary account', _row.id);
  end if;
  return _row;
end $$;
REVOKE ALL ON FUNCTION public.system_record_balance_sync(uuid, text, numeric, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_record_balance_sync(uuid, text, numeric, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_reverse_balance_sync(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare _row public.balance_syncs;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into _row from public.balance_syncs where id = _id for update;
  if _row.id is null then raise exception 'Not found'; end if;
  if _row.status <> 'applied' then raise exception 'Only applied updates can be reversed'; end if;
  perform 1 from public.profiles where id = _row.user_id for update;
  if coalesce(_row.adjustment, 0) <> 0 then
    insert into public.ledger (user_id, amount, kind, description, ref_id)
      values (_row.user_id, -_row.adjustment, 'adjustment', 'Primary balance update reversed by admin', _row.id);
  end if;
  update public.balance_syncs set status = 'reversed', reversed_at = now() where id = _id;
end $$;
REVOKE ALL ON FUNCTION public.admin_reverse_balance_sync(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reverse_balance_sync(uuid) TO authenticated;

CREATE POLICY "Users upload own balance proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'balance-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own balance proofs or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'balance-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));