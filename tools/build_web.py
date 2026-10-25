"""Erzeugt die GitHub-Pages-Fassung (Ordner pags-app/) aus den Quellen in src/.

alltag.html bekommt statt Artefakt-/Datei-Speichern eine Anmeldung per E-Mail-Link (Supabase)
und speichert die persönlichen Einträge automatisch – pro Nutzer, auf allen Geräten.
"""
import os, re, json, shutil, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'pags-app-build')

# Quellen erst normal bauen (füllt Logo/Bilder ein)
subprocess.run(['python3', os.path.join(SRC, 'build.py')], check=True)

s = open(os.path.join(ROOT, 'lokal', 'pags-alltag.html')).read()


def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)


def cut(start, end, new):
    """Ersetzt alles von start (inkl.) bis end (exkl.)."""
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + new + s[b:]


# ---------- Kopf: Titel, Manifest, Supabase-Bibliothek, Konfiguration ----------
rep('<title data-keep>PAGS Alltag</title>',
    '<title data-keep>PAGS Alltag</title>\n<meta name="theme-color" content="#A81010">\n'
    '<link rel="icon" href="icon.png">\n<link rel="apple-touch-icon" href="icon.png">\n<link rel="manifest" href="manifest.webmanifest">')

# ---------- CSS für Konto-Bereich ----------
rep('.sitefoot{', '''.acct{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);border-radius:3px;padding:4px 9px;font-size:13px;color:var(--head);cursor:pointer}
.acct:hover{border-color:var(--red);color:var(--red)}
.acct i{width:8px;height:8px;border-radius:50%;background:#bbb;display:inline-block}
.acct i.ok{background:var(--ok)}.acct i.busy{background:var(--warn)}.acct i.err{background:var(--red)}
.konto{border-top:3px solid var(--red)}
.konto .row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.konto input[type=email]{flex:1 1 220px;width:auto;border:1px solid var(--line);background:var(--alt);border-radius:3px;padding:9px 11px;min-width:0}
.konto input[type=email]:focus{border-color:var(--red);outline:none;background:#fff}
.konto .hint{font-size:13px;color:var(--muted)}
.btn.danger{background:#fff;color:var(--red);border-color:var(--red)}
.btn.danger:hover{background:var(--red-soft)}
@media (max-width:440px){.top .today{display:none}}
.sitefoot{''')

# ---------- Zustand: lokale Daten statt Entwurf ----------
rep("  var FRAMED = (function () { try { return window.top !== window.self; } catch (e) { return true; } })();\n", "")
rep("  var restore = null;\n", "")
rep("""  var LS_KEY = 'pags-alltag-entwurf';""", """  var LS_ANON = 'pags-alltag-daten';
  var CFG = window.PAGS_CONFIG || {};
  var sb = null, user = null, sync = 'lokal', pending = false, pushTimer = null, confirmDelete = false, loginSent = '';
  var BASE_LINKS = ORIGINAL.links.filter(function (l) { return !l.id; });""")
cut("  try {\n    var p = localStorage.getItem(LS_KEY);", "  function esc(s)", """  function personal() { return { termine: S.termine, notizen: S.notizen, links: S.links.filter(function (l) { return !!l.id; }) }; }
  function applyPersonal(p) {
    p = p || {};
    S.termine = Array.isArray(p.termine) ? p.termine : [];
    S.notizen = Array.isArray(p.notizen) ? p.notizen : [];
    S.links = BASE_LINKS.concat(Array.isArray(p.links) ? p.links : []);
  }
  function isEmpty(p) { return !p || !((p.termine || []).length || (p.notizen || []).length || (p.links || []).length); }
  function mergeById(a, b) {
    var seen = {}, out = [];
    (a || []).concat(b || []).forEach(function (x) { if (x && x.id && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
    return out;
  }
  function merge(a, b) { return { termine: mergeById(a.termine, b.termine), notizen: mergeById(a.notizen, b.notizen), links: mergeById(a.links, b.links) }; }
  function cacheKey() { return user ? LS_ANON + ':' + user.id : LS_ANON; }
  function readLocal(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeLocal() { try { localStorage.setItem(cacheKey(), JSON.stringify(personal())); } catch (e) {} }
  applyPersonal(readLocal(LS_ANON));

""")
rep("  function dirty() { return JSON.stringify(S) !== JSON.stringify(ORIGINAL); }\n", "")

# ---------- render(): Kopf-Chip, kein Entwurfs-Hinweis, Konto-Bereich, keine Speicherleiste ----------
rep("""Alltag</h1><span class="today">' + fmtShort(n.iso) + ' ' + n.hm + '</span></div></header>' +""",
    """Alltag</h1><span style="display:flex;align-items:center;gap:10px"><span class="today">' + fmtShort(n.iso) + ' ' + n.hm + '</span>' + acctChip() + '</span></div></header>' +""")
cut("        (restore ? '<div class=\"notice\">", "        '<h2>' + TABS", "")
cut("        '<footer class=\"meta\">'", "        '<div class=\"sitefoot\">", """        '<footer class="meta">' + (msg ? '<span role="status"><b>' + esc(msg) + '</b></span>' : '') +
        vKonto() +
        '<span>Schuldaten aus <a href="' + esc(S.quelle) + '" target="_blank" rel="noopener">pags-kuelsheim.de</a>, Stand ' + fmtShort(S.stand) + S.stand.slice(0, 4) + '.</span>' +
""")
cut("      (dirty() ? '<div class=\"savebar\">", "      '<nav class=\"tabs\"", "")
rep("""    if (!restore) { try { if (dirty()) localStorage.setItem(LS_KEY, JSON.stringify(S)); else localStorage.removeItem(LS_KEY); } catch (e) {} }\n""", "")

# ---------- Speicher-Logik ersetzen ----------
cut("  function canSave()", "  document.addEventListener('click'", r"""  // ---------- Konto & automatische Synchronisierung (Supabase) ----------
  var STATUS = {
    lokal: ['', 'Nur auf diesem Gerät'],
    laden: ['busy', 'Lädt …'],
    speichert: ['busy', 'Speichert …'],
    gespeichert: ['ok', 'Gespeichert'],
    offline: ['err', 'Offline – wird nachgeholt'],
    fehler: ['err', 'Nicht gespeichert']
  };
  function acctChip() {
    var st = STATUS[sync] || STATUS.lokal;
    var label = user ? st[1] : (sb ? 'Anmelden' : 'Nur auf diesem Gerät');
    return '<button class="acct" type="button" data-konto="1" title="Konto und Speicherung"><i class="' + (user ? st[0] : '') + '"></i>' + esc(label) + '</button>';
  }
  function vKonto() {
    var h = '<section class="panel konto" id="konto"><h3>Meine Daten</h3>';
    if (!sb) {
      h += '<p class="small">Ihre Termine, Notizen und Links werden in diesem Browser auf diesem Gerät gespeichert.' +
        (CFG.supabaseUrl ? ' Die Anmeldung ist gerade nicht erreichbar.' : ' Die Anmeldung für alle Geräte ist noch nicht eingerichtet.') + '</p>';
    } else if (!user) {
      h += '<p class="small">Melden Sie sich mit Ihrer E-Mail-Adresse an. Dann werden Ihre Termine, Notizen und Links automatisch gespeichert und stehen auf jedem Gerät bereit. Ein Passwort brauchen Sie nicht: Sie bekommen einen Anmeldelink per E-Mail.</p>' +
        (loginSent ? '<p class="small"><b>Link verschickt an ' + esc(loginSent) + '.</b> Öffnen Sie die E-Mail auf diesem Gerät und tippen Sie auf den Link.</p>' : '') +
        '<form data-form="login" class="row2"><label for="login-mail" class="sr" style="position:absolute;left:-9999px">E-Mail-Adresse</label><input id="login-mail" name="email" type="email" required autocomplete="email" placeholder="name@beispiel.de"><button class="btn" type="submit">Anmeldelink senden</button></form>' +
        '<p class="hint">Bis zur Anmeldung bleiben Ihre Einträge auf diesem Gerät. Bei der ersten Anmeldung werden sie in Ihr Konto übernommen.</p>';
    } else {
      var st = STATUS[sync] || STATUS.lokal;
      h += '<p class="small">Angemeldet als <b>' + esc(user.email || 'Nutzer') + '</b>. Änderungen werden automatisch gespeichert. Nur Sie sehen Ihre Einträge.</p>' +
        '<p class="small">Status: <b>' + esc(st[1]) + '</b></p>' +
        (confirmDelete
          ? '<p class="small"><b>Alle Ihre gespeicherten Termine, Notizen und Links endgültig löschen?</b></p><div class="row2"><button class="btn danger" type="button" data-delete-data="2">Ja, endgültig löschen</button><button class="btn ghost" type="button" data-delete-data="0">Abbrechen</button></div>'
          : '<div class="row2"><button class="btn ghost" type="button" data-logout="1">Abmelden</button><button class="btn ghost" type="button" data-delete-data="1">Meine Daten löschen</button></div>');
    }
    h += '<p class="hint">Gespeichert wird nur, was Sie hier selbst eintragen, und Ihre E-Mail-Adresse für die Anmeldung. ' +
      'Speicherort: ' + (sb ? 'Datenbank des Dienstes Supabase' + (CFG.region ? ' (' + esc(CFG.region) + ')' : '') : 'nur dieser Browser') + '.</p></section>';
    return h;
  }

  function setSync(v) {
    sync = v; var c = document.querySelector('.acct'); if (c) c.outerHTML = acctChip();
    var ae = document.activeElement; if (!(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) render();
  }

  // nach jeder Änderung: anzeigen, lokal sichern, bei Anmeldung verzögert hochladen
  function changed() {
    render(); writeLocal();
    if (user) { pending = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, 700); setSync('speichert'); }
  }

  function push() {
    if (!sb || !user) return;
    if (!navigator.onLine) { setSync('offline'); return; }
    setSync('speichert');
    var payload = personal();
    sb.from('pags_alltag').upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).then(function (r) {
      if (r.error) { pending = true; setSync(navigator.onLine ? 'fehler' : 'offline'); return; }
      if (JSON.stringify(payload) === JSON.stringify(personal())) pending = false;
      setSync(pending ? 'speichert' : 'gespeichert');
      if (pending) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 700); }
    }, function () { pending = true; setSync('offline'); });
  }

  // Daten vom Server holen; beim ersten Anmelden die Einträge dieses Geräts übernehmen
  function pull(firstLogin) {
    if (!sb || !user || pending) return;
    setSync('laden');
    sb.from('pags_alltag').select('data, updated_at').eq('user_id', user.id).maybeSingle().then(function (r) {
      if (r.error) { setSync(navigator.onLine ? 'fehler' : 'offline'); return; }
      var remote = (r.data && r.data.data) || null;
      var anon = firstLogin ? readLocal(LS_ANON) : null;
      if (anon && !isEmpty(anon)) {
        applyPersonal(remote ? merge(remote, anon) : anon);
        try { localStorage.removeItem(LS_ANON); } catch (e) {}
        msg = 'Ihre Einträge von diesem Gerät wurden in Ihr Konto übernommen.';
        changed(); return;
      }
      if (remote) applyPersonal(remote);
      else if (!r.data && !isEmpty(personal())) { changed(); return; }
      writeLocal(); sync = 'gespeichert'; render();
    }, function () { setSync('offline'); });
  }

  function onSession(session, event) {
    var before = user && user.id;
    user = session ? session.user : null;
    if (user && user.id !== before) {
      applyPersonal(readLocal(cacheKey()) || readLocal(LS_ANON));
      loginSent = '';
      if (event === 'SIGNED_IN' && /access_token|code=/.test(location.href)) { try { history.replaceState(null, '', location.pathname + '#heute'); } catch (e) {} }
      render(); pull(true);
    } else if (!user && before) {
      applyPersonal(readLocal(LS_ANON)); sync = 'lokal'; render();
    }
  }

  function initSync() {
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase || !window.supabase.createClient) { render(); return; }
    try {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    } catch (e) { sb = null; render(); return; }
    sb.auth.onAuthStateChange(function (event, session) { setTimeout(function () { onSession(session, event); }, 0); });
    sb.auth.getSession().then(function (r) { onSession(r.data && r.data.session, 'INITIAL'); render(); });
    window.addEventListener('online', function () { if (pending) push(); else pull(false); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && user && !pending) pull(false); });
    setInterval(function () { if (user && pending) push(); }, 30000);
  }

  function login(email) {
    if (!sb) return;
    msg = '';
    sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
      if (r.error) { msg = /rate|seconds/i.test(r.error.message || '') ? 'Bitte warten Sie kurz, bevor Sie einen neuen Link anfordern.' : 'Der Anmeldelink konnte nicht verschickt werden. Bitte prüfen Sie die Adresse.'; }
      else loginSent = email;
      render();
    });
  }
  function logout() {
    if (!sb) return;
    try { localStorage.removeItem(cacheKey()); } catch (e) {}
    sb.auth.signOut().then(function () { user = null; applyPersonal(readLocal(LS_ANON)); sync = 'lokal'; msg = 'Sie sind abgemeldet. Ihre Einträge bleiben in Ihrem Konto gespeichert.'; render(); });
  }
  function deleteData() {
    if (!sb || !user) return;
    sb.from('pags_alltag').delete().eq('user_id', user.id).then(function (r) {
      confirmDelete = false;
      if (r.error) { msg = 'Löschen hat nicht geklappt. Bitte später noch einmal versuchen.'; render(); return; }
      pending = false; applyPersonal({}); try { localStorage.removeItem(cacheKey()); } catch (e) {}
      msg = 'Ihre gespeicherten Daten wurden gelöscht.'; sync = 'gespeichert'; render();
    });
  }

""")

# ---------- Klick- und Formular-Handler ----------
rep("if (d.delTermin) { S.termine = S.termine.filter(function (x) { return x.id !== d.delTermin; }); render(); return; }",
    "if (d.delTermin) { S.termine = S.termine.filter(function (x) { return x.id !== d.delTermin; }); changed(); return; }")
rep("if (d.delNote) { S.notizen = S.notizen.filter(function (x) { return x.id !== d.delNote; }); render(); return; }",
    "if (d.delNote) { S.notizen = S.notizen.filter(function (x) { return x.id !== d.delNote; }); changed(); return; }")
rep("if (d.delLink) { S.links = S.links.filter(function (x) { return x.id !== d.delLink; }); render(); return; }",
    "if (d.delLink) { S.links = S.links.filter(function (x) { return x.id !== d.delLink; }); changed(); return; }")
cut("    if (d.discard) {", "  });\n  function sel(b)", """    if (d.konto) { var k = document.getElementById('konto'); if (k) k.scrollIntoView({ block: 'center' }); var m = document.getElementById('login-mail'); if (m) m.focus(); return; }
    if (d.logout) { logout(); return; }
    if (d.deleteData) { if (d.deleteData === '2') deleteData(); else { confirmDelete = d.deleteData === '1'; render(); } return; }
""")
rep("""    if (f.dataset.form === 'termin') {""", """    if (f.dataset.form === 'login') { if (v.email) login(v.email); return; }
    if (f.dataset.form === 'termin') {""")
rep("""      S.links.push({ id: uid(), gruppe: 'Eigene Links', titel: v.titel, url: v.url });
    }
    msg = ''; render();""", """      S.links.push({ id: uid(), gruppe: 'Eigene Links', titel: v.titel, url: v.url });
    }
    msg = ''; changed();""")
cut("  document.addEventListener('keydown',", "  render();\n  setInterval(", "")
cut("  (function initCaps(tries) {", "})();\n</script>", "  initSync();\n")

# Reste der alten Logik dürfen nicht mehr vorkommen
for bad in ['buildDoc', 'saveLocal', 'claude.use', 'LS_KEY', 'restore', 'dirty()', 'data-save', 'FRAMED', 'canDownload']:
    assert bad not in s.split('<script id="pags-app">')[1], bad
s = s.replace('<script type="application/json" id="pags-data">',
              '<script src="config.js?v=2"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n<script type="application/json" id="pags-data">')

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'alltag.html'), 'w').write(s)
k = open(os.path.join(ROOT, 'lokal', 'pags-kennenlernen.html')).read()
k = k.replace('<title>PAGS kennenlernen</title>', '<title>PAGS kennenlernen</title>\n<meta name="theme-color" content="#A81010">\n<link rel="icon" href="icon.png">\n<link rel="apple-touch-icon" href="icon.png">')
open(os.path.join(OUT, 'kennenlernen.html'), 'w').write(k)
print('pags-app/alltag.html', round(len(s) / 1024), 'KB; kennenlernen.html', round(len(k) / 1024), 'KB')
