-- Irregular-Verbs-Trainer (englisch/irregular-verbs/) – Projekt pags-lernplaner, eingerichtet am 16.11.2026
-- Schüler: frei gewählter Benutzername + Kennwort (nur als bcrypt-Hash). Lernstand als JSON in "data".
-- Tabelle per RLS komplett gesperrt; Zugriff nur über die Funktionen.
-- Lehrerfunktionen nutzen den Hauptschlüssel (umfrage_lehrer_ok), es gibt noch keine Lehrerseite.
create table public.verben (
  id uuid primary key default gen_random_uuid(),
  benutzer text not null check (char_length(benutzer) between 3 and 30),
  benutzer_key text generated always as (lower(benutzer)) stored unique,
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  fehlversuche smallint not null default 0,
  gesperrt_bis timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.verben enable row level security;
revoke all on public.verben from anon, authenticated;

-- verben_pin_check(p_id, p_pin)                     intern; 8 Fehlversuche = 10 Minuten Sperre (nicht für anon)
-- verben_anmelden(p_benutzer, p_pin, p_neu)        -> {ok, id, benutzer, data, updated_at} | {ok:false, grund}
-- verben_speichern(p_id, p_pin, p_data)            -> {ok, updated_at}
-- verben_liste(schluessel)                         Lehrer: alle Zugänge mit Lernstand
-- verben_pin_neu(schluessel, eintrag, neue_pin)    Lehrer: Kennwort zurücksetzen
-- Vollständige Definitionen: Migrationen „verben_trainer_tabelle“, „verben_trainer_funktionen“, „verben_trainer_rechte“.
