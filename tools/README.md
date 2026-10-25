# Quellen

- `kennenlernen.src.html`, `alltag.src.html`: Quellseiten mit Platzhaltern `{{LOGO}}` usw. für eingebettete Bilder (`assets/*.txt`, Data-URIs).
- `build.py`: erzeugt daraus eigenständige HTML-Dateien.
- `build_web.py`: erzeugt die GitHub-Pages-Fassung mit Supabase-Login (`alltag.html`) und `kennenlernen.html`.

Die Skripte erwarten die Ordnerstruktur der ursprünglichen Arbeitsumgebung (`src/`, `lokal/`); zum Aktualisieren von Inhalten genügt es meist, direkt `alltag.html` bzw. `kennenlernen.html` zu bearbeiten.
