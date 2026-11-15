/* Standortgespräche – gemeinsame Hilfen für Eltern- und Lehrerseite (Datenbank, Texte, Datumsangaben) */
(function () {
  'use strict';
  const G = {}, TZ = 'Europe/Berlin';
  const f = o => new Intl.DateTimeFormat('de-DE', Object.assign({ timeZone: TZ }, o));
  const F = {
    key: new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }),
    lang: f({ weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
    kurz: f({ weekday: 'short', day: '2-digit', month: '2-digit' }),
    datum: f({ day: '2-digit', month: '2-digit', year: 'numeric' }),
    uhr: f({ hour: '2-digit', minute: '2-digit' })
  };

  G.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  G.tagKey = s => F.key.format(new Date(s));                       // 2026-11-24
  G.tagLang = s => F.lang.format(new Date(s));                     // Dienstag, 24.11.2026
  G.tagKurz = s => F.kurz.format(new Date(s));                     // Di., 24.11.
  G.datum = s => s ? F.datum.format(new Date(s)) : '';
  G.uhr = s => F.uhr.format(new Date(s));                          // 15:15
  G.ende = t => new Date(new Date(t.beginn).getTime() + (t.dauer || 15) * 60000);
  G.zeitraum = t => G.uhr(t.beginn) + '–' + G.uhr(G.ende(t)) + ' Uhr';
  G.zeitpunkt = s => s ? G.datum(s) + ', ' + G.uhr(s) + ' Uhr' : '';
  G.termin = t => G.tagLang(t.beginn) + ', ' + G.zeitraum(t);
  /* Termine nach Tagen gruppieren */
  G.tage = function (termine) {
    const m = new Map();
    termine.forEach(t => { const k = G.tagKey(t.beginn); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
    return [...m.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([key, l]) => ({ key, termine: l.sort((a, b) => new Date(a.beginn) - new Date(b.beginn)) }));
  };

  G.rpc = async function (fn, body) {
    const c = window.PAGS_CONFIG || {};
    if (!c.supabaseUrl) throw new Error('Keine Datenbank eingerichtet.');
    const r = await fetch(c.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: c.supabaseAnonKey, Authorization: 'Bearer ' + c.supabaseAnonKey },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message || ''; } catch (e) { }
      const x = new Error(r.status === 404 ? 'Diese Funktion ist in der Datenbank noch nicht eingerichtet.' : (m || 'Fehler ' + r.status));
      x.status = r.status; throw x;
    }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };

  G.GRUND = {
    eingabe: 'Bitte die Eingaben prüfen: Benutzername 3 bis 60 Zeichen, Kennwort mindestens 6 Zeichen.',
    vergeben: 'Dieser Benutzername ist schon vergeben. Bitte einen anderen wählen – oder oben auf „Anmelden“ tippen, wenn es Ihr Konto ist.',
    unbekannt: 'Diesen Benutzernamen gibt es noch nicht. Bitte prüfen oder ein neues Konto anlegen.',
    pw: 'Das Kennwort stimmt nicht.', gesperrt: 'Zu viele falsche Versuche. Bitte 10 Minuten warten.',
    voll: 'Es können gerade keine weiteren Einträge angelegt werden.',
    name: 'Bitte die Namen prüfen (höchstens 80 Zeichen).',
    termin: 'Diesen Termin gibt es nicht mehr.', zu: 'Die Buchung ist zurzeit nicht geöffnet.',
    vorbei: 'Dieser Termin liegt in der Vergangenheit und lässt sich nicht mehr ändern.',
    belegt: 'Dieser Termin wurde gerade eben schon vergeben. Bitte wählen Sie einen anderen.',
    angaben: 'Bitte geben Sie Ihren Namen und den Namen Ihres Kindes an (je 2 bis 80 Zeichen).',
    zugang: 'Der Zugangsschlüssel stimmt nicht.', fehlt: 'Der Eintrag wurde nicht gefunden.',
    fenster: 'Bitte Datum und Zeitfenster prüfen: Das Ende muss mindestens 15 Minuten nach dem Anfang liegen.',
    gebucht: 'Darunter sind gebuchte Termine.'
  };
  G.ok = function (r) {
    if (!r || !r.ok) { const x = new Error(G.GRUND[r && r.grund] || 'Das hat nicht geklappt.'); x.grund = (r && r.grund) || 'fehler'; x.daten = r; throw x; }
    return r;
  };

  window.G = G;
})();
