/* PAGS-App – Begleiter-Figur aus der Assistent-App (Klementine, Bit, Olli), angepasst an Startseite, „PAGS kennenlernen“ und „PAGS Alltag“.
   Frei verschiebbare Figur mit Sprechblase und Menü; führt durch die Seiten, beantwortet Fragen, hilft beim Eintragen und Anmelden.
   Seite wählen über <body data-buddy="start|kennen|alltag">.
   Akkuschonend: Animationen laufen nur ein paar Sekunden nach einem Ereignis, danach steht die Figur still. */
(function(){
"use strict";
const NAMES=['Klementine','Bit','Olli'];
const KEY='pags-app.buddy',POS='pags-app.buddy.pos.'+(document.body.getAttribute('data-buddy')||'start'),SEEN='pags-app.buddy.seen.'+(document.body.getAttribute('data-buddy')||'start'),AREAS='pags-app.buddy.areas';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function kind(){let k=0;try{const v=localStorage.getItem(KEY);if(v!==null)k=+v}catch(_){}return isNaN(k)?0:k}
function moodOf(m){return m==='happy'||m==='proud'?'happy':m==='busy'?'think':m==='sleepy'?'sleepy':m==='think'?'think':'normal'}

/* ---------------- Figuren (SVG, 100×100) ---------------- */
function eyes(x1,x2,y,rx,ry,pr,mood,white,pupil){
  let s='';
  for(const x of [x1,x2]){
    if(mood==='happy')s+='<path d="M'+(x-rx*.8)+' '+(y+2)+'Q'+x+' '+(y-ry*1.1)+' '+(x+rx*.8)+' '+(y+2)+'" fill="none" stroke="'+pupil+'" stroke-width="3" stroke-linecap="round"/>';
    else if(mood==='sleepy')s+='<path d="M'+(x-rx*.8)+' '+y+'Q'+x+' '+(y+ry*.6)+' '+(x+rx*.8)+' '+y+'" fill="none" stroke="'+pupil+'" stroke-width="3" stroke-linecap="round"/>';
    else{const lx=mood==='think'?2.5:0,ly=mood==='think'?-3.5:.8;
      s+='<g class="bl"><ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+white+'"/><circle cx="'+(x+lx)+'" cy="'+(y+ly)+'" r="'+pr+'" fill="'+pupil+'"/><circle cx="'+(x+lx-pr*.35)+'" cy="'+(y+ly-pr*.4)+'" r="'+(pr*.32)+'" fill="#fff" opacity=".8"/></g>'}
  }
  return s;
}
function mouth(x,y,w,col,mood){
  const talk='<ellipse class="mt" cx="'+x+'" cy="'+y+'" rx="'+(w*.35)+'" ry="3" fill="'+col+'"/>';
  let rest;
  if(mood==='happy')rest='<path d="M'+(x-w*.7)+' '+(y-1)+'A'+(w*.7)+' '+(w*.65)+' 0 0 0 '+(x+w*.7)+' '+(y-1)+'Z" fill="'+col+'"/>';
  else if(mood==='think')rest='<path d="M'+(x-w*.2)+' '+(y+1)+'L'+(x+w*.45)+' '+(y-1)+'" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round"/>';
  else if(mood==='sleepy')rest='<ellipse cx="'+x+'" cy="'+(y+1)+'" rx="2.5" ry="2" fill="'+col+'"/>';
  else rest='<path d="M'+(x-w*.47)+' '+(y-1.5)+'Q'+x+' '+(y+w*.4)+' '+(x+w*.47)+' '+(y-1.5)+'" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round"/>';
  return '<g class="mr">'+rest+'</g>'+(mood==='happy'?'':talk);
}
function clementine(m){
  const arms=m==='happy'
    ?'<g class="wv"><path d="M22 58L11 44" /><path d="M78 58L89 44"/></g>'
    :'<path d="M22 64L14 73"/><path d="M78 64L86 73"/>';
  return '<g stroke="#E0701A" stroke-width="4" stroke-linecap="round" fill="none">'+arms+'</g>'+
    '<path d="M50 30L52 21" stroke="#6B4A2B" stroke-width="3" stroke-linecap="round"/>'+
    '<ellipse cx="62" cy="24" rx="10" ry="5" fill="#2E9E4A" transform="rotate(-28 60 24)"/>'+
    '<circle cx="50" cy="59" r="30" fill="#FF8A1F"/><ellipse cx="38" cy="43" rx="8" ry="6" fill="#fff" opacity=".32"/>'+
    '<circle cx="64" cy="76" r="1.2" fill="#A04000" opacity=".15"/><circle cx="36" cy="74" r="1.2" fill="#A04000" opacity=".15"/><circle cx="70" cy="50" r="1.2" fill="#A04000" opacity=".15"/>'+
    '<circle cx="34" cy="67" r="4.5" fill="#FF3D6D" opacity=".33"/><circle cx="66" cy="67" r="4.5" fill="#FF3D6D" opacity=".33"/>'+
    eyes(41,59,56,6,7.5,3.3,m,'#fff','#2A1A10')+mouth(50,70,10,'#5A2A10',m);
}
function robot(m,acc){
  const eye='#4FE3FF';let e='';
  for(const x of [42.5,57.5]){
    if(m==='happy')e+='<path d="M'+(x-4)+' 51Q'+x+' 43 '+(x+4)+' 51" fill="none" stroke="'+eye+'" stroke-width="2.8" stroke-linecap="round"/>';
    else if(m==='sleepy')e+='<path d="M'+(x-3.5)+' 50h7" stroke="'+eye+'" stroke-width="2.8" stroke-linecap="round"/>';
    else{const lx=m==='think'?2:0,ly=m==='think'?-3:0;e+='<rect class="bl" x="'+(x-3.5+lx)+'" y="'+(44+ly)+'" width="7" height="10" rx="2.5" fill="'+eye+'"/>'}
  }
  const mo=m==='happy'?'<path d="M44 58.5A6 4.5 0 0 0 56 58.5" fill="none" stroke="'+eye+'" stroke-width="2.5" stroke-linecap="round"/>'
    :'<g class="mr"><path d="M46 60h8" stroke="'+eye+'" stroke-width="2.5" stroke-linecap="round"/></g><rect class="mt" x="45" y="58" width="10" height="4" rx="1.5" fill="'+eye+'"/>';
  return '<ellipse cx="50" cy="82" rx="14" ry="4" fill="'+acc+'" opacity=".22"/>'+
    '<path d="M50 28V15" stroke="#9A9A98" stroke-width="2.5" stroke-linecap="round"/><circle class="ant" cx="50" cy="13" r="3.8" fill="'+acc+'"/>'+
    '<rect x="19" y="44" width="8" height="16" rx="3" fill="#BDBDBA"/><rect x="73" y="44" width="8" height="16" rx="3" fill="#BDBDBA"/>'+
    (m==='happy'?'<g class="wv" stroke="#BDBDBA" stroke-width="3.5" stroke-linecap="round"><path d="M26 70L14 58"/><path d="M74 70L86 58"/></g>':'')+
    '<rect x="26" y="28" width="48" height="49" rx="14" fill="#EDEDEA" stroke="#CFCFCB" stroke-width="1.5"/>'+
    '<rect x="32" y="36" width="36" height="30" rx="8" fill="#262626"/>'+e+mo;
}
function owl(m){
  const wl=m==='happy'?' class="fl"':'';
  return '<g'+wl+'><ellipse cx="26" cy="61" rx="7" ry="15" fill="#6F5541" transform="rotate(10 28 50)"/><ellipse cx="74" cy="61" rx="7" ry="15" fill="#6F5541" transform="rotate(-10 72 50)"/></g>'+
    '<path d="M29 34L32 14L44 27ZM71 34L68 14L56 27Z" fill="#8B6B52"/>'+
    '<ellipse cx="50" cy="54" rx="24" ry="32" fill="#8B6B52"/><ellipse cx="50" cy="67" rx="14" ry="17" fill="#E3CFB2"/>'+
    '<g fill="none" stroke="#B89B7A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M41 64l3 3 3-3"/><path d="M53 64l3 3 3-3"/><path d="M47 72l3 3 3-3"/></g>'+
    '<circle cx="40" cy="43" r="11.5" fill="#F4E9D4"/><circle cx="60" cy="43" r="11.5" fill="#F4E9D4"/>'+
    eyes(40,60,43,8.5,8.5,4.6,m,'#fff','#1E1E1E')+
    '<path d="M45.5 52h9L50 58Z" fill="#F2A33A"/>'+(m==='happy'?'':'<path class="mt" d="M47 59h6l-3 3Z" fill="#F2A33A"/>')+
    '<ellipse cx="43" cy="86" rx="4" ry="3" fill="#F2A33A"/><ellipse cx="57" cy="86" rx="4" ry="3" fill="#F2A33A"/>';
}
function svg(k,mood,acc){
  const m=moodOf(mood);
  const fig=k===1?robot(m,acc||'#FF5A1F'):k===2?owl(m):clementine(m);
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g class="sh"><ellipse cx="50" cy="94" rx="24" ry="3" fill="#000" opacity=".13"/></g><g class="bd">'+fig+'</g></svg>';
}
window.buddySVG=function(m,k){return svg(k==null?kind():k,m)};
window.buddyKind=kind;

/* ---------------- Oberfläche ---------------- */
const st=document.createElement('style');
st.textContent=`
.bud{position:fixed;width:64px;height:64px;z-index:45;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
.bud[hidden],body.kbup .bud,body.kbup .bub{display:none!important}
.bud svg{overflow:visible;display:block}
.bud .bd,.bud .sh{transform-box:fill-box;transform-origin:50% 100%}
.bud .bl{transform-box:fill-box;transform-origin:50% 50%}
.bud .mt{display:none;transform-box:fill-box;transform-origin:50% 50%}
.bud.talk .mt{display:inline}.bud.talk .mr{display:none}
.bud.live .bd{animation:budBob 2.4s ease-in-out infinite}
.bud.live .sh{animation:budSh 2.4s ease-in-out infinite}
.bud.live .bl{animation:budBlink 4.3s infinite}
.bud.live.talk .mt{animation:budTalk .19s ease-in-out infinite alternate}
.bud.live .wv{animation:budWave .35s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
.bud.live .fl{animation:budWave .16s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 0}
.bud.live .ant{animation:budAnt 1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 50%}
.bud.hop{animation:budHop .7s cubic-bezier(.3,1.5,.5,1)}
@keyframes budBob{0%,100%{transform:translateY(1.5px)}50%{transform:translateY(-2px)}}
@keyframes budSh{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.85)}}
@keyframes budBlink{0%,95%,100%{transform:none}97%{transform:scaleY(.1)}}
@keyframes budTalk{from{transform:scaleY(.45)}to{transform:scaleY(1.5)}}
@keyframes budWave{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
@keyframes budAnt{from{transform:scale(.85)}to{transform:scale(1.15)}}
@keyframes budHop{0%{transform:none}35%{transform:translateY(-14px)}65%{transform:translateY(2px)}100%{transform:none}}
.bub{position:fixed;z-index:46;max-width:min(290px,calc(100vw - 24px));box-sizing:border-box;padding:12px 10px 10px 14px;border-radius:14px;background:#FFFBE3;border:1px solid #E7DDA6;box-shadow:0 10px 30px -10px rgba(40,30,0,.35);font:400 15px/1.45 "Open Sans",Helvetica,Arial,sans-serif;color:#111;transform-origin:var(--ox,90%) var(--oy,100%);animation:bubIn .18s ease-out}
.bub .bt{display:flex;gap:8px;align-items:flex-start}.bub .bt span{flex:1;white-space:pre-line}
.bub .bx{flex:none;border:0;background:none;color:#999;font-size:13px;padding:0 4px 6px 8px;cursor:pointer}
.bub .bo{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 2px;font:inherit;font-weight:600;color:#111;cursor:pointer;border-radius:8px}
.bub .bo:active{background:rgba(0,0,0,.05)}
.bub .bo i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#A81010;margin:0 10px 1px 2px;vertical-align:middle}
.bub .bos{margin-top:6px}
.bub:after{content:"";position:absolute;left:var(--tx,80%);width:14px;height:14px;background:#FFFBE3;border:1px solid #E7DDA6;transform:rotate(45deg);border-top:0;border-left:0;bottom:-8px}
.bub.below:after{bottom:auto;top:-8px;border:1px solid #E7DDA6;border-bottom:0;border-right:0}
@keyframes bubIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bud.live *,.bud.hop,.bub{animation:none!important}}
`;
document.head.appendChild(st);

const el=document.createElement('div');el.className='bud';el.id='bud';el.setAttribute('role','button');el.setAttribute('aria-label','Assistent');
document.body.appendChild(el);
let mood='normal',cur=null,bub=null,hideT=0,liveT=0,talkT=0,moodT=0,lastShown={};
function paint(){el.innerHTML=svg(kind(),mood,"#A81010")}
function live(ms){el.classList.add('live');clearTimeout(liveT);liveT=setTimeout(()=>el.classList.remove('live'),ms||12000)}
function setMood(m,ms){mood=moodOf(m);paint();clearTimeout(moodT);if(ms)moodT=setTimeout(()=>{mood=cur?moodOf(cur.mood):'normal';paint()},ms)}
function hop(){el.classList.remove('hop');void el.offsetWidth;el.classList.add('hop');live()}
function haptic(){try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}}

/* Position: Standard unten rechts über der Leiste; verschoben wird per Ziehen, gespeichert als Anteil des Fensters */
function place(){
  let p=null;try{p=JSON.parse(localStorage.getItem(POS)||'null')}catch(_){}
  const W=innerWidth,H=innerHeight;
  if(p&&typeof p.x==='number'){el.style.left=Math.max(0,Math.min(W-64,p.x*W))+'px';el.style.top=Math.max(0,Math.min(H-64,p.y*H))+'px';el.style.right=el.style.bottom=''}
  else{el.style.left=el.style.top='';el.style.right='12px';el.style.bottom=document.body.getAttribute('data-buddy')==='alltag'?'calc(78px + env(safe-area-inset-bottom,0px))':'calc(16px + env(safe-area-inset-bottom,0px))'}
}
let dn=null,drag=false;
el.addEventListener('pointerdown',e=>{dn={x:e.clientX,y:e.clientY,r:el.getBoundingClientRect()};drag=false;try{el.setPointerCapture(e.pointerId)}catch(_){}});
el.addEventListener('pointermove',e=>{if(!dn)return;const dx=e.clientX-dn.x,dy=e.clientY-dn.y;
  if(!drag&&Math.hypot(dx,dy)>8){drag=true;hide();live()}
  if(drag){el.style.right=el.style.bottom='';el.style.left=Math.max(0,Math.min(innerWidth-64,dn.r.left+dx))+'px';el.style.top=Math.max(0,Math.min(innerHeight-64,dn.r.top+dy))+'px'}});
el.addEventListener('pointerup',()=>{if(!dn)return;dn=null;
  if(drag){const r=el.getBoundingClientRect();try{localStorage.setItem(POS,JSON.stringify({x:r.left/innerWidth,y:r.top/innerHeight}))}catch(_){}return}
  haptic();hop();menu()});
el.addEventListener('pointercancel',()=>{dn=null});
addEventListener('resize',()=>{place();hide()});

/* ---------------- Sprechblase ---------------- */
function hide(){clearTimeout(hideT);if(bub){bub.remove();bub=null}el.classList.remove('talk')}
function say(text,m,opts){
  if(kind()<0)return;
  hide();live(Math.max(9000,text.length*80));
  const b=document.createElement('div');b.className='bub';
  b.innerHTML='<div class="bt"><span>'+esc(text)+'</span><button class="bx" aria-label="Schließen">✕</button></div>'+
    (opts&&opts.length?'<div class="bos">'+opts.map((o,i)=>'<button class="bo" data-i="'+i+'"><i></i>'+esc(o[0])+'</button>').join('')+'</div>':'');
  document.body.appendChild(b);bub=b;
  b.querySelector('.bx').onclick=hide;
  b.querySelectorAll('.bo').forEach(x=>x.onclick=()=>{haptic();const f=opts[+x.dataset.i][1];hide();try{f()}catch(_){}});
  const r=el.getBoundingClientRect(),bw=b.offsetWidth,bh=b.offsetHeight;
  let x=Math.max(12,Math.min(innerWidth-bw-12,r.right-bw+10)),y=r.top-bh-10,below=false;
  if(y<12){y=r.bottom+10;below=true}
  b.style.left=x+'px';b.style.top=y+'px';b.classList.toggle('below',below);
  const tx=Math.max(14,Math.min(bw-28,r.left+r.width/2-x-7));
  b.style.setProperty('--tx',tx+'px');b.style.setProperty('--ox',(tx+7)+'px');b.style.setProperty('--oy',below?'0':'100%');
  setMood(m||'normal',2600);
  el.classList.add('talk');clearTimeout(talkT);talkT=setTimeout(()=>el.classList.remove('talk'),Math.min(2600,700+text.length*30));
  if(!opts||!opts.length)hideT=setTimeout(hide,Math.max(5000,text.length*75));
}

/* ================= Inhalte für die PAGS-App (Startseite, Kennenlernen, Alltag) ================= */
const PAGE=(document.body.getAttribute('data-buddy')||'start');
const OK=()=>{setMood('happy',1500);hop()};
const fx=document.createElement('style');
fx.textContent='.bflash{animation:bFlash 2.2s ease-out}@keyframes bFlash{0%,60%{box-shadow:0 0 0 4px rgba(168,16,16,.55)}100%{box-shadow:0 0 0 0 transparent}}';
document.head.appendChild(fx);
function flash(n){if(!n)return;n.classList.remove('bflash');void n.offsetWidth;n.classList.add('bflash')}
function go(id,then){const s=document.getElementById(id);if(!s)return;s.scrollIntoView({behavior:'smooth',block:'start'});flash(s.querySelector('h3')?s:s);if(then)setTimeout(then,700)}

/* Schuldaten aus der Seite (Alltag) bzw. feste Angaben */
function pdata(){try{return JSON.parse(document.getElementById('pags-data').textContent)}catch(_){return null}}
function berlin(){const p={};try{new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value)}catch(_){const d=new Date();return {iso:d.toISOString().slice(0,10),wd:d.getDay()||7,hm:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}}
  return {iso:p.year+'-'+p.month+'-'+p.day,wd:{Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}[p.weekday],hm:p.hour+':'+p.minute}}
const FERIEN_FIX=[['2026-12-23','2027-01-08','Weihnachtsferien'],['2027-02-08','2027-02-12','Fasnetsferien'],['2027-03-25','2027-04-02','Osterferien'],['2027-05-17','2027-05-28','Pfingstferien'],['2027-07-29','2027-09-11','Sommerferien']];
function ferien(){const d=pdata();return d&&d.ferien?d.ferien.map(f=>[f.von,f.bis,f.titel]):FERIEN_FIX}
const WDN=['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
function fmt(iso){const a=iso.split('-');return (+a[2])+'.'+(+a[1])+'.'}
function daysTo(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5)}
function ferienText(){
  const n=berlin(),f=ferien();
  const now=f.find(x=>x[0]<=n.iso&&n.iso<=x[1]);
  if(now)return 'Gerade sind '+now[2]+' – bis einschließlich '+fmt(now[1])+'. Schön, oder?';
  const nx=f.filter(x=>x[0]>n.iso).sort((a,b)=>a[0]<b[0]?-1:1)[0];
  if(!nx)return 'Die nächsten Ferientermine stehen im Ferienkalender auf der Schulwebsite.';
  const d=daysTo(n.iso,nx[0]);
  return 'Die nächsten freien Tage: '+nx[2]+' ab '+fmt(nx[0])+(nx[1]!==nx[0]?' bis '+fmt(nx[1]):'')+'. Das sind noch '+(d===1?'1 Tag':d+' Tage')+'.';
}
const SEK={1:[['07:00','13:00'],['14:00','15:30']],2:[['07:00','13:00'],['14:00','15:30']],3:[['07:00','12:15']],4:[['07:00','13:00']],5:[['07:00','12:15']]};
function sekText(){
  const d=pdata(),z=(d&&d.sekretariat&&d.sekretariat.zeiten)||SEK,n=berlin(),f=ferien();
  const frei=iso=>f.some(x=>x[0]<=iso&&iso<=x[1]);
  const today=(!frei(n.iso)&&z[n.wd])||[];
  for(const s of today)if(n.hm>=s[0]&&n.hm<s[1])return 'Ja! Das Sekretariat ist gerade geöffnet, heute bis '+s[1]+' Uhr. Telefon: 09345 / 333.';
  for(let k=0;k<21;k++){const iso=new Date(Date.parse(n.iso)+k*864e5).toISOString().slice(0,10),wd=(new Date(iso+'T12:00:00Z').getUTCDay())||7;
    if(frei(iso))continue;for(const s of (z[wd]||[]))if(k>0||s[0]>n.hm)return 'Gerade ist das Sekretariat geschlossen. Wieder geöffnet '+(k===0?'heute':k===1?'morgen':'am '+WDN[wd]+', '+fmt(iso))+' ab '+s[0]+' Uhr. Der Anrufbeantworter unter 09345 / 333 ist immer an.'}
  return 'Gerade ist das Sekretariat geschlossen. Der Anrufbeantworter unter 09345 / 333 ist immer an.';
}

/* gemeinsame Antworten */
const GLOSSAR=[
 ['Lernpartner','So heißen an der PAGS die Schülerinnen und Schüler.'],
 ['Lernbegleiter','So heißen die Lehrerinnen und Lehrer – sie begleiten das Lernen.'],
 ['Lerngruppe (LG)','Die Klasse. LG 5 ist also die Klasse 5.'],
 ['Lernplan','Die Wochenziele mit dem passenden Material. Daran arbeiten die Lernpartner selbstständig.'],
 ['Input','Eine kurze Erklärphase des Lernbegleiters, damit der Lernplan danach allein klappt.'],
 ['Lernatelier','Ein Raum zum ruhigen, gemeinsamen Arbeiten am Lernplan.'],
 ['Lerntagebuch','Der Planer der Lernpartner und zugleich der wöchentliche Draht zwischen Kind, Eltern und Schule.'],
 ['IL','Die freie Lernzeit der Lernpartner. Sie findet in der Schulzeit statt.'],
 ['TIP','Themen-Interesse-Projekte: Wahlangebote im Ganztag, z. B. Klettern, Töpfern oder Schülerband.'],
 ['G-, M- und E-Niveau','Die drei Niveaustufen: grundlegend (Hauptschule), mittel (Realschule) und erweitert (Gymnasium).']
];
function glossar(back){say('Welchen Begriff soll ich erklären?','think',GLOSSAR.map(g=>[g[0],()=>say(g[0]+': '+g[1],'normal',[['Noch ein Begriff',()=>glossar(back)],['Danke!',OK]])]).concat(back?[['Zurück',back]]:[]))}
function krank(){say('Krankmeldung: Bitte bis möglichst 7:45 Uhr im Sekretariat anrufen – 09345 / 333, der Anrufbeantworter ist immer an. Die schriftliche Entschuldigung folgt innerhalb von drei Tagen.','normal',[['Ist das Sekretariat offen?',()=>say(sekText(),'normal',[['Danke!',OK]])],['Danke!',OK]])}

/* ---------------- Startseite ---------------- */
function startModule(){
  const tile=i=>document.querySelectorAll('.tile')[i];
  function zeige(i,t){const c=tile(i);if(!c)return;c.scrollIntoView({behavior:'smooth',block:'center'});flash(c);setTimeout(()=>{hop();say(t,'happy',[['Öffnen',()=>c.click()],['Danke!',OK]])},550)}
  function welche(){say('Wer bist du – oder was suchst du?','think',[
    ['Wir sind neu an der Schule',()=>zeige(0,'Dann ist „PAGS kennenlernen“ genau richtig: Konzept, Abschlüsse, Ganztag und Anmeldung auf einen Blick.')],
    ['Ich brauche etwas für den Schultag',()=>zeige(1,'„PAGS Alltag“ zeigt, ob das Sekretariat offen ist, wann Ferien sind und wen du anrufen kannst. Eigene Termine kannst du auch eintragen.')],
    ['Ich will wissen, wie die App geht',()=>{const a=document.querySelector('a[href$=".pdf"]');if(a){a.scrollIntoView({behavior:'smooth',block:'center'});flash(a)}say('Unten steht der Kurzleitfaden als PDF – mit Bildern, Schritt für Schritt.','happy',[['Leitfaden öffnen',()=>a&&a.click()],['Danke!',OK]])}]])}
  return {
    ctx:()=>({t:'Hallo! Hier geht es zu den beiden Teilen der PAGS-App. Soll ich dir zeigen, welcher zu dir passt?',s:'Welcher Teil passt zu mir?',act:welche}),
    intro:'Ich zeige dir, welcher Teil der PAGS-App zu dir passt.',
    main:[['Welcher Teil passt zu mir?',welche]],
    faq:[
     ['Muss ich etwas installieren?','Nein. Die App läuft im Browser auf Handy, Tablet und Computer. Wer mag, legt sie auf den Startbildschirm: in Safari „Teilen“ → „Zum Home-Bildschirm“.'],
     ['Kostet die App etwas?','Nein, sie ist kostenlos und ohne Werbung.'],
     ['Wer hat die App gemacht?','Thorsten von Plotho-Kettner, Lernbegleiter an der PAGS. Fragen zur App gerne an t.von.plotho-kettner@pagskuelsheim.de.']
    ],
    tips:['Halte mich gedrückt und zieh mich dorthin, wo ich nicht störe.','Den QR-Code der App findest du im Kurzleitfaden – zum Ausdrucken und Weitergeben.','Ganz unten auf der Seite kannst du eine andere Figur wählen oder mich ausblenden.'],
    areas:null
  };
}

/* ---------------- PAGS kennenlernen ---------------- */
function kennenModule(){
  const TOUR=[
    ['gemeinschaftsschule','Station 1: Die PAGS ist eine Gemeinschaftsschule. Alle lernen gemeinsam, aber jedes Kind auf seinem Niveau – mit den Standards von Haupt-, Realschule und Gymnasium.'],
    ['gemeinschaftsschule','Station 2: An der PAGS heißen manche Dinge anders. Weiter unten im Abschnitt steht der PAGS-Wortschatz – Lernpartner, Lernbegleiter, Lernplan und mehr.'],
    ['ganztag','Station 3: Alle Klassen sind Ganztagsschule. Mittags gibt es Essen in der Mensa – und Hausaufgaben im üblichen Sinn gibt es nicht.'],
    ['lg1','Station 4: Hier steht, wie die Anmeldung für Klasse 1 abläuft und was Sie mitbringen. Für Klasse 5 steht es direkt darunter.'],
    ['kontakt','Letzte Station: Hier finden Sie alle Ansprechpartner. Bei Fragen hilft das Sekretariat gern weiter.']];
  function tour(i){i=i||0;const s=TOUR[i];go(s[0],()=>{hop();say(s[1],i===TOUR.length-1?'happy':'normal',i<TOUR.length-1?[['Weiter',()=>tour(i+1)],['Tour beenden',OK]]:[['Danke!',OK],['Nochmal von vorn',()=>tour(0)]])})}
  function anmeldung(){say('Für welche Klasse möchten Sie anmelden?','think',[['Klasse 1',()=>go('lg1',()=>say('Anmeldung für Klasse 1: an einem Nachmittag im März in der Mensa. Wer im Einzugsgebiet wohnt, wird automatisch eingeladen. Hier steht, was Sie mitbringen.','normal',[['Danke!',OK]]))],['Klasse 5',()=>go('lg5',()=>say('Anmeldung für Klasse 5: im landesweiten Zeitraum nach der Grundschulempfehlung. Bringen Sie Blatt 3 und 4 der Empfehlung im Original mit. Vorher gern im Sekretariat anrufen: 09345 / 333.','normal',[['Danke!',OK]]))]])}
  function frage(){say('Was möchten Sie wissen?','think',[
    ['Welche Abschlüsse gibt es?',()=>go('gemeinschaftsschule',()=>say('Nach Klasse 9 der Hauptschulabschluss, nach Klasse 10 der Haupt- oder Realschulabschluss. Wer auf E-Niveau abschließt, kann in die gymnasiale Oberstufe wechseln.','normal',[['Noch eine Frage',frage],['Danke!',OK]]))],
    ['Gibt es Hausaufgaben?',()=>go('ganztag',()=>say('Hausaufgaben im üblichen Sinn gibt es nicht. Zu Hause wird trotzdem nachgeholt, vertieft und für Tests gelernt.','normal',[['Noch eine Frage',frage],['Danke!',OK]]))],
    ['Wie läuft das Mittagessen?',()=>go('ganztag',()=>say('Bestellt wird über Mampf – schon in der Vorwoche oder am selben Tag bis 10 Uhr. Essen gibt es um 12:15 oder 13:00 Uhr, Wasser ist kostenlos.','normal',[['Noch eine Frage',frage],['Danke!',OK]]))],
    ['Ab wann braucht mein Kind ein iPad?',()=>go('ipads',()=>say('Ab Klasse 7. Sie wählen zwischen Mietkauf für 12 € im Monat und einem kostenlosen Leihgerät der Schule.','normal',[['Noch eine Frage',frage],['Danke!',OK]]))],
    ['Wen kann ich bei Sorgen ansprechen?',()=>go('schutzkonzept',()=>say('Die Vertrauenslehrer Thorsten von Plotho-Kettner und Ann-Christin Ferschel und Schulsozialarbeiterin Antje Kaiser – sie ist täglich von 8 bis 17 Uhr im Mensagebäude.','normal',[['Noch eine Frage',frage],['Danke!',OK]]))],
    ['Was bedeutet …?',()=>glossar(frage)]])}
  const CTX={
    top:{t:'Willkommen bei der PAGS! Ich kann Sie in fünf Stationen durch das Wichtigste führen.',s:'Kurze Tour starten',act:()=>tour(0)},
    schulinfos:{t:'Hier steht, was die PAGS ausmacht: Gemeinschaftsschule, Abschlüsse, Schulweg, Schutzkonzept und mehr.',s:'Was bedeutet …?',act:()=>glossar(),mood:'think'},
    starten:{t:'Hier geht es um die Anmeldung – für Klasse 1 und für Klasse 5.',s:'Anmeldung erklären',act:anmeldung},
    grundschule:{t:'Die Grundschule ist zweizügig. In der Tabelle stehen die Betreuungszeiten am Nachmittag.',s:'Ich habe eine Frage',act:frage},
    sekundarstufe:{t:'Das „Haus des Lernens“: Lernplan, Ganztag, iPads ab Klasse 7 und die Wahlfächer.',s:'Ich habe eine Frage',act:frage,mood:'think'},
    smv:{t:'Die SMV – Schüler mit Verantwortung. Hier gestalten die Lernpartner das Schulleben mit.',s:'Was bedeutet …?',act:()=>glossar()},
    kontakt:{t:'Hier finden Sie alle Ansprechpartner. Das Sekretariat erreichen Sie unter 09345 / 333.',s:'Ist das Sekretariat offen?',act:()=>say(sekText(),'normal',[['Danke!',OK]])}};
  return {
    ctx:a=>CTX[a]||CTX.top,
    intro:'Ich führe Sie durch die Seite und erkläre Begriffe wie Lernpartner oder Lernplan.',
    main:[['Kurze Tour starten',()=>tour(0)],['Anmeldung erklären',anmeldung],['Ich habe eine Frage',frage]],
    faq:[
     ['Ist das Sekretariat gerade offen?',()=>sekText()],
     ['Wann sind die nächsten Ferien?',()=>ferienText()],
     ['Wo finde ich alles für den Schultag?','In „PAGS Alltag“: Krankmeldung, Mensa, Ferien, Kontakte und eigene Termine. Den Link finden Sie auf der Startseite der PAGS-App.']
    ],
    tips:['Halte mich gedrückt und zieh mich dorthin, wo ich nicht störe.','Oben im Menü springen Sie direkt zu jedem Thema.','Ganz unten auf der Seite können Sie eine andere Figur wählen oder mich ausblenden.','Die Bilder auf der Startseite führen direkt zu Grundschule, Sekundarstufe und Ganztag.'],
    areas:'section.chapter[id]'
  };
}

/* ---------------- PAGS Alltag ---------------- */
function alltagModule(){
  const tabBtn=t=>document.querySelector('[data-tab="'+t+'"]');
  const curTab=()=>{const b=document.querySelector('.tabs [aria-selected="true"]');return b?b.getAttribute('data-tab'):'heute'};
  function toTab(t,then){const b=tabBtn(t);if(b&&curTab()!==t)b.click();if(then)setTimeout(then,250)}
  function focusEl(id){const e=document.getElementById(id);if(e){e.scrollIntoView({behavior:'smooth',block:'center'});flash(e.closest('.panel')||e);setTimeout(()=>{try{e.focus({preventScroll:true})}catch(_){}},400)}}
  function suche(q,text){toTab('kontakte',()=>{const s=document.getElementById('k-suche');if(s){s.value=q;s.dispatchEvent(new Event('input',{bubbles:true}));s.blur()}setTimeout(()=>{hop();say(text,'happy',[['Danke!',OK],['Andere Frage',wen]])},300)})}
  function wen(){say('Wofür suchst du jemanden?','think',[
    ['Sorgen oder Probleme',()=>suche('Vertrauen','Die Vertrauenslehrer Thorsten von Plotho-Kettner und Ann-Christin Ferschel hören zu. Auch Schulsozialarbeiterin Antje Kaiser ist täglich für dich da.')],
    ['Krankmeldung, Formulare',()=>suche('Sekretariat','Das Sekretariat: Frau Haag und Frau Schreck, Telefon 09345 / 333.')],
    ['Probleme mit dem iPad',()=>suche('iPad','Beim iPad helfen Herr Krämer und Herr Nowotny.')],
    ['Betreuung, Gebühren',()=>suche('Stadt','Betreuung und Gebühren laufen über die Stadt Külsheim.')],
    ['Hilfe außerhalb der Schule',()=>suche('','Ganz unten bei „Externe Hilfe“ stehen die Nummer gegen Kummer, das Hilfe-Telefon und das Jugendamt – anonym und kostenlos.')]])}
  function eintragen(){say('Was möchtest du eintragen?','think',[
    ['Einen Termin',()=>toTab('termine',()=>{focusEl('t-titel');say('Datum wählen, Titel eingeben, auf „Hinzufügen“ tippen – fertig.','normal')})],
    ['Eine Notiz',()=>toTab('heute',()=>{focusEl('n-text');say('Schreib deine Notiz hier hinein und tipp auf „Notiz hinzufügen“.','normal')})],
    ['Einen Link',()=>toTab('links',()=>{focusEl('l-titel');say('Titel und Adresse eingeben – der Link erscheint dann unter „Eigene Links“.','normal')})]])}
  function konto(){const k=document.getElementById('konto');if(k){k.scrollIntoView({behavior:'smooth',block:'center'});flash(k)}
    const login=!!document.getElementById('login-mail'),inn=!!document.querySelector('[data-logout]');
    say(inn?'Du bist angemeldet. Alles, was du einträgst, wird automatisch gespeichert – auf jedem Gerät.':login?'So geht es: E-Mail-Adresse eingeben, Anmeldelink anfordern, Link in der E-Mail antippen. Ein Passwort brauchst du nicht.':'Deine Einträge bleiben in diesem Browser auf diesem Gerät gespeichert.','normal',login?[['E-Mail eintragen',()=>focusEl('login-mail')],['Später',()=>{}]]:[['Danke!',OK]])}
  const CTX={
    heute:{t:'Das ist „Heute“: Sekretariat, Unterricht, Mensa und die nächsten Ferien auf einen Blick.',s:'Ist das Sekretariat offen?',act:()=>say(sekText(),'normal',[['Krankmeldung – wie?',krank],['Danke!',OK]])},
    kontakte:{t:'Hier findest du alle Ansprechpartner. Oben kannst du nach Namen oder Stichwort suchen.',s:'Wen frage ich bei …?',act:wen,mood:'think'},
    termine:{t:'Hier stehen die Ferien – und deine eigenen Termine. Neue Termine trägst du oben ein.',s:'Termin eintragen',act:()=>{focusEl('t-titel')}},
    regeln:{t:'Die Schulordnung in kurz: Tagesablauf, Handy, Fehlen und was verboten ist.',s:'Krankmeldung – wie?',act:krank,mood:'think'},
    links:{t:'Formulare, Ferienkalender, Schulwegeplan – und deine eigenen Links.',s:'Eigenen Link anlegen',act:()=>focusEl('l-titel')}};
  /* Ereignisse der Seite beobachten */
  document.addEventListener('submit',e=>{const f=e.target&&e.target.dataset?e.target.dataset.form:null;if(!f||kind()<0)return;
    setTimeout(()=>{
      if(f==='termin'){hop();say('Termin gespeichert! Du findest ihn unter „Kommend“ und auf der Seite „Heute“.','happy')}
      else if(f==='notiz'){hop();say('Notiz ist drin. Mit dem ✕ daneben löschst du sie wieder.','happy')}
      else if(f==='link'){const m=document.querySelector('footer.meta [role=status]');if(m&&/https/.test(m.textContent)){say('Die Adresse muss mit https:// beginnen.','think')}else{hop();say('Link gespeichert – unter „Eigene Links“.','happy')}}
      else if(f==='login'){const m=document.querySelector('footer.meta [role=status]');if(m&&m.textContent){say(m.textContent,'think')}else{hop();say('Schau in dein Postfach und tipp auf den Link – am besten auf diesem Gerät. Auch im Spam-Ordner nachsehen!','happy')}}
    },350)},true);
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-tab]');if(t)setTimeout(()=>update(t.getAttribute('data-tab')),120)},true);
  let srT=0;
  document.addEventListener('input',e=>{if(e.target.id!=='k-suche'||kind()<0)return;clearTimeout(srT);const q=e.target.value.trim();if(!q)return;
    srT=setTimeout(()=>{if(document.querySelector('.contact')||document.querySelector('.names span'))return;hop();say('Zu „'+q+'“ finde ich niemanden. Soll ich dir helfen, die richtige Person zu finden?','think',[['Ja, bitte',wen],['Nein danke',()=>{}]])},1200)});
  /* einmal gratulieren, wenn die erste Synchronisierung klappt */
  let synced=false;
  new MutationObserver(()=>{syncFoot();const c=document.querySelector('.acct');if(!synced&&c&&/Gespeichert/.test(c.textContent)&&document.querySelector('[data-logout]')){synced=true;try{if(!localStorage.getItem(KEY+'.sync')){localStorage.setItem(KEY+'.sync','1');setTimeout(()=>{hop();say('Super, du bist angemeldet! Ab jetzt speichere ich nichts mehr von Hand – das passiert automatisch, auf jedem Gerät.','happy')},800)}}catch(_){}}}).observe(document.getElementById('app'),{childList:true,subtree:false});
  return {
    ctx:a=>CTX[a]||CTX.heute,
    intro:'Ich zeige dir, was in „PAGS Alltag“ steckt, und helfe beim Eintragen und Anmelden.',
    main:[['Ist das Sekretariat offen?',()=>say(sekText(),'normal',[['Danke!',OK]])],['Wann sind Ferien?',()=>say(ferienText(),'happy',[['Alle Termine',()=>toTab('termine')],['Danke!',OK]])],['Wen frage ich bei …?',wen],['Etwas eintragen',eintragen],['Anmelden – wie geht das?',konto]],
    faq:[
     ['Krankmeldung – was muss ich tun?',null,krank],
     ['Wie bestelle ich Essen?','Über Mampf (Knopf „Mensa-Bestellung“ auf „Heute“): in der Vorwoche oder am selben Tag bis 10 Uhr. Ausgabe um 12:15 oder 13:00 Uhr.'],
     ['Wo sind meine Einträge gespeichert?','Ohne Anmeldung nur in diesem Browser. Mit Anmeldung in deinem Konto – das sieht nur du, auf Servern in der EU.'],
     ['Was bedeutet …?',null,()=>glossar(faqMenu)],
     ['Wer hat die App gemacht?','Thorsten von Plotho-Kettner, Lernbegleiter an der PAGS.']
    ],
    tips:['Halte mich gedrückt und zieh mich dorthin, wo ich nicht störe.','Auf dem Handy: App auf den Startbildschirm legen – dann ist sie mit einem Tipp da.','Telefonnummern kopierst du mit „kopieren“ neben der Nummer.','Bei „Kontakte“ findest du jeden Lernbegleiter über die Suche.','Unten bei „Meine Daten“ kannst du eine andere Figur wählen oder mich ausblenden.'],
    areas:null
  };
}

const M=PAGE==='kennen'?kennenModule():PAGE==='alltag'?alltagModule():startModule();
function faqMenu(){say('Was möchtest du wissen?','think',M.faq.map(f=>[f[0],()=>{if(f[2])return f[2]();const a=typeof f[1]==='function'?f[1]():f[1];say(a,'normal',[['Noch eine Frage',faqMenu],['Danke!',OK]])}]))}
const TIPS=M.tips;let tipI=Math.floor(Math.random()*TIPS.length);
function tip(){tipI=(tipI+1)%TIPS.length;say(TIPS[tipI],'think',[['Noch ein Tipp',tip],['Danke!',OK]])}
function intro(){const k=kind();if(k<0)return;hop();say('Hallo, ich bin '+NAMES[k]+'! '+M.intro+' Tipp mich an, wenn du Hilfe brauchst – oder zieh mich woandershin.','happy',[[M.main[0][0],M.main[0][1]],['Ich schau mich erst um',()=>setMood('happy',1200)]])}
function menu(){
  const t=cur&&cur.t?cur.t:'Hallo! Wobei kann ich helfen?',o=[];
  if(cur&&cur.s&&cur.act)o.push([cur.s,cur.act]);
  M.main.forEach(m=>{if(!o.some(x=>x[0]===m[0]))o.push(m)});
  o.push(['Häufige Fragen',faqMenu]);
  o.push(['Gib mir einen Tipp',tip]);
  o.push(['Andere Figur',()=>{const k=(kind()+1)%3;try{localStorage.setItem(KEY,k)}catch(_){}paint();intro();syncFoot()}]);
  o.push(['Ausblenden',()=>{say('Alles klar, bis bald! Ganz unten auf der Seite holst du mich zurück.','normal');setTimeout(()=>window.buddySet(-1),2600)}]);
  say(t,cur?cur.mood:'normal',o.slice(0,8));
}

/* Bereich wechseln: je Abschnitt spricht die Figur von selbst nur einmal, nach kurzem Verweilen */
let lastArea=null,dwellT=0;
function spoken(){try{return JSON.parse(localStorage.getItem(AREAS)||'{}')}catch(_){return {}}}
function update(area){
  if(area===lastArea)return;lastArea=area;cur=M.ctx(area);
  const nm=moodOf(cur.mood);if(!bub&&nm!==mood){mood=nm;paint()}
  clearTimeout(dwellT);
  if(kind()<0||area==='top'||PAGE==='start')return;
  dwellT=setTimeout(()=>{
    const s=spoken();if(s[area]||bub||lastArea!==area)return;
    s[area]=1;try{localStorage.setItem(AREAS,JSON.stringify(s))}catch(_){}
    cur=M.ctx(area);hop();say(cur.t,cur.mood,[[cur.s,cur.act],['Später',()=>{}]]);
  },2200);
}
if(PAGE==='alltag'){const h=(location.hash||'').slice(1);update(/^(heute|kontakte|termine|regeln|links)$/.test(h)?h:'heute')}
else{cur=M.ctx('top');lastArea='top'}
if(M.areas&&'IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)update(e.target.id)})},{rootMargin:'-35% 0px -55% 0px'});
  document.querySelectorAll(M.areas).forEach(s=>io.observe(s));
  addEventListener('scroll',()=>{if(scrollY<300)update('top')},{passive:true});
}

/* Erster Besuch: kurz vorstellen */
let first=false;try{first=!localStorage.getItem(SEEN)}catch(_){}
if(first&&kind()>=0){try{localStorage.setItem(SEEN,'1')}catch(_){}setTimeout(intro,1400)}

window.buddySet=function(k){try{localStorage.setItem(KEY,k)}catch(_){}hide();if(k<0){el.hidden=true;syncFoot();return}el.hidden=false;paint();place();syncFoot()};
document.addEventListener('focusin',e=>{if(e.target.matches('input,textarea')&&matchMedia('(max-width:860px)').matches)document.body.classList.add('kbup')});
document.addEventListener('focusout',()=>document.body.classList.remove('kbup'));
function syncFoot(){const s=document.getElementById('budSel');if(s&&s.value!==String(kind()))s.value=String(kind())}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='budSel'){const k=+e.target.value;window.buddySet(k);if(k>=0)setTimeout(intro,200)}});

place();paint();if(kind()<0)el.hidden=true;syncFoot();
document.addEventListener('visibilitychange',()=>{if(document.hidden){el.classList.remove('live');hide()}});
})();
