/* Azubi-App der PAGS – gemeinsame Logik für Auszubildendenseite (index.html) und Betreuerbereich (lehrer.html):
   Datenmodell, Wochennachweise (Berichtsheft), Fortschritt, Ausbildungsbericht, PDF. Baut auf ../praktikum/bericht.js (PB) auf. */
(function () {
  'use strict';
  const AZ = {};

  AZ.BEGINN = '2026-09-01';
  AZ.MAXWOCHEN = 200;
  AZ.ART = [['', 'Normale Woche'], ['urlaub', 'Urlaub'], ['krank', 'Krank'], ['frei', 'Frei / Feiertag']];
  AZ.ARTNAME = { urlaub: 'Urlaub', krank: 'Krank', frei: 'Frei / Feiertag' };
  AZ.STIMMUNG = ['', 'sehr schlecht', 'eher schlecht', 'mittel', 'gut', 'super'];
  AZ.KOMP = [
    ['fach', 'Ich beherrsche die Aufgaben meines Ausbildungsjahres.'],
    ['sorgfalt', 'Ich arbeite sorgfältig und genau.'],
    ['zuverl', 'Ich bin pünktlich und zuverlässig.'],
    ['team', 'Ich arbeite gut im Team.'],
    ['kunde', 'Ich bin im Umgang mit Kunden und Kollegen freundlich und sicher.'],
    ['selbst', 'Ich arbeite selbstständig und frage nach, wenn ich etwas nicht weiß.'],
    ['bs', 'Ich komme in der Berufsschule gut mit.']
  ];
  AZ.SKALA = ['', 'trifft nicht zu', 'trifft eher nicht zu', 'trifft eher zu', 'trifft voll zu'];
  AZ.CHECK_ANZAHL = 12;

  /* ---------- Datenmodell ---------- */
  AZ.leer = function () {
    return {
      v: 1, beginn: AZ.BEGINN, dauer: 3,
      betrieb: {}, check: {}, ziele: {}, plan: [], wochen: {}, bs: {}, pruef: {}, komp: {}, rb: {},
      bericht: null
    };
  };
  const istObj = o => o && typeof o === 'object' && !Array.isArray(o);
  const str = (v, n) => String(v == null ? '' : v).slice(0, n || 3000);
  const ISO = /^\d{4}-\d\d-\d\d$/;
  AZ.normal = function (d) {
    const l = AZ.leer();
    if (!istObj(d)) return l;
    ['betrieb', 'check', 'ziele', 'bs', 'pruef', 'komp', 'rb'].forEach(k => { if (istObj(d[k])) l[k] = d[k]; });
    if (ISO.test(d.beginn || '')) l.beginn = d.beginn;
    if ([2, 2.5, 3, 3.5, 4].includes(+d.dauer)) l.dauer = +d.dauer;
    if (Array.isArray(d.plan)) l.plan = d.plan.filter(istObj).slice(0, 40).map(p => ({ abt: str(p.abt, 120), von: ISO.test(p.von || '') ? p.von : '', bis: ISO.test(p.bis || '') ? p.bis : '', ansprech: str(p.ansprech, 120), ziel: str(p.ziel, 600) }));
    if (istObj(d.wochen)) Object.keys(d.wochen).filter(k => ISO.test(k) && istObj(d.wochen[k])).sort().slice(0, AZ.MAXWOCHEN).forEach(k => { l.wochen[k] = d.wochen[k]; });
    if (istObj(d.bericht) && Array.isArray(d.bericht.teile)) {
      l.bericht = { erstellt: d.bericht.erstellt || null, teile: d.bericht.teile.filter(istObj).map(t => ({ titel: str(t.titel, 200), text: str(t.text, 6000) })) };
    }
    return l;
  };

  /* ---------- Datum und Wochen ---------- */
  const z2 = n => String(n).padStart(2, '0');
  const parse = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  AZ.parse = parse;
  AZ.montag = function (dat) {                           // Datum oder ISO-Text -> ISO des Montags
    const d = typeof dat === 'string' ? parse(dat) : new Date(dat.getFullYear(), dat.getMonth(), dat.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return PB.iso(d);
  };
  AZ.plus = (iso, tage) => { const d = parse(iso); d.setDate(d.getDate() + tage); return PB.iso(d); };
  AZ.kw = function (iso) {                               // ISO-Kalenderwoche
    const d = parse(iso); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  };
  /* Alle Wochen (Montage) vom Ausbildungsbeginn bis heute, höchstens bis zum Ende der Ausbildung */
  AZ.wochenListe = function (d, heute) {
    const h = heute || new Date(), m0 = AZ.montag(d.beginn), mh = AZ.montag(h);
    const ende = AZ.plus(m0, Math.round(d.dauer * 52) * 7), out = [];
    if (m0 > mh) return out;
    for (let m = m0; m <= mh && m < ende && out.length < AZ.MAXWOCHEN; m = AZ.plus(m, 7)) out.push(m);
    return out;
  };
  AZ.wocheNr = (d, m) => Math.round((parse(m) - parse(AZ.montag(d.beginn))) / 604800000) + 1;
  AZ.jahr = (d, m) => Math.floor((AZ.wocheNr(d, m) - 1) / 52) + 1;
  AZ.phase = function (d, heute) {                       // 'vor' = Ausbildung noch nicht gestartet
    const h = heute || new Date(), h0 = new Date(h.getFullYear(), h.getMonth(), h.getDate()), b = parse(d.beginn);
    return h0 < b ? { phase: 'vor', bis: Math.round((b - h0) / 86400000) } : { phase: 'in', bis: 0 };
  };
  AZ.zeitraumWoche = m => PB.kurz(parse(m)) + '–' + PB.lang(parse(AZ.plus(m, 4)));

  /* ---------- Fortschritt ---------- */
  const t = s => String(s == null ? '' : s).trim();
  const voll = (o, keys) => keys.filter(k => t(o && o[k])).length;
  const zahl = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : 0; };
  AZ.zahl = zahl;
  AZ.wocheStand = function (w) {                         // 0 = leer, 1 = angefangen, 2 = abgeschlossen
    if (!w) return 0;
    if (w.art || w.fertig) return 2;
    return (voll(w, ['abt', 'taet', 'unterw', 'bsthemen', 'gelernt', 'hb', 'hs']) || w.stimmung) ? 1 : 0;
  };
  AZ.wochenZahlen = function (d, heute) {                 // für Übersicht und CSV
    const liste = AZ.wochenListe(d, heute), fertig = liste.filter(m => AZ.wocheStand(d.wochen[m]) === 2).length;
    const alle = Object.keys(d.wochen).filter(m => AZ.wocheStand(d.wochen[m]) > 0).sort();
    let hb = 0, hs = 0; alle.forEach(m => { hb += zahl(d.wochen[m].hb); hs += zahl(d.wochen[m].hs); });
    return { erwartet: liste.length, fertig: fertig, erfasst: alle.length, letzte: alle.length ? alle[alle.length - 1] : '', hb: hb, hs: hs, fehlen: liste.length - fertig };
  };
  AZ.stand = function (d) {
    const teil = (n, max) => (n >= max ? 2 : n > 0 ? 1 : 0);
    const haken = Object.keys(d.check || {}).filter(k => d.check[k]).length;
    const wz = AZ.wochenZahlen(d), plan = d.plan.filter(p => t(p.abt)).length;
    const komp = AZ.KOMP.filter(k => d.komp[k[0]]).length;
    const rbN = voll(d.rb, ['erfuellt', 'gefallen', 'schwierig', 'gelernt', 'ausblick']) + (d.rb.zufrieden ? 1 : 0);
    return [
      { id: 'steckbrief', titel: 'Mein Betrieb (Steckbrief)', tab: 'vor', stand: teil(voll(d.betrieb, ['name', 'ort', 'beruf', 'ausbilder', 'tel', 'zeiten', 'schule']), 7) },
      { id: 'check', titel: 'Checkliste Ausbildungsstart', tab: 'vor', stand: teil(haken, AZ.CHECK_ANZAHL), info: haken + ' von ' + AZ.CHECK_ANZAHL },
      { id: 'ziele', titel: 'Meine Ziele', tab: 'vor', stand: teil(voll(d.ziele, ['warum', 'erwartung', 'ziele', 'staerken']), 4) },
      { id: 'woche', titel: 'Wochennachweise (Berichtsheft)', tab: 'woche', stand: wz.erwartet ? teil(wz.fertig, wz.erwartet) : (wz.erfasst ? 1 : 0), info: wz.fertig + ' von ' + wz.erwartet + ' Wochen' },
      { id: 'plan', titel: 'Ausbildungsplan', tab: 'ausb', stand: plan >= 3 ? 2 : plan ? 1 : 0, info: plan + (plan === 1 ? ' Abteilung' : ' Abteilungen') },
      { id: 'bs', titel: 'Berufsschule', tab: 'ausb', stand: teil(voll(d.bs, ['faecher', 'noten', 'staerken', 'schwaechen', 'lernen']), 4) },
      { id: 'pruef', titel: 'Prüfungen', tab: 'ausb', stand: teil(voll(d.pruef, ['zwischen', 'abschluss', 'themen', 'lernplan']), 3) },
      { id: 'komp', titel: 'Meine Kompetenzen', tab: 'ausb', stand: teil(komp, AZ.KOMP.length), info: komp + ' von ' + AZ.KOMP.length },
      { id: 'rb', titel: 'Rückblick', tab: 'bericht', stand: teil(rbN, 5) }
    ];
  };

  /* ---------- Ausbildungsbericht aus den Einträgen ---------- */
  function absatz(label, text) { text = t(text); return text ? (label ? label + ': ' : '') + text : ''; }
  function liste(text) {
    return t(text).split(/\n+/).map(z => z.replace(/^\s*[-–•*]\s*/, '').trim()).filter(Boolean).map(z => '– ' + z).join('\n');
  }
  const kuerze = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  /* Zeitraum des Berichts: rb.von / rb.bis (ISO), sonst die ganze bisherige Ausbildung */
  AZ.berichtWochen = function (d) {
    const von = ISO.test(d.rb.von || '') ? AZ.montag(d.rb.von) : '', bis = ISO.test(d.rb.bis || '') ? d.rb.bis : '';
    return Object.keys(d.wochen).sort().filter(m => AZ.wocheStand(d.wochen[m]) > 0 && (!von || m >= von) && (!bis || m <= bis));
  };
  AZ.zeitraumText = function (d) {
    const w = AZ.berichtWochen(d);
    if (ISO.test(d.rb.von || '') || ISO.test(d.rb.bis || '')) return (ISO.test(d.rb.von || '') ? PB.lang(parse(d.rb.von)) : 'Ausbildungsbeginn') + ' bis ' + (ISO.test(d.rb.bis || '') ? PB.lang(parse(d.rb.bis)) : 'heute');
    return 'seit ' + PB.lang(parse(d.beginn)) + (w.length ? '' : '');
  };
  AZ.ende = d => PB.lang(parse(AZ.plus(AZ.montag(d.beginn), Math.round(d.dauer * 52) * 7 - 3)));

  AZ.teile = function (d) {
    const b = d.betrieb, out = [], wm = AZ.berichtWochen(d);
    const neu = (titel, abs) => out.push({ titel: titel, text: abs.filter(Boolean).join('\n\n') });

    let ein = [];
    ein.push('Ich mache seit dem ' + PB.lang(parse(d.beginn)) + (t(b.beruf) ? ' eine Ausbildung zum/zur ' + t(b.beruf) : ' eine Ausbildung') + (t(b.name) ? ' bei ' + t(b.name) + (t(b.ort) ? ' (' + t(b.ort) + ')' : '') : '') + '.');
    ein.push('Die Ausbildung dauert ' + String(d.dauer).replace('.', ',') + ' Jahre und endet voraussichtlich am ' + AZ.ende(d) + '.');
    if (t(b.branche)) ein.push('Der Betrieb gehört zum Bereich ' + t(b.branche) + '.');
    if (t(b.ausbilder)) ein.push('Mein Ausbilder / meine Ausbilderin ist ' + t(b.ausbilder) + '.');
    if (t(b.zeiten)) ein.push('Meine Arbeitszeit: ' + t(b.zeiten) + '.');
    neu('Mein Ausbildungsbetrieb', [ein.join(' ').replace(/\.\.( |$)/g, '.$1'), absatz('Das macht der Betrieb', b.taetig), absatz('Mitarbeiter und Auszubildende', b.team)]);

    neu('Meine Ziele und Erwartungen', [
      absatz('Darum habe ich mich für diese Ausbildung entschieden', d.ziele.warum), absatz('Das habe ich erwartet', d.ziele.erwartung),
      absatz('Das sind meine Ziele für die Ausbildung', d.ziele.ziele), absatz('Davor habe ich Respekt', d.ziele.respekt), absatz('Diese Stärken bringe ich mit', d.ziele.staerken)
    ]);

    const plan = d.plan.filter(p => t(p.abt));
    neu('Ausbildungsplan und Einsatzbereiche', [plan.map(p => {
      const zeit = p.von || p.bis ? ' (' + (p.von ? PB.lang(parse(p.von)) : '…') + ' bis ' + (p.bis ? PB.lang(parse(p.bis)) : '…') + ')' : '';
      return '– ' + t(p.abt) + zeit + (t(p.ansprech) ? ', Ansprechperson: ' + t(p.ansprech) : '') + (t(p.ziel) ? '\n   Lernziele: ' + t(p.ziel) : '');
    }).join('\n')]);

    neu('Berufsschule', [
      t(b.schule) ? absatz('Berufsschule', t(b.schule) + (t(b.bsklasse) ? ', Klasse ' + t(b.bsklasse) : '') + (t(b.schultage) ? ' (' + t(b.schultage) + ')' : '')) : '',
      absatz('Fächer und Lernfelder', d.bs.faecher), absatz('Meine Noten', d.bs.noten), absatz('Das fällt mir leicht', d.bs.staerken),
      absatz('Das fällt mir schwer', d.bs.schwaechen), absatz('So lerne ich und so unterstütze ich mich', d.bs.lernen)
    ]);

    // Meine Arbeit: Tätigkeiten aus den Wochennachweisen, nach Abteilung geordnet
    let hb = 0, hs = 0; const nachAbt = {};
    wm.forEach(m => { const w = d.wochen[m]; if (w.art) return; hb += zahl(w.hb); hs += zahl(w.hs);
      const a = t(w.abt) || 'Ohne Angabe'; (nachAbt[a] = nachAbt[a] || []).push(...t(w.taet).split(/\n+/).map(z => z.replace(/^\s*[-–•*]\s*/, '').trim()).filter(Boolean)); });
    const abtText = Object.keys(nachAbt).map(a => {
      const eig = [...new Set(nachAbt[a])].slice(0, 14);
      return a + ':' + (eig.length ? '\n' + eig.map(z => '– ' + kuerze(z, 160)).join('\n') : ' (keine Tätigkeiten eingetragen)');
    }).join('\n\n');
    const urlaub = wm.filter(m => d.wochen[m].art === 'urlaub').length, krank = wm.filter(m => d.wochen[m].art === 'krank').length;
    neu('Meine Arbeit im Betrieb', [
      wm.length ? 'In diesem Zeitraum liegen ' + wm.length + (wm.length === 1 ? ' Wochennachweis' : ' Wochennachweise') + ' vor' + (hb ? ' (zusammen ' + String(hb).replace('.', ',') + ' Stunden im Betrieb' + (hs ? ' und ' + String(hs).replace('.', ',') + ' Stunden Berufsschule bzw. Unterweisung' : '') + ')' : '') + '.' +
        (urlaub || krank ? ' Davon: ' + [urlaub ? urlaub + ' Urlaubswoche(n)' : '', krank ? krank + ' Woche(n) krank' : ''].filter(Boolean).join(', ') + '.' : '') : '',
      abtText ? 'Das habe ich gemacht:\n\n' + abtText : ''
    ]);

    const geler = wm.filter(m => t(d.wochen[m].gelernt)).slice(-8).map(m => '– ' + kuerze(t(d.wochen[m].gelernt).replace(/\s*\n+\s*/g, ' '), 260));
    neu('Das habe ich gelernt', [geler.length ? 'Aus meinen Wochennachweisen:\n' + geler.join('\n') : '', absatz('Mein größter Lernerfolg', d.rb.erfolg)]);

    neu('Prüfungen', [
      absatz('Zwischenprüfung / Teil 1 der Abschlussprüfung', d.pruef.zwischen ? PB.lang(parse(d.pruef.zwischen)) : ''),
      absatz('Abschlussprüfung', d.pruef.abschluss ? PB.lang(parse(d.pruef.abschluss)) : ''),
      absatz('Prüfungsthemen', d.pruef.themen), absatz('So bereite ich mich vor', d.pruef.lernplan), absatz('Ergebnisse', d.pruef.ergebnis)
    ]);

    const k = AZ.KOMP.filter(x => d.komp[x[0]]).map(x => '– ' + x[1] + ' → ' + AZ.SKALA[d.komp[x[0]]]).join('\n');
    neu('So schätze ich mich ein', [k]);

    const r = d.rb;
    neu('Rückblick und Ausblick', [
      absatz('Haben sich meine Erwartungen an die Ausbildung erfüllt?', r.erfuellt).replace('?: ', '? '),
      absatz('Das gefällt mir gut', r.gefallen), absatz('Das ist schwierig oder gefällt mir nicht', r.schwierig),
      absatz('Das habe ich über mich und die Arbeitswelt gelernt', r.gelernt),
      r.zufrieden ? 'Meine Zufriedenheit mit der Ausbildung: ' + AZ.ZUFRIEDEN[r.zufrieden] + '.' : '',
      absatz('Das will ich im nächsten Abschnitt erreichen', r.ausblick), absatz('Das wünsche ich mir von Betrieb oder Berufsschule', r.wunsch)
    ]);
    return out;
  };
  AZ.ZUFRIEDEN = ['', 'sehr unzufrieden', 'eher unzufrieden', 'teils, teils', 'eher zufrieden', 'sehr zufrieden'];
  AZ.berichtTeile = function (d, immerNeu) {
    if (!immerNeu && d.bericht && d.bericht.teile && d.bericht.teile.length) return d.bericht.teile;
    return AZ.teile(d);
  };

  /* ---------- PDF ---------- */
  const W = 210, H = 297, L = 22, R = 22, OBEN = 24, UNTEN = 22, B = W - L - R;
  const ROT = [168, 16, 16], GRAU = [110, 110, 110], TEXT = [40, 40, 40];
  AZ.dateiname = function (rec, vorsatz) {
    return (vorsatz || 'Ausbildungsbericht') + '_' + String(rec.name || 'Azubi').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.pdf';
  };

  /* Gemeinsamer Rahmen: Deckblatt, Inhalt über Zeichenfunktionen, Fußzeilen */
  function pdfRahmen(recs, titel, untertitel, inhalt, opt) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), T = PB.pdfText;
    let y = 0;
    const platz = h => { if (y + h > H - UNTEN) { doc.addPage(); y = OBEN; } };
    const ctx = {
      doc: doc, T: T,
      get y() { return y; }, set y(v) { y = v; }, platz: platz,
      titel: (txt, nr) => {
        platz(24); if (nr > 1) y += 5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, ROT);
        const kopf = doc.splitTextToSize(T(txt), B); doc.text(kopf, L, y); y += 6.2 * kopf.length;
        doc.setDrawColor.apply(doc, ROT); doc.setLineWidth(0.4); doc.line(L, y - 3.4, W - R, y - 3.4); doc.setLineWidth(0.2); y += 3.5;
      },
      text: (txt, o) => {
        o = o || {}; doc.setFont('helvetica', o.fett ? 'bold' : 'normal'); doc.setFontSize(o.groesse || 11); doc.setTextColor.apply(doc, o.farbe || TEXT);
        T(txt).split('\n').forEach(zeile => {
          if (!zeile.trim()) { y += 3; return; }
          const m = zeile.match(/^(- |\d+\. )/), einzug = m ? 5 : 0, rest = m ? zeile.slice(m[0].length) : zeile;
          doc.splitTextToSize(rest, B - einzug - (m ? 2 : 0)).forEach((z, k) => {
            platz(5.6); if (m && k === 0) doc.text(m[0].trim(), L + 1, y); doc.text(z, L + (m ? einzug + 2 : 0), y); y += 5.6;
          });
          y += 1.2;
        });
      }
    };
    recs.forEach((rec, nr) => {
      const d = AZ.normal(rec.data);
      if (nr > 0) doc.addPage();
      const erste = doc.getNumberOfPages();
      doc.setFillColor.apply(doc, ROT); doc.rect(0, 0, W, 8, 'F'); y = 30;
      const logo = PB.logo && PB.logo();
      if (logo) { const h = 26, w = h * logo.w / logo.h; doc.addImage(logo.url, 'PNG', (W - w) / 2, y, w, h); y += h + 8; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor.apply(doc, GRAU); doc.text(T(PB.SCHULE), W / 2, y, { align: 'center' }); y += 34;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor.apply(doc, ROT); doc.text(T(titel), W / 2, y, { align: 'center' }); y += 12;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor.apply(doc, TEXT);
      doc.splitTextToSize(T(untertitel(d, rec)), B).forEach(z => { doc.text(z, W / 2, y, { align: 'center' }); y += 6.5; }); y += 22;
      const zeilen = [['Name', rec.name], ['Gruppe', rec.gruppe], ['Beruf', d.betrieb.beruf], ['Betrieb', d.betrieb.name], ['Ort', d.betrieb.ort],
        ['Ausbilder/in', d.betrieb.ausbilder], ['Ausbildungsbeginn', PB.lang(parse(d.beginn))], ['Voraussichtliches Ende', AZ.ende(d)]].filter(z => t(z[1]));
      doc.setFontSize(12);
      zeilen.forEach(z => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GRAU); doc.text(T(z[0]), L + 14, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, TEXT);
        const zl = doc.splitTextToSize(T(z[1]), B - 14 - 52); doc.text(zl, L + 14 + 52, y);
        y += 7 * zl.length + 1.5; doc.setDrawColor(225); doc.line(L + 14, y - 4.6, W - R - 14, y - 4.6);
      });
      doc.setFontSize(10); doc.setTextColor.apply(doc, GRAU);
      doc.text(T(opt.fuss(rec)), W / 2, H - 30, { align: 'center' });
      doc.addPage(); y = OBEN;
      inhalt(ctx, d, rec);
      const letzte = doc.getNumberOfPages();
      for (let p = erste + 1; p <= letzte; p++) {
        doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, GRAU);
        doc.text(T(titel + ' · ' + (rec.name || '') + (rec.gruppe ? ' · ' + rec.gruppe : '')), L, H - 12);
        doc.text('Seite ' + (p - erste) + ' von ' + (letzte - erste), W - R, H - 12, { align: 'right' });
      }
      doc.setPage(letzte);
    });
    return doc;
  }

  /* Ausbildungsbericht. recs: [{name, gruppe, data, abgegeben_am, updated_at}] */
  AZ.pdf = function (recs, opt) {
    opt = opt || {};
    return pdfRahmen(recs, 'Ausbildungsbericht', (d, rec) => (t(d.betrieb.beruf) || 'Ausbildung') + ' · Ausbildungsbeginn ' + PB.lang(parse(d.beginn)), (c, d) => {
      const teile = AZ.berichtTeile(d, opt.immerNeu).filter(x => t(x.text));
      if (!teile.length) c.text('Noch keine Einträge vorhanden.', { farbe: GRAU });
      teile.forEach((teil, i) => { c.titel((i + 1) + '  ' + teil.titel, i + 1); c.text(teil.text); });
    }, { fuss: rec => (rec.abgegeben_am && !opt.immerNeu ? 'Abgegeben am ' + PB.zeitpunkt(rec.abgegeben_am) : 'Entwurf – noch nicht abgegeben' + (rec.updated_at ? ' (Stand: ' + PB.zeitpunkt(rec.updated_at) + ')' : '')) });
  };

  /* Berichtsheft: Ausbildungsnachweise je Woche mit Feldern für die Unterschriften.
     opt.von / opt.bis (ISO) begrenzen den Zeitraum, standardmäßig alle Wochen mit Eintrag. */
  AZ.pdfHeft = function (recs, opt) {
    opt = opt || {};
    return pdfRahmen(recs, 'Ausbildungsnachweis', (d, rec) => 'Berichtsheft' + (t(d.betrieb.beruf) ? ' · ' + t(d.betrieb.beruf) : ''), (c, d, rec) => {
      const von = opt.von ? AZ.montag(opt.von) : '', bis = opt.bis || '';
      const wm = Object.keys(d.wochen).sort().filter(m => AZ.wocheStand(d.wochen[m]) > 0 && (!von || m >= von) && (!bis || m <= bis));
      const doc = c.doc;
      if (!wm.length) { c.text('Noch keine Wochennachweise vorhanden.', { farbe: GRAU }); return; }
      wm.forEach((m, i) => {
        const w = d.wochen[m];
        c.platz(52); if (i > 0) c.y += 6;
        doc.setFillColor(250, 238, 236); doc.rect(L, c.y - 5, B, 9.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor.apply(doc, ROT);
        doc.text(c.T('Nachweis Nr. ' + AZ.wocheNr(d, m) + ' · KW ' + AZ.kw(m) + ' · ' + AZ.zeitraumWoche(m)), L + 2, c.y + 1.2);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, GRAU);
        doc.text(c.T('Ausbildungsjahr ' + AZ.jahr(d, m)), W - R - 2, c.y + 1.2, { align: 'right' }); c.y += 9;
        if (w.art) { c.text(AZ.ARTNAME[w.art] + (t(w.taet) ? ' – ' + t(w.taet) : ''), { groesse: 10.5 }); }
        else {
          const kopf = [t(w.abt) ? 'Abteilung / Einsatzort: ' + t(w.abt) : '', zahl(w.hb) ? 'Stunden im Betrieb: ' + String(w.hb).replace('.', ',') : '', zahl(w.hs) ? 'Stunden Berufsschule / Unterweisung: ' + String(w.hs).replace('.', ',') : ''].filter(Boolean).join('   ·   ');
          if (kopf) c.text(kopf, { groesse: 10, farbe: GRAU });
          [['Betriebliche Tätigkeiten', liste(w.taet)], ['Unterweisungen, Lehrgespräche, Betriebsunterricht', liste(w.unterw)], ['Berufsschule: Themen und Lernfelder', liste(w.bsthemen)], ['Das habe ich gelernt', t(w.gelernt)]].forEach(s => {
            if (!s[1]) return; c.platz(14); c.text(s[0], { fett: true, groesse: 10, farbe: ROT }); c.text(s[1], { groesse: 10.5 });
          });
        }
        c.platz(20); c.y += 6;
        doc.setDrawColor(150); doc.setLineWidth(0.25);
        doc.line(L, c.y, L + 72, c.y); doc.line(L + B - 72, c.y, L + B, c.y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GRAU);
        doc.text('Datum, Unterschrift Auszubildende/r', L, c.y + 4); doc.text('Datum, Unterschrift Ausbilder/in', L + B - 72, c.y + 4);
        c.y += 7; doc.setLineWidth(0.2);
      });
    }, { fuss: rec => 'Stand: ' + PB.zeitpunkt(rec.updated_at || new Date().toISOString()) });
  };

  AZ.rpc = (fn, body, keepalive) => PB.rpc(fn, body, keepalive);
  window.AZ = AZ;
})();
