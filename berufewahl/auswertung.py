#!/usr/bin/env python3
"""Auswertung der Stimmabgabe Ausbildungsberufe 2026/27 als PDF.

Eingabe: JSON-Ergebnis der Supabase-Funktion public.berufewahl_ergebnis()
  {"teilnehmer": 12, "klassen": {"9A": 12}, "stimmen": [["Bankkaufmann/-frau", 3], ...]}
Aufruf:  python3 auswertung.py ergebnis.json Ausgabe.pdf
Benötigt: pip install weasyprint
"""
import json, sys, html
from datetime import datetime
from zoneinfo import ZoneInfo
from weasyprint import HTML

ANGEFRAGT = {'Friseur/-in', 'Industrieelektroniker/-in', 'Notfallsanitäter/-in', 'Straßenbauer/-in'}


def bauen(d):
    stimmen = d.get('stimmen') or []
    teil = d.get('teilnehmer', 0)
    gesamt = sum(n for _, n in stimmen)
    hoch = max([n for _, n in stimmen] + [1])
    stand = datetime.now(ZoneInfo('Europe/Berlin')).strftime('%d.%m.%Y, %H:%M Uhr')
    klassen = ', '.join(f'{k}: {v}' for k, v in sorted((d.get('klassen') or {}).items())) or '–'

    def name(b):
        t = html.escape(b)
        return t + (' <span class="ang">(werden angefragt)</span>' if b in ANGEFRAGT else '')

    def zeile(b, n, rang=None):
        breite = 100 * n / hoch if hoch else 0
        r = f'<td class="rang">{rang}.</td>' if rang else ''
        return (f'<tr class="{"null" if n == 0 else ""}">{r}<td>{name(b)}</td>'
                f'<td class="bar"><div style="width:{breite:.1f}%"></div></td><td class="n">{n}</td></tr>')

    liste = ''.join(zeile(b, n) for b, n in stimmen)
    sortiert = sorted([s for s in stimmen if s[1] > 0], key=lambda s: (-s[1], stimmen.index(s)))
    rang, letzte, rangliste = 0, None, ''
    for i, (b, n) in enumerate(sortiert, 1):
        if n != letzte:
            rang, letzte = i, n
        rangliste += zeile(b, n, rang)
    if not rangliste:
        rangliste = '<tr><td colspan="4">Noch keine Stimmen abgegeben.</td></tr>'

    return f'''<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 11mm 15mm 13mm; @bottom-right {{ content: "Seite " counter(page) " von " counter(pages); font: 8pt "Liberation Sans", Arial; color: #777; }}
  @bottom-left {{ content: "PAGS Külsheim · Stand {stand}"; font: 8pt "Liberation Sans", Arial; color: #777; }} }}
body {{ font: 9.5pt/1.25 "Liberation Sans", Arial, sans-serif; color: #222; }}
h1 {{ font-size: 17pt; margin: 0; text-align: center; }}
.sub {{ text-align: center; margin: 2mm 0 4mm; color: #555; }}
.kpi {{ display: flex; gap: 4mm; margin-bottom: 3mm; }}
tr {{ page-break-inside: avoid; }}
.kpi div {{ flex: 1; border: 1px solid #ddd; border-radius: 3mm; padding: 2mm 3mm; }}
.kpi b {{ display: block; font-size: 15pt; color: #A81010; }}
.kpi span {{ font-size: 8.5pt; color: #666; }}
table {{ width: 100%; border-collapse: collapse; }}
th {{ text-align: left; font-size: 9pt; background: #A81010; color: #fff; padding: 1.6mm 2mm; }}
th.n {{ text-align: right; }}
td {{ padding: 0.55mm 2mm; border-bottom: 0.4pt solid #ddd; vertical-align: middle; }}
tr:nth-child(even) td {{ background: #faf7f6; }}
td.n {{ text-align: right; font-weight: bold; width: 14mm; font-size: 10.5pt; }}
td.bar {{ width: 48mm; }}
td.bar div {{ height: 3mm; background: #A81010; border-radius: 1mm; }}
tr.null td.bar div {{ display: none; }}
td.rang {{ width: 9mm; color: #666; }}
tr.null td {{ color: #999; }}
.ang {{ color: #888; font-size: 8.5pt; }}
h2 {{ font-size: 13pt; margin: 0 0 3mm; page-break-before: always; }}
</style></head><body>
<h1>Ausbildungsberufe 2026/2027</h1>
<p class="sub">Ergebnis der Stimmabgabe · Jede Schülerin und jeder Schüler hatte 2 Stimmen.</p>
<div class="kpi">
  <div><b>{teil}</b><span>Schülerinnen und Schüler haben abgestimmt</span></div>
  <div><b>{gesamt}</b><span>Stimmen insgesamt</span></div>
  <div><b style="font-size:10.5pt;line-height:1.5">{html.escape(klassen)}</b><span>Teilnahme nach Klassen</span></div>
</div>
<table><thead><tr><th>Ausbildungsberuf</th><th></th><th class="n">Stimmen</th></tr></thead><tbody>{liste}</tbody></table>
<h2>Rangliste (Berufe mit Stimmen)</h2>
<table><thead><tr><th>Platz</th><th>Ausbildungsberuf</th><th></th><th class="n">Stimmen</th></tr></thead><tbody>{rangliste}</tbody></table>
</body></html>'''


if __name__ == '__main__':
    daten = json.load(open(sys.argv[1], encoding='utf-8'))
    if isinstance(daten, list):  # Ausgabe von execute_sql: [{"berufewahl_ergebnis": {...}}]
        daten = daten[0].get('berufewahl_ergebnis', daten[0])
    HTML(string=bauen(daten)).write_pdf(sys.argv[2])
    print('PDF erstellt:', sys.argv[2])
