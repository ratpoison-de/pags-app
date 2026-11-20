/* Bildungswege 9a – Begleiter-Figur aus der Assistent-App (Klementine, Bit, Olli), angepasst an diese Seite.
   Frei verschiebbare Figur mit Sprechblase und Menü; erklärt Abschnitte und Begriffe, reagiert auf Fahrplan, Wegfinder und Quiz.
   Akkuschonend: Animationen laufen nur ein paar Sekunden nach einem Ereignis, danach steht die Figur still. */
(function(){
"use strict";
const NAMES=['Klementine','Bit','Olli'];
const KEY='pags-bw.buddy',POS='pags-bw.buddy.pos',SEEN='pags-bw.buddy.seen',AREAS='pags-bw.buddy.areas';
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
.bub{position:fixed;z-index:46;max-width:min(290px,calc(100vw - 24px));box-sizing:border-box;padding:12px 10px 10px 14px;border-radius:14px;background:#FFFBE3;border:1px solid #E7DDA6;box-shadow:0 10px 30px -10px rgba(40,30,0,.35);font:500 15px/1.4 "Source Sans 3","Segoe UI",Roboto,Arial,sans-serif;color:#111;transform-origin:var(--ox,90%) var(--oy,100%);animation:bubIn .18s ease-out}
.bub .bt{display:flex;gap:8px;align-items:flex-start}.bub .bt span{flex:1;white-space:pre-line}
.bub .bx{flex:none;border:0;background:none;color:#999;font-size:13px;padding:0 4px 6px 8px;cursor:pointer}
.bub .bo{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 2px;font:inherit;font-weight:600;color:#111;cursor:pointer;border-radius:8px}
.bub .bo:active{background:rgba(0,0,0,.05)}
.bub .bo i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#AD120D;margin:0 10px 1px 2px;vertical-align:middle}
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
function paint(){el.innerHTML=svg(kind(),mood,"#AD120D")}
function live(ms){el.classList.add('live');clearTimeout(liveT);liveT=setTimeout(()=>el.classList.remove('live'),ms||12000)}
function setMood(m,ms){mood=moodOf(m);paint();clearTimeout(moodT);if(ms)moodT=setTimeout(()=>{mood=cur?moodOf(cur.mood):'normal';paint()},ms)}
function hop(){el.classList.remove('hop');void el.offsetWidth;el.classList.add('hop');live()}
function haptic(){try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}}

/* Position: Standard unten rechts über der Leiste; verschoben wird per Ziehen, gespeichert als Anteil des Fensters */
function place(){
  let p=null;try{p=JSON.parse(localStorage.getItem(POS)||'null')}catch(_){}
  const W=innerWidth,H=innerHeight;
  if(p&&typeof p.x==='number'){el.style.left=Math.max(0,Math.min(W-64,p.x*W))+'px';el.style.top=Math.max(0,Math.min(H-64,p.y*H))+'px';el.style.right=el.style.bottom=''}
  else{el.style.left=el.style.top='';el.style.right='12px';el.style.bottom='calc(16px + env(safe-area-inset-bottom,0px))'}
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

/* ---------------- Inhalte für die Bildungswege-Seite ---------------- */
function data(){try{return JSON.parse(localStorage.getItem('pags-bildungswege-9a'))||{}}catch(_){return {}}}
function go(id,then){const s=document.getElementById(id);if(!s)return;s.scrollIntoView({behavior:'smooth',block:'start'});if(then)setTimeout(then,650)}
function days(){return Math.max(0,Math.ceil((new Date(2028,2,1)-new Date())/864e5))}
const WN={dual:'die duale Ausbildung',schul:'die schulische Ausbildung',beamt:'die Beamtenlaufbahn',bk:'das Berufskolleg',bg:'das Berufliche Gymnasium',os:'die gymnasiale Oberstufe'};
function chkCount(){const all=document.querySelectorAll('.check input');let n=0;all.forEach(c=>{if(c.checked)n++});return [n,all.length]}
function firstOpen(){return document.querySelector('.check input:not(:checked)')}
function click(sel){const b=document.querySelector(sel);if(b)b.click()}

function ctx(area){
  const d=data();
  if(area==='start')return {t:'Hier siehst du, wo du gerade stehst: Klasse 9, M-Niveau. Bis zur Anmeldefrist für berufliche Schulen sind es noch '+days()+' Tage – das klingt viel, geht aber schnell.',s:'Zeig mir das Schaubild',act:()=>go('wege')};
  if(area==='wege')return {t:'Das Schaubild liest du von unten nach oben. Tipp auf einen Weg, dann erkläre ich ihn dir genauer. Mit den farbigen Knöpfen siehst du alle Wege zu einem Ziel.',s:'Wege zum Abitur zeigen',act:()=>click('[data-goal="abi"]'),mood:'think'};
  if(area==='wegfinder'){
    if(d.finder&&d.finder.length)return {t:'Laut deinem Wegfinder passt '+WN[d.finder[0]]+' gut zu dir. Das ist kein Urteil – nur ein Anfang zum Weiterdenken.',s:'Im Schaubild zeigen',act:()=>{const b=document.getElementById('fShow');if(b)b.click();else go('wege')},mood:'happy'};
    return {t:'Fünf kurze Fragen, dann zeige ich dir, welche Wege zu dir passen könnten. Es gibt keine falschen Antworten!',s:'Los geht’s',act:()=>go('wegfinder',()=>{const o=document.querySelector('#finder .opt');if(o)o.focus()})};
  }
  if(area==='abschluesse')return {t:'Je höher die Stufe, desto mehr Möglichkeiten beim Studium. Dein Ziel 2028 ist die rote Stufe: der Realschulabschluss.',s:'Meine Stufe öffnen',act:()=>{const b=document.querySelector('.step.you');if(b){if(b.getAttribute('aria-expanded')!=='true')b.click();b.scrollIntoView({behavior:'smooth',block:'center'})}}};
  if(area==='fahrplan'){const c=chkCount();
    if(c[1]&&c[0]===c[1])return {t:'Du hast deinen ganzen Fahrplan abgehakt. Respekt! Schreib unten noch auf, wie dein Plan aussieht.',mood:'proud',s:'Zu „Mein Plan“',act:()=>{const t=document.getElementById('plan');t.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>t.focus(),500)}};
    return {t:'Du hast '+c[0]+' von '+c[1]+' Punkten abgehakt. Deine Häkchen bleiben nur auf diesem Gerät.',s:'Nächsten Punkt zeigen',act:()=>{const f=firstOpen();if(f){f.closest('label').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>f.focus(),500)}}};
  }
  if(area==='quiz'){const b=d.quizBest;return {t:b!=null?'Deine Bestleistung im Quiz: '+b+' von 7. Schaffst du alle?':'Sieben Fragen – mal sehen, was du schon weißt!',s:'Quiz starten',act:()=>go('quiz',()=>{const o=document.querySelector('#qz .qz-opts button,#qzAgain');if(o)o.focus()}),mood:'happy'}}
  return null;
}

const GL=[
 ['Mittlerer Bildungsabschluss','Oberbegriff für Realschulabschluss und Fachschulreife. Mit ihm kannst du eine Ausbildung machen oder weiter zur Schule gehen – bis zum Abitur.'],
 ['Fachhochschulreife','Damit darfst du an einer Fachhochschule (Hochschule für angewandte Wissenschaften) studieren. Du bekommst sie z. B. am Berufskolleg.'],
 ['Allgemeine Hochschulreife','Das ist das Abitur. Damit kannst du alles studieren, an jeder Hochschule und Universität.'],
 ['Duale Ausbildung','„Dual“ heißt zweifach: Du lernst im Betrieb und in der Berufsschule und bekommst schon Geld.'],
 ['Berufskolleg','Eine berufliche Schule nach dem mittleren Abschluss. Sie verbindet Beruf und Allgemeinbildung und kann zur Fachhochschulreife führen.'],
 ['Berufliches Gymnasium','Drei Jahre bis zum Abitur, mit einem Schwerpunkt wie Wirtschaft, Technik oder Soziales und Gesundheit.'],
 ['Fachschulreife','Ein mittlerer Abschluss, den du an der zweijährigen Berufsfachschule machen kannst – gleichwertig zum Realschulabschluss.'],
 ['BewO','Das Online-Bewerbungsverfahren für berufliche Vollzeitschulen in BW. Du bewirbst dich dort mit dem Halbjahreszeugnis, meist bis 1. März.']
];
function glossary(page){
  const p=page||0,per=4,list=GL.slice(p*per,p*per+per);
  const o=list.map(g=>[g[0],()=>{say(g[0]+': '+g[1],'think',[['Noch ein Begriff',()=>glossary(p)],['Danke!',()=>{setMood('happy',1500);hop()}]])}]);
  o.push([p===0?'Weitere Begriffe …':'Zurück zu den ersten',()=>glossary(p===0?1:0)]);
  say('Welchen Begriff soll ich dir erklären?','think',o);
}
const TIPS=[
  'Halte mich gedrückt und zieh mich dorthin, wo ich dich nicht störe.',
  'Mach einen Termin bei der Berufsberatung der Agentur für Arbeit. Die kennen alle Wege – auch die, an die du noch nicht denkst.',
  'Kein Weg ist eine Einbahnstraße: Auch nach einer Ausbildung kannst du noch Fachhochschulreife oder Abitur machen.',
  'Viele Betriebe suchen ihre Azubis schon ein Jahr im Voraus. Schau früh nach den Fristen!',
  'Für Berufliches Gymnasium und Oberstufe zählen vor allem deine Noten in Deutsch, Mathe und Englisch.',
  'Frag Leute, die den Weg schon gegangen sind: ältere Geschwister, Freunde, Azubis aus deinem Praktikum.',
  'Schreib deinen Plan unten im Fahrplan auf. Was aufgeschrieben ist, vergisst man nicht so schnell.'];
let tipI=Math.floor(Math.random()*TIPS.length);
function tip(){tipI=(tipI+1)%TIPS.length;say(TIPS[tipI],'think',[['Noch ein Tipp',tip],['Danke!',()=>{setMood('happy',1500);hop()}]])}
function intro(){
  const k=kind();if(k<0)return;hop();
  say('Hallo, ich bin '+NAMES[k]+'! Ich begleite dich durch deine Wege nach dem Realschulabschluss. Tipp mich an, wenn du Hilfe brauchst – oder zieh mich woandershin.','happy',[['Was kann ich hier machen?',()=>say('Schau dir das Schaubild an, mach den Wegfinder, hak deinen Fahrplan ab und teste dich im Quiz. Ich erkläre dir unterwegs schwierige Begriffe.','normal',[['Wegfinder starten',()=>go('wegfinder')],['Okay!',()=>{}]])],['Los geht’s!',()=>{setMood('happy',1200)}]]);
}
function menu(){
  const t=cur&&cur.t?cur.t:'Hallo! Wobei kann ich helfen?';
  const o=[];
  if(cur&&cur.s&&cur.act)o.push([cur.s,cur.act]);
  o.push(['Erklär mir einen Begriff',()=>glossary(0)]);
  if(lastArea!=='wegfinder')o.push(['Welcher Weg passt zu mir?',()=>go('wegfinder')]);
  o.push(['Gib mir einen Tipp',tip]);
  o.push(['Andere Figur',()=>{const k=(kind()+1)%3;try{localStorage.setItem(KEY,k)}catch(_){}paint();intro();syncFoot()}]);
  o.push(['Ausblenden',()=>{say('Alles klar, bis bald! Ganz unten auf der Seite holst du mich zurück.','normal');setTimeout(()=>window.buddySet(-1),2600)}]);
  say(t,cur?cur.mood:'normal',o);
}

/* Bereich wechseln: von selbst spricht die Figur je Abschnitt nur einmal (gespeichert), nach kurzem Verweilen */
let lastArea=null,dwellT=0;
function spoken(){try{return JSON.parse(localStorage.getItem(AREAS)||'{}')}catch(_){return {}}}
function update(area){
  if(area===lastArea)return;lastArea=area;cur=ctx(area);
  const nm=cur?moodOf(cur.mood):'normal';if(!bub&&nm!==mood){mood=nm;paint()}
  clearTimeout(dwellT);
  if(kind()<0||!cur)return;
  let first=false;try{first=!localStorage.getItem(SEEN)}catch(_){}
  if(first){try{localStorage.setItem(SEEN,'1')}catch(_){}const s=spoken();s[area]=1;try{localStorage.setItem(AREAS,JSON.stringify(s))}catch(_){}setTimeout(intro,700);return}
  dwellT=setTimeout(()=>{
    const s=spoken();if(s[area]||bub||lastArea!==area)return;
    s[area]=1;try{localStorage.setItem(AREAS,JSON.stringify(s))}catch(_){}
    cur=ctx(area);hop();say(cur.t,cur.mood,cur.s?[[cur.s,cur.act],['Später',()=>{}]]:null);
  },1800);
}
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)update(e.target.id)})},{rootMargin:'-40% 0px -55% 0px'});
  document.querySelectorAll('main section[id]').forEach(s=>io.observe(s));
}

/* ---------------- Reaktionen (von der Seite aufgerufen) ---------------- */
window.buddyDone=function(checked){
  if(kind()<0)return;
  if(lastArea==='fahrplan')cur=ctx('fahrplan');
  if(!checked){setMood('think',1200);return}
  const c=chkCount();
  if(c[1]&&c[0]===c[1]){hop();say('Stark – dein ganzer Fahrplan ist abgehakt!','proud');return}
  if(Math.random()<.4){const a=['Abgehakt!','Ein Schritt weiter.','Weiter so!','Gut gemacht!'];hop();say(a[Math.floor(Math.random()*a.length)],'happy')}
  else{setMood('happy',1400);hop()}
};
window.buddyFinder=function(top){
  if(kind()<0||!top||!top.length)return;cur=ctx('wegfinder');
  hop();say('Interessant! Ganz oben steht '+WN[top[0]]+'. Schau dir die Wege in Ruhe an und sprich mit der Berufsberatung darüber.','happy');
};
window.buddyQuiz=function(right,end,score,total){
  if(kind()<0)return;
  if(end){cur=ctx('quiz');hop();say(score===total?'Alle richtig – du kennst dich richtig gut aus!':score>=total-2?score+' von '+total+'! Fast alles gewusst.':'Gut, dass du es probiert hast! Im Schaubild findest du alle Antworten.',score>=total-2?'proud':'normal',score<total-2?[['Zum Schaubild',()=>go('wege')],['Okay',()=>{}]]:null);return}
  if(right){setMood('happy',1300);hop()}
  else if(Math.random()<.5){say('Nicht schlimm – lies die Erklärung, dann sitzt es beim nächsten Mal.','think')}
  else setMood('think',1300);
};
window.buddySet=function(k){try{localStorage.setItem(KEY,k)}catch(_){}hide();if(k<0){el.hidden=true;syncFoot();return}el.hidden=false;paint();place();syncFoot()};

/* Tastatur: Figur ausblenden, solange ein Textfeld aktiv ist (Handy) */
document.addEventListener('focusin',e=>{if(e.target.matches('textarea,input[type=text],input[type=search]')&&matchMedia('(max-width:860px)').matches)document.body.classList.add('kbup')});
document.addEventListener('focusout',()=>document.body.classList.remove('kbup'));

/* Steuerung im Seitenfuß */
function syncFoot(){const s=document.getElementById('budSel');if(s)s.value=String(kind())}
const sel=document.getElementById('budSel');
if(sel){sel.onchange=()=>{const k=+sel.value;window.buddySet(k);if(k>=0)setTimeout(intro,200)}}

place();paint();if(kind()<0)el.hidden=true;syncFoot();
document.addEventListener('visibilitychange',()=>{if(document.hidden){el.classList.remove('live');hide()}});
})();
