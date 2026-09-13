-- Focus the catalog: start with the SEO & GEO Optimizer (App #1, professional crew) as the first real app.
-- The generic auto-generated template catalog is hidden (unpublished, not deleted) until each is upgraded to
-- professional-grade per the App Build SOP. Reversible: flip is_published back on to restore any of them.
update public.mini_apps set is_published = false
  where slug not in ('seo-geo-optimizer','geo-monitor','gap-finder','rank-pulse','site-health','advanced-research','custom');
update public.mini_apps set sort_order = 1 where slug = 'seo-geo-optimizer';
update public.mini_apps set sort_order = 2 where slug = 'geo-monitor';
update public.mini_apps set sort_order = 3 where slug = 'gap-finder';
update public.mini_apps set sort_order = 4 where slug = 'rank-pulse';
update public.mini_apps set sort_order = 5 where slug = 'site-health';
update public.mini_apps set sort_order = 6 where slug = 'advanced-research';
