grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
grant select on public.ledger to authenticated;
grant all on public.ledger to service_role;
grant select on public.daily_claims to authenticated;
grant all on public.daily_claims to service_role;
grant select, insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
grant select on public.activity_sessions to authenticated;
grant all on public.activity_sessions to service_role;
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
grant select, insert, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant usage, select on sequence public.member_id_seq to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();