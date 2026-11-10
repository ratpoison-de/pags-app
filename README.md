# PAGS-App

Info-App der **Pater-Alois-Grimm-Schule (PAGS) Külsheim** im Design von [pags-kuelsheim.de](https://pags-kuelsheim.de).

Entwickelt von **Thorsten von Plotho-Kettner** (t.von.plotho-kettner@pagskuelsheim.de).

| Seite | Zweck |
|---|---|
| `index.html` | Startseite mit beiden Einstiegen |
| `kennenlernen.html` | Erstinformation für neue Familien: Konzept, Grundschule, Sekundarstufe, Abschlüsse, Fächer, Ganztag, Anmeldung, Ansprechpartner |
| `PAGS-App_Leitfaden.pdf` | Kurzleitfaden für Eltern, Schüler und Kollegium (5 Seiten) |
| `alltag.html` | Tagesbegleiter: Sekretariat offen/geschlossen, Krankmeldung, Mensa, Ferien 2026/27, Kontakte, Schulordnung, Links – plus **eigene Termine, Notizen und Links** |

Veröffentlicht über GitHub Pages: `https://ratpoison-de.github.io/pags-app/`

## Persönliche Daten: Anmeldung und automatisches Speichern

In `alltag.html` kann sich jede Person mit ihrer E-Mail-Adresse anmelden (Anmeldelink per E-Mail, kein Passwort).
Danach werden ihre Einträge automatisch gespeichert und stehen auf jedem Gerät bereit. Jede Person sieht nur ihre eigenen Daten.

- Ohne Anmeldung bleiben die Einträge im Browser des Geräts. Bei der ersten Anmeldung werden sie ins Konto übernommen.
- Gespeichert wird beim Eintragen und Löschen automatisch, offline Geändertes wird nachgeholt.
- Unter „Meine Daten“ kann man sich abmelden und alle eigenen Daten endgültig löschen.

Technik: [Supabase](https://supabase.com) (Auth per Magic Link + Postgres mit Row Level Security). Die Tabelle steht in `supabase/schema.sql`.

### Einrichtung

Eingerichtet im Supabase-Projekt **pags-lernplaner** (EU, Frankfurt), Tabelle `public.pags_alltag`. Offen ist nur Schritt 3 (Anmelde-Adressen).

Für ein neues Projekt:

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

## Deutsch: DECODE – Operation Rhetorik

`deutsch/stilmittel.html` – Agenten-Adventure für Klasse 9 (14–16 J.): Die KI VOXA manipuliert mit Sprache. In fünf Zonen (Werbeagentur, Social Media, Talkshow, Newsroom, Rede-Labor) werden 30 Stilmittel in realistischen Texten gescannt, Firewalls (6 Fragen, mind. 4 richtig) geknackt und VOXA im Endkampf mit Zeitlimit besiegt. XP, Ränge, Combos, Blitzrunde (60 s) mit Rekord, druckbare Decoder-Lizenz. Spielstand bleibt im Browser des Geräts.
Link: `https://ratpoison-de.github.io/pags-app/deutsch/stilmittel.html` · QR-Code: `deutsch/stilmittel-qr.png`
Definitionen nach der Übersicht „Rhetorische Mittel“ von lehrerfreund.de.

## Graduierung – Selbstbewertung (`graduierung/`)

Selbstbewertungsbogen für die Stufen Walker, Hiker, Climber und Freeclimber. Direktlinks: `graduierung/?stufe=walker|hiker|climber|freeclimber`. QR-Codes: `graduierung/QR-Codes_Graduierung.pdf`.

- **Schüler** (`graduierung/index.html`): Name, Datum, Graduierungswoche (Kalenderwoche, Spalte `woche` = Montag), Punkte wählen → „Abgeben“. Die Abgabe wird in Supabase gespeichert (Tabelle `public.graduierung`, Projekt pags-lernplaner). Schüler können nur abgeben, nichts lesen.
- **Lehrer** (`graduierung/lehrer.html`): Zugang nur mit Zugangsschlüssel (in der Datenbank nur als SHA-256-Hash in `public.graduierung_zugang`). „Bewerten“ öffnet eine Seitenleiste mit Lehrerpunkten je Kriterium , einem Gesamtfeld (wird berechnet, kann überschrieben werden) und einem Feld „Bemerkungen Lernbegleiter“; gespeichert über `graduierung_bewerten`. „Drucken“ lädt alle angezeigten Bögen als PDF mit 4 Bögen (A6) pro A4-Seite herunter. Liste mit Filter nach Graduierungswoche (Standard: neueste Woche), Stufe und Name; PDF-Vorschau in einer Seitenleiste mit Herunterladen, Sammel-PDF der angezeigten Abgaben, CSV für Excel, Löschen.
- Gemeinsame Kriterien und PDF-Layout: `graduierung/bogen.js`.

## Praktikum Klasse 9 (`praktikum/`)

Begleit-App für das Betriebspraktikum (Woche ab 16.11.2026). Link: `https://ratpoison-de.github.io/pags-app/praktikum/` · QR-Code: `praktikum/qr-praktikum.png`

- **Schüler** (`praktikum/index.html`): Anmeldung mit Name, Klasse und selbst gewähltem Kennwort (kein E-Mail-Konto nötig). Alles wird automatisch in Supabase gespeichert und ist auf jedem Gerät wieder abrufbar; ohne Netz bleiben die Einträge im Gerät und werden nachgeholt.
  - *Vorbereiten:* Steckbrief des Betriebs, Checkliste, Erwartungen, Verhaltenstipps, „Was tue ich, wenn …“.
  - *Woche:* Tagesbericht für Montag bis Freitag (Arbeitszeit, Tätigkeiten, Gelerntes, Schwieriges, Highlight, Stimmung) mit einem Auftrag pro Tag.
  - *Erkunden:* Betrieb, Berufsbild, Arbeitsvorgang Schritt für Schritt, Interview.
  - *Bericht:* Rückblick mit Selbsteinschätzung; „Bericht erstellen“ baut aus allen Einträgen den Praktikumsbericht, der abschnittsweise überarbeitet, abgegeben und als PDF heruntergeladen werden kann.
- **Lehrer** (`praktikum/lehrer.html`): Zugang mit demselben Zugangsschlüssel wie bei der Graduierung. Übersicht aller Schüler (Betrieb, Tagesberichte Mo–Fr, Stand des Berichts), Lesen in der Seitenleiste (abgegebener Bericht oder aktuelle Einträge), PDF einzeln oder alle als ein PDF, Kennwort zurücksetzen, Löschen.
- Abgegebene Berichte werden als fester Stand gesichert; spätere Änderungen sieht der Lehrer im Bericht erst nach erneutem Abgeben.
- Technik: Tabelle `public.praktikum` und Funktionen `praktikum_*` in `supabase/praktikum.sql`; gemeinsame Logik und PDF-Layout in `praktikum/bericht.js`.
- **Klassen mit Papierbögen** (z. B. Klasse 5, eigener Zugangsschlüssel mit `klasse` in `graduierung_zugang`): Klassenliste (`graduierung_kinder`) auf der Lehrerseite pflegen, „Papierbögen drucken“ erzeugt pro Kind einen kindgerechten Bogen mit QR-Code (2 pro A4). `graduierung/erfassen.html` scannt den QR-Code mit der Kamera (jsQR) und speichert über `graduierung_erfassen`. Jeder Zugang sieht nur Abgaben seiner Klasse. Schlüssel lassen sich über „🔑 Schlüssel ändern“ selbst ändern (`graduierung_schluessel_aendern`); neue Zugänge mit `erst_schluessel = true` werden nach der ersten Anmeldung dazu aufgefordert. Als Web-App installierbar (`graduierung/manifest.webmanifest`).
