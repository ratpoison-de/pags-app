-- Löschfunktionen der Gesprächsvorbereitung. Im Supabase-Dashboard → SQL Editor einfügen und „Run“ drücken.
-- (Konto löschen durch Eltern/Schüler, Schüler und Konten entfernen im Lehrerbereich.)

create function public.vb_konto_loeschen(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  delete from public.vb_konten where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.vb_schueler_loeschen(schluessel text, p_id uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.vb_schueler where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

create function public.vb_konto_entfernen(schluessel text, p_konto uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.vb_konten where id = p_konto;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.vb_konto_loeschen(uuid, text), public.vb_schueler_loeschen(text, uuid), public.vb_konto_entfernen(text, uuid) from public;
grant execute on function public.vb_konto_loeschen(uuid, text), public.vb_schueler_loeschen(text, uuid), public.vb_konto_entfernen(text, uuid) to anon, authenticated;
