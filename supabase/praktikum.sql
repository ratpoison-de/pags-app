-- Praktikums-App (praktikum/) – Projekt pags-lernplaner.
-- Schüler speichern mit Name + selbst gewähltem Kennwort (nur als bcrypt-Hash gespeichert).
-- Die Tabelle ist per RLS komplett gesperrt; Zugriff nur über die Funktionen unten.
-- Lehrerzugang: derselbe Zugangsschlüssel wie bei der Graduierung (public.graduierung_zugang / graduierung_pruefen).

create table public.praktikum (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  klasse text not null check (klasse ~ '^(8|9|10)[a-d]$'),
  name_key text generated always as (lower(name)) stored,
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 400000),
  abgabe jsonb check (abgabe is null or (jsonb_typeof(abgabe) = 'object' and pg_column_size(abgabe) < 200000)),  -- fester Stand des abgegebenen Berichts
  abgegeben_am timestamptz,
  fehlversuche smallint not null default 0,
  gesperrt_bis timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (klasse, name_key)
);
alter table public.praktikum enable row level security;
revoke all on public.praktikum from anon, authenticated;

-- intern: Kennwort prüfen (8 Fehlversuche = 10 Minuten Sperre)
create function public.praktikum_pin_check(p_id uuid, p_pin text) returns text
language plpgsql security definer set search_path to '' as $$
declare r public.praktikum;
begin
  select * into r from public.praktikum where id = p_id for update;
  if not found then return 'unbekannt'; end if;
  if r.gesperrt_bis is not null and r.gesperrt_bis > now() then return 'gesperrt'; end if;
  if r.pin_hash = extensions.crypt(coalesce(p_pin, ''), r.pin_hash) then
    if r.fehlversuche <> 0 or r.gesperrt_bis is not null then
      update public.praktikum set fehlversuche = 0, gesperrt_bis = null where id = p_id;
    end if;
    return 'ok';
  end if;
  update public.praktikum
     set fehlversuche = case when r.fehlversuche >= 7 then 0 else r.fehlversuche + 1 end,
         gesperrt_bis = case when r.fehlversuche >= 7 then now() + interval '10 minutes' else null end
   where id = p_id;
  return 'pin';
end $$;
revoke execute on function public.praktikum_pin_check(uuid, text) from public, anon, authenticated;

-- Schüler: neu anlegen (p_neu = true) oder anmelden
create function public.praktikum_anmelden(p_name text, p_klasse text, p_pin text, p_neu boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare n text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
        v_id uuid; s text; r public.praktikum;
begin
  if char_length(n) < 2 or char_length(n) > 80 or coalesce(p_klasse, '') !~ '^(8|9|10)[a-d]$'
     or char_length(coalesce(p_pin, '')) < 4 or char_length(p_pin) > 40 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  select id into v_id from public.praktikum where klasse = p_klasse and name_key = lower(n);
  if p_neu then
    if v_id is not null then return jsonb_build_object('ok', false, 'grund', 'vergeben'); end if;
    if (select count(*) from public.praktikum) >= 400 then return jsonb_build_object('ok', false, 'grund', 'voll'); end if;
    insert into public.praktikum (name, klasse, pin_hash)
      values (n, p_klasse, extensions.crypt(p_pin, extensions.gen_salt('bf', 8))) returning * into r;
  else
    if v_id is null then return jsonb_build_object('ok', false, 'grund', 'unbekannt'); end if;
    s := public.praktikum_pin_check(v_id, p_pin);
    if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
    select * into r from public.praktikum where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'name', r.name, 'klasse', r.klasse,
    'data', r.data, 'abgegeben_am', r.abgegeben_am, 'updated_at', r.updated_at);
end $$;

-- Schüler: speichern; p_abgeben = true sichert den Bericht zusätzlich als festen Abgabestand
create function public.praktikum_speichern(p_id uuid, p_pin text, p_data jsonb, p_abgeben boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text; r public.praktikum;
begin
  s := public.praktikum_pin_check(p_id, p_pin);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) >= 400000 then
    return jsonb_build_object('ok', false, 'grund', 'zugross');
  end if;
  if p_abgeben and (jsonb_typeof(p_data->'bericht') is distinct from 'object' or pg_column_size(p_data->'bericht') >= 200000) then
    return jsonb_build_object('ok', false, 'grund', 'zugross');
  end if;
  update public.praktikum
     set data = p_data, updated_at = now(),
         abgegeben_am = case when p_abgeben then now() else abgegeben_am end,
         abgabe = case when p_abgeben then p_data->'bericht' else abgabe end
   where id = p_id returning * into r;
  return jsonb_build_object('ok', true, 'updated_at', r.updated_at, 'abgegeben_am', r.abgegeben_am);
end $$;

-- Lehrer
create function public.praktikum_liste(schluessel text)
returns table (id uuid, name text, klasse text, data jsonb, abgabe jsonb, abgegeben_am timestamptz, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.graduierung_pruefen(schluessel) then raise exception 'Zugang verweigert'; end if;
  return query select p.id, p.name, p.klasse, p.data, p.abgabe, p.abgegeben_am, p.created_at, p.updated_at
    from public.praktikum p order by p.klasse, p.name_key;
end $$;

create function public.praktikum_loeschen(schluessel text, eintrag uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.graduierung_pruefen(schluessel) then raise exception 'Zugang verweigert'; end if;
  delete from public.praktikum where id = eintrag;
end $$;

create function public.praktikum_pin_neu(schluessel text, eintrag uuid, neue_pin text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.graduierung_pruefen(schluessel) then raise exception 'Zugang verweigert'; end if;
  if char_length(coalesce(neue_pin, '')) < 4 or char_length(neue_pin) > 40 then raise exception 'Kennwort: 4 bis 40 Zeichen'; end if;
  update public.praktikum set pin_hash = extensions.crypt(neue_pin, extensions.gen_salt('bf', 8)),
         fehlversuche = 0, gesperrt_bis = null where id = eintrag;
  if not found then raise exception 'Eintrag nicht gefunden'; end if;
end $$;

revoke execute on function public.praktikum_anmelden(text, text, text, boolean), public.praktikum_speichern(uuid, text, jsonb, boolean),
  public.praktikum_liste(text), public.praktikum_loeschen(text, uuid), public.praktikum_pin_neu(text, uuid, text) from public;
grant execute on function public.praktikum_anmelden(text, text, text, boolean), public.praktikum_speichern(uuid, text, jsonb, boolean),
  public.praktikum_liste(text), public.praktikum_loeschen(text, uuid), public.praktikum_pin_neu(text, uuid, text) to anon, authenticated;
