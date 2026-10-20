'use strict';
/* Public configuration. Set these two public values before publishing.
   NEVER put the Gemini key or Turnstile secret in this file. */
const CONFIG = {
  API_ENDPOINT: 'https://traceai-api.traceai-lopatka915.workers.dev/analyze',
  TURNSTILE_SITE_KEY: '0x4AAAAAAFdcvOyuN3zh5tVh',
};

const DB_NAME = 'TraceAIDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MODE_LABELS = {analiza:'Analiza śladu', porownanie:'Porównanie śladów', protokol:'Projekt protokołu', zabezpieczenie:'Zabezpieczenie śladu'};
let currentMode = 'analiza';
let currentImages = [null, null];
let sessionId = makeId();
let conversation = [];
let busy = false;
let records = [];
let turnstileToken = '';
let turnstileWidgetId = null;
let turnstileReady = false;
let themePreference = 'system';
try { themePreference = localStorage.getItem('traceai_theme') || 'system'; } catch (_e) { /* Storage blocked */ }

// Remove API keys saved by the previous version. Existing keys may have been
// exposed through browser developer tools; consider rotating them.
try { localStorage.removeItem('traceai_key'); } catch (e) { console.warn('Local storage unavailable', e); }

function makeId() { return 'sesja-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); }
function el(id) { return document.getElementById(id); }
const ICON_PATHS = {
  "arrow-up": "<path d=\"M12 19V5\"/><path d=\"m5 12 7-7 7 7\"/>",
  "camera": "<path d=\"M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z\"/><circle cx=\"12\" cy=\"14\" r=\"3\"/>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3\"/>",
  "download": "<path d=\"M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3\"/>",
  "file-text": "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2\"/>",
  "flask-conical": "<path d=\"M9 3h6M10 3v7l-6.5 9a2 2 0 0 0 1.6 3h13.8a2 2 0 0 0 1.6-3L14 10V3M7 16h10\"/>",
  "folder": "<path d=\"M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z\"/>",
  "footprints": "<circle cx=\"9\" cy=\"9\" r=\"5\"/><path d=\"m13 13 6 6\"/><path d=\"M3 20h8\"/>",
  "home": "<path d=\"m3 10 9-7 9 7v11h-6v-7H9v7H3z\"/>",
  "images": "<rect x=\"7\" y=\"3\" width=\"14\" height=\"14\" rx=\"2\"/><path d=\"M4 7H3a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h12a1 1 0 0 0 1-1v-1\"/><circle cx=\"11\" cy=\"8\" r=\"1\"/><path d=\"m7 14 4-4 3 3 2-2 5 5\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 11v6M12 7h.01\"/>",
  "monitor": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"15\" rx=\"2\"/><path d=\"M8 22h8M12 18v4\"/>",
  "moon": "<path d=\"M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13z\"/>",
  "palette": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"8\" cy=\"8\" r=\"1\"/><circle cx=\"15\" cy=\"7\" r=\"1\"/><circle cx=\"17\" cy=\"13\" r=\"1\"/><path d=\"M12 21a3 3 0 0 1 0-6h1a2 2 0 0 0 2-2 2 2 0 0 0-2-2\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "scale": "<path d=\"M12 3v17M5 7h14M3 21h18M5 7 2 14a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z\"/>",
  "search": "<circle cx=\"10.8\" cy=\"10.8\" r=\"7\"/><path d=\"m16 16 5 5\"/>",
  "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19 12a7 7 0 0 0-.2-1.5l2-1.8-2-3.5-2.5.8a7 7 0 0 0-2.6-1.5L13.2 2h-4l-.5 2.5a7 7 0 0 0-2.6 1.5l-2.5-.8-2 3.5 2 1.8a7 7 0 0 0 0 3l-2 1.8 2 3.5 2.5-.8a7 7 0 0 0 2.6 1.5L9.2 22h4l.5-2.5a7 7 0 0 0 2.6-1.5l2.5.8 2-3.5-2-1.8A7 7 0 0 0 19 12z\"/>",
  "settings-2": "<path d=\"M4 7h9M17 7h3M4 17h3M11 17h9\"/><circle cx=\"15\" cy=\"7\" r=\"2\"/><circle cx=\"9\" cy=\"17\" r=\"2\"/>",
  "shield-check": "<path d=\"M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11z\"/><path d=\"m9 12 2 2 4-4\"/>",
  "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
  "trash-2": "<path d=\"M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7\"/>",
  "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>"
};
function iconRefresh() {
  for (const node of document.querySelectorAll('i[data-lucide]')) {
    const name=node.getAttribute('data-lucide');const path=ICON_PATHS[name];if(!path)continue;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [key,value] of Object.entries({xmlns:'http://www.w3.org/2000/svg',width:'24',height:'24',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.85','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
    svg.innerHTML=path;
    if(node.className)svg.setAttribute("class",node.className);
    if(node.hasAttribute('style'))svg.setAttribute('style',node.getAttribute('style'));
    node.replaceWith(svg);
  }
}

function countWord(n) {
  if (n === 1) return 'analiza';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return 'analizy';
  return 'analiz';
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function formatText(t) {
  return escapeHTML(t).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g,'<br>');
}
function extractTitle(text) {
  const line = String(text || '').split(/\r?\n/).map(x=>x.replace(/^#+\s*/,'').replace(/\*\*/g,'').trim()).find(x=>x.length>3 && x.length<90 && !x.endsWith(':'));
  return line || 'Analiza traseologiczna';
}
function setTheme() {
  const dark = themePreference === 'dark' || (themePreference === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#131820' : '#FAF9F6';
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    const selected = button.dataset.themeChoice === themePreference;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
  });
  const toggle = el('header-theme-btn');
  if (toggle) {
    toggle.setAttribute('aria-label', dark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw');
    toggle.setAttribute('title', dark ? 'Jasny motyw' : 'Ciemny motyw');
    el('header-theme-icon').innerHTML = dark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    iconRefresh();
  }
}
function chooseTheme(choice) {
  if(!['system','light','dark'].includes(choice))return;
  themePreference=choice;
  try{localStorage.setItem('traceai_theme',choice)}catch(_e){}
  setTheme();
}
function toggleThemeQuick() {
  const currentDark = document.documentElement.dataset.theme === 'dark';
  chooseTheme(currentDark ? 'light' : 'dark');
}
function pokazModal() { el('modal').style.display='flex'; iconRefresh(); }
function ukryjModal() { el('modal').style.display='none'; }
function configured() {
  return /^https:\/\//.test(CONFIG.API_ENDPOINT) && !CONFIG.API_ENDPOINT.includes('YOUR_SUBDOMAIN') &&
    CONFIG.TURNSTILE_SITE_KEY.length > 15 && !CONFIG.TURNSTILE_SITE_KEY.includes('YOUR_PUBLIC_');
}
function showConfigStatus() {
  const status=el('connection-status');
  if(status) status.textContent = configured() ? 'Gemini obsługiwane przez bezpieczne API' : 'Połączenie z API wymaga konfiguracji administratora';
}
let pendingVerification=null;
window.initTurnstile = () => { turnstileReady=true; renderTurnstile(); };
function renderTurnstile() {
  if(!configured() || !window.turnstile)return;
  if(turnstileWidgetId!==null){try{window.turnstile.remove(turnstileWidgetId)}catch(_e){}}
  turnstileToken='';
  turnstileWidgetId=window.turnstile.render('#turnstile-widget',{
    sitekey:CONFIG.TURNSTILE_SITE_KEY,
    execution:'execute',
    callback:token=>{
      turnstileToken=token;
      if(pendingVerification){const pending=pendingVerification;pendingVerification=null;clearTimeout(pending.timeout);pending.resolve(token);}
    },
    'expired-callback':()=>{turnstileToken='';},
    'error-callback':()=>{
      turnstileToken='';
      if(pendingVerification){const pending=pendingVerification;pendingVerification=null;clearTimeout(pending.timeout);pending.reject(new Error('Weryfikacja bezpieczeństwa nie powiodła się. Spróbuj ponownie.'));}
    }
  });
}
function verifyInBackground(){
  if(!turnstileReady||turnstileWidgetId===null||!window.turnstile)return Promise.reject(new Error('Trwa ładowanie ochrony antyspamowej. Spróbuj za chwilę.'));
  if(pendingVerification)return Promise.reject(new Error('Weryfikacja już trwa.'));
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{
      pendingVerification=null;
      reject(new Error('Weryfikacja trwa zbyt długo. Spróbuj ponownie.'));
    },25000);
    pendingVerification={resolve,reject,timeout};
    try{window.turnstile.execute(turnstileWidgetId);}catch(_e){
      clearTimeout(timeout);pendingVerification=null;
      reject(new Error('Nie udało się uruchomić weryfikacji. Odśwież stronę.'));
    }
  });
}
function resetTurnstile() {
  turnstileToken='';
  if(window.turnstile&&turnstileWidgetId!==null){try{window.turnstile.reset(turnstileWidgetId)}catch(_e){}}
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===id));
}
function modeFromText(p) {
  const s=String(p||'').toLowerCase();
  if(s.includes('porównaj')) return 'porownanie';
  if(s.includes('protokoł')) return 'protokol';
  if(s.includes('zabezpiecz')) return 'zabezpieczenie';
  return 'analiza';
}
function resetPreview() {
  ['','-2'].forEach((suffix,idx) => {
    el('img-preview'+suffix).removeAttribute('src');
    el('img-preview'+suffix).classList.remove('visible');
    el('upload-placeholder'+suffix).classList.remove('hidden');
    if(idx===0) el('upload-zone').classList.remove('has-image');
    if(idx===1) el('compare-zone').classList.remove('has-image');
    el('file-input'+suffix).value='';
  });
}
function newSession() {
  sessionId=makeId(); conversation=[]; currentImages=[null,null]; resetPreview();
  el('result-area').innerHTML='<div class="scan-empty">Wybierz zdjęcie i rozpocznij analizę.</div>';
  el('msg-input').value='';autoResize(el('msg-input'));
}
function goScan(prefill='') {
  currentMode=MODE_LABELS[prefill] ? prefill : modeFromText(prefill);
  newSession();
  el('scan-title').textContent=MODE_LABELS[currentMode];
  el('compare-zone').hidden=currentMode!=='porownanie';
  if(prefill && !MODE_LABELS[prefill]) {
    el('msg-input').value=prefill;autoResize(el('msg-input'));
  }
  showScreen('screen-scan');
}
function goHome() { renderRecentFromHistory();showScreen('screen-home'); }
function goHistory() {renderFullHistory();showScreen('screen-history');}

async function openDB() {
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=> { if(!r.result.objectStoreNames.contains(STORE_NAME))r.result.createObjectStore(STORE_NAME,{keyPath:'id',autoIncrement:true}); };
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
async function getAllRecords() {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const t=db.transaction(STORE_NAME,'readonly'); const r=t.objectStore(STORE_NAME).getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error); t.oncomplete=()=>db.close();
  });
}
async function storeRecord(record) {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const t=db.transaction(STORE_NAME,'readwrite');const r=t.objectStore(STORE_NAME).add(record);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);t.oncomplete=()=>db.close();
  });
}
async function clearDB() {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const t=db.transaction(STORE_NAME,'readwrite');t.objectStore(STORE_NAME).clear();
    t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);
  });
}
function normalizeRecord(r) {
  if(typeof r.reply==='string') return r;
  const parts=r.userParts||[];
  const image=r.image || (parts.find(x=>x.inlineData)?.inlineData && {mime:parts.find(x=>x.inlineData).inlineData.mimeType,b64:parts.find(x=>x.inlineData).inlineData.data});
  return {id:r.id,sessionId:'legacy-'+r.id,mode:'analiza',text:'Archiwalna analiza',reply:r.modelParts?.[0]?.text||'',images:image?[{mimeType:image.mime||image.mimeType,data:image.b64||image.data}]:[],timestamp:r.timestamp||Date.now()};
}
function getImagesForRecord(r) {
  if(Array.isArray(r.images)&&r.images.length) return r.images;
  return records.find(e=>e.sessionId===r.sessionId && Array.isArray(e.images) && e.images.length)?.images || [];
}
function updateStats() {
  const n=records.length;
  el('home-count').textContent=String(n);
  document.querySelector('.ring-label').textContent=countWord(n);
  el('ring-fill').style.strokeDashoffset=String(226 - Math.min(n/5,1)*226);
  el('recent-count').textContent=`${n} ${countWord(n)}`;
}
function createHistoryCard(r,small=false) {
  const btn=document.createElement(small?'button':'div');
  btn.className=small?'recent-item':'result-card';
  if(small) { btn.type='button';btn.style.width='100%';btn.style.textAlign='left'; }
  const title=extractTitle(r.reply);
  if(small) {
    btn.innerHTML='<div class="recent-dot" style="background:#FEF3C7"><i data-lucide="footprints"></i></div><div class="recent-info"></div>';
    const info=btn.querySelector('.recent-info');
    const h=document.createElement('h4');h.textContent=MODE_LABELS[r.mode]||'Analiza śladu';
    const p=document.createElement('p');p.textContent=title;
    info.append(h,p);
    btn.onclick=()=>printReport(r);
  } else {
    const heading=document.createElement('h3');heading.textContent=MODE_LABELS[r.mode]||'Analiza śladu';btn.appendChild(heading);
    const img=getImagesForRecord(r);
    for(const i of img) {
      if(!['image/jpeg','image/png','image/webp'].includes(i.mimeType)) continue;
      const preview=document.createElement('img');preview.src=`data:${i.mimeType};base64,${i.data}`;
      preview.alt='Zdjęcie śladu';preview.style.cssText='width:100%;max-height:190px;object-fit:contain;border-radius:12px;margin:0 0 10px;background:var(--bg)';
      btn.appendChild(preview);
    }
    const d=document.createElement('p');d.className='answer';d.innerHTML=formatText(r.reply);btn.appendChild(d);
    const print=document.createElement('button');print.className='report-btn';print.textContent='Wydrukuj / zapisz PDF';print.onclick=()=>printReport(r);btn.appendChild(print);
  }
  return btn;
}
function renderRecentFromHistory() {
  updateStats();
  const target=el('recent-list');target.innerHTML='';
  if(!records.length){target.innerHTML='<p style="padding:20px;text-align:center;color:var(--text2)">Brak analiz — rozpocznij od przycisku Skanuj.</p>';return;}
  for(const r of records.slice(-5).reverse())target.appendChild(createHistoryCard(r,true));
  iconRefresh();
}
function renderFullHistory() {
  const target=el('history-list');target.innerHTML='';
  if(!records.length){target.innerHTML='<p style="text-align:center;color:var(--text2)">Brak zapisanych analiz.</p>';return;}
  for(const r of records.slice().reverse())target.appendChild(createHistoryCard(r,false));
  iconRefresh();
}
async function wyczyscHistorie() {
  if(!confirm('Usunąć wszystkie lokalnie zapisane analizy i zdjęcia? Tej operacji nie można cofnąć.'))return;
  try {await clearDB();records=[];newSession();renderRecentFromHistory();alert('Historia została usunięta.');}
  catch {alert('Nie udało się usunąć historii. Sprawdź uprawnienia przeglądarki.');}
}
function exportHistory() {
  const contents=JSON.stringify({app:'TraceAI',exportedAt:new Date().toISOString(),analyses:records},null,2);
  const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='TraceAI-historia.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function printReport(r) {
  const root=el('print-section');root.textContent='';root.style.display='block';
  const container=document.createElement('div');container.style.cssText='font-family:Georgia,serif;line-height:1.55;padding:28px';
  const heading=document.createElement('h1');heading.textContent='TraceAI — wstępna analiza traseologiczna';container.appendChild(heading);
  const metadata=document.createElement('p');metadata.textContent=`Tryb: ${MODE_LABELS[r.mode]||'Analiza śladu'} · Wygenerowano: ${new Date(r.timestamp||Date.now()).toLocaleString('pl-PL')}`;container.appendChild(metadata);
  const note=document.createElement('p');note.className='print-note';note.textContent='Dokument roboczy wygenerowany z pomocą AI. Nie stanowi opinii biegłego ani samodzielnej podstawy identyfikacji.';container.appendChild(note);
  const images=getImagesForRecord(r);
  for(const i of images){if(!['image/jpeg','image/png','image/webp'].includes(i.mimeType))continue;const img=document.createElement('img');img.src=`data:${i.mimeType};base64,${i.data}`;img.alt='Dokumentacja fotograficzna';container.appendChild(img);}
  const h=document.createElement('h2');h.textContent='Wynik analizy';container.appendChild(h);
  const body=document.createElement('div');body.className='report-body';body.textContent=r.reply;container.appendChild(body);
  root.appendChild(container);
  const done=()=>{root.style.display='none';window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done);
  requestAnimationFrame(()=>window.print());
}

async function convertImage(file) {
  if(!file.type.startsWith('image/'))throw Error('Wybierz plik graficzny.');
  if(file.size>18_000_000)throw Error('Maksymalny rozmiar zdjęcia to 18 MB.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=url;await image.decode();
    if(image.naturalWidth<100||image.naturalHeight<100)throw Error('Zdjęcie ma za małą rozdzielczość.');
    const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.82).split(',')[1];
    if(data.length>5_500_000)throw Error('Zdjęcie po kompresji jest zbyt duże.');
    return {mimeType:'image/jpeg',data};
  } catch(e) {if(e instanceof Error && e.message!=='The source image cannot be decoded.')throw e;throw Error('Nie można odczytać zdjęcia. Spróbuj pliku JPG lub PNG.');}
  finally {URL.revokeObjectURL(url);}
}
async function wgrajZdjecie(event,index=0) {
  const file=event.target.files?.[0];if(!file)return;
  try {
    const img=await convertImage(file);
    // Choosing another photo after a completed dialogue starts a clean case.
    if(conversation.length){newSession();}
    currentImages[index]=img;
    el('result-area').querySelectorAll('[data-notice]').forEach(n=>n.remove());
    const suffix=index===0?'':'-2';const preview=el('img-preview'+suffix);
    preview.src=`data:${img.mimeType};base64,${img.data}`;
    preview.classList.add('visible');el('upload-placeholder'+suffix).classList.add('hidden');
    el(index===0?'upload-zone':'compare-zone').classList.add('has-image');
  } catch(e){alert(e.message||'Nie udało się wczytać zdjęcia.');}
}
function renderWiadomosc(tekst,rola='ai') {
  const area=el('result-area');
  const normalized=String(tekst||'').replace(/^⚠️\s*/, '').trim();
  const last=area.lastElementChild;
  // Errors/validation notices are transient. Do not stack or duplicate notices.
  if(rola==='error' && last?.dataset.notice===normalized) return last;
  if(rola==='error') area.querySelectorAll('[data-notice]').forEach(n=>n.remove());
  if(rola!=='error') area.querySelectorAll('[data-notice]').forEach(n=>n.remove());
  if(area.querySelector('.scan-empty')) area.querySelector('.scan-empty').remove();
  const card=document.createElement('div');
  card.className=rola==='error'?'inline-notice':rola==='user'?'result-card user-question':'result-card';
  if(rola==='error'){
    card.dataset.notice=normalized;
    card.setAttribute('role','status');
    card.innerHTML='<span class="notice-symbol" aria-hidden="true">!</span><span></span>';
    card.lastElementChild.textContent=normalized;
  }else{
    const heading=document.createElement('h3');heading.textContent=rola==='user'?'Twoje pytanie':'Analiza AI';
    const body=document.createElement('p');body.className='answer';body.innerHTML=formatText(normalized);
    card.append(heading,body);
  }
  area.appendChild(card);area.scrollTop=area.scrollHeight;
  return card;
}
function typing(active) {
  el('typing')?.remove();
  if(active){const d=document.createElement('div');d.className='typing-card';d.id='typing';d.textContent='Przygotowuję analizę zdjęcia…';el('result-area').appendChild(d);}
}
function quickSend(t) {el('msg-input').value=t;autoResize(el('msg-input')); if(currentImages[0] && (currentMode!=='porownanie'||currentImages[1]))wyslij();else {renderWiadomosc('Najpierw dodaj '+(currentMode==='porownanie'?'oba zdjęcia.':'zdjęcie śladu.'),'error');el('file-input').focus();}}
function autoResize(element) {element.style.height='auto';element.style.height=Math.min(element.scrollHeight,80)+'px';}
function handleKey(event) {if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();wyslij();}}
async function wyslij() {
  if(busy)return;
  const text=el('msg-input').value.trim();
  if(!currentImages[0] || (currentMode==='porownanie'&&!currentImages[1])){renderWiadomosc('Najpierw dodaj '+(currentMode==='porownanie'?'dwa zdjęcia śladów.':'zdjęcie śladu.'),'error');return;}
  if(!configured()){renderWiadomosc('Administrator musi najpierw podłączyć serwer analizy i Turnstile.','error');return;}
  if(text.length>3000){renderWiadomosc('Skróć pytanie do 3000 znaków.','error');return;}
  busy=true;el('send-btn').disabled=true;
  renderWiadomosc(text||'Przeanalizuj zdjęcie','user');typing(true);
  const prior=conversation.slice(-6);
  const imagePayload=currentImages.slice(0,currentMode==='porownanie'?2:1);
  try {
    const verifiedToken=await verifyInBackground();
    const response=await fetch(CONFIG.API_ENDPOINT, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:currentMode,text,images:imagePayload,conversation:prior,turnstileToken:verifiedToken})});
    const result=await response.json().catch(()=>({error:'Nieprawidłowa odpowiedź serwera.'}));
    if(!response.ok || !result.reply)throw Error(result.error||'Nie udało się wykonać analizy.');
    typing(false);
    const r={sessionId,mode:currentMode,text,reply:result.reply,timestamp:Date.now(),images:conversation.length===0?imagePayload:[]};
    try{r.id=await storeRecord(r);}catch(e){r.id=-Date.now();renderWiadomosc('Nie udało się zapisać wyniku lokalnie (możliwy brak miejsca).','error');}
    records.push(r);conversation.push({role:'user',text:text||'Przeanalizuj zdjęcie'},{role:'model',text:result.reply});
    const card=renderWiadomosc(result.reply);
    const button=document.createElement('button');button.className='report-btn';button.textContent='Wydrukuj / zapisz PDF';button.onclick=()=>printReport(r);card.appendChild(button);
    el('msg-input').value='';autoResize(el('msg-input'));renderRecentFromHistory();
  } catch(e){typing(false);renderWiadomosc('⚠️ '+(e.message||'Błąd połączenia.'),'error');}
  finally{busy=false;el('send-btn').disabled=false;resetTurnstile();}
}

async function init() {
  setTheme();showConfigStatus();iconRefresh();
  try{records=(await getAllRecords()).map(normalizeRecord).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));}
  catch(e){console.warn('Historia niedostępna:',e);}
  renderRecentFromHistory();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')ukryjModal();});
  if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(themePreference==='system')setTheme();});
}
init();