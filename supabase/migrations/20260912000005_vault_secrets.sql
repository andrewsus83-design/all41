-- Task 0.5 — provider key vault. Secrets live in Supabase Vault (encrypted at rest),
-- reachable ONLY through these service-role functions. Never readable by anon/authenticated.
create or replace function public.set_platform_secret(p_name text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_full text := 'all41:' || p_name;
begin
  select id into v_id from vault.secrets where name = v_full;
  if v_id is null then
    perform vault.create_secret(p_value, v_full, 'all41 platform secret');
  else
    perform vault.update_secret(v_id, p_value, v_full, 'all41 platform secret');
  end if;
end $$;
revoke all on function public.set_platform_secret(text,text) from public, anon, authenticated;

create or replace function public.delete_platform_secret(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from vault.secrets where name = 'all41:' || p_name;
end $$;
revoke all on function public.delete_platform_secret(text) from public, anon, authenticated;

create or replace function public.get_platform_secrets() returns table (name text, secret text)
language sql security definer set search_path = public as $$
  select substr(name, 7) as name, decrypted_secret as secret
  from vault.decrypted_secrets where name like 'all41:%'
$$;
revoke all on function public.get_platform_secrets() from public, anon, authenticated;
