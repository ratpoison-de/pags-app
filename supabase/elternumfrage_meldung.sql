-- Elternumfrage – E-Mail-Benachrichtigung bei neuen Abgaben. Eingerichtet am 15.11.2026.
-- Eine stündliche geplante Aufgabe ruft die Funktion auf und schickt bei neuen Abgaben eine E-Mail (nur Zahlen).
alter table public.umfrage_abgaben add column if not exists gemeldet boolean not null default false;

create or replace function public.umfrage_neue_abgaben_melden() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare erg jsonb;
begin
  with neu as (update public.umfrage_abgaben set gemeldet = true where not gemeldet returning runde_id, konto_id)
  select jsonb_build_object('neu', count(*), 'umfragen', coalesce(jsonb_agg(x), '[]'::jsonb)) into erg from (
    select r.titel, r.klasse, count(*) as neu, count(n.konto_id) as mit_namen, count(*) - count(n.konto_id) as anonym,
           (select count(*) from public.umfrage_abgaben a where a.runde_id = r.id) as gesamt
      from neu n join public.umfrage_runden r on r.id = n.runde_id group by r.id, r.titel, r.klasse) x;
  return jsonb_build_object('neu', coalesce((select sum((u->>'neu')::int) from jsonb_array_elements(erg->'umfragen') u), 0), 'umfragen', erg->'umfragen');
end $$;
revoke execute on function public.umfrage_neue_abgaben_melden() from public, anon, authenticated;
