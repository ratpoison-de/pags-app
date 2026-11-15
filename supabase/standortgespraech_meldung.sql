-- Standortgespräche – E-Mail-Benachrichtigung bei neuen Buchungen, Verlegungen, Änderungen und Absagen. Eingerichtet am 15.11.2026.
-- Eine stündliche geplante Aufgabe ruft die Funktion auf und schickt bei neuen Meldungen eine E-Mail (Art und Termin, keine Namen).
alter table public.gespraech_meldungen add column if not exists gemailt boolean not null default false;

create or replace function public.gespraech_neue_meldungen_melden() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare erg jsonb;
begin
  with neu as (update public.gespraech_meldungen set gemailt = true where not gemailt returning id, klasse, art, von, beginn, beginn_alt)
  select coalesce(jsonb_agg(jsonb_build_object('klasse', n.klasse, 'art', n.art,
           'termin', to_char(n.beginn at time zone 'Europe/Berlin', 'DD.MM.YYYY, HH24:MI') || ' Uhr',
           'termin_alt', case when n.beginn_alt is null then null else to_char(n.beginn_alt at time zone 'Europe/Berlin', 'DD.MM.YYYY, HH24:MI') || ' Uhr' end,
           'konto_geloescht', n.von = 'konto') order by n.id), '[]'::jsonb)
    into erg from neu n where n.von <> 'lehrer';
  return jsonb_build_object('neu', jsonb_array_length(erg), 'meldungen', erg,
    'stand', coalesce((select jsonb_agg(jsonb_build_object('klasse', x.klasse, 'gebucht', x.gebucht, 'termine', x.termine))
               from (select t.klasse, count(b.id) as gebucht, count(*) as termine
                       from public.gespraech_termine t left join public.gespraech_buchungen b on b.termin_id = t.id group by t.klasse) x), '[]'::jsonb));
end $$;
revoke execute on function public.gespraech_neue_meldungen_melden() from public, anon, authenticated;
