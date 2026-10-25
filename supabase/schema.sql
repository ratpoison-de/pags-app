-- PAGS Alltag: persönliche Einträge (Termine, Notizen, Links) pro angemeldetem Nutzer
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.

create table if not exists public.pags_alltag (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Zeilenbasierte Sicherheit: Jede Person sieht und ändert ausschließlich ihre eigene Zeile.
alter table public.pags_alltag enable row level security;

drop policy if exists "eigene Daten lesen"    on public.pags_alltag;
drop policy if exists "eigene Daten anlegen"  on public.pags_alltag;
drop policy if exists "eigene Daten ändern"   on public.pags_alltag;
drop policy if exists "eigene Daten löschen"  on public.pags_alltag;

create policy "eigene Daten lesen"   on public.pags_alltag for select to authenticated using (auth.uid() = user_id);
create policy "eigene Daten anlegen" on public.pags_alltag for insert to authenticated with check (auth.uid() = user_id);
create policy "eigene Daten ändern"  on public.pags_alltag for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Daten löschen" on public.pags_alltag for delete to authenticated using (auth.uid() = user_id);

-- Schutz vor übergroßen Einträgen (ca. 200 KB pro Person)
alter table public.pags_alltag drop constraint if exists pags_alltag_groesse;
alter table public.pags_alltag add constraint pags_alltag_groesse check (pg_column_size(data) < 200000);
