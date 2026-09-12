create table public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
create policy "admin settings" on public.platform_settings for all using (public.is_admin()) with check (public.is_admin());
insert into public.platform_settings (key, value) values
  ('markup', '3.2'), ('platform_fee', '0.06'), ('free_tier_max_cost_usd', '0.02'), ('fixed_costs_daily_usd', '2.0'),
  ('margin_floor', '0.50')
on conflict (key) do nothing;
