-- Vorbereitung auf das Standortgespräch (gespraechsvorbereitung/) – Projekt pags-lernplaner. Eingerichtet am 20.11.2026.
-- Der Lehrer legt die Schülerliste an; jede Schülerin / jeder Schüler bekommt einen Zugangscode (XXXX-XXXX).
-- Mit dem Code legen Eltern und Schüler eigene Konten an (Rolle eltern / schueler) oder ein gemeinsames (gemeinsam).
-- Höchstens 4 Konten je Schüler. Jedes Konto füllt seinen Vorbereitungsbogen aus (daten, jsonb) und kann ihn
-- für den Klassenlehrer freigeben. Der Lehrer hat je Schüler eine eigene Gesprächsvorlage (vb_schueler.lehrer).
-- Lehrerzugang: der HAUPTschlüssel der Graduierung (public.umfrage_lehrer_ok).
-- Alle Tabellen per RLS gesperrt; Zugriff nur über die Funktionen unten.

create table public.vb_schueler (
  id uuid primary key default gen_random_uuid(),
  klasse text not null default '9a' check (klasse ~ '^([1-9]|10)[a-d]$'),
  vorname text not null check (char_length(vorname) between 1 and 60),
  nachname text not null default '' check (char_length(nachname) <= 60),
  code text not null unique,
  lehrer jsonb not null default '{}'::jsonb check (pg_column_size(lehrer) < 60000),
  lehrer_am timestamptz,
  created_at timestamptz not null default now()
);

create table public.vb_konten (
  id uuid primary key default gen_random_uuid(),
  benutzer text not null check (char_length(benutzer) between 3 and 60),
  benutzer_key text generated always as (lower(benutzer)) stored unique,
  pw_hash text not null,
  schueler_id uuid not null references public.vb_schueler(id) on delete cascade,
  rolle text not null check (rolle in ('eltern', 'schueler', 'gemeinsam')),
  name text not null default '' check (char_length(name) <= 80),
  daten jsonb not null default '{}'::jsonb check (pg_column_size(daten) < 60000),
  freigabe boolean not null default false,
  gespeichert_am timestamptz,
  fehlversuche smallint not null default 0,
  gesperrt_bis timestamptz,
  created_at timestamptz not null default now()
);
create index on public.vb_konten (schueler_id);

alter table public.vb_schueler enable row level security;
alter table public.vb_konten enable row level security;
revoke all on public.vb_schueler, public.vb_konten from anon, authenticated;

-- ---------- intern ----------
create function public.vb_code() returns text
language plpgsql volatile security definer set search_path to '' as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; s text; i int;
begin
  loop
    b := extensions.gen_random_bytes(8); s := '';
    for i in 0..7 loop
      s := s || substr(a, (get_byte(b, i) % 32) + 1, 1);
      if i = 3 then s := s || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.vb_schueler where code = s);
  end loop;
  return s;
end $$;

create function public.vb_pw_check(p_id uuid, p_pw text) returns text
language plpgsql security definer set search_path to '' as $$
declare r public.vb_konten;
begin
  select * into r from public.vb_konten where id = p_id for update;
  if not found then return 'unbekannt'; end if;
  if r.gesperrt_bis is not null and r.gesperrt_bis > now() then return 'gesperrt'; end if;
  if r.pw_hash = extensions.crypt(coalesce(p_pw, ''), r.pw_hash) then
    if r.fehlversuche <> 0 or r.gesperrt_bis is not null then
      update public.vb_konten set fehlversuche = 0, gesperrt_bis = null where id = p_id;
    end if;
    return 'ok';
  end if;
  update public.vb_konten
     set fehlversuche = case when r.fehlversuche >= 7 then 0 else r.fehlversuche + 1 end,
         gesperrt_bis = case when r.fehlversuche >= 7 then now() + interval '10 minutes' else null end
   where id = p_id;
  return 'pw';
end $$;

create function public.vb_stand(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('ok', true,
    'konto', jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'rolle', k.rolle, 'name', k.name,
               'daten', k.daten, 'freigabe', k.freigabe, 'gespeichert_am', k.gespeichert_am),
    'schueler', jsonb_build_object('vorname', s.vorname, 'nachname', s.nachname, 'klasse', s.klasse))
    from public.vb_konten k join public.vb_schueler s on s.id = k.schueler_id where k.id = p_id;
$$;

revoke execute on function public.vb_code(), public.vb_pw_check(uuid, text), public.vb_stand(uuid) from public, anon, authenticated;

-- ---------- Eltern und Schüler ----------
-- Konto anlegen (p_neu = true, mit Zugangscode und Rolle) oder anmelden
create function public.vb_anmelden(p_benutzer text, p_pw text, p_neu boolean default false,
                                   p_code text default '', p_rolle text default '', p_name text default '') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare b text := trim(coalesce(p_benutzer, '')); v_id uuid; s text; sch uuid;
        c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if char_length(b) < 3 or char_length(b) > 60 or char_length(coalesce(p_pw, '')) < 6 or char_length(p_pw) > 72 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  select id into v_id from public.vb_konten where benutzer_key = lower(b);
  if p_neu then
    if v_id is not null then return jsonb_build_object('ok', false, 'grund', 'vergeben'); end if;
    if coalesce(p_rolle, '') not in ('eltern', 'schueler', 'gemeinsam') or char_length(coalesce(p_name, '')) > 80 then
      return jsonb_build_object('ok', false, 'grund', 'eingabe');
    end if;
    if char_length(c) <> 8 then return jsonb_build_object('ok', false, 'grund', 'code'); end if;
    select id into sch from public.vb_schueler where code = substr(c, 1, 4) || '-' || substr(c, 5, 4);
    if sch is null then return jsonb_build_object('ok', false, 'grund', 'code'); end if;
    if (select count(*) from public.vb_konten where schueler_id = sch) >= 4 then return jsonb_build_object('ok', false, 'grund', 'codevoll'); end if;
    if (select count(*) from public.vb_konten) >= 800 then return jsonb_build_object('ok', false, 'grund', 'voll'); end if;
    insert into public.vb_konten (benutzer, pw_hash, schueler_id, rolle, name)
      values (b, extensions.crypt(p_pw, extensions.gen_salt('bf', 8)), sch, p_rolle, trim(coalesce(p_name, ''))) returning id into v_id;
  else
    if v_id is null then return jsonb_build_object('ok', false, 'grund', 'unbekannt'); end if;
    s := public.vb_pw_check(v_id, p_pw);
    if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  end if;
  return public.vb_stand(v_id);
end $$;

create function public.vb_laden(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  return public.vb_stand(p_id);
end $$;

create function public.vb_speichern(p_id uuid, p_pw text, p_daten jsonb, p_freigabe boolean, p_name text default null) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if p_daten is null or jsonb_typeof(p_daten) <> 'object' or pg_column_size(p_daten) >= 60000
     or (p_name is not null and char_length(p_name) > 80) then
    return jsonb_build_object('ok', false, 'grund', 'gross');
  end if;
  update public.vb_konten set daten = p_daten, freigabe = coalesce(p_freigabe, false), gespeichert_am = now(),
         name = coalesce(trim(p_name), name) where id = p_id;
  return jsonb_build_object('ok', true, 'gespeichert_am', now());
end $$;

-- Rolle wechseln (z. B. eigenes Konto doch gemeinsam nutzen)
create function public.vb_rolle(p_id uuid, p_pw text, p_rolle text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if coalesce(p_rolle, '') not in ('eltern', 'schueler', 'gemeinsam') then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
  update public.vb_konten set rolle = p_rolle where id = p_id;
  return public.vb_stand(p_id);
end $$;

create function public.vb_pw_aendern(p_id uuid, p_pw text, p_neu text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if char_length(coalesce(p_neu, '')) < 6 or char_length(p_neu) > 72 then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
  update public.vb_konten set pw_hash = extensions.crypt(p_neu, extensions.gen_salt('bf', 8)) where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.vb_konto_loeschen(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.vb_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  delete from public.vb_konten where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Lehrer ----------
create function public.vb_lehrer_daten(schluessel text, p_klasse text default '9a') returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  return jsonb_build_object('ok', true, 'klasse', p_klasse,
    'schueler', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'vorname', s.vorname, 'nachname', s.nachname, 'code', s.code,
                 'lehrer', s.lehrer, 'lehrer_am', s.lehrer_am,
                 'konten', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'rolle', k.rolle, 'name', k.name,
                              'freigabe', k.freigabe, 'gespeichert_am', k.gespeichert_am, 'created_at', k.created_at,
                              'daten', case when k.freigabe then k.daten else null end) order by k.created_at)
                            from public.vb_konten k where k.schueler_id = s.id), '[]'::jsonb))
                 order by lower(s.nachname), lower(s.vorname))
               from public.vb_schueler s where s.klasse = p_klasse), '[]'::jsonb));
end $$;

-- Mehrere Schüler auf einmal anlegen: p_namen = [{"vorname": "...", "nachname": "..."}, ...]
create function public.vb_schueler_anlegen(schluessel text, p_klasse text, p_namen jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare e jsonb; v text; n text; z int := 0;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if coalesce(p_klasse, '') !~ '^([1-9]|10)[a-d]$' or jsonb_typeof(p_namen) <> 'array' then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
  if (select count(*) from public.vb_schueler where klasse = p_klasse) + jsonb_array_length(p_namen) > 40 then
    return jsonb_build_object('ok', false, 'grund', 'voll');
  end if;
  for e in select * from jsonb_array_elements(p_namen) loop
    v := trim(coalesce(e->>'vorname', '')); n := trim(coalesce(e->>'nachname', ''));
    if char_length(v) between 1 and 60 and char_length(n) <= 60 then
      insert into public.vb_schueler (klasse, vorname, nachname, code) values (p_klasse, v, n, public.vb_code());
      z := z + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'angelegt', z);
end $$;

create function public.vb_schueler_aendern(schluessel text, p_id uuid, p_vorname text, p_nachname text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(trim(coalesce(p_vorname, ''))) not between 1 and 60 or char_length(trim(coalesce(p_nachname, ''))) > 60 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  update public.vb_schueler set vorname = trim(p_vorname), nachname = trim(coalesce(p_nachname, '')) where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
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

create function public.vb_code_neu(schluessel text, p_id uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare c text;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  c := public.vb_code();
  update public.vb_schueler set code = c where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true, 'code', c);
end $$;

create function public.vb_lehrer_speichern(schluessel text, p_id uuid, p_lehrer jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if p_lehrer is null or jsonb_typeof(p_lehrer) <> 'object' or pg_column_size(p_lehrer) >= 60000 then
    return jsonb_build_object('ok', false, 'grund', 'gross');
  end if;
  update public.vb_schueler set lehrer = p_lehrer, lehrer_am = now() where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true, 'gespeichert_am', now());
end $$;

create function public.vb_konto_entfernen(schluessel text, p_konto uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  delete from public.vb_konten where id = p_konto;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Kennwort vergessen: Lehrer setzt ein neues Kennwort
create function public.vb_pw_neu(schluessel text, p_konto uuid, p_neu text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(coalesce(p_neu, '')) < 6 or char_length(p_neu) > 72 then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
  update public.vb_konten set pw_hash = extensions.crypt(p_neu, extensions.gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = p_konto;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function
  public.vb_anmelden(text, text, boolean, text, text, text), public.vb_laden(uuid, text), public.vb_speichern(uuid, text, jsonb, boolean, text),
  public.vb_rolle(uuid, text, text), public.vb_pw_aendern(uuid, text, text), public.vb_konto_loeschen(uuid, text),
  public.vb_lehrer_daten(text, text), public.vb_schueler_anlegen(text, text, jsonb), public.vb_schueler_aendern(text, uuid, text, text),
  public.vb_schueler_loeschen(text, uuid), public.vb_code_neu(text, uuid), public.vb_lehrer_speichern(text, uuid, jsonb),
  public.vb_konto_entfernen(text, uuid), public.vb_pw_neu(text, uuid, text)
from public;
grant execute on function
  public.vb_anmelden(text, text, boolean, text, text, text), public.vb_laden(uuid, text), public.vb_speichern(uuid, text, jsonb, boolean, text),
  public.vb_rolle(uuid, text, text), public.vb_pw_aendern(uuid, text, text), public.vb_konto_loeschen(uuid, text),
  public.vb_lehrer_daten(text, text), public.vb_schueler_anlegen(text, text, jsonb), public.vb_schueler_aendern(text, uuid, text, text),
  public.vb_schueler_loeschen(text, uuid), public.vb_code_neu(text, uuid), public.vb_lehrer_speichern(text, uuid, jsonb),
  public.vb_konto_entfernen(text, uuid), public.vb_pw_neu(text, uuid, text)
to anon, authenticated;
