-- Elternumfrage – Ergebnisse (Schaubilder) für Eltern. Eingerichtet am 15.11.2026.
-- Der Lehrer gibt die Ergebnisse je Umfrage frei (Standard: nicht freigegeben).
-- Eltern sehen dann nur Verteilungen von Skalen- und Auswahlfragen: keine Freitexte, keine Namen,
-- nicht die Frage zum Gesprächswunsch, erst ab 5 Abgaben und nur, wenn sie selbst teilgenommen haben.

alter table public.umfrage_runden add column if not exists ergebnisse_frei boolean not null default false;

create or replace function public.umfrage_ergebnisse_freigeben(schluessel text, p_id uuid, p_frei boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  update public.umfrage_runden set ergebnisse_frei = coalesce(p_frei, false), updated_at = now() where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.umfrage_ergebnisse(p_id uuid, p_pw text, p_runde uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text; r public.umfrage_runden; k public.umfrage_konten; n int; erg jsonb;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  select * into k from public.umfrage_konten where id = p_id;
  select * into r from public.umfrage_runden where id = p_runde;
  if not found or r.klasse <> k.klasse then return jsonb_build_object('ok', false, 'grund', 'runde'); end if;
  if not r.ergebnisse_frei or not exists (select 1 from public.umfrage_teilnahme t where t.konto_id = p_id and t.runde_id = p_runde) then
    return jsonb_build_object('ok', false, 'grund', 'nichtfrei');
  end if;
  select count(*) into n from public.umfrage_abgaben a where a.runde_id = p_runde;
  if n < 5 then return jsonb_build_object('ok', false, 'grund', 'zuwenig'); end if;
  select jsonb_object_agg(f->>'id',
    case when f->>'typ' = 'skala' then
      (select jsonb_build_object('n', count(*), 'z', jsonb_build_array(
          count(*) filter (where x.v = '1'), count(*) filter (where x.v = '2'), count(*) filter (where x.v = '3'),
          count(*) filter (where x.v = '4'), count(*) filter (where x.v = '5')))
         from (select a.antworten->>(f->>'id') v from public.umfrage_abgaben a
                where a.runde_id = p_runde and a.antworten->>(f->>'id') in ('1','2','3','4','5')) x)
    else jsonb_build_object(
      'n', (select count(*) from public.umfrage_abgaben a where a.runde_id = p_runde and a.antworten ? (f->>'id')),
      'o', coalesce((select jsonb_agg(jsonb_build_array(o.o, (select count(*) from public.umfrage_abgaben a
                        where a.runde_id = p_runde and (a.antworten->(f->>'id') = to_jsonb(o.o)
                           or (jsonb_typeof(a.antworten->(f->>'id')) = 'array' and a.antworten->(f->>'id') ? o.o)))) order by o.ord)
                      from jsonb_array_elements_text(f->'optionen') with ordinality o(o, ord)), '[]'::jsonb))
    end)
    into erg
    from jsonb_array_elements(r.fragen) f
   where f->>'typ' in ('skala', 'wahl', 'mehrfach') and f->>'id' <> 'gespraech';
  return jsonb_build_object('ok', true, 'anzahl', n, 'fragen', coalesce(erg, '{}'::jsonb));
end $$;

-- Eltern-Stand und Lehrer-Daten liefern zusätzlich das Feld ergebnisse_frei
create or replace function public.umfrage_eltern_stand(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('ok', true,
    'konto', (select jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'klasse', k.klasse, 'name_eltern', k.name_eltern, 'name_kind', k.name_kind)
                from public.umfrage_konten k where k.id = p_id),
    'runden', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'titel', r.titel, 'einleitung', r.einleitung, 'fragen', r.fragen,
                 'offen', r.offen, 'created_at', r.created_at, 'ergebnisse_frei', r.ergebnisse_frei,
                 'teilnahme', (select case when t.anonym then 'anonym' else 'name' end from public.umfrage_teilnahme t where t.konto_id = p_id and t.runde_id = r.id))
                 order by r.created_at desc)
               from public.umfrage_runden r, public.umfrage_konten k
              where k.id = p_id and r.klasse = k.klasse
                and (r.offen or exists (select 1 from public.umfrage_teilnahme t where t.konto_id = p_id and t.runde_id = r.id))), '[]'::jsonb),
    'abgaben', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'runde_id', a.runde_id, 'antworten', a.antworten, 'abgegeben_am', a.abgegeben_am,
                 'name_eltern', a.name_eltern, 'name_kind', a.name_kind, 'antwort_lehrer', a.antwort_lehrer, 'antwort_am', a.antwort_am) order by a.abgegeben_am desc)
               from public.umfrage_abgaben a where a.konto_id = p_id), '[]'::jsonb));
$$;

create or replace function public.umfrage_lehrer_daten(schluessel text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  return jsonb_build_object('ok', true,
    'runden', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'klasse', r.klasse, 'titel', r.titel, 'einleitung', r.einleitung, 'fragen', r.fragen,
               'offen', r.offen, 'ergebnisse_frei', r.ergebnisse_frei, 'created_at', r.created_at, 'updated_at', r.updated_at) order by r.created_at desc) from public.umfrage_runden r), '[]'::jsonb),
    'abgaben', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'runde_id', a.runde_id, 'anonym', a.konto_id is null, 'konto_id', a.konto_id,
               'name_eltern', a.name_eltern, 'name_kind', a.name_kind, 'antworten', a.antworten, 'abgegeben_am', a.abgegeben_am,
               'antwort_lehrer', a.antwort_lehrer, 'antwort_am', a.antwort_am, 'erledigt', a.erledigt)
               order by a.abgegeben_am desc, a.id) from public.umfrage_abgaben a), '[]'::jsonb),
    'konten', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'klasse', k.klasse, 'name_eltern', k.name_eltern,
               'name_kind', k.name_kind, 'created_at', k.created_at) order by k.created_at desc) from public.umfrage_konten k), '[]'::jsonb));
end $$;

revoke execute on function public.umfrage_eltern_stand(uuid) from public, anon, authenticated;
revoke execute on function public.umfrage_ergebnisse(uuid, text, uuid), public.umfrage_ergebnisse_freigeben(text, uuid, boolean) from public;
grant execute on function public.umfrage_ergebnisse(uuid, text, uuid), public.umfrage_ergebnisse_freigeben(text, uuid, boolean) to anon, authenticated;
