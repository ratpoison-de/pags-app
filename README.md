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

## Deutsch: Villa Kauderwelsch

`deutsch/villa-kauderwelsch.html` – Point-and-Click-Adventure im Stil von Maniac Mansion für Klasse 9a (M-Niveau), passend zur Klassenarbeit „Sprache untersuchen“: Professor Kauderwelsch will alle Sprachregeln löschen. Neun Stationen: Fehlertext, Getrennt-/Zusammenschreibung, Rechtschreibstrategien, Wortarten, Tempora, Aktiv/Passiv, Synonyme/Antonyme, Satzglieder, Kommasetzung. Touchsteuerung fürs iPad, Merkkästen, Wiederholung falscher Aufgaben, Trainingsraum, Urkunde. Spielstand bleibt im Browser des Geräts.
Link: `https://ratpoison-de.github.io/pags-app/deutsch/villa-kauderwelsch.html` · QR-Code: `deutsch/villa-kauderwelsch-qr.png`

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
- **Lehrer** (`praktikum/lehrer.html`): Zugang mit demselben Zugangsschlüssel wie bei der Graduierung. Übersicht aller Schüler (Betrieb, Tagesberichte Mo–Fr, Stand des Berichts), Lesen in der Seitenleiste (abgegebener Bericht oder aktuelle Einträge), PDF einzeln oder alle als ein PDF, **Drucken** (einzelner Bericht, alle abgegebenen, Übersichtsliste), **CSV-Export** der Übersicht (Excel), Kennwort zurücksetzen, Löschen. Gilt gleich für den Hauptschlüssel und die Klassenzugänge (z. B. 9b).
- Abgegebene Berichte werden als fester Stand gesichert; spätere Änderungen sieht der Lehrer im Bericht erst nach erneutem Abgeben.
- Technik: Tabelle `public.praktikum` und Funktionen `praktikum_*` in `supabase/praktikum.sql`; gemeinsame Logik und PDF-Layout in `praktikum/bericht.js`.
- **Klassen mit Papierbögen** (z. B. Klasse 5, eigener Zugangsschlüssel mit `klasse` in `graduierung_zugang`): Klassenliste (`graduierung_kinder`) auf der Lehrerseite pflegen, „Papierbögen drucken“ erzeugt pro Kind einen kindgerechten Bogen mit QR-Code (2 pro A4). `graduierung/erfassen.html` scannt den QR-Code mit der Kamera (jsQR) und speichert über `graduierung_erfassen`. Jeder Zugang sieht nur Abgaben seiner Klasse. Schlüssel lassen sich über „🔑 Schlüssel ändern“ selbst ändern (`graduierung_schluessel_aendern`); neue Zugänge mit `erst_schluessel = true` werden nach der ersten Anmeldung dazu aufgefordert. Als Web-App installierbar (`graduierung/manifest.webmanifest`).

### Klasse 9b – eigener Lehrerzugang

- Schüler 9b: `https://ratpoison-de.github.io/pags-app/praktikum/9b/` (Klasse ist fest auf 9b gestellt) · QR-Code: `praktikum/qr-praktikum-9b.png`
- Lehrkraft 9b: `https://ratpoison-de.github.io/pags-app/praktikum/9b/lehrer.html` – Anmeldung mit Benutzername und Kennwort. Mit den Startdaten muss die Lehrkraft beim ersten Anmelden eigene Zugangsdaten und ihren Namen festlegen; später über „Zugangsdaten ändern“.
- Die Lehrkraft der 9b sieht nur die 9b. Der Hauptschlüssel der Graduierung (`praktikum/lehrer.html`) sieht nur Klassen ohne eigenen Zugang; Klassenschlüssel der Graduierung (z. B. Klasse 5) öffnen das Praktikum nicht.
- Weitere Klassen: Zeile in `public.praktikum_lehrer` anlegen (siehe `supabase/praktikum.sql`), Link `praktikum/?klasse=9c` bzw. `praktikum/lehrer.html?klasse=9c`.

## Elternumfrage (`elternumfrage/`)

Umfrage-App für Eltern (zuerst Klasse 9a, „Die ersten acht Wochen in der 9a“). Link: `https://ratpoison-de.github.io/pags-app/elternumfrage/` · QR-Code: `elternumfrage/qr-elternumfrage.png`

- **Eltern** (`elternumfrage/index.html`): Konto mit frei gewähltem Benutzernamen und Kennwort (keine E-Mail nötig). Umfrage in Schritten (ein Abschnitt pro Schritt), Zwischenstand bleibt im Gerät. Am Ende wählen die Eltern **mit Namen** (Name, optional Name des Kindes) oder **anonym**. Abgaben mit Namen und die Rückmeldungen des Lehrers sind im Konto sichtbar. „Mein Konto“: Namen, Kennwort ändern, Konto löschen. Andere Klassen: `elternumfrage/?klasse=9b`.
- **Lehrer** (`elternumfrage/lehrer.html`): Zugang mit dem Hauptschlüssel der Graduierung.
  - *Auswertung:* Kennzahlen (Abgaben, mit Namen/anonym, Rücklauf, Ø Zufriedenheit), Schaubilder (Stimmungsbild aller Skalenfragen als an der Mitte ausgerichtete Verteilungsbalken, Durchschnitt je Themenbereich mit Vorrunde, Abgaben pro Tag), Gesprächswünsche, jede Frage mit Balken bzw. Freitexten; Filter alle/mit Namen/anonym; Vergleich mit der vorherigen Runde (gleiche Frage-ID); Drucken/PDF.
  - *Abgaben:* Liste mit Suche und Filtern (offen, Gesprächswunsch …), Einzelansicht in der Seitenleiste, **Rückmeldung an die Eltern** (nur bei Abgabe mit Namen), Haken „erledigt“, Drucken, CSV für Excel. **Löschen** einzeln (✕) oder per Häkchen mehrere auf einmal; bei Abgaben mit Namen lässt sich erlauben, dass die Eltern erneut abgeben.
  - *Umfragen:* öffnen/schließen, bearbeiten (Fragetypen: Skala 1–5, eine Antwort, mehrere Antworten, Freitext, Abschnitte), **als neue Runde kopieren** zum Wiederverwenden, Elternlink kopieren. Fragen sind gesperrt, sobald es Abgaben gibt.
  - *Elternkonten:* Kennwort zurücksetzen, **Konten löschen** einzeln oder per Häkchen mehrere (löscht auch deren Abgaben mit Namen; anonyme Abgaben bleiben).
- **Ergebnisse für Eltern:** Unter *Umfragen* lässt sich je Umfrage „Ergebnisse für Eltern freigeben“ (Standard: aus). Eltern, die teilgenommen haben, sehen dann in ihrer App Schaubilder der Klasse zu Skalen- und Auswahlfragen – ohne Freitexte, Namen, Einzelabgaben und Gesprächswunsch, erst ab 5 Abgaben (`supabase/elternumfrage_ergebnisse.sql`, eingerichtet).
- **Anonymität:** Bei anonymer Abgabe speichert die Datenbank weder Konto noch Namen noch Uhrzeit (nur das Datum). Dass ein Konto teilgenommen hat, steht getrennt und ohne Verweis in `umfrage_teilnahme` (verhindert doppelte Abgaben, auch für den Lehrerzugang nicht lesbar).
- Technik: Tabellen `public.umfrage_*` und Funktionen `umfrage_*` in `supabase/elternumfrage.sql` (Projekt pags-lernplaner, eingerichtet). Die Löschfunktionen stehen in `supabase/elternumfrage_loeschen.sql` (ebenfalls eingerichtet). Gemeinsame Hilfen: `elternumfrage/umfrage.js`.

## Standortgespräche (`standortgespraech/`)

Terminbuchung für die Standortgespräche (zuerst Klasse 9a). Link für Eltern: `https://ratpoison-de.github.io/pags-app/standortgespraech/` · QR-Code: `standortgespraech/qr-standortgespraech.png`

- **Eltern** (`standortgespraech/index.html`): Konto mit Benutzername und Kennwort – dasselbe Konto wie bei der Elternumfrage. Freie Viertelstunden-Termine antippen und buchen (Name, Name des Kindes, freiwillig Telefon und Anliegen). Belegte Termine sind für alle gesperrt und ohne Namen als „belegt“ sichtbar. Den eigenen Termin können Eltern verlegen, die Angaben ändern oder absagen. Ein Termin pro Konto. Andere Klassen: `standortgespraech/?klasse=9b`.
- **Lehrer** (`standortgespraech/lehrer.html`): Zugang mit dem Hauptschlüssel der Graduierung.
  - *Termine:* Sprechzeit anlegen (Tag + Zeitfenster von/bis → automatisch Viertelstunden-Termine; mehrere Fenster pro Tag möglich), einzelne Termine oder ganze Tage löschen, Eltern selbst eintragen, Buchungen bearbeiten, verlegen, absagen. Buchung für Eltern öffnen/schließen.
  - *Meldungen:* jede Buchung, Verlegung, Änderung und Absage; Zähler am Reiter, Hinweisbanner, Abfrage alle 30 Sekunden.
  - *Übersicht:* Tabelle nach Tagen; als PDF herunterladen (ohne Zusatzbibliothek erzeugt), drucken, als Text für Claude kopieren, CSV.
  - *Einstellungen:* Titel, Ort, Hinweis für die Eltern, Elternlink.
- Technik: Tabellen `public.gespraech_*` und Funktionen `gespraech_*` in `supabase/standortgespraech.sql` (Projekt pags-lernplaner, eingerichtet am 15.11.2026). Doppelbuchungen verhindert die Datenbank (eindeutiger Schlüssel auf dem Termin). Meldungen schreibt ein Trigger. E-Mail-Benachrichtigung: stündliche geplante Aufgabe ruft `gespraech_neue_meldungen_melden()` auf (`supabase/standortgespraech_meldung.sql`) und mailt Art und Termin, ohne Namen. Gemeinsame Hilfen: `standortgespraech/gespraech.js`.

## Englisch: Irregular Verbs Trainer (`englisch/irregular-verbs/`)

Trainer für die 98 unregelmäßigen Verben aus der „List of irregular verbs“ des Englischbuchs (S. 199–201), für Klasse 10 (M-Niveau). Link: `https://ratpoison-de.github.io/pags-app/englisch/irregular-verbs/` · QR-Code: `englisch/irregular-verbs/qr-irregular-verbs.png`

- **Zugang:** Benutzername und Kennwort selbst anlegen (keine E-Mail). Der Lernstand wird nach jeder Antwort in Supabase gespeichert (Tabelle `public.verben`). „⏸ Pause“ oder „Abmelden“ sichert die angefangene Übung; nach dem nächsten Anmelden – auch auf einem anderen Gerät – geht es an derselben Aufgabe weiter. Ohne Netz bleibt der Stand im Gerät und wird nachgeholt.
- **Übungsarten:** Karteikarten, Formen eintippen, Lückensätze, Schnellquiz (mit typischen Fallen wie *buyed*), Wiederholen (gemischt, unsichere Verben zuerst), Probetest mit Punkten und Note.
- **Auswahl:** alle Verben, unsichere, noch nicht geübte, Pakete à 10 in Buchreihenfolge, Muster AAA/ABB/ABA/ABC.
- **Lernstufen** (Leitner): neu → noch unsicher → geübt → gefestigt → sicher → Profi. Falsche Antworten kommen in derselben Runde noch einmal dran.
- Verbliste mit Suche, Musterfilter und Sprachausgabe (britisches Englisch); Fortschritt je Paket, Tage in Folge, Verlauf der Probetests.
- Verbdaten und Beispielsätze: `englisch/irregular-verbs/verbs.js`. Datenbank: `supabase/irregular-verbs.sql`.

## Landing Page aller Schul-Apps (`apps/`)

`https://ratpoison-de.github.io/pags-app/apps/` · QR-Code: `apps/qr/landing.png`

Alle Web-Apps für die PAGS auf einer Seite, getrennt nach **Schülern**, **Lehrkräften** und **Eltern** (auch die Apps aus `pags-lernplaner`, `lerntagebuch`, `unterrichtsplaner` und `tag-der-berufe`). Jede Karte hat „Öffnen“, wo vorhanden „Anleitung“ und einen QR-Code zum Zeigen über das Apple TV (`apps/qr/*.png`). Mit Suchfeld.

## Stimmabgabe Ausbildungsberufe 2026/27

`berufewahl/index.html` – Schülerinnen und Schüler wählen aus der Liste der Ausbildungsberufe genau **2 Berufe** und geben ihre Stimmen ab (Name + Klasse, jede Person nur einmal).
Link: `https://ratpoison-de.github.io/pags-app/berufewahl/` · QR-Code: `berufewahl/qr-berufewahl.png`

- Datenbank: Supabase-Projekt pags-lernplaner, Tabelle `public.berufewahl_stimmen` (per RLS gesperrt), Abgabe nur über `berufewahl_abstimmen()`. SQL: `supabase/berufewahl.sql`
- Auswertung: `select public.berufewahl_ergebnis();` (nur mit Service-Zugang) → JSON in `berufewahl/auswertung.py` geben → PDF mit Stimmen je Beruf (Reihenfolge der Liste) und Rangliste.

## Lehrkräfte: IT-Start für neue Lehrkräfte

`it-start/index.html` – Checkliste für neue Kolleginnen und Kollegen auf Grundlage des Medienkonzepts: 24 Punkte in fünf Bereichen (Zugänge, Unterricht, Datenschutz, Kommunikation, Medienkonzept). Abhaken mit automatischem Datum, Notizen je Punkt, Fortschrittsanzeige, Filter, Drucken/PDF, „Stand kopieren“ als Text sowie Sicherung als Datei speichern und laden (Gerätewechsel). Der Fortschritt bleibt im Browser des Geräts, es gibt keinen Server.
Link: `https://ratpoison-de.github.io/pags-app/it-start/` · QR-Code: `apps/qr/it-start.png`
Die Punkte stehen im Skript im Array `ITEMS`, die Bereiche in `CATS`.
