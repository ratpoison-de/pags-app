/* Praktikums-App der PAGS – gemeinsame Logik für Schülerseite (index.html) und Lehrerseite (lehrer.html):
   Datenmodell, Fortschritt, Bericht aus den Einträgen erzeugen, PDF bauen, Supabase-Aufrufe. */
(function () {
  'use strict';
  const PB = {};

  PB.START = '2026-11-16';              // Montag der Praktikumswoche (Schüler können das Datum anpassen)
  PB.SCHULE = 'Pater-Alois-Grimm-Schule Külsheim';
  PB.SCHULTEL = '09345 / 333';
  PB.LEHRER = 'Thorsten von Plotho-Kettner';
  PB.WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  PB.STIMMUNG = ['', 'sehr schlecht', 'eher schlecht', 'mittel', 'gut', 'super'];
  PB.SELBST = [
    ['puenktlich', 'Ich war pünktlich.'],
    ['zuverlaessig', 'Ich habe Aufgaben zuverlässig erledigt.'],
    ['interesse', 'Ich habe Interesse gezeigt und nachgefragt.'],
    ['selbst', 'Ich habe selbstständig gearbeitet.'],
    ['team', 'Ich bin mit den Menschen im Betrieb gut zurechtgekommen.'],
    ['ausdauer', 'Ich habe auch bei anstrengenden Aufgaben durchgehalten.']
  ];
  PB.SKALA = ['', 'trifft nicht zu', 'trifft eher nicht zu', 'trifft eher zu', 'trifft voll zu'];
  PB.VORSTELLBAR = ['', 'Nein, auf keinen Fall.', 'Eher nicht.', 'Ich bin unsicher.', 'Eher ja.', 'Ja, auf jeden Fall.'];

  /* ---------- Datenmodell ---------- */
  PB.leer = function () {
    return {
      v: 1, start: PB.START,
      betrieb: {}, check: {}, erw: {},
      tage: [{}, {}, {}, {}, {}],
      erk: {}, beruf: {},
      interview: { person: '', qa: [] },
      vorgang: { titel: '', material: '', schritte: [] },
      rb: { selbst: {} },
      bericht: null
    };
  };
  const istObj = o => o && typeof o === 'object' && !Array.isArray(o);
  PB.normal = function (d) {
    const l = PB.leer();
    if (!istObj(d)) return l;
    ['betrieb', 'check', 'erw', 'erk', 'beruf'].forEach(k => { if (istObj(d[k])) l[k] = d[k]; });
    if (/^\d{4}-\d\d-\d\d$/.test(d.start || '')) l.start = d.start;
    if (Array.isArray(d.tage)) for (let i = 0; i < 5; i++) if (istObj(d.tage[i])) l.tage[i] = d.tage[i];
    if (istObj(d.interview)) {
      l.interview.person = String(d.interview.person || '');
      if (Array.isArray(d.interview.qa)) l.interview.qa = d.interview.qa.filter(istObj).map(q => ({ f: String(q.f || ''), a: String(q.a || '') }));
    }
    if (istObj(d.vorgang)) {
      l.vorgang.titel = String(d.vorgang.titel || ''); l.vorgang.material = String(d.vorgang.material || '');
      if (Array.isArray(d.vorgang.schritte)) l.vorgang.schritte = d.vorgang.schritte.map(s => String(s || ''));
    }
    if (istObj(d.rb)) { l.rb = d.rb; if (!istObj(l.rb.selbst)) l.rb.selbst = {}; }
    if (istObj(d.bericht) && Array.isArray(d.bericht.teile)) {
      l.bericht = { erstellt: d.bericht.erstellt || null, teile: d.bericht.teile.filter(istObj).map(t => ({ titel: String(t.titel || ''), text: String(t.text || '') })) };
    }
    return l;
  };

  /* ---------- Datum ---------- */
  PB.tagDatum = function (start, i) {
    const p = String(start || PB.START).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2] + i);
  };
  const z2 = n => String(n).padStart(2, '0');
  PB.kurz = d => z2(d.getDate()) + '.' + z2(d.getMonth() + 1) + '.';
  PB.lang = d => z2(d.getDate()) + '.' + z2(d.getMonth() + 1) + '.' + d.getFullYear();
  PB.wtag = d => PB.WOCHENTAGE[(d.getDay() + 6) % 7];
  PB.iso = d => d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate());
  PB.zeitpunkt = function (s) {
    if (!s) return '';
    const d = new Date(s); if (isNaN(d)) return '';
    return PB.lang(d) + ', ' + z2(d.getHours()) + ':' + z2(d.getMinutes()) + ' Uhr';
  };
  /* Wo steht die Woche? -> {phase:'vor'|'in'|'nach', tag:0..4|-1, bis:Tage bis Start} */
  PB.phase = function (start, heute) {
    const h = heute || new Date(); const h0 = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    const diff = Math.round((h0 - PB.tagDatum(start, 0)) / 86400000);
    if (diff < 0) return { phase: 'vor', tag: -1, bis: -diff };
    if (diff <= 4) return { phase: 'in', tag: diff, bis: 0 };
    return { phase: 'nach', tag: -1, bis: 0 };
  };

  /* ---------- Fortschritt ---------- */
  const t = s => String(s == null ? '' : s).trim();
  const voll = (o, keys) => keys.filter(k => t(o && o[k])).length;
  PB.CHECK_ANZAHL = 12;
  PB.tagStand = function (tag) {          // 0 = leer, 1 = angefangen, 2 = fertig
    if (!tag) return 0;
    if (tag.status === 'fehlt') return 2;
    const n = voll(tag, ['taetigkeiten', 'gelernt', 'highlight', 'schwierig', 'werkzeuge']) + (tag.stimmung ? 1 : 0);
    if (t(tag.taetigkeiten) && t(tag.gelernt) && tag.stimmung) return 2;
    return n ? 1 : 0;
  };
  /* Liste aller Bereiche mit Stand – für Startseite, Bericht-Check und Lehrerübersicht */
  PB.stand = function (d) {
    const teil = (n, max) => (n >= max ? 2 : n > 0 ? 1 : 0);
    const haken = Object.keys(d.check || {}).filter(k => d.check[k]).length;
    const qa = d.interview.qa.filter(q => t(q.f) && t(q.a)).length;
    const schritte = d.vorgang.schritte.filter(t).length;
    const selbst = PB.SELBST.filter(s => d.rb.selbst[s[0]]).length;
    const rbN = voll(d.rb, ['erfuellt', 'gefallen', 'nichtgefallen', 'gelernt', 'begruendung', 'zukunft']) + (d.rb.vorstellbar ? 1 : 0) + (selbst === PB.SELBST.length ? 1 : 0);
    return [
      { id: 'steckbrief', titel: 'Mein Betrieb (Steckbrief)', tab: 'vor', stand: teil(voll(d.betrieb, ['name', 'ort', 'ansprech', 'tel', 'zeiten', 'beruf']), 6) },
      { id: 'check', titel: 'Checkliste', tab: 'vor', stand: teil(haken, PB.CHECK_ANZAHL), info: haken + ' von ' + PB.CHECK_ANZAHL },
      { id: 'erw', titel: 'Meine Erwartungen', tab: 'vor', stand: teil(voll(d.erw, ['warum', 'erwartung', 'fragen', 'staerken']), 4) },
      { id: 'woche', titel: 'Tagesberichte', tab: 'woche', stand: teil(d.tage.filter(x => PB.tagStand(x) === 2).length, 5), info: d.tage.filter(x => PB.tagStand(x) === 2).length + ' von 5' },
      { id: 'erk', titel: 'Betrieb erkunden', tab: 'erkunden', stand: teil(voll(d.erk, ['produkt', 'mitarbeiter', 'abteilungen', 'kunden']), 4) },
      { id: 'beruf', titel: 'Berufsbild', tab: 'erkunden', stand: teil(voll(d.beruf, ['name', 'dauer', 'abschluss', 'taetigkeiten', 'anforderungen']), 5) },
      { id: 'vorgang', titel: 'Arbeitsvorgang', tab: 'erkunden', stand: t(d.vorgang.titel) && schritte >= 3 ? 2 : (t(d.vorgang.titel) || schritte ? 1 : 0) },
      { id: 'interview', titel: 'Interview', tab: 'erkunden', stand: qa >= 3 ? 2 : (qa || t(d.interview.person) ? 1 : 0), info: qa + ' Antworten' },
      { id: 'rb', titel: 'Rückblick', tab: 'bericht', stand: teil(rbN, 8) }
    ];
  };

  /* ---------- Bericht aus den Einträgen erzeugen ---------- */
  function absatz(label, text) { text = t(text); return text ? (label ? label + ': ' : '') + text : ''; }
  function liste(text) {
    return t(text).split(/\n+/).map(z => z.replace(/^\s*[-–•*]\s*/, '').trim()).filter(Boolean).map(z => '– ' + z).join('\n');
  }
  PB.zeitraum = function (d) { return PB.lang(PB.tagDatum(d.start, 0)) + ' bis ' + PB.lang(PB.tagDatum(d.start, 4)); };

  PB.teile = function (d) {
    const b = d.betrieb, out = [];
    const neu = (titel, abs) => out.push({ titel: titel, text: abs.filter(Boolean).join('\n\n') });

    // 1 Betrieb
    let ein = [];
    if (t(b.name)) ein.push('Mein Praktikum habe ich vom ' + PB.zeitraum(d) + ' bei ' + t(b.name) + (t(b.ort) ? ' (' + t(b.ort) + ')' : '') + ' gemacht.');
    else ein.push('Mein Praktikum fand vom ' + PB.zeitraum(d) + ' statt.');
    if (t(b.branche)) ein.push('Der Betrieb gehört zum Bereich ' + t(b.branche) + '.');
    if (t(b.beruf)) ein.push('Dort habe ich den Beruf ' + t(b.beruf) + ' kennengelernt.');
    if (t(b.ansprech)) ein.push('Betreut hat mich ' + t(b.ansprech) + '.');
    if (t(b.zeiten)) ein.push('Meine Arbeitszeit: ' + t(b.zeiten) + '.');
    if (t(b.weg)) ein.push('Mein Weg zum Betrieb: ' + t(b.weg) + '.');
    neu('Mein Praktikumsbetrieb', [
      ein.join(' ').replace(/\.\.( |$)/g, '.$1'),
      absatz('Das macht der Betrieb', d.erk.produkt),
      absatz('Mitarbeiterinnen und Mitarbeiter', d.erk.mitarbeiter),
      absatz('Abteilungen und Bereiche', d.erk.abteilungen),
      absatz('Kundinnen und Kunden', d.erk.kunden),
      absatz('Das ist mir besonders aufgefallen', d.erk.besonderes)
    ]);

    // 2 Erwartungen
    neu('Meine Erwartungen vor dem Praktikum', [
      absatz('Darum habe ich mich für diesen Praktikumsplatz entschieden', d.erw.warum),
      absatz('Das habe ich erwartet', d.erw.erwartung),
      absatz('Das wollte ich herausfinden', d.erw.fragen),
      absatz('Davor hatte ich Respekt', d.erw.respekt),
      absatz('Diese Stärken bringe ich mit', d.erw.staerken)
    ]);

    // 3 Berufsbild
    const bn = t(d.beruf.name) || t(b.beruf);
    neu('Der Beruf' + (bn ? ': ' + bn : ''), [
      absatz('Dauer der Ausbildung', d.beruf.dauer),
      absatz('Benötigter Schulabschluss', d.beruf.abschluss),
      t(d.beruf.taetigkeiten) ? 'Typische Tätigkeiten:\n' + liste(d.beruf.taetigkeiten) : '',
      absatz('Das muss man für den Beruf können und mitbringen', d.beruf.anforderungen),
      absatz('Arbeitsorte und Arbeitszeiten', d.beruf.orte),
      absatz('Möglichkeiten nach der Ausbildung', d.beruf.chancen)
    ]);

    // 4 Tagesberichte
    d.tage.forEach((tag, i) => {
      const dat = PB.tagDatum(d.start, i);
      const titel = 'Tagesbericht ' + (i + 1) + ' – ' + PB.wtag(dat) + ', ' + PB.lang(dat);
      if (tag.status === 'fehlt') { neu(titel, ['An diesem Tag war ich nicht im Betrieb.' + (t(tag.grund) ? ' Grund: ' + t(tag.grund) : '')]); return; }
      let zeit = '';
      if (t(tag.von) && t(tag.bis)) zeit = 'Arbeitszeit: ' + tag.von + ' bis ' + tag.bis + ' Uhr' + (t(tag.pause) ? ', Pause: ' + t(tag.pause) : '') + '.';
      neu(titel, [
        zeit,
        absatz(i === 0 ? 'Mein erster Eindruck' : '', tag.eindruck),
        t(tag.taetigkeiten) ? 'Das habe ich gemacht:\n' + liste(tag.taetigkeiten) : '',
        absatz('Damit habe ich gearbeitet', tag.werkzeuge),
        absatz('Das habe ich Neues gelernt', tag.gelernt),
        absatz('Das war schwierig', tag.schwierig),
        absatz('Das Beste an diesem Tag', tag.highlight),
        tag.stimmung ? 'So ging es mir an diesem Tag: ' + PB.STIMMUNG[tag.stimmung] + '.' : ''
      ]);
    });

    // 5 Arbeitsvorgang
    const schritte = d.vorgang.schritte.filter(t);
    neu('Ein Arbeitsvorgang Schritt für Schritt' + (t(d.vorgang.titel) ? ': ' + t(d.vorgang.titel) : ''), [
      absatz('Das braucht man dafür', d.vorgang.material),
      schritte.map((s, i) => (i + 1) + '. ' + t(s)).join('\n'),
      absatz('Darauf muss man besonders achten', d.vorgang.achten)
    ]);

    // 6 Interview
    const qa = d.interview.qa.filter(q => t(q.f) && t(q.a));
    neu('Interview', [
      qa.length && t(d.interview.person) ? 'Ich habe ' + t(d.interview.person) + ' befragt.' : '',
      qa.map(q => 'Frage: ' + t(q.f) + '\nAntwort: ' + t(q.a)).join('\n\n')
    ]);

    // 7 Rückblick
    const r = d.rb;
    const selbst = PB.SELBST.filter(s => r.selbst[s[0]]).map(s => '– ' + s[1] + ' → ' + PB.SKALA[r.selbst[s[0]]]).join('\n');
    neu('Mein Rückblick', [
      absatz('Haben sich meine Erwartungen erfüllt?', r.erfuellt).replace('?: ', '? '),
      absatz('Das hat mir gut gefallen', r.gefallen),
      absatz('Das hat mir nicht so gut gefallen', r.nichtgefallen),
      absatz('Das habe ich über mich und die Arbeitswelt gelernt', r.gelernt),
      selbst ? 'So schätze ich mich selbst ein:\n' + selbst : '',
      r.vorstellbar ? 'Kann ich mir vorstellen, später in diesem Beruf zu arbeiten? ' + PB.VORSTELLBAR[r.vorstellbar] + (t(r.begruendung) ? ' ' + t(r.begruendung) : '') : absatz('', r.begruendung),
      absatz('So geht es für mich weiter', r.zukunft),
      absatz('Mein Dank', r.dank)
    ]);
    return out;
  };

  /* Welche Teile gelten für einen Datensatz? Gespeicherter Bericht, sonst frisch aus den Einträgen. */
  PB.berichtTeile = function (d, immerNeu) {
    if (!immerNeu && d.bericht && d.bericht.teile && d.bericht.teile.length) return d.bericht.teile;
    return PB.teile(d);
  };

  /* ---------- PDF ---------- */
  let LOGO = null;
  PB.ladeLogo = function (url) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); LOGO = { url: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }; } catch (e) { } res(); };
      im.onerror = () => res(); im.src = url;
    });
  };
  /* Die Standardschrift im PDF kennt nur westeuropäische Zeichen: Emojis und Sonderzeichen ersetzen. */
  PB.pdfText = function (s) {
    return String(s == null ? '' : s)
      .replace(/[„“”«»]/g, '"').replace(/[‚‘’]/g, "'").replace(/[–—−]/g, '-').replace(/…/g, '...')
      .replace(/→/g, '->').replace(/•/g, '-').replace(/ /g, ' ').replace(/\t/g, ' ')
      .replace(/[^\n\x20-\x7E¡-ÿ€]/g, '').replace(/[ ]{2,}/g, ' ');
  };
  PB.dateiname = function (rec) {
    return 'Praktikumsbericht_' + String(rec.name || 'Bericht').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.pdf';
  };

  /* recs: [{name, klasse, data, abgegeben_am, updated_at}], opt.immerNeu: aktuelle Einträge statt gespeichertem Bericht */
  PB.pdf = function (recs, opt) {
    opt = opt || {};
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, L = 22, R = 22, OBEN = 24, UNTEN = 22, B = W - L - R;
    const ROT = [168, 16, 16], GRAU = [110, 110, 110], TEXT = [40, 40, 40];
    const T = PB.pdfText;

    recs.forEach((rec, nr) => {
      const d = PB.normal(rec.data);
      if (nr > 0) doc.addPage();
      const ersteSeite = doc.getNumberOfPages();

      /* Deckblatt */
      doc.setFillColor.apply(doc, ROT); doc.rect(0, 0, W, 8, 'F');
      let y = 30;
      if (LOGO) { const h = 26, w = h * LOGO.w / LOGO.h; doc.addImage(LOGO.url, 'PNG', (W - w) / 2, y, w, h); y += h + 8; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor.apply(doc, GRAU);
      doc.text(T(PB.SCHULE), W / 2, y, { align: 'center' }); y += 34;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor.apply(doc, ROT);
      doc.text('Praktikumsbericht', W / 2, y, { align: 'center' }); y += 12;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor.apply(doc, TEXT);
      doc.text(T('Betriebspraktikum vom ' + PB.zeitraum(d)), W / 2, y, { align: 'center' }); y += 30;

      const zeilen = [['Name', rec.name], ['Klasse', rec.klasse], ['Betrieb', d.betrieb.name], ['Ort', d.betrieb.ort],
        ['Beruf', d.beruf.name || d.betrieb.beruf], ['Betreuung im Betrieb', d.betrieb.ansprech], ['Lehrer', PB.LEHRER]].filter(z => t(z[1]));
      doc.setFontSize(12);
      zeilen.forEach(z => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GRAU); doc.text(T(z[0]), L + 14, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, TEXT);
        const zl = doc.splitTextToSize(T(z[1]), B - 14 - 52); doc.text(zl, L + 14 + 52, y);
        y += 7 * zl.length + 1.5; doc.setDrawColor(225); doc.line(L + 14, y - 4.6, W - R - 14, y - 4.6);
      });
      doc.setFontSize(10); doc.setTextColor.apply(doc, GRAU);
      const fuss = rec.abgegeben_am && !opt.immerNeu ? 'Abgegeben am ' + PB.zeitpunkt(rec.abgegeben_am)
        : 'Entwurf – noch nicht abgegeben' + (rec.updated_at ? ' (Stand: ' + PB.zeitpunkt(rec.updated_at) + ')' : '');
      doc.text(T(fuss), W / 2, H - 30, { align: 'center' });

      /* Inhalt */
      const teile = PB.berichtTeile(d, opt.immerNeu).filter(x => t(x.text));
      doc.addPage(); y = OBEN;
      const platz = h => { if (y + h > H - UNTEN) { doc.addPage(); y = OBEN; } };
      if (!teile.length) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor.apply(doc, GRAU);
        doc.text('Noch keine Einträge vorhanden.', L, y);
      }
      teile.forEach((teil, i) => {
        platz(24);
        if (i > 0) y += 5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, ROT);
        const kopf = doc.splitTextToSize(T((i + 1) + '  ' + teil.titel), B);
        doc.text(kopf, L, y); y += 6.2 * kopf.length;
        doc.setDrawColor.apply(doc, ROT); doc.setLineWidth(0.4); doc.line(L, y - 3.4, W - R, y - 3.4); doc.setLineWidth(0.2);
        y += 3.5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor.apply(doc, TEXT);
        T(teil.text).split('\n').forEach(zeile => {
          if (!zeile.trim()) { y += 3; return; }
          const einzug = /^(- |\d+\. )/.test(zeile) ? 5 : 0;
          const m = zeile.match(/^(- |\d+\. )/);
          const rest = m ? zeile.slice(m[0].length) : zeile;
          const zl = doc.splitTextToSize(rest, B - einzug - (m ? 2 : 0));
          zl.forEach((z, k) => {
            platz(5.6);
            if (m && k === 0) doc.text(m[0].trim(), L + 1, y);
            doc.text(z, L + (m ? einzug + 2 : 0), y); y += 5.6;
          });
          y += 1.2;
        });
      });

      /* Fußzeilen (ohne Deckblatt) */
      const letzte = doc.getNumberOfPages();
      for (let p = ersteSeite + 1; p <= letzte; p++) {
        doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, GRAU);
        doc.text(T('Praktikumsbericht · ' + (rec.name || '') + (rec.klasse ? ' · ' + rec.klasse : '')), L, H - 12);
        doc.text('Seite ' + (p - ersteSeite) + ' von ' + (letzte - ersteSeite), W - R, H - 12, { align: 'right' });
      }
      doc.setPage(letzte);
    });
    return doc;
  };

  /* ---------- Supabase ---------- */
  PB.rpc = async function (fn, body, keepalive) {
    const c = window.PAGS_CONFIG || {};
    if (!c.supabaseUrl) throw new Error('Keine Datenbank eingerichtet.');
    const r = await fetch(c.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST', keepalive: !!keepalive,
      headers: { 'Content-Type': 'application/json', apikey: c.supabaseAnonKey, Authorization: 'Bearer ' + c.supabaseAnonKey },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { } const f = new Error(m || ('Fehler ' + r.status)); f.status = r.status; throw f; }
    const txt = await r.text(); return txt ? JSON.parse(txt) : null;
  };

  PB.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.PB = PB;
})();
