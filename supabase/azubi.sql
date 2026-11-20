-- Azubi-App (azubi/) – Projekt pags-lernplaner. Aufbau wie praktikum.sql.
-- Auszubildende speichern mit Name + Gruppe + selbst gewähltem Kennwort (nur als bcrypt-Hash).
-- Die Tabelle ist per RLS komplett gesperrt; Zugriff nur über die Funktionen unten.
-- Betreuerzugang: nur der HAUPTschlüssel der Graduierung (graduierung_zugang.klasse is null).

create table public.azubi (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  gruppe text not null check (gruppe ~ '^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß .,/_-]{1,29}$'),   -- Gruppe / Jahrgang / Berufsschulklasse
  name_key text generated always as (lower(name)) stored,
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 1500000),
  abgabe jsonb check (abgabe is null or (jsonb_typeof(abgabe) = 'object' and pg_column_size(abgabe) < 300000)),  -- fester Stand des abgegebenen Ausbildungsberichts
  abgegeben_am timestamptz,
  fehlversuche smallint not null default 0,
  gesperrt_bis timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gruppe, name_key)
);
alter table public.azubi enable row level security;
revoke all on public.azubi from anon, authenticated;

create function public.azubi_pin_check(p_id uuid, p_pin text) returns text
language plpgsql security definer set search_path to '' as $$
declare r public.azubi;
begin
  select * into r from public.azubi where id = p_id for update;
  if not found then return 'unbekannt'; end if;
  if r.gesperrt_bis is not null and r.gesperrt_bis > now() then return 'gesperrt'; end if;
  if r.pin_hash = extensions.crypt(coalesce(p_pin, ''), r.pin_hash) then
    if r.fehlversuche <> 0 or r.gesperrt_bis is not null then
      update public.azubi set fehlversuche = 0, gesperrt_bis = null where id = p_id;
    end if;
    return 'ok';
  end if;
  update public.azubi
     set fehlversuche = case when r.fehlversuche >= 7 then 0 else r.fehlversuche + 1 end,
         gesperrt_bis = case when r.fehlversuche >= 7 then now() + interval '10 minutes' else null end
   where id = p_id;
  return 'pin';
end $$;
revoke execute on function public.azubi_pin_check(uuid, text) from public, anon, authenticated;

create function public.azubi_anmelden(p_name text, p_gruppe text, p_pin text, p_neu boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare n text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
        g text := trim(coalesce(p_gruppe, ''));
        v_id uuid; s text; r public.azubi;
begin
  if char_length(n) < 2 or char_length(n) > 80 or g !~ '^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß .,/_-]{1,29}$'
     or char_length(coalesce(p_pin, '')) < 4 or char_length(p_pin) > 40 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  select id into v_id from public.azubi where gruppe = g and name_key = lower(n);
  if p_neu then
    if v_id is not null then return jsonb_build_object('ok', false, 'grund', 'vergeben'); end if;
    if (select count(*) from public.azubi) >= 300 then return jsonb_build_object('ok', false, 'grund', 'voll'); end if;
    insert into public.azubi (name, gruppe, pin_hash)
      values (n, g, extensions.crypt(p_pin, extensions.gen_salt('bf', 8))) returning * into r;
  else
    if v_id is null then return jsonb_build_object('ok', false, 'grund', 'unbekannt'); end if;
    s := public.azubi_pin_check(v_id, p_pin);
    if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
    select * into r from public.azubi where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'name', r.name, 'gruppe', r.gruppe,
    'data', r.data, 'abgegeben_am', r.abgegeben_am, 'updated_at', r.updated_at);
end $$;

create function public.azubi_speichern(p_id uuid, p_pin text, p_data jsonb, p_abgeben boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text; r public.azubi;
begin
  s := public.azubi_pin_check(p_id, p_pin);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) >= 1500000 then
    return jsonb_build_object('ok', false, 'grund', 'zugross');
  end if;
  if p_abgeben and (jsonb_typeof(p_data->'bericht') is distinct from 'object' or pg_column_size(p_data->'bericht') >= 300000) then
    return jsonb_build_object('ok', false, 'grund', 'zugross');
  end if;
  update public.azubi
     set data = p_data, updated_at = now(),
         abgegeben_am = case when p_abgeben then now() else abgegeben_am end,
         abgabe = case when p_abgeben then p_data->'bericht' else abgabe end
   where id = p_id returning * into r;
  return jsonb_build_object('ok', true, 'updated_at', r.updated_at, 'abgegeben_am', r.abgegeben_am);
end $$;

-- intern: nur der Hauptschlüssel (klasse is null) öffnet den Betreuerbereich
create function public.azubi_betreuer_pruefen(schluessel text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.graduierung_zugang
    where klasse is null and hash = encode(extensions.digest(convert_to(coalesce(schluessel,''),'UTF8'),'sha256'),'hex'));
$$;
revoke execute on function public.azubi_betreuer_pruefen(text) from public, anon, authenticated;

create function public.azubi_liste(schluessel text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.azubi_betreuer_pruefen(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  return jsonb_build_object('ok', true, 'zeilen', coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'gruppe', a.gruppe, 'data', a.data, 'abgabe', a.abgabe,
             'abgegeben_am', a.abgegeben_am, 'created_at', a.created_at, 'updated_at', a.updated_at) order by a.gruppe, a.name_key)
      from public.azubi a), '[]'::jsonb));
end $$;

create function public.azubi_loeschen(schluessel text, eintrag uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.azubi_betreuer_pruefen(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.azubi where id = eintrag;
  return jsonb_build_object('ok', true);
end $$;

create function public.azubi_pin_neu(schluessel text, eintrag uuid, neue_pin text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.azubi_betreuer_pruefen(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(coalesce(neue_pin, '')) < 4 or char_length(neue_pin) > 40 then return jsonb_build_object('ok', false, 'grund', 'pin'); end if;
  update public.azubi set pin_hash = extensions.crypt(neue_pin, extensions.gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = eintrag;
  return jsonb_build_object('ok', found);
end $$;

revoke execute on function public.azubi_anmelden(text, text, text, boolean), public.azubi_speichern(uuid, text, jsonb, boolean),
  public.azubi_liste(text), public.azubi_loeschen(text, uuid), public.azubi_pin_neu(text, uuid, text) from public;
grant execute on function public.azubi_anmelden(text, text, text, boolean), public.azubi_speichern(uuid, text, jsonb, boolean),
  public.azubi_liste(text), public.azubi_loeschen(text, uuid), public.azubi_pin_neu(text, uuid, text) to anon, authenticated;
