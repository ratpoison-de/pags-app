-- Elternumfrage – Löschfunktionen. Im Projekt pags-lernplaner eingerichtet (Migration „elternumfrage_loeschen“, 14.11.2026).

-- Eltern: eigenes Konto löschen (Konto, Teilnahmevermerke, Abgaben mit Namen; anonyme Abgaben bleiben)
create function public.umfrage_konto_loeschen(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  delete from public.umfrage_konten where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Lehrer: Umfrage mit allen Abgaben löschen
create function public.umfrage_runde_loeschen(schluessel text, p_id uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.umfrage_runden where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Lehrer: Abgaben löschen (eine oder mehrere). p_neu_erlauben: bei Abgaben mit Namen darf das Konto danach erneut abgeben.
create function public.umfrage_abgaben_loeschen(schluessel text, p_ids uuid[], p_neu_erlauben boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if coalesce(p_neu_erlauben, false) then
    delete from public.umfrage_teilnahme t using public.umfrage_abgaben a
     where a.id = any(p_ids) and a.konto_id is not null and t.konto_id = a.konto_id and t.runde_id = a.runde_id;
  end if;
  delete from public.umfrage_abgaben where id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'anzahl', n);
end $$;

-- Lehrer: Elternkonten löschen (eines oder mehrere): Konto, Teilnahmevermerke und Abgaben mit Namen.
create function public.umfrage_konten_entfernen(schluessel text, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.umfrage_konten where id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'anzahl', n);
end $$;
