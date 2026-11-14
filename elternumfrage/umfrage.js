/* Elternumfrage – gemeinsame Hilfen für Eltern- und Lehrerseite (Datenbank, Texte, Datumsangaben) */
(function () {
  'use strict';
  const UF = {};
  const z2 = n => String(n).padStart(2, '0');

  UF.TYPEN = { abschnitt: 'Abschnitt (Überschrift)', skala: 'Skala 1–5', wahl: 'Eine Antwort wählen', mehrfach: 'Mehrere Antworten wählen', text: 'Freitext' };

  UF.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UF.datum = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : z2(d.getDate()) + '.' + z2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  UF.zeitpunkt = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : UF.datum(s) + ', ' + z2(d.getHours()) + ':' + z2(d.getMinutes()) + ' Uhr'; };
  /* Anonyme Abgaben tragen nur das Datum – dort keine Uhrzeit anzeigen */
  UF.abgabeZeit = a => a.anonym ? UF.datum(a.abgegeben_am) : UF.zeitpunkt(a.abgegeben_am);
  UF.zahl = (n, st) => n.toLocaleString('de-DE', { minimumFractionDigits: st || 0, maximumFractionDigits: st || 0 });

  /* Fragen ohne Abschnitte, Abschnitte als Schritte */
  UF.fragen = r => (r.fragen || []).filter(f => f.typ !== 'abschnitt');
  UF.schritte = function (r) {
    const s = []; let akt = null;
    (r.fragen || []).forEach(f => {
      if (f.typ === 'abschnitt') { akt = { titel: f.text, fragen: [] }; s.push(akt); }
      else { if (!akt) { akt = { titel: 'Fragen', fragen: [] }; s.push(akt); } akt.fragen.push(f); }
    });
    return s.filter(x => x.fragen.length);
  };
  UF.beantwortet = v => !(v == null || v === '' || (Array.isArray(v) && !v.length));
  /* Antwort als lesbarer Text */
  UF.text = function (f, v) {
    if (!UF.beantwortet(v)) return '';
    if (f.typ === 'skala') return v + ' von 5' + (v == 1 && f.links ? ' (' + f.links + ')' : v == 5 && f.rechts ? ' (' + f.rechts + ')' : '');
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  UF.rpc = async function (fn, body) {
    const c = window.PAGS_CONFIG || {};
    if (!c.supabaseUrl) throw new Error('Keine Datenbank eingerichtet.');
    const r = await fetch(c.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: c.supabaseAnonKey, Authorization: 'Bearer ' + c.supabaseAnonKey },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message || ''; } catch (e) { }
      const f = new Error(r.status === 404 ? 'Diese Funktion ist in der Datenbank noch nicht eingerichtet.' : (m || 'Fehler ' + r.status));
      f.status = r.status; f.fehlt = r.status === 404; throw f;
    }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };

  UF.GRUND = {
    eingabe: 'Bitte die Eingaben prüfen: Benutzername 3 bis 60 Zeichen, Kennwort mindestens 6 Zeichen.',
    vergeben: 'Dieser Benutzername ist schon vergeben. Bitte einen anderen wählen – oder oben auf „Anmelden“ tippen, wenn es Ihr Konto ist.',
    unbekannt: 'Diesen Benutzernamen gibt es noch nicht. Bitte prüfen oder ein neues Konto anlegen.',
    pw: 'Das Kennwort stimmt nicht.', gesperrt: 'Zu viele falsche Versuche. Bitte 10 Minuten warten.',
    voll: 'Es können gerade keine weiteren Konten angelegt werden. Bitte wenden Sie sich an den Klassenlehrer.',
    runde: 'Diese Umfrage gibt es nicht mehr.', geschlossen: 'Diese Umfrage ist inzwischen geschlossen.',
    doppelt: 'Für diese Umfrage wurde von Ihrem Konto schon eine Abgabe gemacht.', zugross: 'Die Antworten sind zu lang.',
    name: 'Bitte geben Sie für die Abgabe mit Namen Ihren Namen an (2 bis 80 Zeichen).',
    zugang: 'Der Zugangsschlüssel stimmt nicht.', hat_abgaben: 'Zu dieser Umfrage gibt es schon Abgaben. Die Fragen lassen sich nicht mehr ändern – kopieren Sie die Umfrage als neue Runde.',
    fehlt: 'Der Eintrag wurde nicht gefunden.', zulang: 'Die Rückmeldung ist zu lang (höchstens 4000 Zeichen).'
  };
  UF.ok = function (r) {
    if (!r || !r.ok) { const f = new Error(UF.GRUND[r && r.grund] || 'Das hat nicht geklappt.'); f.grund = (r && r.grund) || 'fehler'; throw f; }
    return r;
  };

  window.UF = UF;
})();
