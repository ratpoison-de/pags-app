// Gemeinsame Teile für Schülerseite (index.html) und Lehrerseite (lehrer.html)
const RESPEKT = {t:'Gesprächsregeln einhalten und respektvolles Verhalten', k:'Gesprächsregeln & Respekt', b:['im Atelier und Klassenzimmer','gegenüber Mitschülern, Lernbegleitern, Eigentum']};
const RESPEKT2 = {...RESPEKT, b:['im Atelier und Klassenzimmer und außerhalb','gegenüber Mitschülern, Lernbegleitern, Eigentum']};
const ZEIT = {t:'Effektive Nutzung der Arbeitszeit und Lernplan auf aktuellem Stand', k:'Arbeitszeit & Lernplan', b:['in Unterricht und IL','pünktliche Vorbereitung auf Präsentationen, Tests']};
const ZUV_ORG = {t:'Zuverlässigkeit sowie Organisation und Ordnung', k:'Zuverlässigkeit, Organisation & Ordnung', b:['Rückgabezettel, Unterschriften, Material …','Lerntagebuch, Überblick haben, selbstständig planen']};
const VORBILD = {t:'Aktive Teilnahme am Unterricht und Mitgestaltung des Unterrichtsgeschehens', k:'Aktive Teilnahme & Mitgestaltung des Unterrichts', b:[]};

const STUFEN = {
  walker:{name:'Walker', farbe:'#2E7D32', hex:[46,125,50], max:6, zusatz:true, krit:[
    {...RESPEKT, max:2}, {...ZEIT, max:2},
    {t:'Zuverlässigkeit', k:'Zuverlässigkeit', b:['Rückgabezettel, Unterschriften, Material rechtzeitig dabeihaben und nicht vergessen'], max:1},
    {t:'Organisation und Ordnung', k:'Organisation & Ordnung', b:['Lerntagebuch, Überblick und Ordnung haben','Selbstständigkeit, selbstständige Arbeit sinnvoll planen'], max:1}]},
  hiker:{name:'Hiker', farbe:'#1565C0', hex:[21,101,192], krit:[
    {...RESPEKT2, max:3}, {...ZEIT, max:3}, {...ZUV_ORG, max:2}, {...VORBILD, max:2}]},
  climber:{name:'Climber', farbe:'#E65100', hex:[230,81,0], krit:[
    {...RESPEKT2, max:4}, {...ZEIT, max:4}, {...ZUV_ORG, max:3}, {...VORBILD, max:3}]},
  freeclimber:{name:'Freeclimber', farbe:'#6A1B9A', hex:[106,27,154], krit:[
    {...RESPEKT2, max:4}, {...ZEIT, max:4}, {...ZUV_ORG, max:3}, {...VORBILD, max:3}]}
};
for (const s of Object.values(STUFEN)) if (!s.max) s.max = s.krit.reduce((a,k)=>a+k.max,0);

function gesamtPunkte(stufe, werte, zusatz){
  const s = STUFEN[stufe];
  return Math.min(werte.reduce((a,v)=>a+(v||0),0) + (s.zusatz ? (zusatz||0) : 0), s.max);
}
// Lehrer-Gesamt: eingetragener Wert, sonst Summe der Lehrerpunkte, sonst null
function lehrerGesamt(a){
  if (a.lehrer_gesamt !== null && a.lehrer_gesamt !== undefined) return Number(a.lehrer_gesamt);
  if (Array.isArray(a.lehrer_werte) && a.lehrer_werte.some(v=>v!==null)) return gesamtPunkte(a.stufe, a.lehrer_werte, a.lehrer_zusatz);
  return null;
}
function zahl(v){ return v===null || v===undefined ? '' : String(Number(v)).replace('.',','); }
function lw(a,i){ return Array.isArray(a.lehrer_werte) && a.lehrer_werte[i]!==null && a.lehrer_werte[i]!==undefined ? a.lehrer_werte[i] : null; }
function datumDE(v){ const [y,m,d]=String(v).slice(0,10).split('-'); return `${d}.${m}.${y}`; }

/* ---------- Graduierungswoche (Kalenderwoche, Mo–Fr) ---------- */
function _utc(iso){ const [y,m,d]=String(iso).slice(0,10).split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function _iso(dt){ return dt.toISOString().slice(0,10); }
function montagVon(iso){ const d=_utc(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay()+6)%7)); return _iso(d); }
function plusTage(iso, n){ const d=_utc(iso); d.setUTCDate(d.getUTCDate()+n); return _iso(d); }
function kwNr(iso){ const d=_utc(iso); d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));
  const j=new Date(Date.UTC(d.getUTCFullYear(),0,4)); return 1+Math.round(((d-j)/864e5-3+((j.getUTCDay()+6)%7))/7); }
function heuteISO(){ const t=new Date(); return _iso(new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()))); }
// lang: "KW 46 · 09.11.–13.11.2026", kurz: "KW 46 · 09.11.–13.11."
function wocheText(mo, kurz){
  const fr=plusTage(mo,4), a=datumDE(mo), b=datumDE(fr);
  return `KW ${kwNr(mo)} · ${a.slice(0,6)}–${kurz ? b.slice(0,6) : b}`;
}
function wocheVon(a){ return a.woche ? String(a.woche).slice(0,10) : montagVon(a.datum); }
function dateiName(a){ const n=String(a.name).trim().replace(/[^A-Za-zÄÖÜäöüß0-9]+/g,'_'); return `Selbstbewertung_${STUFEN[a.stufe].name}_${n}_${String(a.datum).slice(0,10)}.pdf`; }

let LOGO = null;
function ladeLogo(pfad){
  return fetch(pfad).then(r=>r.blob()).then(b=>new Promise(res=>{const fr=new FileReader(); fr.onload=()=>{LOGO=fr.result;res();}; fr.readAsDataURL(b);})).catch(()=>{});
}

/* ---------- Großer Bogen (eine A4-Seite pro Schüler) ---------- */
function _tabelle(doc, x, y, w, rows, hex, mitLehrer){
  const sp = 22, c1 = w - (mitLehrer ? 2*sp : sp);
  doc.setFillColor(...hex); doc.rect(x,y,w,8,'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
  doc.text('Kriterium', x+3, y+5.5);
  doc.text('Schüler', x+c1+sp/2, y+5.5, {align:'center'});
  if (mitLehrer) doc.text('Lehrer', x+c1+sp*1.5, y+5.5, {align:'center'});
  y += 8; doc.setTextColor(40);
  rows.forEach((r,i)=>{
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    const t = doc.splitTextToSize(r[0], c1-6);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const u = r[1].flatMap(s=>doc.splitTextToSize('– '+s, c1-10));
    const h = 5 + t.length*4.6 + u.length*3.9 + 2;
    if (i%2) { doc.setFillColor(246,245,243); doc.rect(x,y,w,h,'F'); }
    doc.setDrawColor(200); doc.rect(x,y,w,h); doc.line(x+c1,y,x+c1,y+h);
    if (mitLehrer) doc.line(x+c1+sp,y,x+c1+sp,y+h);
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(t, x+3, y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(100); doc.text(u, x+6, y+5+t.length*4.6);
    doc.setTextColor(40); doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text(r[2], x+c1+sp/2, y+h/2+1.8, {align:'center'});
    if (mitLehrer) { doc.setTextColor(168,16,16); doc.text(r[3], x+c1+sp*1.5, y+h/2+1.8, {align:'center'}); doc.setTextColor(40); }
    y += h;
  });
  return y;
}
function _box(doc, x, y, w, titel, inhalt, minH){
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(titel, x, y);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(40);
  const lines = inhalt ? doc.splitTextToSize(inhalt, w-6) : [];
  const h = Math.max(minH, lines.length*4.6+5);
  doc.setDrawColor(190); doc.rect(x, y+2, w, h);
  if (lines.length) doc.text(lines, x+3, y+7);
  return y+2+h+7;
}

// a = {stufe, name, datum, werte[], zusatz, dienste, bemerkung, eingang?, lehrer_werte?, lehrer_zusatz?, lehrer_gesamt?}
// doc optional: hängt eine neue Seite an ein vorhandenes PDF an
// mitLehrer: Lehrerspalte zeigen (Lehrerseite), auf der Schülerseite nicht
function bogenPDF(a, doc, mitLehrer){
  const { jsPDF } = window.jspdf; const s = STUFEN[a.stufe];
  if (doc) doc.addPage(); else doc = new jsPDF({unit:'mm', format:'a4', compress:true});
  const W=210, M=16, B=W-2*M;
  doc.setFillColor(168,16,16); doc.rect(0,0,W,24,'F');
  if (LOGO) { try{ doc.setFillColor(255); doc.roundedRect(M,6,20,12,2,2,'F'); doc.addImage(LOGO,'PNG',M+1,7,18,9,'logo','FAST');}catch(e){} }
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(15);
  doc.text('Graduierungspunkte – Selbstbewertung', M+24, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  doc.text('Pater-Alois-Grimm-Schule Külsheim', M+24, 18);
  doc.setFillColor(...s.hex); doc.roundedRect(W-M-36, 7, 36, 10, 2, 2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(s.name, W-M-18, 13.8, {align:'center'});

  let y = 34; doc.setTextColor(40); doc.setFontSize(11);
  doc.setFont('helvetica','bold'); doc.text('Name:', M, y); doc.setFont('helvetica','normal'); doc.text(String(a.name).trim(), M+16, y);
  doc.setFont('helvetica','bold'); doc.text('Datum:', M+120, y); doc.setFont('helvetica','normal'); doc.text(datumDE(a.datum), M+136, y);
  y += 6.5;
  doc.setFont('helvetica','bold'); doc.text('Graduierungswoche:', M, y); doc.setFont('helvetica','normal'); doc.text(wocheText(wocheVon(a)), M+41, y);
  y += 6;

  const L = (v,m) => v===null ? '' : `${zahl(v)} / ${m}`;
  const rows = s.krit.map((k,i)=>[k.t, k.b, `${a.werte[i]} / ${k.max}`, L(lw(a,i), k.max)]);
  if (s.zusatz) rows.push(['Zusatzpunkt für Dienste', ['max. 1 Zusatzpunkt, aber insgesamt nicht über '+s.max+' Punkte'], `${a.zusatz||0} / 1`,
    (a.lehrer_zusatz===null||a.lehrer_zusatz===undefined) ? '' : `${a.lehrer_zusatz} / 1`]);
  y = _tabelle(doc, M, y, B, rows, s.hex, mitLehrer);
  const sp = 22, c1 = B - (mitLehrer ? 2*sp : sp);
  doc.setFillColor(...s.hex); doc.rect(M, y, B, 10, 'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Gesamt', M+3, y+6.8);
  doc.text(`${gesamtPunkte(a.stufe, a.werte, a.zusatz)} / ${s.max}`, M+c1+sp/2, y+6.8, {align:'center'});
  const lg = lehrerGesamt(a);
  if (mitLehrer) {
    doc.setFillColor(255); doc.rect(M+c1+sp+1, y+1, sp-2, 8, 'F');
    doc.setTextColor(168,16,16); doc.text(lg===null ? '' : `${zahl(lg)} / ${s.max}`, M+c1+sp*1.5, y+6.8, {align:'center'});
  }
  y += 18;

  doc.setTextColor(40);
  y = _box(doc, M, y, B, 'Aktiv gemachte Dienste oder Leistungen über den Unterricht hinaus (selbst ausgefüllt)', (a.dienste||'').trim(), 14);
  if ((a.bemerkung||'').trim()) { doc.setTextColor(40); y = _box(doc, M, y, B, 'Bemerkung der Schülerin / des Schülers', a.bemerkung.trim(), 10); }
  doc.setTextColor(168,16,16);
  y = _box(doc, M, y, B, 'Gelbe Karten (nur vom Lernbegleiter auszufüllen mit Datum und Unterschrift)', '', 16);
  doc.setTextColor(168,16,16);
  y = _box(doc, M, y, B, 'Bemerkungen zu Abzügen oder Zusatzpunkten (Lernbegleiter)', mitLehrer ? (a.lehrer_bemerkung||'').trim() : '', 16);
  // Neue Gesamtpunktzahl (vom Lernbegleiter)
  doc.setDrawColor(168,16,16); doc.setLineWidth(0.5); doc.rect(M, y-2, 82, 11); doc.setLineWidth(0.2);
  doc.setTextColor(168,16,16); doc.setFont('helvetica','bold'); doc.setFontSize(10.5);
  doc.text('Neue Gesamtpunktzahl:', M+3, y+5.2);
  doc.setFontSize(13);
  doc.text((mitLehrer && lg!==null ? zahl(lg) : '_____') + ' / ' + s.max, M+79, y+5.4, {align:'right'});
  doc.setTextColor(40); doc.setDrawColor(120); doc.setFont('helvetica','normal');
  doc.line(M+100, y+6, M+B, y+6); doc.setFontSize(8); doc.text('Datum, Unterschrift Lernbegleiter', M+100, y+10);

  doc.setFontSize(7.5); doc.setTextColor(140);
  const zeit = a.eingang ? new Date(a.eingang) : new Date();
  doc.text((a.eingang ? 'Abgegeben am ' : 'Erstellt am ') + zeit.toLocaleString('de-DE') + ' über die PAGS-App', M, 290);
  return doc;
}

/* ---------- Kompakter Bogen: 4 pro A4-Seite (je A6) ---------- */
function _kompakt(doc, a, X, Y){
  const s = STUFEN[a.stufe], W = 105, H = 148.5, m = 6, x = X+m, w = W-2*m;
  let y = Y+m;
  // Kopf
  doc.setFillColor(168,16,16); doc.rect(x, y, w, 9, 'F');
  if (LOGO) { try{ doc.setFillColor(255); doc.roundedRect(x+1.5,y+1.2,12,6.6,1,1,'F'); doc.addImage(LOGO,'PNG',x+2,y+1.6,11,5.6,'logo','FAST'); }catch(e){} }
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text('Graduierungspunkte', x+15.5, y+4.2);
  doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.text('PAGS Külsheim', x+15.5, y+7.3);
  doc.setFillColor(...s.hex); doc.roundedRect(x+w-24, y+1.8, 22.5, 5.4, 1.2, 1.2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.text(s.name, x+w-12.75, y+5.6, {align:'center'});
  y += 14;
  // Name / Datum
  doc.setTextColor(40); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text(doc.splitTextToSize(String(a.name).trim(), w-30)[0], x, y);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.text(wocheText(wocheVon(a), true), x+w, y, {align:'right'});
  y += 3;
  // Tabelle
  const sp = 12, c1 = w - 2*sp;
  doc.setFillColor(...s.hex); doc.rect(x, y, w, 5, 'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(6.5);
  doc.text('Kriterium', x+1.5, y+3.4); doc.text('Schüler', x+c1+sp/2, y+3.4, {align:'center'}); doc.text('Lehrer', x+c1+sp*1.5, y+3.4, {align:'center'});
  y += 5;
  const zeilen = s.krit.map((k,i)=>[k.k, `${a.werte[i]}/${k.max}`, lw(a,i)===null ? '' : `${zahl(lw(a,i))}/${k.max}`]);
  if (s.zusatz) zeilen.push(['Zusatzpunkt Dienste', `${a.zusatz||0}/1`, (a.lehrer_zusatz===null||a.lehrer_zusatz===undefined) ? '' : `${a.lehrer_zusatz}/1`]);
  doc.setDrawColor(200);
  zeilen.forEach((z,i)=>{
    doc.setFont('helvetica','normal'); doc.setFontSize(7);
    const t = doc.splitTextToSize(z[0], c1-3); const h = Math.max(6, t.length*3 + 3);
    if (i%2) { doc.setFillColor(246,245,243); doc.rect(x,y,w,h,'F'); }
    doc.rect(x,y,w,h); doc.line(x+c1,y,x+c1,y+h); doc.line(x+c1+sp,y,x+c1+sp,y+h);
    doc.setTextColor(40); doc.text(t, x+1.5, y+3.9);
    doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(z[1], x+c1+sp/2, y+h/2+1.3, {align:'center'});
    doc.setTextColor(168,16,16); doc.text(z[2], x+c1+sp*1.5, y+h/2+1.3, {align:'center'});
    y += h;
  });
  doc.setFillColor(...s.hex); doc.rect(x, y, w, 6.5, 'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Gesamt', x+1.5, y+4.4);
  doc.text(`${gesamtPunkte(a.stufe, a.werte, a.zusatz)}/${s.max}`, x+c1+sp/2, y+4.4, {align:'center'});
  doc.setFillColor(255); doc.rect(x+c1+sp+0.6, y+0.6, sp-1.2, 5.3, 'F');
  const lg = lehrerGesamt(a);
  doc.setTextColor(168,16,16); doc.setFontSize(8.5); doc.text(lg===null ? '' : `${zahl(lg)}/${s.max}`, x+c1+sp*1.5, y+4.5, {align:'center'});
  y += 10;
  // Textfelder
  const feld = (titel, text, maxZ, minH, rot) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); rot ? doc.setTextColor(168,16,16) : doc.setTextColor(60);
    doc.text(titel, x, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.8); rot ? doc.setTextColor(150,20,20) : doc.setTextColor(40);
    let l = text ? doc.splitTextToSize(text, w-3) : [];
    if (l.length > maxZ) { l = l.slice(0, maxZ); l[maxZ-1] = l[maxZ-1].replace(/.{0,2}$/, '…'); }
    const h = Math.max(minH, l.length*2.9 + 2.5);
    doc.setDrawColor(190); doc.rect(x, y+1, w, h);
    if (l.length) doc.text(l, x+1.5, y+3.6);
    y += h + 5;
  };
  feld('Dienste / Leistungen über den Unterricht hinaus', (a.dienste||'').trim(), 4, 7);
  if ((a.bemerkung||'').trim()) feld('Bemerkung Schüler/in', a.bemerkung.trim(), 2, 5);
  const lb = (a.lehrer_bemerkung||'').trim();
  if (lb) { feld('Bemerkungen Lernbegleiter', lb, 6, 7, true); }
  const rest2 = Y + H - m - 13.5 - y;   // Platz für Gesamtpunktzahl + Unterschrift
  feld(lb ? 'Gelbe Karten' : 'Gelbe Karten / Bemerkungen Lernbegleiter', '', 0, Math.max(8, rest2 - 1), true);
  // Unterschrift
  const uy = Y + H - m - 2;
  doc.setDrawColor(120); doc.line(x+w-45, uy, x+w, uy);
  doc.setFont('helvetica','normal'); doc.setFontSize(5.8); doc.setTextColor(110);
  doc.text('Datum, Unterschrift Lernbegleiter', x+w-45, uy+2.6);
  doc.text('Abgabe: '+(a.eingang ? new Date(a.eingang).toLocaleDateString('de-DE') : ''), x, uy+3);
  // Neue Gesamtpunktzahl
  const lgk = lehrerGesamt(a);
  doc.setDrawColor(168,16,16); doc.setLineWidth(0.4); doc.rect(x, uy-7.4, 47, 7.4); doc.setLineWidth(0.2);
  doc.setTextColor(168,16,16); doc.setFont('helvetica','bold'); doc.setFontSize(6.6);
  doc.text('Neue Gesamtpunktzahl', x+1.5, uy-2.8);
  doc.setFontSize(9); doc.text((lgk===null ? '____' : zahl(lgk)) + ' / ' + s.max, x+45.5, uy-2.6, {align:'right'});
}

// Alle Bögen, 4 pro A4-Seite, mit Schnittlinien
function druckPDF(liste){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'a4', compress:true});
  liste.forEach((a,i)=>{
    const pos = i % 4;
    if (i && !pos) doc.addPage();
    if (!pos) {
      doc.setDrawColor(170); doc.setLineWidth(0.2); doc.setLineDashPattern([1.5,1.5],0);
      doc.line(105, 4, 105, 293); doc.line(4, 148.5, 206, 148.5);
      doc.setLineDashPattern([],0);
    }
    _kompakt(doc, a, (pos % 2) * 105, Math.floor(pos / 2) * 148.5);
  });
  return doc;
}

/* ---------- Papierbogen für Klassen ohne Geräte (z. B. Klasse 5) ---------- */
// Kindgerechte Formulierungen (Punkte und Reihenfolge wie STUFEN)
const KIND_TEXTE = {
  walker: [
    'Ich halte mich an die Gesprächsregeln und bin freundlich und respektvoll – zu Kindern, Lehrkräften und fremden Sachen.',
    'Ich nutze meine Arbeitszeit gut. Mein Lernplan ist auf dem neuesten Stand.',
    'Ich bin zuverlässig: Zettel, Unterschriften und Material habe ich dabei.',
    'Ich halte Ordnung und habe den Überblick (Lerntagebuch, Planen).'
  ],
  zusatz: 'Extra-Punkt: Ich habe einen zusätzlichen Dienst übernommen.'
};
function kindKriterien(stufe){
  const s = STUFEN[stufe], t = KIND_TEXTE[stufe];
  const l = s.krit.map((k,i)=>({text: t ? t[i] : k.t, kurz: k.k, max: k.max}));
  if (s.zusatz) l.push({text: KIND_TEXTE.zusatz, kurz: 'Extra-Punkt (Dienst)', max: 1, zusatz: true});
  return l;
}
function optLabel(max, n){
  if (max === 1) return n ? 'ja' : 'nein';
  if (max === 2) return ['noch nicht','teilweise','sehr gut'][n];
  return '';
}
function erfassenUrl(code, woche){
  const basis = location.href.replace(/[^/]*([?#].*)?$/, '');
  return basis + 'erfassen.html#k=' + code + '&w=' + woche;
}
function _qr(doc, text, x, y, groesse){
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = groesse / n;
  doc.setFillColor(0);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x + c*m, y + r*m, m + 0.02, m + 0.02, 'F');
}
function _papierBogen(doc, kind, woche, klasse, Y){
  const s = STUFEN[kind.stufe], M = 10, W = 210, B = W - 2*M;
  let y = Y + 7;
  doc.setFillColor(168,16,16); doc.rect(M, y, B, 12, 'F');
  if (LOGO) { try{ doc.setFillColor(255); doc.roundedRect(M+2,y+1.6,17,8.8,1.2,1.2,'F'); doc.addImage(LOGO,'PNG',M+2.6,y+2.1,15.8,7.8,'logo','FAST'); }catch(e){} }
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('Graduierung – So war meine Woche', M+22, y+6.2);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('Pater-Alois-Grimm-Schule Külsheim' + (klasse ? ' · Klasse ' + klasse : ''), M+22, y+10);
  doc.setFillColor(...s.hex); doc.roundedRect(W-M-30, y+2.5, 28, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(s.name, W-M-16, y+7.4, {align:'center'});
  y += 18;
  // Name, Woche, QR
  doc.setTextColor(40); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text('Name', M, y);
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(String(kind.name), M, y+7);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text('Woche', M+100, y);
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(wocheText(woche), M+100, y+6.5);
  _qr(doc, erfassenUrl(kind.code, woche), W-M-25, y-4, 25);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(120);
  doc.text('Nr. ' + kind.nr + ' · nur für die Lehrkraft', W-M-12.5, y+24, {align:'center'});
  doc.setFontSize(8.5); doc.setTextColor(80);
  doc.text('Kreuze in jeder Zeile genau ein Kästchen an. Sei ehrlich!', M, y+13);
  y += 27;
  // Tabelle
  const krit = kindKriterien(kind.stufe), maxOpt = Math.max(...krit.map(k=>k.max)) + 1;
  const ow = maxOpt <= 3 ? 22 : 15, tw = B - maxOpt*ow;
  krit.forEach((k,i)=>{
    doc.setFont('helvetica', k.zusatz ? 'bolditalic' : 'normal'); doc.setFontSize(9.5);
    const t = doc.splitTextToSize(k.text, tw - 4), h = Math.max(11, t.length*4.2 + 4);
    if (i%2 === 0) { doc.setFillColor(246,245,243); doc.rect(M, y, B, h, 'F'); }
    doc.setDrawColor(205); doc.rect(M, y, B, h);
    doc.setTextColor(40); doc.text(t, M+2, y + h/2 - (t.length-1)*2.1 + 1.2);
    for (let n = 0; n <= k.max; n++) {
      const cx = M + tw + n*ow + ow/2, lab = optLabel(k.max, n);
      doc.setDrawColor(60); doc.setLineWidth(0.4); doc.rect(cx-2.8, y + (lab ? 1.8 : h/2-2.8), 5.6, 5.6); doc.setLineWidth(0.2);
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(150); doc.text(String(n), cx+4, y + (lab ? 3.6 : h/2-1));
      if (lab) { doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(70); doc.text(lab, cx, y + 10.3, {align:'center'}); }
    }
    y += h;
  });
  y += 5;
  // Textfelder
  const fw = (B - 6) / 2, fh = Y + 148.5 - 9 - y - 4;
  [['Das habe ich zusätzlich gemacht (z. B. Dienste, anderen geholfen):', M], ['Das möchte ich noch sagen:', M + fw + 6]].forEach(([t, x])=>{
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(60); doc.text(t, x, y);
    doc.setDrawColor(190); doc.rect(x, y+1.5, fw, fh);
    doc.setDrawColor(225); for (let ly = y + 9; ly < y + 1.5 + fh - 2; ly += 7) doc.line(x+2, ly, x+fw-2, ly);
  });
}
// Alle Kinder einer Klasse, 2 Bögen pro A4-Seite (A5 quer)
function papierPDF(kinder, woche, klasse){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'a4', compress:true});
  kinder.forEach((k,i)=>{
    const pos = i % 2;
    if (i && !pos) doc.addPage();
    if (!pos) { doc.setDrawColor(170); doc.setLineDashPattern([1.5,1.5],0); doc.line(4, 148.5, 206, 148.5); doc.setLineDashPattern([],0); }
    _papierBogen(doc, k, woche, klasse, pos * 148.5);
  });
  return doc;
}

// Supabase-REST ohne Bibliothek
function sbFetch(pfad, body){
  const c = window.PAGS_CONFIG;
  return fetch(c.supabaseUrl + '/rest/v1/' + pfad, {
    method:'POST',
    headers:{'apikey':c.supabaseAnonKey,'Authorization':'Bearer '+c.supabaseAnonKey,'Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify(body)
  });
}
