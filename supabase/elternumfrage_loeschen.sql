-- Elternumfrage – Löschfunktionen (Konto löschen, Abgabe löschen, Umfrage löschen).
-- Noch NICHT im Projekt eingerichtet: Einmal im Supabase-Dashboard → SQL Editor einfügen und ausführen.
-- Solange sie fehlen, funktioniert die App normal; nur die Löschen-Knöpfe melden „noch nicht eingerichtet“.

-- Konto löschen: Konto, Teilnahmevermerke und Abgaben MIT Namen werden gelöscht.
-- Anonyme Abgaben bleiben (sie sind keinem Konto zugeordnet und lassen sich nicht finden).
create function public.umfrage_konto_loeschen(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  delete from public.umfrage_konten where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.umfrage_runde_loeschen(schluessel text, p_id uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.umfrage_runden where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.umfrage_abgabe_loeschen(schluessel text, p_id uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.umfrage_abgaben where id = p_id;   -- Teilnahmevermerk bleibt: keine zweite Abgabe in dieser Runde
  return jsonb_build_object('ok', true);
end $$;

create function public.umfrage_konto_entfernen(schluessel text, konto uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.umfrage_konten where id = konto;
  return jsonb_build_object('ok', true);
end $$;

