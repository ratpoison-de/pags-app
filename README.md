# PAGS-App

Info-App der **Pater-Alois-Grimm-Schule (PAGS) Külsheim** im Design von [pags-kuelsheim.de](https://pags-kuelsheim.de).

| Seite | Zweck |
|---|---|
| `index.html` | Startseite mit beiden Einstiegen |
| `kennenlernen.html` | Erstinformation für neue Familien: Konzept, Grundschule, Sekundarstufe, Abschlüsse, Fächer, Ganztag, Anmeldung, Ansprechpartner |
| `alltag.html` | Tagesbegleiter: Sekretariat offen/geschlossen, Krankmeldung, Mensa, Ferien 2026/27, Kontakte, Schulordnung, Links – plus **eigene Termine, Notizen und Links** |

Veröffentlicht über GitHub Pages: `https://ratpoison-de.github.io/pags-app/`

## Persönliche Daten: Anmeldung und automatisches Speichern

In `alltag.html` kann sich jede Person mit ihrer E-Mail-Adresse anmelden (Anmeldelink per E-Mail, kein Passwort).
Danach werden ihre Einträge automatisch gespeichert und stehen auf jedem Gerät bereit. Jede Person sieht nur ihre eigenen Daten.

- Ohne Anmeldung bleiben die Einträge im Browser des Geräts. Bei der ersten Anmeldung werden sie ins Konto übernommen.
- Gespeichert wird beim Eintragen und Löschen automatisch, offline Geändertes wird nachgeholt.
- Unter „Meine Daten“ kann man sich abmelden und alle eigenen Daten endgültig löschen.

Technik: [Supabase](https://supabase.com) (Auth per Magic Link + Postgres mit Row Level Security). Die Tabelle steht in `supabase/schema.sql`.

### Einrichtung (einmalig, ca. 10 Minuten)

1. Auf supabase.com ein kostenloses Konto und ein **neues Projekt** anlegen, Region **Central EU (Frankfurt)**.
2. Im Projekt **SQL Editor** öffnen, den Inhalt von `supabase/schema.sql` einfügen und ausführen.
3. **Authentication → URL Configuration**
   - Site URL: `https://ratpoison-de.github.io/pags-app/alltag.html`
   - Redirect URLs: `https://ratpoison-de.github.io/pags-app/**`
4. **Authentication → Sign In / Providers → Email**: aktiviert lassen. „Confirm email“ kann aktiv bleiben.
5. **Project Settings → API**: `Project URL` und den Schlüssel `anon public` kopieren und in `config.js` eintragen.
6. Änderung committen. Nach ca. einer Minute ist die Anmeldung auf der Seite aktiv.

Hinweis: Der kostenlose Supabase-Tarif verschickt nur wenige Anmelde-Mails pro Stunde. Für viele Nutzer unter **Authentication → Emails → SMTP Settings** einen eigenen Mailversand (z. B. das Schul-Postfach) hinterlegen.

## Datenschutz

Gespeichert werden nur die E-Mail-Adresse zur Anmeldung und die selbst eingetragenen Termine, Notizen und Links.
Bevor die App an Eltern oder Schülerinnen und Schüler weitergegeben wird, sollte sie mit der Schulleitung und der/dem Datenschutzbeauftragten abgestimmt werden (Verarbeitungsverzeichnis, Auftragsverarbeitungsvertrag mit Supabase, Datenschutzhinweis).

## Inhalte aktualisieren

Die Schuldaten (Kontakte, Ferien, Links) stehen in `alltag.html` im Block `<script type="application/json" id="pags-data">`.
Stand der Inhalte: Oktober 2026, übernommen von pags-kuelsheim.de.
