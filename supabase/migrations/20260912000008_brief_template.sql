-- Arena-style fill-in-the-blanks brief per app template. Placeholders {{key}} map to config_schema keys.
alter table public.mini_apps add column if not exists brief_template text;
alter table public.mini_apps add column if not exists tags text[] not null default '{}';
alter table public.mini_apps add column if not exists who_for text;
update public.mini_apps set brief_template = 'Build a morning briefing about {{topic}}, looking at {{angle}}, {{schedule}}, delivered to {{output_target}}.', who_for = 'Anyone who needs to know what changed overnight in their niche.' where slug = 'morning-briefing';
update public.mini_apps set brief_template = 'Track {{competitor}} and compare {{compare}} against my own business, {{schedule}}, delivered to {{output_target}}.', who_for = 'Founders and marketers who want to know what a rival is doing without checking every week.' where slug = 'competitor-crawler';
update public.mini_apps set brief_template = 'Turn {{idea}} into ready-to-post drafts for {{platforms}} in a {{tone}} tone, {{schedule}}.', who_for = 'Anyone who has to show up online but does not have time to write from scratch.' where slug = 'content-pipeline';
update public.mini_apps set brief_template = 'Every time it runs, deliver {{what}} so I can decide {{goal}}. Fresh web info: {{needs_fresh}}. Runs {{schedule}}, delivered to {{output_target}}.', who_for = 'You, when none of the ready-made apps fit.' where slug = 'custom';
