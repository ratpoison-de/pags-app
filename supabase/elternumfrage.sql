-- Elternumfrage (elternumfrage/) – Projekt pags-lernplaner.
-- Eltern legen ein Konto mit Benutzername + selbst gewähltem Kennwort an (nur als bcrypt-Hash gespeichert).
-- Alle Tabellen sind per RLS komplett gesperrt; Zugriff nur über die Funktionen unten.
-- Lehrerzugang: der HAUPTschlüssel der Graduierung (public.graduierung_zugang mit klasse is null).
--
-- Anonymität: Bei anonymer Abgabe wird in umfrage_abgaben KEIN Konto und KEIN Name gespeichert,
-- als Zeitpunkt nur das Datum (ohne Uhrzeit). Dass ein Konto teilgenommen hat, steht getrennt in
-- umfrage_teilnahme (ohne Zeitpunkt, ohne Verweis auf die Abgabe) – nur damit niemand doppelt abgibt.
-- umfrage_teilnahme ist auch über den Lehrerzugang nicht lesbar.
-- Die Löschfunktionen stehen in supabase/elternumfrage_loeschen.sql (eingerichtet).

create table public.umfrage_konten (
  id uuid primary key default gen_random_uuid(),
  benutzer text not null check (char_length(benutzer) between 3 and 60),
  benutzer_key text generated always as (lower(benutzer)) stored unique,
  pw_hash text not null,
  klasse text not null default '9a' check (klasse ~ '^([1-9]|10)[a-d]$'),
  name_eltern text not null default '' check (char_length(name_eltern) <= 80),
  name_kind text not null default '' check (char_length(name_kind) <= 80),
  fehlversuche smallint not null default 0,
  gesperrt_bis timestamptz,
  created_at timestamptz not null default now()
);

create table public.umfrage_runden (
  id uuid primary key default gen_random_uuid(),
  klasse text not null default '9a' check (klasse ~ '^([1-9]|10)[a-d]$'),
  titel text not null check (char_length(titel) between 2 and 120),
  einleitung text not null default '' check (char_length(einleitung) <= 2000),
  fragen jsonb not null default '[]'::jsonb check (jsonb_typeof(fragen) = 'array' and pg_column_size(fragen) < 100000),
  offen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.umfrage_teilnahme (
  konto_id uuid not null references public.umfrage_konten(id) on delete cascade,
  runde_id uuid not null references public.umfrage_runden(id) on delete cascade,
  anonym boolean not null,
  primary key (konto_id, runde_id)
);

create table public.umfrage_abgaben (
  id uuid primary key default gen_random_uuid(),
  runde_id uuid not null references public.umfrage_runden(id) on delete cascade,
  konto_id uuid references public.umfrage_konten(id) on delete cascade,   -- null = anonym
  name_eltern text,
  name_kind text,
  antworten jsonb not null check (jsonb_typeof(antworten) = 'object' and pg_column_size(antworten) < 60000),
  abgegeben_am timestamptz not null,                                       -- anonym: nur das Datum
  antwort_lehrer text check (char_length(antwort_lehrer) <= 4000),
  antwort_am timestamptz,
  erledigt boolean not null default false
);
create index on public.umfrage_abgaben (runde_id);
create index on public.umfrage_abgaben (konto_id);

alter table public.umfrage_konten enable row level security;
alter table public.umfrage_runden enable row level security;
alter table public.umfrage_teilnahme enable row level security;
alter table public.umfrage_abgaben enable row level security;
revoke all on public.umfrage_konten, public.umfrage_runden, public.umfrage_teilnahme, public.umfrage_abgaben from anon, authenticated;

-- ---------- intern ----------
create function public.umfrage_lehrer_ok(schluessel text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.graduierung_zugang
    where klasse is null and hash = encode(extensions.digest(convert_to(coalesce(schluessel, ''), 'UTF8'), 'sha256'), 'hex'));
$$;

-- Kennwort prüfen (8 Fehlversuche = 10 Minuten Sperre)
create function public.umfrage_pw_check(p_id uuid, p_pw text) returns text
language plpgsql security definer set search_path to '' as $$
declare r public.umfrage_konten;
begin
  select * into r from public.umfrage_konten where id = p_id for update;
  if not found then return 'unbekannt'; end if;
  if r.gesperrt_bis is not null and r.gesperrt_bis > now() then return 'gesperrt'; end if;
  if r.pw_hash = extensions.crypt(coalesce(p_pw, ''), r.pw_hash) then
    if r.fehlversuche <> 0 or r.gesperrt_bis is not null then
      update public.umfrage_konten set fehlversuche = 0, gesperrt_bis = null where id = p_id;
    end if;
    return 'ok';
  end if;
  update public.umfrage_konten
     set fehlversuche = case when r.fehlversuche >= 7 then 0 else r.fehlversuche + 1 end,
         gesperrt_bis = case when r.fehlversuche >= 7 then now() + interval '10 minutes' else null end
   where id = p_id;
  return 'pw';
end $$;

-- Alles, was die Eltern nach der Anmeldung sehen
create function public.umfrage_eltern_stand(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('ok', true,
    'konto', (select jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'klasse', k.klasse, 'name_eltern', k.name_eltern, 'name_kind', k.name_kind)
                from public.umfrage_konten k where k.id = p_id),
    'runden', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'titel', r.titel, 'einleitung', r.einleitung, 'fragen', r.fragen,
                 'offen', r.offen, 'created_at', r.created_at,
                 'teilnahme', (select case when t.anonym then 'anonym' else 'name' end from public.umfrage_teilnahme t where t.konto_id = p_id and t.runde_id = r.id))
                 order by r.created_at desc)
               from public.umfrage_runden r, public.umfrage_konten k
              where k.id = p_id and r.klasse = k.klasse
                and (r.offen or exists (select 1 from public.umfrage_teilnahme t where t.konto_id = p_id and t.runde_id = r.id))), '[]'::jsonb),
    'abgaben', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'runde_id', a.runde_id, 'antworten', a.antworten, 'abgegeben_am', a.abgegeben_am,
                 'name_eltern', a.name_eltern, 'name_kind', a.name_kind, 'antwort_lehrer', a.antwort_lehrer, 'antwort_am', a.antwort_am) order by a.abgegeben_am desc)
               from public.umfrage_abgaben a where a.konto_id = p_id), '[]'::jsonb));
$$;

revoke execute on function public.umfrage_lehrer_ok(text), public.umfrage_pw_check(uuid, text), public.umfrage_eltern_stand(uuid) from public, anon, authenticated;

-- ---------- Eltern ----------
-- Konto anlegen (p_neu = true) oder anmelden
create function public.umfrage_anmelden(p_benutzer text, p_pw text, p_neu boolean default false, p_klasse text default '9a') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare b text := trim(coalesce(p_benutzer, '')); v_id uuid; s text;
begin
  if char_length(b) < 3 or char_length(b) > 60 or char_length(coalesce(p_pw, '')) < 6 or char_length(p_pw) > 72 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  select id into v_id from public.umfrage_konten where benutzer_key = lower(b);
  if p_neu then
    if v_id is not null then return jsonb_build_object('ok', false, 'grund', 'vergeben'); end if;
    if coalesce(p_klasse, '') !~ '^([1-9]|10)[a-d]$' then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
    if (select count(*) from public.umfrage_konten) >= 600 then return jsonb_build_object('ok', false, 'grund', 'voll'); end if;
    insert into public.umfrage_konten (benutzer, pw_hash, klasse)
      values (b, extensions.crypt(p_pw, extensions.gen_salt('bf', 8)), p_klasse) returning id into v_id;
  else
    if v_id is null then return jsonb_build_object('ok', false, 'grund', 'unbekannt'); end if;
    s := public.umfrage_pw_check(v_id, p_pw);
    if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  end if;
  return public.umfrage_eltern_stand(v_id);
end $$;

create function public.umfrage_laden(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  return public.umfrage_eltern_stand(p_id);
end $$;

-- Abgeben: mit Namen (Konto + Namen werden gespeichert) oder anonym (nichts davon)
create function public.umfrage_abgeben(p_id uuid, p_pw text, p_runde uuid, p_antworten jsonb, p_anonym boolean,
                                       p_name_eltern text default '', p_name_kind text default '') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text; r public.umfrage_runden; k public.umfrage_konten;
        ne text := trim(coalesce(p_name_eltern, '')); nk text := trim(coalesce(p_name_kind, ''));
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  select * into k from public.umfrage_konten where id = p_id;
  select * into r from public.umfrage_runden where id = p_runde;
  if not found or r.klasse <> k.klasse then return jsonb_build_object('ok', false, 'grund', 'runde'); end if;
  if not r.offen then return jsonb_build_object('ok', false, 'grund', 'geschlossen'); end if;
  if exists (select 1 from public.umfrage_teilnahme where konto_id = p_id and runde_id = p_runde) then
    return jsonb_build_object('ok', false, 'grund', 'doppelt');
  end if;
  if p_antworten is null or jsonb_typeof(p_antworten) <> 'object' or pg_column_size(p_antworten) >= 60000 then
    return jsonb_build_object('ok', false, 'grund', 'zugross');
  end if;
  if not coalesce(p_anonym, false) and (char_length(ne) < 2 or char_length(ne) > 80 or char_length(nk) > 80) then
    return jsonb_build_object('ok', false, 'grund', 'name');
  end if;
  insert into public.umfrage_teilnahme (konto_id, runde_id, anonym) values (p_id, p_runde, coalesce(p_anonym, false));
  if coalesce(p_anonym, false) then
    insert into public.umfrage_abgaben (runde_id, konto_id, name_eltern, name_kind, antworten, abgegeben_am)
      values (p_runde, null, null, null, p_antworten, date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
  else
    insert into public.umfrage_abgaben (runde_id, konto_id, name_eltern, name_kind, antworten, abgegeben_am)
      values (p_runde, p_id, ne, nullif(nk, ''), p_antworten, now());
    update public.umfrage_konten set name_eltern = ne, name_kind = nk where id = p_id;
  end if;
  return public.umfrage_eltern_stand(p_id);
end $$;

-- Konto: Namen und/oder Kennwort ändern (p_neues_pw leer = Kennwort bleibt)
create function public.umfrage_konto_aendern(p_id uuid, p_pw text, p_name_eltern text, p_name_kind text, p_neues_pw text default '') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if char_length(trim(coalesce(p_name_eltern, ''))) > 80 or char_length(trim(coalesce(p_name_kind, ''))) > 80 then
    return jsonb_build_object('ok', false, 'grund', 'name');
  end if;
  if coalesce(p_neues_pw, '') <> '' and (char_length(p_neues_pw) < 6 or char_length(p_neues_pw) > 72) then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  update public.umfrage_konten set name_eltern = trim(coalesce(p_name_eltern, '')), name_kind = trim(coalesce(p_name_kind, '')),
         pw_hash = case when coalesce(p_neues_pw, '') <> '' then extensions.crypt(p_neues_pw, extensions.gen_salt('bf', 8)) else pw_hash end
   where id = p_id;
  return public.umfrage_eltern_stand(p_id);
end $$;

-- ---------- Lehrer ----------
create function public.umfrage_lehrer_daten(schluessel text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  return jsonb_build_object('ok', true,
    'runden', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'klasse', r.klasse, 'titel', r.titel, 'einleitung', r.einleitung, 'fragen', r.fragen,
               'offen', r.offen, 'created_at', r.created_at, 'updated_at', r.updated_at) order by r.created_at desc) from public.umfrage_runden r), '[]'::jsonb),
    'abgaben', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'runde_id', a.runde_id, 'anonym', a.konto_id is null, 'konto_id', a.konto_id,
               'name_eltern', a.name_eltern, 'name_kind', a.name_kind, 'antworten', a.antworten, 'abgegeben_am', a.abgegeben_am,
               'antwort_lehrer', a.antwort_lehrer, 'antwort_am', a.antwort_am, 'erledigt', a.erledigt)
               order by a.abgegeben_am desc, a.id) from public.umfrage_abgaben a), '[]'::jsonb),
    'konten', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'klasse', k.klasse, 'name_eltern', k.name_eltern,
               'name_kind', k.name_kind, 'created_at', k.created_at) order by k.created_at desc) from public.umfrage_konten k), '[]'::jsonb));
end $$;

-- Rückmeldung an Eltern (nur bei Abgaben mit Namen) und Erledigt-Haken
create function public.umfrage_rueckmeldung(schluessel text, abgabe uuid, p_text text, p_erledigt boolean default null) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare t text := nullif(trim(coalesce(p_text, '')), '');
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(t) > 4000 then return jsonb_build_object('ok', false, 'grund', 'zulang'); end if;
  update public.umfrage_abgaben a
     set antwort_lehrer = case when a.konto_id is null then null else t end,
         antwort_am = case when a.konto_id is null or t is null then null
                           when t is distinct from a.antwort_lehrer then now() else a.antwort_am end,
         erledigt = coalesce(p_erledigt, a.erledigt)
   where a.id = abgabe;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Umfrage anlegen (p_id null) oder ändern. Fragen lassen sich nur ändern, solange es keine Abgaben gibt.
create function public.umfrage_runde_speichern(schluessel text, p_id uuid, p_titel text, p_einleitung text, p_fragen jsonb, p_offen boolean, p_klasse text default '9a') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v uuid := p_id; alt public.umfrage_runden;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(trim(coalesce(p_titel, ''))) < 2 or char_length(trim(p_titel)) > 120 or char_length(coalesce(p_einleitung, '')) > 2000
     or p_fragen is null or jsonb_typeof(p_fragen) <> 'array' or pg_column_size(p_fragen) >= 100000 or coalesce(p_klasse, '') !~ '^([1-9]|10)[a-d]$' then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  if v is null then
    insert into public.umfrage_runden (titel, einleitung, fragen, offen, klasse)
      values (trim(p_titel), coalesce(p_einleitung, ''), p_fragen, coalesce(p_offen, false), p_klasse) returning id into v;
  else
    select * into alt from public.umfrage_runden where id = v;
    if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
    if alt.fragen is distinct from p_fragen and exists (select 1 from public.umfrage_abgaben where runde_id = v) then
      return jsonb_build_object('ok', false, 'grund', 'hat_abgaben');
    end if;
    update public.umfrage_runden set titel = trim(p_titel), einleitung = coalesce(p_einleitung, ''), fragen = p_fragen,
           offen = coalesce(p_offen, false), klasse = p_klasse, updated_at = now() where id = v;
  end if;
  return jsonb_build_object('ok', true, 'id', v);
end $$;

create function public.umfrage_pw_neu(schluessel text, konto uuid, neues_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(coalesce(neues_pw, '')) < 6 or char_length(neues_pw) > 72 then return jsonb_build_object('ok', false, 'grund', 'eingabe'); end if;
  update public.umfrage_konten set pw_hash = extensions.crypt(neues_pw, extensions.gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = konto;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function
  public.umfrage_anmelden(text, text, boolean, text), public.umfrage_laden(uuid, text),
  public.umfrage_abgeben(uuid, text, uuid, jsonb, boolean, text, text), public.umfrage_konto_aendern(uuid, text, text, text, text),
  public.umfrage_lehrer_daten(text), public.umfrage_rueckmeldung(text, uuid, text, boolean),
  public.umfrage_runde_speichern(text, uuid, text, text, jsonb, boolean, text), 
  public.umfrage_pw_neu(text, uuid, text)
from public;
grant execute on function
  public.umfrage_anmelden(text, text, boolean, text), public.umfrage_laden(uuid, text),
  public.umfrage_abgeben(uuid, text, uuid, jsonb, boolean, text, text), public.umfrage_konto_aendern(uuid, text, text, text, text),
  public.umfrage_lehrer_daten(text), public.umfrage_rueckmeldung(text, uuid, text, boolean),
  public.umfrage_runde_speichern(text, uuid, text, text, jsonb, boolean, text), 
  public.umfrage_pw_neu(text, uuid, text)
to anon, authenticated;
