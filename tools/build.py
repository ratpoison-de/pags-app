"""Baut die PAGS-Seiten aus src/: Artefakt-Fassung (ohne Dokumentgerüst) und lokale, eigenständige HTML-Dateien."""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
A = lambda n: open(os.path.join(SRC, 'assets', n)).read().strip()
PH = {
    '{{LOGO}}': A('logo.txt'), '{{HERO}}': A('hero.txt'), '{{SSD}}': A('ssd.txt'),
    '{{T_GS}}': A('teaser-grundschule.txt'), '{{T_SEK}}': A('teaser-sekundarstufe.txt'),
    '{{T_GMS}}': A('teaser-gemeinschaftsschule.txt'), '{{T_GTS}}': A('teaser-ganztagsschule.txt'),
}
BASE = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}'


def fill(s):
    for k, v in PH.items():
        s = s.replace(k, v)
    assert '{{' not in s, re.findall(r'\{\{\w+\}\}', s)
    return s


def standalone(s):
    s = re.sub(r'<meta (data-keep )?name="claude:viewport-fit-sides" content="cover">\n', '', s)
    i = s.index('</style>') + len('</style>')
    return ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style id="base-reset">' + BASE + '</style>\n' + s[:i] + '\n</head>\n<body>' + s[i:] + '\n</body>\n</html>\n')


os.makedirs(os.path.join(ROOT, 'lokal'), exist_ok=True)
for src, name in [('kennenlernen.src.html', 'pags-kennenlernen.html'), ('alltag.src.html', 'pags-alltag.html')]:
    s = fill(open(os.path.join(SRC, src)).read())
    if 'pags-data' in s:
        json.loads(re.search(r'id="pags-data">(.*?)</script>', s, re.S).group(1))
    open(os.path.join(ROOT, name), 'w').write(s)
    open(os.path.join(ROOT, 'lokal', name), 'w').write(standalone(s))
    print(name, round(len(s) / 1024), 'KB')
