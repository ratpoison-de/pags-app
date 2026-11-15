-- Standortgespräche (standortgespraech/) – Projekt pags-lernplaner. Eingerichtet am 15.11.2026.
-- Der Lehrer legt Sprechzeiten als Viertelstunden-Termine an (pro Tag ein oder mehrere Zeitfenster),
-- Eltern buchen genau einen Termin, können ihn verlegen oder absagen.
-- Elternkonten: dieselben wie bei der Elternumfrage (public.umfrage_konten, Kennwort als bcrypt-Hash).
-- Lehrerzugang: der HAUPTschlüssel der Graduierung (public.umfrage_lehrer_ok).
-- Alle Tabellen sind per RLS komplett gesperrt; Zugriff nur über die Funktionen unten.
-- Doppelbuchungen verhindert die Datenbank selbst: gespraech_buchungen.termin_id ist eindeutig.
-- Jede Buchung, Verlegung, Änderung und Absage wird automatisch in gespraech_meldungen protokolliert (Trigger).

create table public.gespraech_einstellung (
  klasse text primary key check (klasse ~ '^([1-9]|10)[a-d]$'),
  titel text not null default 'Standortgespräche' check (char_length(titel) between 2 and 120),
  hinweis text not null default '' check (char_length(hinweis) <= 2000),
  ort text not null default '' check (char_length(ort) <= 120),
  offen boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.gespraech_termine (
  id uuid primary key default gen_random_uuid(),
  klasse text not null check (klasse ~ '^([1-9]|10)[a-d]$'),
  beginn timestamptz not null,
  dauer smallint not null default 15 check (dauer between 5 and 120),
  unique (klasse, beginn)
);

create table public.gespraech_buchungen (
  id uuid primary key default gen_random_uuid(),
  termin_id uuid not null unique references public.gespraech_termine(id) on delete cascade,   -- eindeutig = nie doppelt belegt
  konto_id uuid unique references public.umfrage_konten(id) on delete cascade,                -- null = vom Lehrer eingetragen; eindeutig = ein Termin pro Konto
  name_eltern text not null check (char_length(name_eltern) between 2 and 80),
  name_kind text not null check (char_length(name_kind) between 2 and 80),
  telefon text not null default '' check (char_length(telefon) <= 40),
  notiz text not null default '' check (char_length(notiz) <= 1000),
  gebucht_am timestamptz not null default now(),
  geaendert_am timestamptz
);

create table public.gespraech_meldungen (
  id bigint generated always as identity primary key,
  klasse text not null,
  art text not null check (art in ('gebucht', 'verlegt', 'geaendert', 'abgesagt')),
  von text not null check (von in ('eltern', 'lehrer', 'konto')),   -- konto = Elternkonto wurde gelöscht
  name_eltern text not null,
  name_kind text not null,
  beginn timestamptz not null,
  beginn_alt timestamptz,
  am timestamptz not null default now(),
  gelesen boolean not null default false
);
create index on public.gespraech_meldungen (klasse, am desc);

alter table public.gespraech_einstellung enable row level security;
alter table public.gespraech_termine enable row level security;
alter table public.gespraech_buchungen enable row level security;
alter table public.gespraech_meldungen enable row level security;
revoke all on public.gespraech_einstellung, public.gespraech_termine, public.gespraech_buchungen, public.gespraech_meldungen from anon, authenticated;

-- ---------- Protokoll (Benachrichtigungen für den Lehrerbereich) ----------
create function public.gespraech_protokoll() returns trigger
language plpgsql security definer set search_path to '' as $$
declare v text := nullif(current_setting('gespraech.von', true), '');
        tn public.gespraech_termine; ta public.gespraech_termine;
begin
  if tg_op = 'INSERT' then
    v := coalesce(v, 'eltern');
    select * into tn from public.gespraech_termine where id = new.termin_id;
    insert into public.gespraech_meldungen (klasse, art, von, name_eltern, name_kind, beginn, gelesen)
      values (tn.klasse, 'gebucht', v, new.name_eltern, new.name_kind, tn.beginn, v = 'lehrer');
  elsif tg_op = 'UPDATE' then
    v := coalesce(v, 'eltern');
    select * into tn from public.gespraech_termine where id = new.termin_id;
    if new.termin_id <> old.termin_id then
      select * into ta from public.gespraech_termine where id = old.termin_id;
      insert into public.gespraech_meldungen (klasse, art, von, name_eltern, name_kind, beginn, beginn_alt, gelesen)
        values (tn.klasse, 'verlegt', v, new.name_eltern, new.name_kind, tn.beginn, ta.beginn, v = 'lehrer');
    elsif (new.name_eltern, new.name_kind, new.telefon, new.notiz) is distinct from (old.name_eltern, old.name_kind, old.telefon, old.notiz) then
      insert into public.gespraech_meldungen (klasse, art, von, name_eltern, name_kind, beginn, gelesen)
        values (tn.klasse, 'geaendert', v, new.name_eltern, new.name_kind, tn.beginn, v = 'lehrer');
    end if;
  else
    v := coalesce(v, 'konto');
    select * into ta from public.gespraech_termine where id = old.termin_id;
    if found then
      insert into public.gespraech_meldungen (klasse, art, von, name_eltern, name_kind, beginn, gelesen)
        values (ta.klasse, 'abgesagt', v, old.name_eltern, old.name_kind, ta.beginn, v = 'lehrer');
    end if;
  end if;
  return null;
end $$;
create trigger gespraech_protokoll after insert or update or delete on public.gespraech_buchungen
  for each row execute function public.gespraech_protokoll();

-- ---------- intern ----------
-- Alles, was die Eltern nach der Anmeldung sehen. Belegte Termine ohne Namen.
create function public.gespraech_eltern_stand(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('ok', true,
    'konto', jsonb_build_object('id', k.id, 'benutzer', k.benutzer, 'klasse', k.klasse, 'name_eltern', k.name_eltern, 'name_kind', k.name_kind),
    'einstellung', coalesce((select jsonb_build_object('titel', e.titel, 'hinweis', e.hinweis, 'ort', e.ort, 'offen', e.offen)
                               from public.gespraech_einstellung e where e.klasse = k.klasse),
                            jsonb_build_object('titel', 'Standortgespräche', 'hinweis', '', 'ort', '', 'offen', false)),
    'termine', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'beginn', t.beginn, 'dauer', t.dauer,
                 'status', case when b.konto_id = p_id then 'meins' when b.id is not null then 'belegt'
                                when t.beginn <= now() then 'vorbei' else 'frei' end) order by t.beginn)
               from public.gespraech_termine t left join public.gespraech_buchungen b on b.termin_id = t.id
              where t.klasse = k.klasse and (t.beginn > now() - interval '12 hours' or b.konto_id = p_id)), '[]'::jsonb),
    'buchung', (select jsonb_build_object('id', b.id, 'termin_id', b.termin_id, 'beginn', t.beginn, 'dauer', t.dauer, 'name_eltern', b.name_eltern,
                 'name_kind', b.name_kind, 'telefon', b.telefon, 'notiz', b.notiz, 'gebucht_am', b.gebucht_am, 'geaendert_am', b.geaendert_am)
                  from public.gespraech_buchungen b join public.gespraech_termine t on t.id = b.termin_id where b.konto_id = p_id))
    from public.umfrage_konten k where k.id = p_id;
$$;
revoke execute on function public.gespraech_protokoll(), public.gespraech_eltern_stand(uuid) from public, anon, authenticated;

-- ---------- Eltern ----------
-- Konto anlegen und anmelden: public.umfrage_anmelden (gemeinsame Elternkonten), danach gespraech_laden.
create function public.gespraech_laden(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  return public.gespraech_eltern_stand(p_id);
end $$;

-- Termin buchen. Gibt es schon eine Buchung des Kontos, wird sie auf den neuen Termin verlegt bzw. geändert.
create function public.gespraech_buchen(p_id uuid, p_pw text, p_termin uuid, p_name_eltern text, p_name_kind text,
                                        p_telefon text default '', p_notiz text default '') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text; k public.umfrage_konten; t public.gespraech_termine; alt public.gespraech_buchungen; alt_beginn timestamptz;
        ne text := trim(coalesce(p_name_eltern, '')); nk text := trim(coalesce(p_name_kind, ''));
        tel text := trim(coalesce(p_telefon, '')); nz text := trim(coalesce(p_notiz, ''));
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  select * into k from public.umfrage_konten where id = p_id;
  select * into t from public.gespraech_termine where id = p_termin for update;
  if not found or t.klasse <> k.klasse then return jsonb_build_object('ok', false, 'grund', 'termin'); end if;
  if not coalesce((select offen from public.gespraech_einstellung where klasse = k.klasse), false) then
    return jsonb_build_object('ok', false, 'grund', 'zu');
  end if;
  if char_length(ne) < 2 or char_length(ne) > 80 or char_length(nk) < 2 or char_length(nk) > 80 or char_length(tel) > 40 or char_length(nz) > 1000 then
    return jsonb_build_object('ok', false, 'grund', 'angaben');
  end if;
  select * into alt from public.gespraech_buchungen where konto_id = p_id for update;
  if found then select beginn into alt_beginn from public.gespraech_termine where id = alt.termin_id; end if;
  if alt_beginn is not null and alt_beginn <= now() then return jsonb_build_object('ok', false, 'grund', 'vorbei'); end if;
  if (alt.id is null or alt.termin_id <> p_termin) and t.beginn <= now() then return jsonb_build_object('ok', false, 'grund', 'vorbei'); end if;
  perform set_config('gespraech.von', 'eltern', true);
  begin
    if alt.id is null then
      insert into public.gespraech_buchungen (termin_id, konto_id, name_eltern, name_kind, telefon, notiz) values (p_termin, p_id, ne, nk, tel, nz);
    else
      update public.gespraech_buchungen set termin_id = p_termin, name_eltern = ne, name_kind = nk, telefon = tel, notiz = nz, geaendert_am = now()
       where id = alt.id;
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'grund', 'belegt');
  end;
  update public.umfrage_konten set name_eltern = ne, name_kind = nk where id = p_id and (name_eltern, name_kind) is distinct from (ne, nk);
  return public.gespraech_eltern_stand(p_id);
end $$;

create function public.gespraech_absagen(p_id uuid, p_pw text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s text;
begin
  s := public.umfrage_pw_check(p_id, p_pw);
  if s <> 'ok' then return jsonb_build_object('ok', false, 'grund', s); end if;
  if exists (select 1 from public.gespraech_buchungen b join public.gespraech_termine t on t.id = b.termin_id where b.konto_id = p_id and t.beginn <= now()) then
    return jsonb_build_object('ok', false, 'grund', 'vorbei');
  end if;
  perform set_config('gespraech.von', 'eltern', true);
  delete from public.gespraech_buchungen where konto_id = p_id;
  return public.gespraech_eltern_stand(p_id);
end $$;

-- ---------- Lehrer ----------
create function public.gespraech_lehrer_daten(schluessel text, p_klasse text default '9a') returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  return jsonb_build_object('ok', true, 'klasse', p_klasse,
    'einstellung', coalesce((select jsonb_build_object('titel', e.titel, 'hinweis', e.hinweis, 'ort', e.ort, 'offen', e.offen)
                               from public.gespraech_einstellung e where e.klasse = p_klasse),
                            jsonb_build_object('titel', 'Standortgespräche', 'hinweis', '', 'ort', '', 'offen', false)),
    'termine', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'beginn', t.beginn, 'dauer', t.dauer,
                 'buchung', case when b.id is null then null else jsonb_build_object('id', b.id, 'name_eltern', b.name_eltern, 'name_kind', b.name_kind,
                   'telefon', b.telefon, 'notiz', b.notiz, 'gebucht_am', b.gebucht_am, 'geaendert_am', b.geaendert_am, 'vom_lehrer', b.konto_id is null,
                   'benutzer', (select k.benutzer from public.umfrage_konten k where k.id = b.konto_id)) end) order by t.beginn)
               from public.gespraech_termine t left join public.gespraech_buchungen b on b.termin_id = t.id where t.klasse = p_klasse), '[]'::jsonb),
    'meldungen', coalesce((select jsonb_agg(to_jsonb(m) order by m.am desc, m.id desc)
               from (select id, art, von, name_eltern, name_kind, beginn, beginn_alt, am, gelesen from public.gespraech_meldungen
                      where klasse = p_klasse order by am desc, id desc limit 300) m), '[]'::jsonb),
    'konten', (select count(*) from public.umfrage_konten where klasse = p_klasse));
end $$;

-- Zeitfenster an einem Tag in Viertelstunden-Termine teilen (z. B. 14:00–17:00 = 12 Termine).
-- Termine, die sich mit vorhandenen überschneiden würden, werden übersprungen.
create function public.gespraech_fenster(schluessel text, p_klasse text, p_tag date, p_von time, p_bis time) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare ts timestamptz; n int := 0; u int := 0; i int := 0;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if coalesce(p_klasse, '') !~ '^([1-9]|10)[a-d]$' or p_tag is null or p_von is null or p_bis is null
     or p_bis < p_von + interval '15 minutes' or p_tag < current_date - 1 or p_tag > current_date + 400 then
    return jsonb_build_object('ok', false, 'grund', 'fenster');
  end if;
  if (select count(*) from public.gespraech_termine where klasse = p_klasse) >= 600 then return jsonb_build_object('ok', false, 'grund', 'voll'); end if;
  while p_von + (i + 1) * interval '15 minutes' <= p_bis and p_von + (i + 1) * interval '15 minutes' > p_von + i * interval '15 minutes' loop
    ts := (p_tag + (p_von + i * interval '15 minutes')) at time zone 'Europe/Berlin';
    if exists (select 1 from public.gespraech_termine t where t.klasse = p_klasse
                and t.beginn < ts + interval '15 minutes' and t.beginn + t.dauer * interval '1 minute' > ts) then
      u := u + 1;
    else
      insert into public.gespraech_termine (klasse, beginn, dauer) values (p_klasse, ts, 15);
      n := n + 1;
    end if;
    i := i + 1;
  end loop;
  return jsonb_build_object('ok', true, 'angelegt', n, 'uebersprungen', u);
end $$;

-- Termine löschen. Gebuchte nur mit p_auch_gebuchte = true (die Buchungen werden dann als „abgesagt (Lehrer)“ protokolliert).
create function public.gespraech_termine_loeschen(schluessel text, p_ids uuid[], p_auch_gebuchte boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare g int; n int;
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  select count(*) into g from public.gespraech_buchungen where termin_id = any(p_ids);
  if g > 0 and not coalesce(p_auch_gebuchte, false) then return jsonb_build_object('ok', false, 'grund', 'gebucht', 'anzahl', g); end if;
  perform set_config('gespraech.von', 'lehrer', true);
  delete from public.gespraech_buchungen where termin_id = any(p_ids);
  delete from public.gespraech_termine where id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'anzahl', n, 'abgesagt', g);
end $$;

create function public.gespraech_einstellung_speichern(schluessel text, p_klasse text, p_titel text, p_hinweis text, p_ort text, p_offen boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if coalesce(p_klasse, '') !~ '^([1-9]|10)[a-d]$' or char_length(trim(coalesce(p_titel, ''))) < 2 or char_length(trim(p_titel)) > 120
     or char_length(coalesce(p_hinweis, '')) > 2000 or char_length(coalesce(p_ort, '')) > 120 then
    return jsonb_build_object('ok', false, 'grund', 'eingabe');
  end if;
  insert into public.gespraech_einstellung (klasse, titel, hinweis, ort, offen)
    values (p_klasse, trim(p_titel), trim(coalesce(p_hinweis, '')), trim(coalesce(p_ort, '')), coalesce(p_offen, false))
  on conflict (klasse) do update set titel = excluded.titel, hinweis = excluded.hinweis, ort = excluded.ort, offen = excluded.offen, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Lehrer trägt selbst jemanden ein (z. B. nach einem Anruf) oder ändert die Angaben einer Buchung.
create function public.gespraech_lehrer_buchen(schluessel text, p_termin uuid, p_name_eltern text, p_name_kind text,
                                               p_telefon text default '', p_notiz text default '') returns jsonb
language plpgsql security definer set search_path to '' as $$
declare ne text := trim(coalesce(p_name_eltern, '')); nk text := trim(coalesce(p_name_kind, ''));
        tel text := trim(coalesce(p_telefon, '')); nz text := trim(coalesce(p_notiz, ''));
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  if char_length(ne) < 2 or char_length(ne) > 80 or char_length(nk) < 2 or char_length(nk) > 80 or char_length(tel) > 40 or char_length(nz) > 1000 then
    return jsonb_build_object('ok', false, 'grund', 'angaben');
  end if;
  perform 1 from public.gespraech_termine where id = p_termin for update;
  if not found then return jsonb_build_object('ok', false, 'grund', 'termin'); end if;
  perform set_config('gespraech.von', 'lehrer', true);
  update public.gespraech_buchungen set name_eltern = ne, name_kind = nk, telefon = tel, notiz = nz, geaendert_am = now() where termin_id = p_termin;
  if not found then
    insert into public.gespraech_buchungen (termin_id, konto_id, name_eltern, name_kind, telefon, notiz) values (p_termin, null, ne, nk, tel, nz);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Buchung auf einen anderen freien Termin verlegen
create function public.gespraech_lehrer_verlegen(schluessel text, p_buchung uuid, p_termin uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  perform 1 from public.gespraech_termine where id = p_termin for update;
  if not found then return jsonb_build_object('ok', false, 'grund', 'termin'); end if;
  perform set_config('gespraech.von', 'lehrer', true);
  begin
    update public.gespraech_buchungen set termin_id = p_termin, geaendert_am = now() where id = p_buchung;
    if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'grund', 'belegt');
  end;
  return jsonb_build_object('ok', true);
end $$;

create function public.gespraech_lehrer_absagen(schluessel text, p_buchung uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  perform set_config('gespraech.von', 'lehrer', true);
  delete from public.gespraech_buchungen where id = p_buchung;
  if not found then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Benachrichtigungen als gelesen markieren (alle der Klasse bis einschließlich p_bis)
create function public.gespraech_meldungen_gelesen(schluessel text, p_klasse text, p_bis bigint) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.umfrage_lehrer_ok(schluessel) then return jsonb_build_object('ok', false, 'grund', 'zugang'); end if;
  update public.gespraech_meldungen set gelesen = true where klasse = p_klasse and id <= p_bis and not gelesen;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function
  public.gespraech_laden(uuid, text), public.gespraech_buchen(uuid, text, uuid, text, text, text, text), public.gespraech_absagen(uuid, text),
  public.gespraech_lehrer_daten(text, text), public.gespraech_fenster(text, text, date, time, time),
  public.gespraech_termine_loeschen(text, uuid[], boolean), public.gespraech_einstellung_speichern(text, text, text, text, text, boolean),
  public.gespraech_lehrer_buchen(text, uuid, text, text, text, text), public.gespraech_lehrer_verlegen(text, uuid, uuid),
  public.gespraech_lehrer_absagen(text, uuid), public.gespraech_meldungen_gelesen(text, text, bigint)
from public;
grant execute on function
  public.gespraech_laden(uuid, text), public.gespraech_buchen(uuid, text, uuid, text, text, text, text), public.gespraech_absagen(uuid, text),
  public.gespraech_lehrer_daten(text, text), public.gespraech_fenster(text, text, date, time, time),
  public.gespraech_termine_loeschen(text, uuid[], boolean), public.gespraech_einstellung_speichern(text, text, text, text, text, boolean),
  public.gespraech_lehrer_buchen(text, uuid, text, text, text, text), public.gespraech_lehrer_verlegen(text, uuid, uuid),
  public.gespraech_lehrer_absagen(text, uuid), public.gespraech_meldungen_gelesen(text, text, bigint)
to anon, authenticated;
