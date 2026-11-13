-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.ledger_kind as enum ('daily_bonus','activity','referral','withdrawal','refund','adjustment');
create type public.withdrawal_status as enum ('pending','approved','completed','rejected','cancelled');

create sequence public.member_id_seq start 100001;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id bigint not null unique default nextval('public.member_id_seq'),
  full_name text not null default '',
  username text not null unique,
  email text not null,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Settings (single row)
create table public.app_settings (
  id boolean primary key default true check (id),
  bonus_base numeric(12,2) not null default 0.05,
  bonus_max numeric(12,2) not null default 0.50,
  streak_days int not null default 30 check (streak_days between 1 and 365),
  bonus_enabled boolean not null default true,
  referral_reward numeric(12,2) not null default 0.20,
  min_withdrawal numeric(12,2) not null default 2.00,
  updated_at timestamptz not null default now()
);
grant select, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone signed in reads settings" on public.app_settings for select to authenticated using (true);
create policy "Admins update settings" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.app_settings (id) values (true);

-- Ledger: every balance change
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  kind public.ledger_kind not null,
  description text not null default '',
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index ledger_user_idx on public.ledger(user_id, created_at desc);
grant select on public.ledger to authenticated;
grant all on public.ledger to service_role;
alter table public.ledger enable row level security;
create policy "Read own ledger or admin" on public.ledger for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Daily claims
create table public.daily_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  streak_day int not null,
  amount numeric(12,2) not null,
  claimed_at timestamptz not null default now()
);
create index daily_claims_user_idx on public.daily_claims(user_id, claimed_at desc);
grant select on public.daily_claims to authenticated;
grant all on public.daily_claims to service_role;
alter table public.daily_claims enable row level security;
create policy "Read own claims or admin" on public.daily_claims for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  url text,
  reward numeric(12,2) not null check (reward >= 0),
  duration_seconds int not null default 30 check (duration_seconds between 5 and 3600),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;
create policy "Read active activities or admin" on public.activities for select to authenticated
  using (active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert activities" on public.activities for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update activities" on public.activities for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete activities" on public.activities for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  started_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_date date
);
create unique index activity_once_per_day on public.activity_sessions(user_id, activity_id, claim_date) where claim_date is not null;
grant select on public.activity_sessions to authenticated;
grant all on public.activity_sessions to service_role;
alter table public.activity_sessions enable row level security;
create policy "Read own sessions or admin" on public.activity_sessions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Withdrawals
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tx_id text not null unique,
  phone text not null,
  amount numeric(12,2) not null check (amount > 0),
  status public.withdrawal_status not null default 'pending',
  idempotency_key uuid not null unique,
  telegram_state text not null default 'unsent',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index withdrawals_user_idx on public.withdrawals(user_id, created_at desc);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "Read own withdrawals or admin" on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Notifications (user_id null = everyone)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, insert, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Read own or broadcast notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid() or user_id is null or public.has_role(auth.uid(), 'admin'));
create policy "Admins send notifications" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete notifications" on public.notifications for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Helpers
create or replace function public.bonus_amount(_day int)
returns numeric language sql stable security definer set search_path = public as $$
  select round(s.bonus_base + (s.bonus_max - s.bonus_base)
    * (greatest(least(_day, s.streak_days), 1) - 1)::numeric / greatest(s.streak_days - 1, 1), 2)
  from public.app_settings s where s.id = true
$$;

create or replace function public.nairobi_today_start()
returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'Africa/Nairobi')) at time zone 'Africa/Nairobi'
$$;

-- New user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _base text; _uname text; _i int := 0; _ref_code text; _referrer uuid; _reward numeric; _full text;
begin
  _base := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'username', ''),
            split_part(split_part(new.email, '@', 1), '+', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if length(_base) < 3 then _base := _base || 'user'; end if;
  _base := left(_base, 20);
  _uname := _base;
  while exists (select 1 from public.profiles where username = _uname) loop
    _i := _i + 1; _uname := _base || _i::text;
  end loop;
  loop
    _ref_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = _ref_code);
  end loop;
  _full := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), initcap(split_part(new.email, '@', 1)));
  select id into _referrer from public.profiles
    where referral_code = upper(nullif(trim(new.raw_user_meta_data->>'ref'), ''));

  insert into public.profiles (id, full_name, username, email, referral_code, referred_by)
    values (new.id, left(_full, 80), _uname, lower(new.email), _ref_code, _referrer);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'adselectglobal.net@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;

  if _referrer is not null then
    select referral_reward into _reward from public.app_settings where id = true;
    if coalesce(_reward, 0) > 0 then
      insert into public.ledger (user_id, amount, kind, description, ref_id)
        values (_referrer, _reward, 'referral', 'Referral bonus: @' || _uname, new.id);
      insert into public.notifications (user_id, title, body)
        values (_referrer, 'New referral!', '@' || _uname || ' joined with your link. You earned $' || to_char(_reward, 'FM9990.00') || '.');
    end if;
  end if;
  insert into public.notifications (user_id, title, body)
    values (new.id, 'Welcome to AdSelect', 'Claim your daily bonus and complete activities to start earning.');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dashboard summary
create or replace function public.get_my_dashboard()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  _uid uuid := auth.uid(); _last public.daily_claims; _s public.app_settings;
  _streak int := 0; _next int := 1; _can boolean := true; _next_at timestamptz := null; _today timestamptz := public.nairobi_today_start();
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select * into _s from public.app_settings where id = true;
  select * into _last from public.daily_claims where user_id = _uid order by claimed_at desc limit 1;
  if _last.id is not null then
    if now() - _last.claimed_at < interval '24 hours' then
      _streak := _last.streak_day; _can := false; _next_at := _last.claimed_at + interval '24 hours';
      _next := (_last.streak_day % _s.streak_days) + 1;
    elsif now() - _last.claimed_at < interval '48 hours' then
      _streak := _last.streak_day; _next := (_last.streak_day % _s.streak_days) + 1;
    end if;
  end if;
  if not _s.bonus_enabled then _can := false; end if;
  return json_build_object(
    'balance', coalesce((select sum(amount) from public.ledger where user_id = _uid), 0),
    'total_earned', coalesce((select sum(amount) from public.ledger where user_id = _uid
        and (kind in ('daily_bonus','activity','referral') or (kind = 'adjustment' and amount > 0))), 0),
    'earned_today', coalesce((select sum(amount) from public.ledger where user_id = _uid
        and kind in ('daily_bonus','activity','referral') and created_at >= _today), 0),
    'total_withdrawn', coalesce((select sum(amount) from public.withdrawals where user_id = _uid and status = 'completed'), 0),
    'pending_withdrawals', coalesce((select sum(amount) from public.withdrawals where user_id = _uid and status in ('pending','approved')), 0),
    'streak_day', _streak, 'next_day', _next, 'next_amount', public.bonus_amount(_next),
    'can_claim', _can, 'next_claim_at', _next_at, 'streak_days', _s.streak_days,
    'bonus_enabled', _s.bonus_enabled, 'min_withdrawal', _s.min_withdrawal, 'referral_reward', _s.referral_reward,
    'referral_count', (select count(*) from public.profiles where referred_by = _uid),
    'referral_earnings', coalesce((select sum(amount) from public.ledger where user_id = _uid and kind = 'referral'), 0)
  );
end $$;

create or replace function public.claim_daily_bonus()
returns json language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _last public.daily_claims; _s public.app_settings; _day int := 1; _amt numeric;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  perform 1 from public.profiles where id = _uid for update;
  select * into _s from public.app_settings where id = true;
  if not _s.bonus_enabled then raise exception 'The daily bonus is paused right now.'; end if;
  select * into _last from public.daily_claims where user_id = _uid order by claimed_at desc limit 1;
  if _last.id is not null then
    if now() - _last.claimed_at < interval '24 hours' then
      raise exception 'You already claimed today''s bonus. Come back when the timer ends.';
    end if;
    if now() - _last.claimed_at < interval '48 hours' then
      _day := (_last.streak_day % _s.streak_days) + 1;
    end if;
  end if;
  _amt := public.bonus_amount(_day);
  insert into public.daily_claims (user_id, streak_day, amount) values (_uid, _day, _amt);
  insert into public.ledger (user_id, amount, kind, description)
    values (_uid, _amt, 'daily_bonus', 'Daily bonus · Day ' || _day || '/' || _s.streak_days);
  return json_build_object('day', _day, 'amount', _amt);
end $$;

-- Activities
create or replace function public.get_activities_today()
returns table (id uuid, title text, description text, url text, reward numeric, duration_seconds int, claimed_today boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.description, a.url, a.reward, a.duration_seconds,
    exists (select 1 from public.activity_sessions s where s.user_id = auth.uid() and s.activity_id = a.id
      and s.claim_date = (now() at time zone 'Africa/Nairobi')::date)
  from public.activities a where a.active and auth.uid() is not null
  order by a.created_at desc
$$;

create or replace function public.start_activity(_activity_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _a public.activities; _sess public.activity_sessions; _today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select * into _a from public.activities where id = _activity_id and active;
  if _a.id is null then raise exception 'This activity is not available.'; end if;
  if exists (select 1 from public.activity_sessions where user_id = _uid and activity_id = _activity_id and claim_date = _today) then
    raise exception 'You already completed this activity today.';
  end if;
  select * into _sess from public.activity_sessions where user_id = _uid and activity_id = _activity_id
    and claimed_at is null and started_at >= public.nairobi_today_start() order by started_at desc limit 1;
  if _sess.id is null then
    insert into public.activity_sessions (user_id, activity_id) values (_uid, _activity_id) returning * into _sess;
  end if;
  return json_build_object('session_id', _sess.id, 'started_at', _sess.started_at, 'duration_seconds', _a.duration_seconds);
end $$;

create or replace function public.claim_activity(_session_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _sess public.activity_sessions; _a public.activities; _today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select * into _sess from public.activity_sessions where id = _session_id and user_id = _uid for update;
  if _sess.id is null then raise exception 'Activity session not found.'; end if;
  if _sess.claimed_at is not null then raise exception 'Reward already claimed.'; end if;
  select * into _a from public.activities where id = _sess.activity_id;
  if _a.id is null or not _a.active then raise exception 'This activity is no longer available.'; end if;
  if now() - _sess.started_at < make_interval(secs => _a.duration_seconds) then
    raise exception 'Please finish the activity timer first.';
  end if;
  if exists (select 1 from public.activity_sessions where user_id = _uid and activity_id = _a.id and claim_date = _today) then
    raise exception 'You already completed this activity today.';
  end if;
  update public.activity_sessions set claimed_at = now(), claim_date = _today where id = _sess.id;
  if _a.reward > 0 then
    insert into public.ledger (user_id, amount, kind, description, ref_id)
      values (_uid, _a.reward, 'activity', 'Activity: ' || _a.title, _a.id);
  end if;
  return json_build_object('amount', _a.reward);
end $$;

-- Withdrawals
create or replace function public.normalize_ke_phone(_phone text)
returns text language plpgsql immutable as $$
declare _d text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
begin
  if _d ~ '^254[17][0-9]{8}$' then return _d; end if;
  if _d ~ '^0[17][0-9]{8}$' then return '254' || substr(_d, 2); end if;
  if _d ~ '^[17][0-9]{8}$' then return '254' || _d; end if;
  return null;
end $$;

create or replace function public.request_withdrawal(_phone text, _amount numeric, _key uuid)
returns public.withdrawals language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _w public.withdrawals; _bal numeric; _s public.app_settings; _norm text; _amt numeric := round(_amount, 2); _tx text;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select * into _w from public.withdrawals where idempotency_key = _key;
  if _w.id is not null then
    if _w.user_id <> _uid then raise exception 'Invalid request.'; end if;
    return _w;
  end if;
  _norm := public.normalize_ke_phone(_phone);
  if _norm is null then raise exception 'Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678.'; end if;
  if _amt is null or _amt <= 0 then raise exception 'Withdrawal amount must be greater than zero.'; end if;
  select * into _s from public.app_settings where id = true;
  if _amt < _s.min_withdrawal then raise exception 'Minimum withdrawal is $%.', to_char(_s.min_withdrawal, 'FM9990.00'); end if;
  perform 1 from public.profiles where id = _uid for update;
  select coalesce(sum(amount), 0) into _bal from public.ledger where user_id = _uid;
  if _amt > _bal then raise exception 'Insufficient funds. Your available balance is $%.', to_char(_bal, 'FM999990.00'); end if;
  loop
    _tx := 'AS' || to_char(now() at time zone 'Africa/Nairobi', 'YYMMDD') || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.withdrawals where tx_id = _tx);
  end loop;
  insert into public.withdrawals (user_id, tx_id, phone, amount, idempotency_key)
    values (_uid, _tx, _norm, _amt, _key) returning * into _w;
  insert into public.ledger (user_id, amount, kind, description, ref_id)
    values (_uid, -_amt, 'withdrawal', 'Withdrawal ' || _tx, _w.id);
  return _w;
end $$;

-- System: cancel when admin could not be notified (server only)
create or replace function public.system_cancel_withdrawal(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _w public.withdrawals;
begin
  select * into _w from public.withdrawals where id = _id for update;
  if _w.id is null or _w.status <> 'pending' then return; end if;
  update public.withdrawals set status = 'cancelled', telegram_state = 'failed', updated_at = now(),
    admin_note = 'Cancelled automatically: admin could not be notified' where id = _id;
  insert into public.ledger (user_id, amount, kind, description, ref_id)
    values (_w.user_id, _w.amount, 'refund', 'Refund ' || _w.tx_id, _w.id);
end $$;
revoke execute on function public.system_cancel_withdrawal(uuid) from public, anon, authenticated;
grant execute on function public.system_cancel_withdrawal(uuid) to service_role;

-- Admin
create or replace function public.admin_update_withdrawal(_id uuid, _status public.withdrawal_status, _note text default null)
returns public.withdrawals language plpgsql security definer set search_path = public as $$
declare _w public.withdrawals;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into _w from public.withdrawals where id = _id for update;
  if _w.id is null then raise exception 'Withdrawal not found'; end if;
  if not (
    (_w.status = 'pending' and _status in ('approved','rejected','completed')) or
    (_w.status = 'approved' and _status in ('completed','rejected'))
  ) then raise exception 'Cannot change status from % to %', _w.status, _status; end if;
  update public.withdrawals set status = _status, admin_note = coalesce(_note, admin_note), updated_at = now(),
    completed_at = case when _status = 'completed' then now() else completed_at end
    where id = _id returning * into _w;
  if _status = 'rejected' then
    insert into public.ledger (user_id, amount, kind, description, ref_id)
      values (_w.user_id, _w.amount, 'refund', 'Refund ' || _w.tx_id, _w.id);
    insert into public.notifications (user_id, title, body) values (_w.user_id, 'Withdrawal rejected',
      'Your withdrawal ' || _w.tx_id || ' was rejected and $' || to_char(_w.amount, 'FM999990.00') || ' was returned to your balance.' || coalesce(' Note: ' || _note, ''));
  elsif _status = 'completed' then
    insert into public.notifications (user_id, title, body) values (_w.user_id, 'Payment sent',
      'Your withdrawal ' || _w.tx_id || ' of $' || to_char(_w.amount, 'FM999990.00') || ' has been paid to your M-Pesa.');
  elsif _status = 'approved' then
    insert into public.notifications (user_id, title, body) values (_w.user_id, 'Withdrawal approved',
      'Your withdrawal ' || _w.tx_id || ' was approved and is being processed.');
  end if;
  return _w;
end $$;

create or replace function public.admin_adjust_balance(_user_id uuid, _amount numeric, _note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _amount is null or round(_amount, 2) = 0 then raise exception 'Amount cannot be zero'; end if;
  if coalesce(trim(_note), '') = '' then raise exception 'A reason is required'; end if;
  insert into public.ledger (user_id, amount, kind, description) values (_user_id, round(_amount, 2), 'adjustment', 'Adjustment: ' || trim(_note));
end $$;

create or replace function public.admin_list_users()
returns table (id uuid, member_id bigint, full_name text, username text, email text, balance numeric,
  total_earned numeric, referrals bigint, is_admin boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  return query select p.id, p.member_id, p.full_name, p.username, p.email,
    coalesce((select sum(l.amount) from public.ledger l where l.user_id = p.id), 0)::numeric,
    coalesce((select sum(l.amount) from public.ledger l where l.user_id = p.id and (l.kind in ('daily_bonus','activity','referral') or (l.kind = 'adjustment' and l.amount > 0))), 0)::numeric,
    (select count(*) from public.profiles r where r.referred_by = p.id),
    public.has_role(p.id, 'admin'), p.created_at
  from public.profiles p order by p.created_at desc;
end $$;

-- User self-service
create or replace function public.my_referrals()
returns table (username text, full_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username, p.full_name, p.created_at from public.profiles p
  where p.referred_by = auth.uid() order by p.created_at desc
$$;

create or replace function public.update_my_name(_full_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(trim(coalesce(_full_name, ''))) < 2 then raise exception 'Name is too short'; end if;
  update public.profiles set full_name = left(trim(_full_name), 80) where id = auth.uid();
end $$;