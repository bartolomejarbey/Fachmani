-- F4 — Backfill search_tsv pro existující řádky (trigger se spustí při UPDATE bez změny).

update public.profiles       set full_name = full_name where search_tsv is null;
update public.seed_providers set full_name = full_name where search_tsv is null;
update public.categories     set name      = name      where search_tsv is null;
