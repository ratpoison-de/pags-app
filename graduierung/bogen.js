// Gemeinsame Teile für Schülerseite (index.html) und Lehrerseite (lehrer.html)
const RESPEKT = {t:'Gesprächsregeln einhalten und respektvolles Verhalten', b:['im Atelier und Klassenzimmer','gegenüber Mitschülern, Lernbegleitern, Eigentum']};
const RESPEKT2 = {t:RESPEKT.t, b:['im Atelier und Klassenzimmer und außerhalb','gegenüber Mitschülern, Lernbegleitern, Eigentum']};
const ZEIT = {t:'Effektive Nutzung der Arbeitszeit und Lernplan auf aktuellem Stand', b:['in Unterricht und IL','pünktliche Vorbereitung auf Präsentationen, Tests']};
const ZUV_ORG = {t:'Zuverlässigkeit sowie Organisation und Ordnung', b:['Rückgabezettel, Unterschriften, Material …','Lerntagebuch, Überblick haben, selbstständig planen']};
const VORBILD = {t:'Vorbildliche und aktive Teilnahme über den Unterricht hinaus', b:['Übernahme zusätzlicher Dienste']};

const STUFEN = {
  walker:{name:'Walker', farbe:'#2E7D32', hex:[46,125,50], max:6, zusatz:true, krit:[
    {...RESPEKT, max:2}, {...ZEIT, max:2},
    {t:'Zuverlässigkeit', b:['Rückgabezettel, Unterschriften, Material rechtzeitig dabeihaben und nicht vergessen'], max:1},
    {t:'Organisation und Ordnung', b:['Lerntagebuch, Überblick und Ordnung haben','Selbstständigkeit, selbstständige Arbeit sinnvoll planen'], max:1}]},
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
function datumDE(v){ const [y,m,d]=String(v).slice(0,10).split('-'); return `${d}.${m}.${y}`; }
function dateiName(a){ const n=String(a.name).trim().replace(/[^A-Za-zÄÖÜäöüß0-9]+/g,'_'); return `Selbstbewertung_${STUFEN[a.stufe].name}_${n}_${String(a.datum).slice(0,10)}.pdf`; }

let LOGO = null;
function ladeLogo(pfad){
  return fetch(pfad).then(r=>r.blob()).then(b=>new Promise(res=>{const fr=new FileReader(); fr.onload=()=>{LOGO=fr.result;res();}; fr.readAsDataURL(b);})).catch(()=>{});
}

function _tabelle(doc, x, y, w, rows, hex){
  const c1 = w-34;
  doc.setFillColor(...hex); doc.rect(x,y,w,8,'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Kriterium', x+3, y+5.5); doc.text('Punkte', x+c1+17, y+5.5, {align:'center'});
  y += 8; doc.setTextColor(40);
  rows.forEach((r,i)=>{
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    const t = doc.splitTextToSize(r[0], c1-6);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const u = r[1].flatMap(s=>doc.splitTextToSize('– '+s, c1-10));
    const h = 5 + t.length*4.6 + u.length*3.9 + 2;
    if (i%2) { doc.setFillColor(246,245,243); doc.rect(x,y,w,h,'F'); }
    doc.setDrawColor(200); doc.rect(x,y,w,h); doc.line(x+c1,y,x+c1,y+h);
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(t, x+3, y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(100); doc.text(u, x+6, y+5+t.length*4.6);
    doc.setTextColor(40); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text(r[2], x+c1+17, y+h/2+1.8, {align:'center'});
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

// a = {stufe, name, datum (YYYY-MM-DD), werte[], zusatz, dienste, bemerkung, eingang?}
// doc optional: hängt eine neue Seite an ein vorhandenes PDF an
function bogenPDF(a, doc){
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
  y += 7;

  const rows = s.krit.map((k,i)=>[k.t, k.b, `${a.werte[i]} / ${k.max}`]);
  if (s.zusatz) rows.push(['Zusatzpunkt für Dienste', ['max. 1 Zusatzpunkt, aber insgesamt nicht über '+s.max+' Punkte'], `${a.zusatz||0} / 1`]);
  y = _tabelle(doc, M, y, B, rows, s.hex);
  doc.setFillColor(...s.hex); doc.rect(M, y, B, 10, 'F');
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Gesamt (Selbsteinschätzung)', M+3, y+6.8);
  doc.text(`${gesamtPunkte(a.stufe, a.werte, a.zusatz)} / ${s.max}`, M+B-17, y+6.8, {align:'center'});
  y += 18;

  doc.setTextColor(40);
  y = _box(doc, M, y, B, 'Aktiv gemachte Dienste oder Leistungen über den Unterricht hinaus (selbst ausgefüllt)', (a.dienste||'').trim(), 14);
  if ((a.bemerkung||'').trim()) { doc.setTextColor(40); y = _box(doc, M, y, B, 'Bemerkung der Schülerin / des Schülers', a.bemerkung.trim(), 10); }
  doc.setTextColor(168,16,16);
  y = _box(doc, M, y, B, 'Gelbe Karten (nur vom Lernbegleiter auszufüllen mit Datum und Unterschrift)', '', 16);
  doc.setTextColor(168,16,16);
  y = _box(doc, M, y, B, 'Bemerkungen zu Abzügen oder Zusatzpunkten (Lernbegleiter)', '', 16);
  doc.setTextColor(40); doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text('Punkte nach Prüfung: ______ / '+s.max, M, y+4);
  doc.line(M+100, y+4, M+B, y+4); doc.setFontSize(8); doc.text('Datum, Unterschrift Lernbegleiter', M+100, y+8);

  doc.setFontSize(7.5); doc.setTextColor(140);
  const zeit = a.eingang ? new Date(a.eingang) : new Date();
  doc.text((a.eingang ? 'Abgegeben am ' : 'Erstellt am ') + zeit.toLocaleString('de-DE') + ' über die PAGS-App', M, 290);
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
