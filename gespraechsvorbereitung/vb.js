/* Vorbereitung auf das Standortgespräch – gemeinsamer Kern für Familien- und Lehrerseite:
   Datenbank, Fragenkatalog, Formular-Bausteine, PDF-Erzeugung (jsPDF). */
(function () {
  'use strict';
  const VB = {};
  VB.KLASSE = '9a';
  VB.LEHRER = 'Thorsten von Plotho-Kettner';
  VB.URL = 'https://ratpoison-de.github.io/pags-app/gespraechsvorbereitung/';

  /* ---------- Hilfen ---------- */
  VB.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  VB.datum = s => s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }) : '';
  VB.zeitpunkt = s => s ? VB.datum(s) + ', ' + new Date(s).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) + ' Uhr' : '';
  VB.isoDatum = s => { if (!s) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? m[3] + '.' + m[2] + '.' + m[1] : s; };
  VB.name = s => (s.vorname + ' ' + (s.nachname || '')).trim();

  VB.rpc = async function (fn, body) {
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
      x.status = r.status; x.grund = r.status === 404 ? 'fehltfn' : ''; throw x;
    }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  VB.GRUND = {
    eingabe: 'Bitte die Eingaben prüfen: Benutzername 3 bis 60 Zeichen, Kennwort mindestens 6 Zeichen.',
    vergeben: 'Dieser Benutzername ist schon vergeben. Bitte einen anderen wählen – oder oben auf „Anmelden“ tippen, wenn es das eigene Konto ist.',
    unbekannt: 'Diesen Benutzernamen gibt es nicht. Bitte prüfen oder ein neues Konto anlegen.',
    pw: 'Das Kennwort stimmt nicht.', gesperrt: 'Zu viele falsche Versuche. Bitte 10 Minuten warten.',
    code: 'Dieser Zugangscode ist nicht gültig. Bitte genau so eingeben, wie er auf dem Zettel steht (z. B. K7QM-3XPA).',
    codevoll: 'Mit diesem Zugangscode wurden schon 4 Konten angelegt. Bitte beim Klassenlehrer melden.',
    voll: 'Es können gerade keine weiteren Einträge angelegt werden.', gross: 'Die Angaben sind zu lang zum Speichern.',
    zugang: 'Der Zugangsschlüssel stimmt nicht.', fehlt: 'Der Eintrag wurde nicht gefunden.'
  };
  VB.ok = function (r) {
    if (!r || !r.ok) { const x = new Error(VB.GRUND[r && r.grund] || 'Das hat nicht geklappt.'); x.grund = (r && r.grund) || 'fehler'; x.daten = r; throw x; }
    return r;
  };

  /* ---------- Fragenkatalog ---------- */
  // Arbeits- und Sozialverhalten: dieselben Punkte aus drei Blickwinkeln (Schüler, Eltern, Lehrer) – so lassen sie sich vergleichen.
  VB.KRITERIEN = [
    { k: 'konz', s: 'Ich arbeite im Unterricht konzentriert mit.', e: 'Mein Kind arbeitet konzentriert (z. B. bei Hausaufgaben).', l: 'arbeitet im Unterricht konzentriert mit', kurz: 'Konzentration' },
    { k: 'sorg', s: 'Ich arbeite sorgfältig (Hefte, Mappen, Ordner).', e: 'Mein Kind arbeitet sorgfältig und ordentlich.', l: 'arbeitet sorgfältig, Hefte und Mappen sind ordentlich', kurz: 'Sorgfalt' },
    { k: 'haus', s: 'Ich erledige meine Hausaufgaben vollständig und pünktlich.', e: 'Mein Kind erledigt seine Hausaufgaben zuverlässig.', l: 'erledigt Hausaufgaben vollständig und pünktlich', kurz: 'Hausaufgaben' },
    { k: 'mat', s: 'Ich habe mein Material dabei und bin pünktlich.', e: 'Mein Kind denkt an sein Material und ist pünktlich.', l: 'hat das Material dabei und ist pünktlich', kurz: 'Material, Pünktlichkeit' },
    { k: 'selbst', s: 'Ich plane meine Aufgaben in der IL selbstständig.', e: 'Mein Kind plant und arbeitet selbstständig.', l: 'plant und arbeitet in der IL selbstständig', kurz: 'Selbstständigkeit (IL)' },
    { k: 'mit', s: 'Ich beteilige mich am Unterricht und melde mich.', e: 'Mein Kind zeigt Interesse am Unterricht.', l: 'beteiligt sich aktiv am Unterricht', kurz: 'Mitarbeit' },
    { k: 'frag', s: 'Ich frage nach, wenn ich etwas nicht verstehe.', e: 'Mein Kind holt sich Hilfe, wenn es etwas nicht versteht.', l: 'fragt nach und holt sich Hilfe', kurz: 'Hilfe holen' },
    { k: 'regel', s: 'Ich halte mich an Regeln und Absprachen.', e: 'Mein Kind hält sich an Regeln und Absprachen.', l: 'hält Regeln und Absprachen ein', kurz: 'Regeln' },
    { k: 'team', s: 'Ich arbeite gut mit anderen zusammen.', e: 'Mein Kind arbeitet gern und gut mit anderen zusammen.', l: 'arbeitet gut im Team', kurz: 'Teamarbeit' },
    { k: 'umg', s: 'Ich gehe respektvoll und fair mit anderen um.', e: 'Mein Kind geht respektvoll mit anderen um.', l: 'geht respektvoll und fair mit anderen um', kurz: 'Umgang' },
    { k: 'konf', s: 'Ich löse Streit ruhig und fair.', e: 'Mein Kind löst Konflikte angemessen.', l: 'löst Konflikte angemessen', kurz: 'Konflikte' },
    { k: 'dig', s: 'Ich nutze iPad und Handy verantwortungsvoll.', e: 'Mein Kind geht verantwortungsvoll mit Handy und Medien um.', l: 'nutzt iPad und Handy verantwortungsvoll', kurz: 'Medien' }
  ];
  VB.STUFEN = [{ v: 4, t: '++', l: 'trifft voll zu' }, { v: 3, t: '+', l: 'trifft eher zu' }, { v: 2, t: '–', l: 'trifft eher nicht zu' }, { v: 1, t: '– –', l: 'trifft nicht zu' }];
  VB.FAECHER = ['Deutsch', 'Mathematik', 'Englisch', 'WBS', 'Geographie', 'Gemeinschaftskunde', 'Geschichte', 'Biologie', 'Physik', 'Chemie', 'Wahlpflichtfach', 'Sport', 'BK / Musik', 'Religion / Ethik'];
  VB.AMPEL = [{ v: 'g', t: 'läuft gut', c: '#1B7A3D' }, { v: 'm', t: 'geht so', c: '#D99A00' }, { v: 's', t: 'schwierig', c: '#C0261A' }];
  VB.SMILEY = [{ v: 1, t: '😟', l: 'gar nicht gut' }, { v: 2, t: '🙁', l: 'eher schlecht' }, { v: 3, t: '😐', l: 'mittel' }, { v: 4, t: '🙂', l: 'gut' }, { v: 5, t: '😄', l: 'sehr gut' }];

  const NACH10 = ['Ausbildung', 'Berufliches Gymnasium', 'Berufskolleg', 'Berufsfachschule', 'Weiß ich noch nicht'];

  // Teil für die Schülerin / den Schüler (du)
  VB.SCHUELER = [
    { id: 'wohl', titel: 'So geht es mir', intro: 'Hier geht es um dich – ehrlich ist am besten. Es gibt kein Richtig oder Falsch.', felder: [
      { id: 's_schule', typ: 'skala5', frage: 'Wie fühlst du dich zurzeit an der Schule?' },
      { id: 's_klasse', typ: 'skala5', frage: 'Wie fühlst du dich in deiner Klasse?' },
      { id: 's_gut', typ: 'text', frage: 'Was gefällt dir an der Schule gerade besonders?' },
      { id: 's_stoert', typ: 'text', frage: 'Was stört oder belastet dich gerade?', hilfe: 'Zum Beispiel Stress, Streit, Lärm, zu viele Arbeiten …' }
    ] },
    { id: 'verhalten', titel: 'Wie ich arbeite', intro: 'Schätze dich selbst ein: ++ trifft voll zu · + eher · – eher nicht · – – trifft nicht zu.', felder: [
      { id: 's_krit', typ: 'kriterien', sicht: 's' }
    ] },
    { id: 'faecher', titel: 'Meine Fächer', intro: 'Wie läuft es in den einzelnen Fächern? Tippe auf eine Farbe.', felder: [
      { id: 's_faecher', typ: 'faecher' },
      { id: 's_stolz', typ: 'text', frage: 'Worauf bist du in diesem Schuljahr stolz?' },
      { id: 's_hilfe', typ: 'text', frage: 'Wo brauchst du Unterstützung – und welche?' }
    ] },
    { id: 'staerken', titel: 'Meine Stärken', felder: [
      { id: 's_kann', typ: 'text', frage: 'Was kannst du gut – in der Schule und außerhalb?' },
      { id: 's_hobby', typ: 'text', frage: 'Was machst du in deiner Freizeit gern (Hobbys, Verein, Nebenjob)?' },
      { id: 's_besser', typ: 'text', frage: 'Was möchtest du an dir oder deiner Arbeitsweise verbessern?' }
    ] },
    { id: 'zukunft', titel: 'Meine Zukunft', felder: [
      { id: 's_abschluss', typ: 'wahl', frage: 'Welchen Abschluss strebst du an?', optionen: ['Realschulabschluss nach Klasse 10', 'Hauptschulabschluss nach Klasse 9', 'Hauptschulabschluss nach Klasse 10', 'Bin mir noch unsicher'] },
      { id: 's_nach10', typ: 'mehr', frage: 'Wie könnte es nach der Schule weitergehen?', optionen: NACH10 },
      { id: 's_beruf', typ: 'text', frage: 'Welche Berufe interessieren dich? Was hast du im Praktikum erlebt?' }
    ] },
    { id: 'ziele', titel: 'Meine Ziele', intro: 'Überlege dir bis zu drei Ziele bis zum nächsten Gespräch. Gute Ziele sind konkret: Was genau? Wie? Bis wann?', felder: [
      { id: 's_ziele', typ: 'ziele' },
      { id: 's_brauche', typ: 'text', frage: 'Was brauchst du dafür von deinen Lehrkräften oder deinen Eltern?' }
    ] },
    { id: 'gespraech', titel: 'Fürs Gespräch', felder: [
      { id: 's_themen', typ: 'text', frage: 'Das möchte ich im Gespräch unbedingt ansprechen:' },
      { id: 's_fragen', typ: 'text', frage: 'Meine Fragen an Herrn von Plotho-Kettner:' }
    ] }
  ];

  // Teil für die Eltern (Sie)
  VB.ELTERN = [
    { id: 'erleben', titel: 'Wie erleben Sie Ihr Kind?', intro: 'Ihre Sicht von zu Hause ergänzt das, was wir in der Schule sehen.', felder: [
      { id: 'e_stimmung', typ: 'skala5', frage: 'Wie geht es Ihrem Kind zurzeit mit der Schule?' },
      { id: 'e_erzaehlt', typ: 'text', frage: 'Was erzählt Ihr Kind zu Hause über die Schule und die Klasse?' },
      { id: 'e_veraendert', typ: 'text', frage: 'Was hat sich seit Beginn des Schuljahres verändert?' }
    ] },
    { id: 'zuhause', titel: 'Lernen zu Hause', felder: [
      { id: 'e_ha', typ: 'wahl', frage: 'Hausaufgaben erledigt mein Kind …', optionen: ['selbstständig', 'mit Erinnerung', 'mit viel Unterstützung', 'selten'] },
      { id: 'e_lernen', typ: 'wahl', frage: 'Für Klassenarbeiten lernt mein Kind …', optionen: ['rechtzeitig und geplant', 'meist kurz vorher', 'kaum'] },
      { id: 'e_medien', typ: 'wahl', frage: 'Die Zeit mit Handy, Spielen und Medien ist …', optionen: ['angemessen', 'eher viel', 'zu viel'] },
      { id: 'e_zuhause', typ: 'text', frage: 'Was klappt beim Lernen zu Hause gut, was ist schwierig?' }
    ] },
    { id: 'verhalten', titel: 'Ihre Einschätzung', intro: '++ trifft voll zu · + eher · – eher nicht · – – trifft nicht zu · ? kann ich nicht einschätzen.', felder: [
      { id: 'e_krit', typ: 'kriterien', sicht: 'e', unklar: true }
    ] },
    { id: 'staerken', titel: 'Stärken und Interessen', felder: [
      { id: 'e_staerken', typ: 'text', frage: 'Wo liegen die Stärken Ihres Kindes?' },
      { id: 'e_interessen', typ: 'text', frage: 'Wofür interessiert und engagiert sich Ihr Kind außerhalb der Schule (Verein, Ehrenamt, Nebenjob, Familie)?' }
    ] },
    { id: 'zukunft', titel: 'Zukunft', felder: [
      { id: 'e_abschluss', typ: 'wahl', frage: 'Welchen Abschluss wünschen Sie sich für Ihr Kind?', optionen: ['Realschulabschluss nach Klasse 10', 'Hauptschulabschluss', 'Das möchten wir im Gespräch klären'] },
      { id: 'e_nach10', typ: 'mehr', frage: 'Welche Wege nach der Schule kommen für Sie in Frage?', optionen: NACH10 },
      { id: 'e_bo', typ: 'text', frage: 'Welche beruflichen Interessen sehen Sie bei Ihrem Kind? Wünschen Sie Unterstützung bei der Berufsorientierung?' }
    ] },
    { id: 'wichtig', titel: 'Wichtiges und Sorgen', intro: 'Alles hier ist freiwillig. Teilen Sie nur, was Sie teilen möchten.', felder: [
      { id: 'e_sorgen', typ: 'text', frage: 'Gibt es etwas, das Ihnen Sorgen macht?' },
      { id: 'e_wissen', typ: 'text', frage: 'Gibt es etwas, das der Klassenlehrer wissen sollte (z. B. Gesundheit, besondere Belastungen, Veränderungen in der Familie)?' }
    ] },
    { id: 'gespraech', titel: 'Fürs Gespräch', felder: [
      { id: 'e_schule', typ: 'text', frage: 'Was wünschen Sie sich von der Schule und vom Klassenlehrer?' },
      { id: 'e_unterst', typ: 'text', frage: 'Wie können Sie Ihr Kind zu Hause unterstützen?' },
      { id: 'e_themen', typ: 'text', frage: 'Diese Themen und Fragen möchte ich im Gespräch ansprechen:' }
    ] }
  ];

  // Gesprächsvorlage für den Klassenlehrer (je Schüler)
  VB.LEHRER_VORLAGE = [
    { id: 'rahmen', titel: 'Gesprächsrahmen', felder: [
      { id: 'l_status', typ: 'wahl', frage: 'Stand', optionen: ['offen', 'vorbereitet', 'geführt'] },
      { id: 'l_datum', typ: 'datum', frage: 'Datum' },
      { id: 'l_zeit', typ: 'kurz', frage: 'Uhrzeit', hilfe: 'z. B. 15:15 Uhr' },
      { id: 'l_teiln', typ: 'mehr', frage: 'Teilnehmende', optionen: ['Schüler/in', 'Mutter', 'Vater', 'andere Erziehungsberechtigte', 'weitere Lehrkraft', 'Schulsozialarbeit', 'Dolmetscher/in'] },
      { id: 'l_anlass', typ: 'wahl', frage: 'Anlass', optionen: ['Regelgespräch (Halbjahr)', 'Auf Wunsch der Eltern', 'Besonderer Anlass'] }
    ] },
    { id: 'ziel', titel: 'Ziel des Gesprächs', felder: [
      { id: 'l_ziel', typ: 'text', frage: 'Was soll am Ende des Gesprächs stehen?' },
      { id: 'l_kern', typ: 'kurz', frage: 'Meine Kernbotschaft in einem Satz' }
    ] },
    { id: 'beob', titel: 'Meine Beobachtungen', felder: [
      { id: 'l_staerken', typ: 'text', frage: 'Stärken (damit beginnen)' },
      { id: 'l_entw', typ: 'text', frage: 'Entwicklungsfelder (höchstens 2–3, konkret und beobachtbar)' },
      { id: 'l_faecher', typ: 'faecher', notiz: true, frage: 'Leistungsstand nach Fächern (Rückmeldungen der Fachlehrkräfte)' },
      { id: 'l_krit', typ: 'kriterien', sicht: 'l', unklar: true, frage: 'Arbeits- und Sozialverhalten' },
      { id: 'l_fehl', typ: 'kurz', frage: 'Fehlzeiten / Verspätungen' },
      { id: 'l_grad', typ: 'kurz', frage: 'Graduierung / Lernen in der IL' },
      { id: 'l_prog', typ: 'wahl', frage: 'Realschulabschluss (M-Niveau)', optionen: ['sicher erreichbar', 'erreichbar mit Einsatz', 'gefährdet'] },
      { id: 'l_prog_t', typ: 'kurz', frage: 'Begründung / Empfehlung' },
      { id: 'l_bo', typ: 'text', frage: 'Berufsorientierung: Praktikum, Interessen, nächste Schritte' }
    ] },
    { id: 'nach', titel: 'Im und nach dem Gespräch', felder: [
      { id: 'l_notiz', typ: 'text', frage: 'Gesprächsnotizen', gross: true },
      { id: 'l_verein', typ: 'vereinbarungen', frage: 'Vereinbarungen' },
      { id: 'l_naechst', typ: 'kurz', frage: 'Überprüfung / nächstes Gespräch', hilfe: 'z. B. vor den Osterferien' }
    ] }
  ];

  // Ablauf des Gesprächs (Leitfaden) – auch im Lehrer-PDF
  VB.PHASEN = [
    { t: 'Ankommen und Rahmen', min: 2, fragen: ['Begrüßen, Dank fürs Kommen, Zeitrahmen (ca. 15–20 Minuten) nennen.', 'Ziel klären: „Heute schauen wir gemeinsam, wo du stehst und wie es weitergeht.“', 'Die Schülerin / der Schüler steht im Mittelpunkt und spricht zuerst.'] },
    { t: 'Selbsteinschätzung des Kindes', min: 4, fragen: ['„Was läuft gerade gut? Worauf bist du stolz?“', '„Wo hakt es? Was fällt dir schwer?“', 'Skalierungsfrage: „Wo stehst du auf einer Skala von 1 bis 10 – und was bräuchte es für einen Punkt mehr?“'] },
    { t: 'Sicht der Eltern', min: 3, fragen: ['„Wie erleben Sie Ihr Kind zu Hause?“', '„Was ist Ihnen für dieses Gespräch besonders wichtig?“', 'Zuhören, zusammenfassen, nachfragen – noch nicht bewerten.'] },
    { t: 'Rückmeldung des Klassenlehrers', min: 4, fragen: ['Mit Stärken beginnen – konkret und mit Beispiel.', 'Höchstens 2–3 Entwicklungsfelder, beobachtbar beschreiben („Mir ist aufgefallen, dass …“).', 'Unterschiede zwischen Selbst-, Eltern- und Lehrersicht ansprechen: „Wie erklärst du dir das?“'] },
    { t: 'Ziele und Vereinbarungen', min: 4, fragen: ['Das Kind formuliert sein Ziel selbst (konkret, überprüfbar, mit Termin).', '„Was machst du konkret? Wer unterstützt dich wie – zu Hause und in der Schule?“', 'Vereinbarungen für alle drei Seiten festhalten: Schüler/in, Eltern, Schule.'] },
    { t: 'Abschluss', min: 2, fragen: ['Ergebnisse kurz zusammenfassen, Vereinbarungen vorlesen.', 'Termin für die Überprüfung festlegen, unterschreiben.', 'Positiv enden: Zutrauen aussprechen.'] }
  ];

  VB.TIPPS = [
    { t: 'Offene Fragen stellen', x: ['„Wie …?“, „Was …?“, „Woran merkst du …?“ statt Ja-Nein-Fragen.', '„Erzähl mal, wie eine typische IL-Stunde bei dir abläuft.“'] },
    { t: 'Ich-Botschaften', x: ['„Mir ist aufgefallen, dass …“ statt „Du bist immer …“.', 'Beobachtung – Wirkung – Wunsch: „Wenn die Hausaufgaben fehlen, kannst du im Unterricht schwer mitarbeiten. Ich wünsche mir …“'] },
    { t: 'Lösungsorientiert bleiben', x: ['„Wann hat es schon einmal gut geklappt? Was war da anders?“', '„Was wäre ein erster kleiner Schritt bis nächste Woche?“'] },
    { t: 'Aktiv zuhören', x: ['Zusammenfassen: „Habe ich richtig verstanden, dass …?“', 'Gefühle benennen: „Das klingt, als würde Sie das beunruhigen.“'] },
    { t: 'Bei Kritik und Emotionen', x: ['Ruhig bleiben, Anliegen hinter der Kritik suchen: „Was genau wünschen Sie sich?“', 'Sache und Person trennen; wenn nötig vertagen und Schulleitung/Schulsozialarbeit dazuholen.'] },
    { t: 'Gute Ziele (SMART)', x: ['spezifisch, messbar, attraktiv, realistisch, terminiert.', '„Ich gebe bis zu den Osterferien alle Englisch-Hausaufgaben pünktlich ab.“ statt „Ich strenge mich mehr an.“'] }
  ];

  VB.CHECKLISTE = ['Termin und Raum stehen, Störungen ausgeschlossen (Schild an der Tür).', 'Rückmeldungen der Fachlehrkräfte eingeholt (Noten, Verhalten).', 'Freigegebene Vorbereitungsbögen gelesen, Unterschiede markiert.', 'Gesprächsvorlage ausgedruckt, Stifte, Taschentücher, Wasser.', 'Bei Bedarf: Dolmetscher/in, Schulsozialarbeit informiert.', 'Nach dem Gespräch: Vereinbarungen notiert, Kopie für die Familie, Wiedervorlage im Kalender.'];

  VB.teile = rolle => rolle === 'eltern' ? [['e', VB.ELTERN]] : rolle === 'schueler' ? [['s', VB.SCHUELER]] : [['s', VB.SCHUELER], ['e', VB.ELTERN]];
  VB.ROLLE = { eltern: 'Elternteil', schueler: 'Schüler/in', gemeinsam: 'Eltern und Kind gemeinsam' };

  /* Fortschritt: Anteil beantworteter Felder */
  VB.beantwortet = function (f, v) {
    if (v == null || v === '') return false;
    if (Array.isArray(v)) return f.typ === 'ziele' ? v.some(z => z && (z.was || '').trim()) : f.typ === 'vereinbarungen' ? v.some(z => z && (z.was || '').trim()) : v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return String(v).trim() !== '';
  };
  VB.fortschritt = function (abschnitte, d) {
    let n = 0, a = 0; abschnitte.forEach(s => s.felder.forEach(f => { n++; if (VB.beantwortet(f, d[f.id])) a++; }));
    return n ? Math.round(a / n * 100) : 0;
  };

  /* ---------- Formular-Bausteine ---------- */
  const e = VB.esc;
  function knoepfe(id, liste, wert, extra) {
    return '<div class="wahl" role="group">' + liste.map(o => '<button type="button" data-f="' + id + '" data-v="' + e(o.v) + '"' + (extra || '') +
      ' aria-pressed="' + (String(wert) === String(o.v)) + '"' + (o.l ? ' title="' + e(o.l) + '" aria-label="' + e(o.l) + '"' : '') + '>' + e(o.t) + '</button>').join('') + '</div>';
  }
  VB.feldHTML = function (f, d) {
    const v = d[f.id], frage = f.frage ? '<span class="fr">' + e(f.frage) + (f.hilfe ? ' <small>' + e(f.hilfe) + '</small>' : '') + '</span>' : '';
    switch (f.typ) {
      case 'text': return '<label class="f">' + frage + '<textarea data-f="' + f.id + '" maxlength="3000"' + (f.gross ? ' style="min-height:160px"' : '') + '>' + e(v || '') + '</textarea></label>';
      case 'kurz': return '<label class="f">' + frage + '<input type="text" data-f="' + f.id + '" maxlength="300" value="' + e(v || '') + '"></label>';
      case 'datum': return '<label class="f">' + frage + '<input type="date" data-f="' + f.id + '" value="' + e(v || '') + '"></label>';
      case 'skala5': return '<div class="f">' + frage + '<div class="smileys">' + knoepfe(f.id, VB.SMILEY.map(o => ({ v: o.v, t: o.t, l: o.l })), v, ' data-typ="zahl"') + '</div></div>';
      case 'wahl': return '<div class="f">' + frage + knoepfe(f.id, f.optionen.map(o => ({ v: o, t: o })), v, ' data-typ="wahl"') + '</div>';
      case 'mehr': {
        const a = Array.isArray(v) ? v : [];
        return '<div class="f">' + frage + ' <small class="muted">(mehrere möglich)</small><div class="wahl" role="group">' + f.optionen.map(o =>
          '<button type="button" data-f="' + f.id + '" data-v="' + e(o) + '" data-typ="mehr" aria-pressed="' + a.includes(o) + '">' + e(o) + '</button>').join('') + '</div></div>';
      }
      case 'kriterien': {
        const o = v && typeof v === 'object' ? v : {};
        const st = VB.STUFEN.concat(f.unklar ? [{ v: 0, t: '?', l: 'kann ich nicht einschätzen' }] : []);
        return '<div class="f">' + frage + '<div class="krit">' + VB.KRITERIEN.map(k => '<div class="kz"><span>' + e(f.sicht === 'l' ? k.kurz + ': ' + k.l : k[f.sicht]) + '</span>' +
          '<div class="wahl stufen" role="group">' + st.map(s => '<button type="button" data-f="' + f.id + '" data-k="' + k.k + '" data-v="' + s.v + '" data-typ="krit" title="' + e(s.l) + '" aria-label="' + e(s.l) + '" aria-pressed="' + (o[k.k] === s.v) + '">' + e(s.t) + '</button>').join('') +
          '</div></div>').join('') + '</div></div>';
      }
      case 'faecher': {
        const o = v && typeof v === 'object' ? v : {};
        return '<div class="f">' + frage + '<div class="faecher">' + VB.FAECHER.map(fa => {
          const w = o[fa] || {};
          return '<div class="fz"><b>' + e(fa) + '</b><div class="ampel" role="group">' + VB.AMPEL.map(a =>
            '<button type="button" data-f="' + f.id + '" data-k="' + e(fa) + '" data-v="' + a.v + '" data-typ="fach" style="--c:' + a.c + '" aria-pressed="' + (w.a === a.v) + '" aria-label="' + e(fa + ': ' + a.t) + '"><i></i>' + e(a.t) + '</button>').join('') + '</div>' +
            (f.notiz ? '<input type="text" class="fn" data-f="' + f.id + '" data-k="' + e(fa) + '" data-typ="fachn" maxlength="120" placeholder="Note / Bemerkung" value="' + e(w.n || '') + '">' : '') + '</div>';
        }).join('') + '</div></div>';
      }
      case 'ziele': {
        const a = Array.isArray(v) ? v : [];
        return '<div class="f">' + [0, 1, 2].map(i => { const z = a[i] || {};
          return '<fieldset class="ziel"><legend>Ziel ' + (i + 1) + (i ? ' <small>(freiwillig)</small>' : '') + '</legend>' +
            '<label class="f"><span class="fr">Was will ich erreichen?</span><input type="text" data-f="' + f.id + '" data-i="' + i + '" data-k="was" data-typ="liste" maxlength="300" value="' + e(z.was || '') + '"></label>' +
            '<label class="f"><span class="fr">Wie schaffe ich das?</span><input type="text" data-f="' + f.id + '" data-i="' + i + '" data-k="wie" data-typ="liste" maxlength="300" value="' + e(z.wie || '') + '"></label>' +
            '<label class="f"><span class="fr">Bis wann?</span><input type="text" data-f="' + f.id + '" data-i="' + i + '" data-k="bis" data-typ="liste" maxlength="80" value="' + e(z.bis || '') + '"></label></fieldset>';
        }).join('') + '</div>';
      }
      case 'vereinbarungen': {
        const a = (Array.isArray(v) && v.length ? v : [{}, {}, {}]);
        return '<div class="f">' + frage + '<div class="verein">' + a.map((z, i) =>
          '<div class="vz"><select data-f="' + f.id + '" data-i="' + i + '" data-k="wer" data-typ="liste" aria-label="Wer">' + ['', 'Schüler/in', 'Eltern', 'Schule'].map(o => '<option' + ((z.wer || '') === o ? ' selected' : '') + ' value="' + o + '">' + (o || 'Wer?') + '</option>').join('') + '</select>' +
          '<input type="text" data-f="' + f.id + '" data-i="' + i + '" data-k="was" data-typ="liste" maxlength="300" placeholder="Was?" value="' + e(z.was || '') + '">' +
          '<input type="text" data-f="' + f.id + '" data-i="' + i + '" data-k="bis" data-typ="liste" maxlength="60" placeholder="Bis wann?" value="' + e(z.bis || '') + '"></div>').join('') +
          '</div><button type="button" class="btn sec klein" data-zeile="' + f.id + '">+ Zeile</button></div>';
      }
    }
    return '';
  };
  VB.abschnittHTML = (s, d) => s.felder.map(f => VB.feldHTML(f, d)).join('');

  /* Eingaben im Container in das Datenobjekt d schreiben; neu = Container neu zeichnen nötig */
  VB.binden = function (box, d, geaendert) {
    box.addEventListener('click', ev => {
      const z = ev.target.closest('[data-zeile]');
      if (z) { const id = z.dataset.zeile; if (!Array.isArray(d[id]) || !d[id].length) d[id] = [{}, {}, {}]; if (d[id].length < 12) d[id].push({}); geaendert(true); return; }
      const b = ev.target.closest('button[data-f]'); if (!b) return;
      const id = b.dataset.f, typ = b.dataset.typ, v = b.dataset.v;
      if (typ === 'zahl') d[id] = d[id] === +v ? null : +v;
      else if (typ === 'wahl') d[id] = d[id] === v ? null : v;
      else if (typ === 'mehr') { const a = Array.isArray(d[id]) ? d[id] : []; d[id] = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); }
      else if (typ === 'krit') { const o = d[id] && typeof d[id] === 'object' ? d[id] : {}; if (o[b.dataset.k] === +v) delete o[b.dataset.k]; else o[b.dataset.k] = +v; d[id] = o; }
      else if (typ === 'fach') { const o = d[id] && typeof d[id] === 'object' ? d[id] : {}; const w = o[b.dataset.k] || {}; w.a = w.a === v ? '' : v; o[b.dataset.k] = w; d[id] = o; }
      // Knöpfe der Gruppe aktualisieren, ohne neu zu zeichnen
      const grp = b.parentElement;
      if (typ === 'mehr') b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      else grp.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b && b.getAttribute('aria-pressed') !== 'true'));
      geaendert(false);
    });
    const eingabe = ev => {
      const t = ev.target; if (!t.dataset || !t.dataset.f || t.tagName === 'BUTTON') return;
      const id = t.dataset.f, typ = t.dataset.typ;
      if (typ === 'liste') { const a = Array.isArray(d[id]) ? d[id] : []; const i = +t.dataset.i; while (a.length <= i) a.push({}); a[i][t.dataset.k] = t.value; d[id] = a; }
      else if (typ === 'fachn') { const o = d[id] && typeof d[id] === 'object' ? d[id] : {}; const w = o[t.dataset.k] || {}; w.n = t.value; o[t.dataset.k] = w; d[id] = o; }
      else d[id] = t.value;
      geaendert(false);
    };
    box.addEventListener('input', eingabe); box.addEventListener('change', eingabe);
  };

  /* Antwort als Klartext (für PDF und Lehreransicht) */
  VB.klartext = function (f, v) {
    if (!VB.beantwortet(f, v)) return '';
    switch (f.typ) {
      case 'skala5': { const s = VB.SMILEY.find(x => x.v === v); return s ? v + ' von 5 (' + s.l + ')' : ''; }
      case 'mehr': return v.join(', ');
      case 'datum': return VB.isoDatum(v);
      case 'ziele': return v.filter(z => z && (z.was || '').trim()).map((z, i) => (i + 1) + '. ' + z.was + (z.wie ? ' – Wie: ' + z.wie : '') + (z.bis ? ' – Bis: ' + z.bis : '')).join('\n');
      case 'vereinbarungen': return v.filter(z => z && (z.was || '').trim()).map(z => (z.wer ? z.wer + ': ' : '') + z.was + (z.bis ? ' (bis ' + z.bis + ')' : '')).join('\n');
      case 'kriterien': case 'faecher': return '';
      default: return String(v);
    }
  };

  /* ---------- PDF ---------- */
  const ROT = [168, 16, 16], GRAU = [111, 111, 111], LINIE = [200, 200, 200];
  VB.pdfNeu = function () {
    if (!window.jspdf) throw new Error('Das PDF-Werkzeug konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const P = { doc, x: 18, w: 174, y: 18, unten: 280 };
    P.font = (gr, art, farbe) => { doc.setFont('helvetica', art || 'normal'); doc.setFontSize(gr); doc.setTextColor.apply(doc, farbe || [40, 40, 40]); };
    P.platz = h => { if (P.y + h > P.unten) { doc.addPage(); P.y = 18; return true; } return false; };
    P.text = function (t, gr, art, farbe, einr, abst) {
      P.font(gr, art, farbe); const lh = gr * 0.42;
      const zeilen = doc.splitTextToSize(String(t), P.w - (einr || 0));
      zeilen.forEach(z => { P.platz(lh); doc.text(z, P.x + (einr || 0), P.y + lh * 0.8); P.y += lh; });
      P.y += abst == null ? 1.2 : abst;
    };
    P.kopf = function (titel, unter, zeile3) {
      doc.setFillColor.apply(doc, ROT); doc.rect(0, 0, 210, 26, 'F');
      P.font(16, 'bold', [255, 255, 255]); doc.text(titel, P.x, 11.5);
      P.font(9.5, 'normal', [255, 255, 255]); doc.text(unter, P.x, 18);
      if (zeile3) doc.text(zeile3, P.x, 22.6);
      P.font(8.5, 'bold', [255, 255, 255]); doc.text('PAGS Külsheim', 192, 11.5, { align: 'right' });
      P.font(8, 'normal', [255, 255, 255]); doc.text('Klasse ' + VB.KLASSE, 192, 16.5, { align: 'right' });
      P.y = 33;
    };
    P.h2 = function (t) {
      P.platz(16); P.y += 2;
      doc.setFillColor.apply(doc, ROT); doc.rect(P.x, P.y, 1.6, 6, 'F');
      P.font(12.5, 'bold', ROT); doc.text(t, P.x + 4, P.y + 4.7); P.y += 9;
    };
    P.linien = function (n, einr) {
      doc.setDrawColor.apply(doc, LINIE); doc.setLineWidth(0.2);
      for (let i = 0; i < n; i++) { P.platz(7.5); P.y += 7; doc.line(P.x + (einr || 0), P.y, P.x + P.w, P.y); }
      P.y += 3;
    };
    P.frage = function (frage, antwort, leer) {
      P.platz(12); P.text(frage, 9.5, 'bold', [60, 60, 60], 0, 0.8);
      if (antwort) P.text(antwort, 10.5, 'normal', [20, 20, 20], 2, 3);
      else P.linien(leer == null ? 2 : leer, 2);
    };
    P.punkt = function (x, y, farbe, r) { doc.setFillColor.apply(doc, farbe); doc.circle(x, y, r || 1.6, 'F'); };
    P.fuss = function (text) {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i); P.font(7.5, 'normal', GRAU);
        doc.text(text, P.x, 290); doc.text('Seite ' + i + ' von ' + n, 192, 290, { align: 'right' });
      }
    };
    P.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    return P;
  };

  // Tabelle Arbeits-/Sozialverhalten: Spalten = Blickwinkel [{titel, werte}]
  VB.pdfKriterien = function (P, spalten, sicht) {
    const doc = P.doc, sw = 17, tw = P.w - sw * spalten.length;
    P.platz(10);
    P.font(8, 'bold', GRAU);
    spalten.forEach((s, i) => doc.text(s.titel, P.x + tw + sw * i + sw / 2, P.y + 3, { align: 'center' }));
    P.y += 5;
    VB.KRITERIEN.forEach((k, ri) => {
      const t = sicht ? k[sicht] : k.kurz;
      P.font(9, 'normal'); const z = doc.splitTextToSize(t, tw - 3); const h = Math.max(6.4, z.length * 3.9 + 2.4);
      P.platz(h);
      if (ri % 2 === 0) { doc.setFillColor(246, 245, 243); doc.rect(P.x, P.y, P.w, h, 'F'); }
      P.font(9, 'normal', [40, 40, 40]); doc.text(z, P.x + 1.5, P.y + 4.3);
      const werte = spalten.map(s => (s.werte || {})[k.k]);
      const zahlen = werte.filter(v => v > 0); const abw = zahlen.length > 1 && Math.max.apply(null, zahlen) - Math.min.apply(null, zahlen) >= 2;
      spalten.forEach((s, i) => {
        const v = werte[i], st = VB.STUFEN.find(x => x.v === v), cx = P.x + tw + sw * i + sw / 2;
        if (s.leer) { doc.setDrawColor.apply(doc, LINIE); doc.rect(cx - 3, P.y + h / 2 - 2.6, 6, 5.2); return; }
        P.font(10, 'bold', abw ? ROT : [40, 40, 40]); doc.text(v === 0 ? '?' : st ? st.t : '·', cx, P.y + h / 2 + 1.4, { align: 'center' });
      });
      P.y += h;
    });
    P.font(7.5, 'normal', GRAU); P.y += 3.5; doc.text('++ trifft voll zu · + eher · – eher nicht · – – trifft nicht zu · ? nicht einschätzbar' + (spalten.length > 1 ? ' · rot = Sichtweisen weichen deutlich ab' : ''), P.x, P.y); P.y += 4;
  };

  VB.pdfFaecher = function (P, spalten) {
    const doc = P.doc, sw = 22, nw = spalten.some(s => s.notiz) ? 60 : 0, tw = P.w - sw * spalten.length - nw;
    P.platz(10); P.font(8, 'bold', GRAU);
    spalten.forEach((s, i) => doc.text(s.titel, P.x + tw + sw * i + sw / 2, P.y + 3, { align: 'center' }));
    if (nw) doc.text('Note / Bemerkung', P.x + tw + sw * spalten.length + 2, P.y + 3);
    P.y += 5;
    VB.FAECHER.forEach((fa, ri) => {
      P.platz(6.4);
      if (ri % 2 === 0) { doc.setFillColor(246, 245, 243); doc.rect(P.x, P.y, P.w, 6.4, 'F'); }
      P.font(9, 'normal', [40, 40, 40]); doc.text(fa, P.x + 1.5, P.y + 4.4);
      spalten.forEach((s, i) => {
        const w = (s.werte || {})[fa] || {}, a = VB.AMPEL.find(x => x.v === w.a), cx = P.x + tw + sw * i + sw / 2;
        if (a) P.punkt(cx, P.y + 3.2, P.hex(a.c), 1.9); else { doc.setDrawColor.apply(doc, LINIE); doc.circle(cx, P.y + 3.2, 1.9); }
      });
      if (nw) { const n = spalten.map(s => s.notiz && ((s.werte || {})[fa] || {}).n).filter(Boolean)[0]; if (n) { P.font(8.5, 'normal'); doc.text(doc.splitTextToSize(n, nw - 3)[0], P.x + tw + sw * spalten.length + 2, P.y + 4.4); } }
      P.y += 6.4;
    });
    P.y += 2; P.font(7.5, 'normal', GRAU);
    let x = P.x; VB.AMPEL.forEach(a => { P.punkt(x + 1.5, P.y + 1.6, P.hex(a.c), 1.3); doc.text(a.t, x + 4, P.y + 2.6); x += 24; }); P.y += 7;
  };

  // Vorbereitungsbogen eines Kontos als PDF (für Familien)
  VB.pdfBogen = function (stand, ausLehrer) {
    const P = VB.pdfNeu(), doc = P.doc, k = stand.konto, s = stand.schueler, d = k.daten || {};
    const kind = VB.name(s);
    P.kopf('Mein Standortgespräch – Vorbereitung', kind + ' · ausgefüllt von: ' + (k.name ? k.name + ' (' + VB.ROLLE[k.rolle] + ')' : VB.ROLLE[k.rolle]),
      'Klassenlehrer: ' + VB.LEHRER + ' · Stand: ' + (k.gespeichert_am ? VB.zeitpunkt(k.gespeichert_am) : VB.datum(new Date())));
    VB.teile(k.rolle).forEach(([teil, abschnitte], ti) => {
      if (VB.teile(k.rolle).length > 1) {
        if (ti) { doc.addPage(); P.y = 18; }
        P.text(teil === 's' ? 'Teil für ' + s.vorname : 'Teil für die Eltern', 14, 'bold', [40, 40, 40], 0, 2);
      }
      abschnitte.forEach(ab => {
        P.h2(ab.titel);
        ab.felder.forEach(f => {
          const v = d[f.id];
          if (f.typ === 'kriterien') return VB.pdfKriterien(P, [{ titel: teil === 's' ? 'Ich' : 'Eltern', werte: v }], f.sicht);
          if (f.typ === 'faecher') return VB.pdfFaecher(P, [{ titel: s.vorname, werte: v }]);
          if (f.typ === 'skala5') {
            P.platz(10); P.text(f.frage, 9.5, 'bold', [60, 60, 60], 0, 0.5);
            let x = P.x + 2; VB.SMILEY.forEach(o => { const an = v === o.v; doc.setDrawColor.apply(doc, an ? ROT : LINIE); if (an) { doc.setFillColor.apply(doc, ROT); doc.circle(x + 2.2, P.y + 2.6, 2.2, 'FD'); } else doc.circle(x + 2.2, P.y + 2.6, 2.2);
              P.font(8, an ? 'bold' : 'normal', an ? [255, 255, 255] : GRAU); doc.text(String(o.v), x + 2.2, P.y + 3.6, { align: 'center' }); P.font(7.5, an ? 'bold' : 'normal', an ? ROT : GRAU); doc.text(o.l, x + 5.6, P.y + 3.5); x += 32; });
            P.y += 8; return;
          }
          if (f.typ === 'ziele') {
            const a = (Array.isArray(v) ? v : []).filter(z => z && (z.was || '').trim());
            P.platz(12); P.text('Meine Ziele bis zum nächsten Gespräch', 9.5, 'bold', [60, 60, 60], 0, 0.8);
            if (a.length) a.forEach((z, i) => P.text((i + 1) + '. ' + z.was + (z.wie ? '\n    Wie: ' + z.wie : '') + (z.bis ? '\n    Bis: ' + z.bis : ''), 10.5, 'normal', [20, 20, 20], 2, 2));
            else P.linien(3, 2);
            return;
          }
          P.frage(f.frage, VB.klartext(f, v), f.typ === 'wahl' || f.typ === 'mehr' ? 1 : 2);
        });
      });
    });
    // Platz für das Gespräch selbst
    doc.addPage(); P.y = 18;
    P.text('Im Gespräch', 14, 'bold', [40, 40, 40], 0, 2);
    P.h2('Notizen'); P.linien(9);
    P.h2('Unsere Vereinbarungen');
    ['Das mache ich (Schüler/in):', 'Das machen wir (Eltern):', 'Das macht die Schule:'].forEach(t => { P.text(t, 9.5, 'bold', [60, 60, 60], 0, 0); P.linien(2, 2); });
    P.text('Überprüfung / nächstes Gespräch am: ______________________', 10, 'normal', [40, 40, 40], 0, 10);
    P.font(8.5, 'normal', GRAU); const y = P.y + 10; doc.setDrawColor(120, 120, 120);
    [['Schüler/in', 18], ['Erziehungsberechtigte', 78], ['Klassenlehrer', 138]].forEach(([t, x]) => { doc.line(x, y, x + 52, y); doc.text(t, x, y + 4); });
    P.fuss('Vorbereitung Standortgespräch · ' + kind + ' · Klasse ' + VB.KLASSE + ' · PAGS Külsheim');
    return doc;
  };

  // Gesprächsvorlage des Lehrers für eine Schülerin / einen Schüler
  VB.pdfLehrer = function (doc0, sch, termin) {
    let P = VB.pdfNeu(); if (doc0) { doc0.addPage(); P.doc = doc0; P.y = 18; }
    const doc = P.doc, L = sch.lehrer || {}, kind = VB.name(sch);
    const konten = (sch.konten || []).filter(k => k.freigabe && k.daten);
    const S = konten.filter(k => k.rolle !== 'eltern').map(k => k.daten)[0] || {};
    const E = konten.filter(k => k.rolle !== 'schueler').map(k => k.daten).filter(d => Object.keys(d).some(x => x.startsWith('e_')))[0] || {};
    const hatS = konten.some(k => k.rolle !== 'eltern'), hatE = Object.keys(E).length > 0;
    const datum = L.l_datum ? VB.isoDatum(L.l_datum) : (termin ? termin.datum : ''), zeit = L.l_zeit || (termin ? termin.zeit : '');
    P.kopf('Standortgespräch – Gesprächsvorlage', kind + (datum ? ' · ' + datum : '') + (zeit ? ' · ' + zeit : ''),
      'Klassenlehrer: ' + VB.LEHRER + (L.l_teiln && L.l_teiln.length ? ' · Teilnehmende: ' + L.l_teiln.join(', ') : ''));
    const status = (sch.konten || []).length ? (sch.konten || []).map(k => VB.ROLLE[k.rolle] + (k.freigabe ? ' (freigegeben)' : ' (nicht freigegeben)')).join(', ') : 'noch kein Konto angelegt';
    P.text('Vorbereitungsbögen: ' + status + (L.l_anlass ? ' · Anlass: ' + L.l_anlass : ''), 8.5, 'normal', GRAU, 0, 2);

    P.h2('Ziel und Kernbotschaft');
    P.frage('Was soll am Ende stehen?', L.l_ziel, 2);
    P.frage('Kernbotschaft', L.l_kern, 1);

    P.h2('Stärken und Entwicklungsfelder');
    P.frage('Stärken (Einstieg)', L.l_staerken, 2);
    P.frage('Entwicklungsfelder (2–3)', L.l_entw, 2);
    if (hatS && (S.s_kann || S.s_besser)) P.frage('So sieht sich ' + sch.vorname + ' selbst', [S.s_kann && 'Kann gut: ' + S.s_kann, S.s_besser && 'Will verbessern: ' + S.s_besser].filter(Boolean).join('\n'));
    if (hatE && E.e_staerken) P.frage('Stärken aus Sicht der Eltern', E.e_staerken);

    P.h2('Leistungsstand nach Fächern');
    VB.pdfFaecher(P, [{ titel: 'Lehrer', werte: L.l_faecher, notiz: true }].concat(hatS ? [{ titel: 'Schüler/in', werte: S.s_faecher }] : []));

    P.h2('Arbeits- und Sozialverhalten im Vergleich');
    VB.pdfKriterien(P, [{ titel: 'Schüler/in', werte: S.s_krit, leer: !hatS }, { titel: 'Eltern', werte: E.e_krit, leer: !hatE }, { titel: 'Lehrer', werte: L.l_krit }], null);

    P.h2('Weitere Punkte');
    P.frage('Fehlzeiten / Verspätungen', L.l_fehl, 1);
    P.frage('Graduierung / IL', L.l_grad, 1);
    P.frage('Realschulabschluss', [L.l_prog, L.l_prog_t].filter(Boolean).join(' – '), 1);
    P.frage('Berufsorientierung', L.l_bo, 2);

    if (hatS || hatE) {
      P.h2('Aus den Vorbereitungsbögen');
      const wohl = [hatS && S.s_schule && 'Schüler/in: ' + VB.klartext({ typ: 'skala5' }, S.s_schule), hatE && E.e_stimmung && 'Eltern: ' + VB.klartext({ typ: 'skala5' }, E.e_stimmung)].filter(Boolean).join(' · ');
      if (wohl) P.frage('Wohlbefinden an der Schule', wohl);
      if (hatS) {
        if (S.s_stoert) P.frage('Was ' + sch.vorname + ' belastet', S.s_stoert);
        if (S.s_abschluss || (S.s_nach10 || []).length || S.s_beruf) P.frage('Zukunft (Schüler/in)', [S.s_abschluss, (S.s_nach10 || []).join(', '), S.s_beruf].filter(Boolean).join('\n'));
        if (VB.beantwortet({ typ: 'ziele' }, S.s_ziele)) P.frage('Ziele von ' + sch.vorname, VB.klartext({ typ: 'ziele' }, S.s_ziele));
        if (S.s_brauche) P.frage('Braucht dafür', S.s_brauche);
        if (S.s_themen || S.s_fragen) P.frage('Themen und Fragen von ' + sch.vorname, [S.s_themen, S.s_fragen].filter(Boolean).join('\n'));
      }
      if (hatE) {
        const zh = [E.e_ha && 'Hausaufgaben: ' + E.e_ha, E.e_lernen && 'Lernen: ' + E.e_lernen, E.e_medien && 'Medien: ' + E.e_medien].filter(Boolean).join(' · ');
        if (zh || E.e_zuhause) P.frage('Lernen zu Hause (Eltern)', [zh, E.e_zuhause].filter(Boolean).join('\n'));
        if (E.e_abschluss || (E.e_nach10 || []).length || E.e_bo) P.frage('Zukunft (Eltern)', [E.e_abschluss, (E.e_nach10 || []).join(', '), E.e_bo].filter(Boolean).join('\n'));
        if (E.e_sorgen || E.e_wissen) P.frage('Sorgen / Wichtiges (vertraulich)', [E.e_sorgen, E.e_wissen].filter(Boolean).join('\n'));
        if (E.e_schule || E.e_unterst || E.e_themen) P.frage('Wünsche und Themen der Eltern', [E.e_schule && 'Von der Schule: ' + E.e_schule, E.e_unterst && 'Unterstützung zu Hause: ' + E.e_unterst, E.e_themen].filter(Boolean).join('\n'));
      }
    }

    // Ablauf mit Platz für Notizen
    doc.addPage(); P.y = 18;
    P.text('Gesprächsablauf – ' + kind, 14, 'bold', [40, 40, 40], 0, 2);
    VB.PHASEN.forEach((ph, i) => {
      P.platz(26);
      P.font(10.5, 'bold', ROT); P.doc.text((i + 1) + '. ' + ph.t, P.x, P.y + 4); P.font(8.5, 'normal', GRAU); P.doc.text('ca. ' + ph.min + ' Min.', 192, P.y + 4, { align: 'right' }); P.y += 6;
      ph.fragen.forEach(q => P.text('•  ' + q, 8.8, 'normal', [70, 70, 70], 2, 0.4));
      P.linien(1, 2);
    });
    if (L.l_notiz) { P.h2('Gesprächsnotizen'); P.text(L.l_notiz, 10, 'normal', [20, 20, 20], 0, 3); }

    P.h2('Vereinbarungen');
    const ver = (Array.isArray(L.l_verein) ? L.l_verein : []).filter(z => z && (z.was || '').trim());
    const zeilen = ver.concat(Array(Math.max(2, 5 - ver.length)).fill({}));
    P.platz(10); P.font(8, 'bold', GRAU); doc.text('Wer', P.x + 1, P.y + 3); doc.text('Was', P.x + 30, P.y + 3); doc.text('Bis wann', P.x + 142, P.y + 3); P.y += 4.5;
    doc.setDrawColor.apply(doc, LINIE);
    zeilen.forEach(z => {
      P.font(9.5, 'normal', [20, 20, 20]); const t = doc.splitTextToSize(z.was || '', 108); const h = Math.max(8, t.length * 4.2 + 3.5);
      P.platz(h); doc.rect(P.x, P.y, P.w, h);
      doc.line(P.x + 28, P.y, P.x + 28, P.y + h); doc.line(P.x + 140, P.y, P.x + 140, P.y + h);
      if (z.wer) doc.text(z.wer, P.x + 1.5, P.y + 5); if (t.length) doc.text(t, P.x + 30, P.y + 5); if (z.bis) doc.text(doc.splitTextToSize(z.bis, 30), P.x + 142, P.y + 5);
      P.y += h;
    });
    P.y += 4; P.text('Überprüfung / nächstes Gespräch: ' + (L.l_naechst || '______________________'), 10, 'normal', [40, 40, 40], 0, 5);
    P.platz(11); P.font(8.5, 'normal', GRAU); const y = P.y + 7; doc.setDrawColor(120, 120, 120);
    [['Schüler/in', 18], ['Erziehungsberechtigte', 78], ['Klassenlehrer', 138]].forEach(([t, x]) => { doc.line(x, y, x + 52, y); doc.text(t, x, y + 4); });
    P.y = y + 8;
    return P;
  };

  window.VB = VB;
})();
