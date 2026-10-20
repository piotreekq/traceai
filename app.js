'use strict';
/* Public configuration. Set these two public values before publishing.
   NEVER put the Gemini key or Turnstile secret in this file. */
const CONFIG = {
  API_ENDPOINT: 'https://traceai-api.traceai-lopatka915.workers.dev/analyze',
  TURNSTILE_SITE_KEY: '0x4AAAAAAFdcvOyuN3zh5tVh',
};

const DB_NAME = 'TraceAIDB';
const DB_VERSION = 2;
const CASE_STORE = 'cases';
const STORE_NAME = 'history';
const MODE_LABELS = {analiza:'Analiza śladu', porownanie:'Porównanie śladów', protokol:'Projekt protokołu', zabezpieczenie:'Zabezpieczenie śladu'};
let currentMode = 'analiza';
let currentImages = [null, null];
let sessionId = makeId();
let conversation = [];
let busy = false;
let records = [];
let cases = [];
let activeCase = null;
let editingCaseId = null;
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
  "scan-search": "<path d=\"M5 3H3v2m16-2h2v2M5 21H3v-2m16 2h2v-2\"/><circle cx=\"11\" cy=\"11\" r=\"5\"/><path d=\"m15 15 5 5\"/>",
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
  sessionId=makeId(); conversation=[]; currentImages=[null,null];activeCase=makeCaseDraft();resetPreview();
  resetCaseEditorState();
  el('result-area').innerHTML='<div class="scan-empty">Wybierz zdjęcie i rozpocznij analizę.</div>';
  el('msg-input').value='';autoResize(el('msg-input'));
  updateEditorOpen();
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
  updateCaseBar();
}
function goHome() { renderRecentFromHistory();showScreen('screen-home'); }
function goHistory() {renderFullHistory();showScreen('screen-history');}

async function openDB() {
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=> { if(!r.result.objectStoreNames.contains(STORE_NAME))r.result.createObjectStore(STORE_NAME,{keyPath:'id',autoIncrement:true}); if(!r.result.objectStoreNames.contains(CASE_STORE))r.result.createObjectStore(CASE_STORE,{keyPath:'id'}); };
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
    const t=db.transaction([STORE_NAME,CASE_STORE],'readwrite');t.objectStore(STORE_NAME).clear();t.objectStore(CASE_STORE).clear();
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
  el('recent-count').textContent=`${cases.length} ${cases.length===1?'sprawa':cases.length>=2&&cases.length<=4?'sprawy':'spraw'}`;
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
  if(!cases.length){target.innerHTML='<p class="case-empty">Brak zapisanych spraw. Wybierz Skanuj lub utwórz nową sprawę.</p>';return;}
  for(const c of cases.slice().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5))target.appendChild(createCaseCard(c,true));
  iconRefresh();
}
function renderFullHistory() {
  const target=el('history-list');target.innerHTML='';
  if(!records.length){target.innerHTML='<p style="text-align:center;color:var(--text2)">Brak zapisanych analiz.</p>';return;}
  for(const r of records.slice().reverse())target.appendChild(createHistoryCard(r,false));
  iconRefresh();
}
async function wyczyscHistorie() {
  if(!confirm('Usunąć wszystkie sprawy, analizy i zdjęcia zapisane na urządzeniu? Operacji nie można cofnąć.'))return;
  try {await clearDB();records=[];cases=[];newSession();renderRecentFromHistory();renderCases();alert('Lokalne sprawy i historia zostały usunięte.');}
  catch {alert('Nie udało się usunąć historii. Sprawdź uprawnienia przeglądarki.');}
}
function exportHistory() {
  const contents=JSON.stringify({app:'TraceAI',exportedAt:new Date().toISOString(),cases,analyses:records},null,2);
  const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='TraceAI-sprawy-i-analizy.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function printReport(r) {
  if(r.caseId && cases.some(c=>c.id===r.caseId)){exportCasePdf(r.caseId);return;}
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
    if(!activeCase)activeCase=makeCaseDraft();activeCase.images=currentImages;activeCase.updatedAt=Date.now();
    try{await upsertCase(activeCase);}catch(e){console.warn('Nie udało się zapisać sprawy lokalnie:',e);}updateCaseBar();
    updateEditorOpen();
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
    const r={sessionId,caseId:activeCase?.id||null,mode:currentMode,text,reply:result.reply,timestamp:Date.now(),images:conversation.length===0?imagePayload:[],annotations:structuredClone(editorState.annotations),calibration:editorState.calibration?{...editorState.calibration}:null};
    try{r.id=await storeRecord(r);}catch(e){r.id=-Date.now();renderWiadomosc('Nie udało się zapisać wyniku lokalnie (możliwy brak miejsca).','error');}
    if(activeCase){activeCase.status='w_toku';activeCase.updatedAt=Date.now();await upsertCase(activeCase).catch(()=>{});}
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
  try{cases=(await getAllCases()).filter(c=>c&&typeof c==='object'&&typeof c.id==='string');await migrateLegacyCases();}catch(e){console.warn('Sprawy niedostępne:',e);}
  if(!activeCase)activeCase=makeCaseDraft();
  renderRecentFromHistory();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')ukryjModal();});
  if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(themePreference==='system')setTheme();});
}

// Photo inspection — annotations and calibration live in source-image pixel coordinates.
let editorState={tool:'pan',zoom:1,panX:0,panY:0,rotation:0,secondAngle:0,secondX:0,secondY:0,opacity:.5,layout:'overlay',points:[],calibration:null,annotations:[],images:[null,null],decoded:[null,null],pointer:null,preview:null};
function updateEditorOpen(){el('editor-open')?.classList.toggle('visible',!!currentImages[0]);}
function editorImageSource(i){return i?'data:'+i.mimeType+';base64,'+i.data:null;}
async function decodeEditorImage(img){if(!img)return null;const image=new Image();image.src=editorImageSource(img);await image.decode();return image;}
async function openEditor(){
  if(!currentImages[0]){renderWiadomosc('Dodaj zdjęcie przed otwarciem narzędzi.','error');return;}
  if(activeCase){editorState.annotations=structuredClone(activeCase.annotations||[]);editorState.calibration=activeCase.calibration?{...activeCase.calibration}:null;}
  editorState.images=[...currentImages];
  try{editorState.decoded=await Promise.all(editorState.images.map(decodeEditorImage));}catch{renderWiadomosc('Nie udało się wczytać obrazu do pracowni.','error');return;}
  showScreen('screen-editor');el('editor-compare-options').hidden=!editorState.decoded[1];
  syncEditorControls();editorRender();
}
function closeEditor(){editorState.pointer=null;editorState.preview=null;showScreen('screen-scan');}
function editorViewport(){const c=el('editor-canvas');const b=c.getBoundingClientRect();const w=Math.max(1,Math.round(b.width*devicePixelRatio)),h=Math.max(1,Math.round(b.height*devicePixelRatio));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return {c,w,h};}
function imgPlacement(index=0){
  const image=editorState.decoded[index];if(!image)return null;
  const {w,h}=editorViewport(),split=editorState.layout==='split'&&editorState.decoded[1];
  const containerWidth=split?w/2:w;
  const scale=Math.min(containerWidth/image.naturalWidth,h/image.naturalHeight)*.91*editorState.zoom;
  return {image,cx:split?(index===0?w/4:w*3/4):w/2,cy:h/2,scale,angle:index===0?editorState.rotation:editorState.rotation+editorState.secondAngle,offsetX:index===0?0:editorState.secondX*devicePixelRatio,offsetY:index===0?0:editorState.secondY*devicePixelRatio};
}
function editorDrawImg(ctx,p,opacity=1){if(!p)return;ctx.save();ctx.globalAlpha=opacity;ctx.translate(p.cx+editorState.panX*devicePixelRatio+p.offsetX,p.cy+editorState.panY*devicePixelRatio+p.offsetY);ctx.rotate(p.angle*Math.PI/180);ctx.scale(p.scale,p.scale);ctx.drawImage(p.image,-p.image.naturalWidth/2,-p.image.naturalHeight/2);ctx.restore();}
function editorToCanvas(pos,index=0){const p=imgPlacement(index);if(!p)return{x:0,y:0};const a=p.angle*Math.PI/180;const lx=(pos.x-p.image.naturalWidth/2)*p.scale,ly=(pos.y-p.image.naturalHeight/2)*p.scale;return{x:p.cx+editorState.panX*devicePixelRatio+p.offsetX+lx*Math.cos(a)-ly*Math.sin(a),y:p.cy+editorState.panY*devicePixelRatio+p.offsetY+lx*Math.sin(a)+ly*Math.cos(a)};}
function editorFromCanvas(x,y){const p=imgPlacement(0);if(!p)return{x:0,y:0};const a=p.angle*Math.PI/180,dx=x-p.cx-editorState.panX*devicePixelRatio,dy=y-p.cy-editorState.panY*devicePixelRatio;return{x:(dx*Math.cos(a)+dy*Math.sin(a))/p.scale+p.image.naturalWidth/2,y:(-dx*Math.sin(a)+dy*Math.cos(a))/p.scale+p.image.naturalHeight/2};}
function editorDrawMark(ctx,item){
  if(!item)return;const first=editorToCanvas(item.a);const second=item.b?editorToCanvas(item.b):first;
  const unit=devicePixelRatio;ctx.save();ctx.lineWidth=2*unit;ctx.strokeStyle='#e64b36';ctx.fillStyle='#e64b36';ctx.font=12*unit+'px sans-serif';ctx.lineCap='round';
  if(item.type==='point'){ctx.beginPath();ctx.arc(first.x,first.y,4.5*unit,0,Math.PI*2);ctx.fill();}
  else if(item.type==='rect'){ctx.strokeRect(first.x,first.y,second.x-first.x,second.y-first.y);}
  else {ctx.beginPath();ctx.moveTo(first.x,first.y);ctx.lineTo(second.x,second.y);ctx.stroke();ctx.beginPath();ctx.arc(first.x,first.y,3*unit,0,Math.PI*2);ctx.arc(second.x,second.y,3*unit,0,Math.PI*2);ctx.fill();}
  if(item.label){ctx.lineWidth=3*unit;ctx.strokeStyle='rgba(0,0,0,.72)';ctx.strokeText(item.label,first.x+8*unit,first.y-8*unit);ctx.fillStyle='#fff';ctx.fillText(item.label,first.x+8*unit,first.y-8*unit)}
  ctx.restore();
}
function editorRender(){if(!el('screen-editor').classList.contains('active'))return;const {c,w,h}=editorViewport(),ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg')||'#eee';ctx.fillRect(0,0,w,h);ctx.save();if(editorState.layout==='split'&&editorState.decoded[1]){ctx.strokeStyle='#999';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();editorDrawImg(ctx,imgPlacement(0));editorDrawImg(ctx,imgPlacement(1));}else{editorDrawImg(ctx,imgPlacement(0));if(editorState.decoded[1])editorDrawImg(ctx,imgPlacement(1),editorState.opacity)}ctx.restore();for(const item of editorState.annotations)editorDrawMark(ctx,item);if(editorState.preview)editorDrawMark(ctx,editorState.preview);}
function syncEditorControls(){
  document.querySelectorAll('[data-editor-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.editorTool===editorState.tool)));
  el('editor-hint').textContent=editorState.tool==='pan'?'Przesuwaj obraz palcem lub myszą':editorState.tool==='calibrate'?'Zaznacz dwa końce znanej odległości':'Dotknij, aby oznaczyć cechę';
  el('editor-layout-btn').textContent=editorState.layout==='overlay'?'Nakładka':'Obok siebie';
  el('editor-calibration').innerHTML=editorState.calibration?`Kalibracja: <strong>${escapeHTML(editorState.calibration.mm.toFixed(2))} mm</strong> / ${Math.round(editorState.calibration.pixels)} px. Wartość orientacyjna.`:'Brak kalibracji — zmierz znany odcinek skali na zdjęciu.';
  if(activeCase){activeCase.annotations=structuredClone(editorState.annotations);activeCase.calibration=editorState.calibration?{...editorState.calibration}:null;upsertCase(activeCase).catch(console.warn);}
  const ul=el('editor-annotations');ul.textContent='';editorState.annotations.forEach((n,i)=>{const li=document.createElement('li');const span=document.createElement('span');span.textContent=(i+1)+'. '+(n.label||({point:'Punkt',line:'Linia',rect:'Obszar',measure:'Pomiar',calibrate:'Kalibracja'}[n.type]||'Cecha'));const b=document.createElement('button');b.textContent='×';b.setAttribute('aria-label','Usuń oznaczenie');b.onclick=()=>{editorState.annotations.splice(i,1);if(n.type==='calibrate')editorState.calibration=null;syncEditorControls();editorRender();};li.append(span,b);ul.appendChild(li)});
}
function setEditorTool(tool){editorState.tool=tool;editorState.points=[];editorState.preview=null;syncEditorControls();editorRender();}
function zoomEditor(delta){editorState.zoom=Math.max(.35,Math.min(6,editorState.zoom+delta));editorRender()}
function rotateEditor(degrees){editorState.rotation=(editorState.rotation+degrees)%360;editorRender()}
function rotateSecond(degrees){editorState.secondAngle=(editorState.secondAngle+degrees)%360;editorRender()}
function moveSecond(dx,dy){editorState.secondX+=dx;editorState.secondY+=dy;editorRender()}
function setEditorOpacity(n){editorState.opacity=Number(n)/100;el('editor-opacity-label').textContent=n+'%';editorRender()}
function switchEditorLayout(){editorState.layout=editorState.layout==='overlay'?'split':'overlay';syncEditorControls();editorRender()}
function resetEditorView(){Object.assign(editorState,{zoom:1,panX:0,panY:0,rotation:0,secondX:0,secondY:0,secondAngle:0});editorRender()}
function clearEditorCalibration(){editorState.calibration=null;editorState.annotations=editorState.annotations.filter(n=>n.type!=='calibrate'&&n.type!=='measure');syncEditorControls();editorRender()}
function undoEditorAnnotation(){const n=editorState.annotations.pop();if(n?.type==='calibrate')editorState.calibration=null;syncEditorControls();editorRender()}
function editorCanvasPoint(e){const c=el('editor-canvas'),b=c.getBoundingClientRect();return{x:(e.clientX-b.left)*(c.width/b.width),y:(e.clientY-b.top)*(c.height/b.height)};}
function isInsideEditorImage(p){const i=editorState.decoded[0];return i&&p.x>=0&&p.y>=0&&p.x<=i.naturalWidth&&p.y<=i.naturalHeight}
function editorPointerDown(e){if(!editorState.decoded[0])return;e.preventDefault();const c=el('editor-canvas');c.setPointerCapture(e.pointerId);const q=editorCanvasPoint(e);const p=editorFromCanvas(q.x,q.y);editorState.pointer={initial:q,current:q,origin:p,panX:editorState.panX,panY:editorState.panY};}
function editorPointerMove(e){if(!editorState.pointer)return;const q=editorCanvasPoint(e),t=editorState.pointer;t.current=q;if(editorState.tool==='pan'){editorState.panX=t.panX+(q.x-t.initial.x)/devicePixelRatio;editorState.panY=t.panY+(q.y-t.initial.y)/devicePixelRatio;}else if(['line','rect','measure'].includes(editorState.tool))editorState.preview={type:editorState.tool,a:t.origin,b:editorFromCanvas(q.x,q.y)};editorRender()}
function editorPointerUp(e){const t=editorState.pointer;if(!t)return;editorState.pointer=null;const q=editorCanvasPoint(e),p=editorFromCanvas(q.x,q.y),a=t.origin;editorState.preview=null;
  if(editorState.tool==='pan'){editorRender();return;}
  if(!isInsideEditorImage(a))return;
  if(editorState.tool==='point'){const label=prompt('Opis cechy (opcjonalnie):','Cecha')||'Cecha';editorState.annotations.push({type:'point',a,label});}
  else if(editorState.tool==='calibrate'){
    editorState.points.push(a);if(editorState.points.length===2){const [a,b]=editorState.points;editorState.points=[];const pixels=Math.hypot(b.x-a.x,b.y-a.y);if(pixels>1){const input=prompt('Rzeczywista długość zaznaczonej skali (mm):','10');if(input!==null){const mm=Number(input.replace(',','.'));if(Number.isFinite(mm)&&mm>0&&mm<100000){editorState.calibration={mm,pixels};editorState.annotations=editorState.annotations.filter(z=>z.type!=='calibrate'&&z.type!=='measure');editorState.annotations.push({type:'calibrate',a,b,label:`Skala ${mm} mm`});}else alert('Podaj dodatnią długość w mm.')}}}
  }else if(['line','rect','measure'].includes(editorState.tool)){
    if(Math.hypot(p.x-a.x,p.y-a.y)>2){if(editorState.tool==='measure'&&!editorState.calibration){alert('Najpierw skalibruj obraz przyciskiem Kalibruj.');return;}
    const mm=editorState.calibration?Math.hypot(p.x-a.x,p.y-a.y)*editorState.calibration.mm/editorState.calibration.pixels:null;
    editorState.annotations.push({type:editorState.tool,a,b:p,label:editorState.tool==='measure'?`${mm.toFixed(2)} mm`:editorState.tool==='line'?'Odcinek':'Obszar'});}}
  syncEditorControls();editorRender();
}
function downloadAnnotatedImage(){if(!editorState.decoded[0])return;editorRender();const a=document.createElement('a');a.href=el('editor-canvas').toDataURL('image/png');a.download='TraceAI-oznaczenia.png';a.click();}
window.addEventListener('resize',()=>{if(el('screen-editor')?.classList.contains('active'))editorRender()});
{const c=el('editor-canvas');c?.addEventListener('pointerdown',editorPointerDown);c?.addEventListener('pointermove',editorPointerMove);c?.addEventListener('pointerup',editorPointerUp);c?.addEventListener('pointercancel',()=>{editorState.pointer=null;editorState.preview=null;editorRender()});}


function makeCaseDraft(){const now=Date.now();return{id:'case-'+(crypto.randomUUID?.()||makeId()),title:'Nowa sprawa',number:'',kind:'obuwie',status:'szkic',notes:'',images:[null,null],annotations:[],calibration:null,createdAt:now,updatedAt:now};}
function resetCaseEditorState(){editorState.tool='pan';editorState.zoom=1;editorState.panX=0;editorState.panY=0;editorState.rotation=0;editorState.secondAngle=0;editorState.secondX=0;editorState.secondY=0;editorState.annotations=[];editorState.calibration=null;editorState.points=[];editorState.decoded=[null,null];editorState.images=[null,null];}
function getAllCases(){return openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(CASE_STORE,'readonly'),request=tx.objectStore(CASE_STORE).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();}));}
async function upsertCase(c){if(!c)return;const idx=cases.findIndex(x=>x&&x.id===c.id);if(idx>=0)cases[idx]=c;else cases.push(c);const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(CASE_STORE,'readwrite');tx.objectStore(CASE_STORE).put(structuredClone(c));tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);});}
function updateCaseBar(){const bar=el('case-current-line');if(!bar)return;bar.classList.toggle('visible',!!activeCase);el('case-current-label').textContent=activeCase?(activeCase.number?activeCase.number+' · ':'')+activeCase.title:'';}
async function migrateLegacyCases(){
  const known=new Set(cases.map(c=>c.id));
  for(const r of records){
    if(r.caseId)continue;
    const id='legacy-'+r.sessionId;r.caseId=id;
    if(known.has(id))continue;
    const now=r.timestamp||Date.now();
    const c={id,title:extractTitle(r.reply),number:'ARCH-'+String(r.id??'').padStart(4,'0'),kind:'inne',status:'zakonczona',notes:'Zaimportowano z wcześniejszej wersji TraceAI',images:getImagesForRecord(r),annotations:[],calibration:null,createdAt:now,updatedAt:now};
    await upsertCase(c);known.add(id);
  }
}
function goCases(){hideCaseForm();renderCases();showScreen('screen-cases');}
function createNewCase(){activeCase=makeCaseDraft();sessionId=makeId();conversation=[];currentImages=activeCase.images;resetCaseEditorState();resetPreview();updateEditorOpen();editingCaseId=activeCase.id;goCases();showCaseForm(activeCase);}
function showCaseForm(c){editingCaseId=c.id;el('case-title').value=c.title==='Nowa sprawa'?'':c.title;el('case-number').value=c.number||'';el('case-kind').value=c.kind||'obuwie';el('case-status').value=c.status||'szkic';el('case-notes').value=c.notes||'';el('case-form').classList.add('visible');el('case-title').focus();}
function hideCaseForm(){el('case-form').classList.remove('visible');editingCaseId=null;}
function editActiveCase(){if(!activeCase)return;goCases();showCaseForm(activeCase);}
async function saveCaseForm(event){event.preventDefault();const c=cases.find(c=>c.id===editingCaseId)|| (activeCase?.id===editingCaseId?activeCase:makeCaseDraft());c.title=el('case-title').value.trim().slice(0,120)||'Nowa sprawa';c.number=el('case-number').value.trim().slice(0,80);c.kind=el('case-kind').value;c.status=el('case-status').value;c.notes=el('case-notes').value.slice(0,3000);c.updatedAt=Date.now();await upsertCase(c);activeCase=c;hideCaseForm();renderCases();renderRecentFromHistory();updateCaseBar();}
function createCaseCard(c,compact=false){
  const outer=document.createElement(compact?'button':'div');outer.className=compact?'recent-item':'case-card';if(compact){outer.type='button';outer.style.width='100%';outer.style.textAlign='left';}
  const icon=document.createElement('span');icon.className=compact?'recent-dot case-card-icon':'case-card-icon';icon.innerHTML='<i data-lucide="folder"></i>';outer.appendChild(icon);
  const body=document.createElement('div');body.className=compact?'recent-info':'case-card-content';const title=document.createElement(compact?'h4':'div');title.className=compact?'':'case-card-title';title.textContent=c.title||'Sprawa bez nazwy';body.appendChild(title);
  const sub=document.createElement(compact?'p':'div');sub.className=compact?'':'case-card-meta';sub.textContent=(c.number?c.number+' · ':'')+ (c.kind==='obuwie'?'Obuwie':c.kind==='opona'?'Opona':c.kind==='stopa'?'Stopa':'Inne') +' · '+new Date(c.updatedAt||Date.now()).toLocaleDateString('pl-PL');body.appendChild(sub);
  if(!compact){const status=document.createElement('span');status.className='case-status';status.textContent={szkic:'Szkic',w_toku:'W toku',zakonczona:'Zakończona'}[c.status]||c.status;body.appendChild(status);const row=document.createElement('div');row.className='case-card-actions';const edit=document.createElement('button');edit.className='case-mini-btn';edit.textContent='Edytuj';edit.onclick=e=>{e.stopPropagation();showCaseForm(c);};const pdf=document.createElement('button');pdf.className='case-report-link';pdf.textContent='Raport PDF';pdf.onclick=e=>{e.stopPropagation();exportCasePdf(c.id);};const del=document.createElement('button');del.className='case-mini-btn danger';del.textContent='Usuń';del.onclick=e=>{e.stopPropagation();deleteCase(c.id);};row.append(edit,pdf,del);body.appendChild(row);}
  outer.appendChild(body);outer.addEventListener('click',()=>openCase(c.id));return outer;
}
function renderCases(){const box=el('case-list');if(!box)return;box.replaceChildren();const q=(el('case-query').value||'').toLocaleLowerCase('pl'),kind=el('case-filter-type').value,status=el('case-filter-status').value,sort=el('case-sort').value;let visible=cases.filter(c=>c&&(!kind||c.kind===kind)&&(!status||c.status===status)&&(!q||((c.title||'')+' '+(c.number||'')).toLocaleLowerCase('pl').includes(q)));visible.sort(sort==='name'?(a,b)=>a.title.localeCompare(b.title,'pl'):sort==='oldest'?(a,b)=>a.createdAt-b.createdAt:(a,b)=>b.updatedAt-a.updatedAt);if(!visible.length){const msg=document.createElement('p');msg.className='case-empty';msg.textContent=cases.length?'Brak spraw spełniających kryteria.':'Nie masz jeszcze spraw. Kliknij „+ Nowa”.';box.appendChild(msg);}for(const c of visible)box.appendChild(createCaseCard(c));iconRefresh();}
function restoreImagePreview(index,img){if(!img)return;const suffix=index===0?'':'-2';const p=el('img-preview'+suffix);p.src=editorImageSource(img);p.classList.add('visible');el('upload-placeholder'+suffix).classList.add('hidden');el(index===0?'upload-zone':'compare-zone').classList.add('has-image');}
function openCase(id){const c=cases.find(c=>c.id===id);if(!c)return;activeCase=c;sessionId='case-session-'+id;conversation=[];currentImages=[...(c.images||[null,null])];resetCaseEditorState();resetPreview();restoreImagePreview(0,currentImages[0]);restoreImagePreview(1,currentImages[1]);updateEditorOpen();currentMode=currentImages[1]?'porownanie':'analiza';el('scan-title').textContent=MODE_LABELS[currentMode];el('compare-zone').hidden=currentMode!=='porownanie';el('result-area').innerHTML='<div class="scan-empty">Możesz kontynuować pracę z materiałem tej sprawy.</div>';
  const entry=records.filter(r=>r.caseId===id).at(-1);if(entry){renderWiadomosc(entry.reply);}
  updateCaseBar();showScreen('screen-scan');}
async function deleteCase(id){const c=cases.find(c=>c.id===id);if(!c||!confirm('Usunąć sprawę „'+c.title+'” oraz jej zapisane analizy?'))return;const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction([CASE_STORE,STORE_NAME],'readwrite');tx.objectStore(CASE_STORE).delete(id);for(const r of records.filter(r=>r.caseId===id))if(r.id)tx.objectStore(STORE_NAME).delete(r.id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();cases=cases.filter(c=>c.id!==id);records=records.filter(r=>r.caseId!==id);if(activeCase?.id===id){activeCase=makeCaseDraft();currentImages=activeCase.images;resetPreview();}renderCases();renderRecentFromHistory();}


// Printable case report, including annotated image and calibration metadata.
function reportNode(tag,text,className=''){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n;}
async function reportImage(data,annotations=[]){
  if(!data || !['image/jpeg','image/png','image/webp'].includes(data.mimeType))return null;
  try{
    const image=await decodeEditorImage(data);
    const limit=1600,scale=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.naturalWidth*scale));c.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);
    ctx.lineWidth=Math.max(2,3*scale);ctx.strokeStyle='#e6412d';ctx.fillStyle='#e6412d';ctx.font='bold '+Math.max(12,18*scale)+'px sans-serif';
    for(const ann of annotations){if(!ann||!ann.a||!Number.isFinite(ann.a.x)||!Number.isFinite(ann.a.y))continue;
      const x=ann.a.x*scale,y=ann.a.y*scale,X=ann.b?.x*scale??x,Y=ann.b?.y*scale??y;
      if(ann.type==='rect'&&ann.b){ctx.strokeRect(x,y,X-x,Y-y)}
      else if(ann.type==='point'){ctx.beginPath();ctx.arc(x,y,Math.max(4,6*scale),0,2*Math.PI);ctx.fill()}
      else if(ann.b){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke()}
      if(ann.label){ctx.lineWidth=3;ctx.strokeStyle='#000';ctx.strokeText(ann.label,x+8,y-8);ctx.fillStyle='#fff';ctx.fillText(ann.label,x+8,y-8);ctx.fillStyle='#e6412d';ctx.strokeStyle='#e6412d';}
    }
    return c.toDataURL('image/jpeg',.87);
  }catch(e){console.warn('Nie można przygotować obrazu do raportu',e);return null;}
}
async function exportCasePdf(id){
  const c=cases.find(c=>c?.id===id)|| (activeCase?.id===id?activeCase:null);
  if(!c){alert('Wybierz sprawę, dla której chcesz przygotować raport.');return;}
  const root=el('print-section');root.replaceChildren();root.style.display='block';
  const report=reportNode('article');
  report.appendChild(reportNode('h1','TraceAI — raport roboczy'));
  report.appendChild(reportNode('p','Dokumentacja pomocnicza sprawy · przygotowana z użyciem narzędzi cyfrowych.'));
  const metadata=reportNode('div',undefined,'report-metadata');
  for(const [label,value] of [['Numer sprawy',c.number||'Nie nadano'],['Nazwa sprawy',c.title||'Bez nazwy'],['Rodzaj śladu',c.kind||'Nie określono'],['Status',({szkic:'Szkic',w_toku:'W toku',zakonczona:'Zakończona'}[c.status]||'Szkic')],['Data raportu',new Date().toLocaleString('pl-PL')],['Data utworzenia',new Date(c.createdAt||Date.now()).toLocaleDateString('pl-PL')]]){
    const wrapper=reportNode('div');wrapper.append(reportNode('small',label),reportNode('strong',value));metadata.appendChild(wrapper);
  }report.appendChild(metadata);
  if(c.notes){report.append(reportNode('h2','Notatki do sprawy'),reportNode('p',c.notes));}
  const images=c.images||[null,null];const anns=c.annotations||[];
  report.appendChild(reportNode('h2','Materiał fotograficzny'));
  for(let i=0;i<images.length;i++){
    const image=images[i];if(!image)continue;
    const figure=reportNode('figure');const img=document.createElement('img');img.alt='Fotografia '+(i+1);img.src=editorImageSource(image);figure.append(img,reportNode('figcaption','Fotografia '+(i+1)+(i===0?' — ślad':' — materiał porównawczy')));report.appendChild(figure);
    if(i===0&&anns.length){const annotated=await reportImage(image,anns);if(annotated){const f=reportNode('figure');const preview=document.createElement('img');preview.src=annotated;preview.alt='Zaznaczone cechy śladu';f.append(preview,reportNode('figcaption','Wizualizacja oznaczeń (materiał roboczy; oryginał powyżej)'));report.appendChild(f);}}
  }
  if(!images.some(Boolean))report.appendChild(reportNode('p','Do sprawy nie dołączono fotografii.'));
  report.appendChild(reportNode('h2','Oznaczenia i pomiary'));
  if(anns.length){const list=reportNode('ol');for(const a of anns){list.appendChild(reportNode('li',a.label||a.type||'Oznaczenie'));}report.appendChild(list);}else report.appendChild(reportNode('p','Brak zapisanych oznaczeń.'));
  if(c.calibration){const {mm,pixels}=c.calibration;report.appendChild(reportNode('p','Kalibracja: '+mm+' mm odpowiada '+Math.round(pixels)+' px. Pomiary mogą być obarczone błędami perspektywy i odwzorowania.'));}
  const related=records.filter(r=>r.caseId===c.id).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
  report.appendChild(reportNode('h2','Wyniki analiz AI'));
  if(!related.length)report.appendChild(reportNode('p','Dla tej sprawy nie wykonano jeszcze analizy AI.'));
  for(const [i,r] of related.entries()){
    const section=reportNode('section');section.appendChild(reportNode('h3',(i+1)+'. '+(MODE_LABELS[r.mode]||'Analiza')));
    section.appendChild(reportNode('p','Pytanie: '+(r.text||'Analiza śladu')));
    const answer=reportNode('div',undefined,'report-answer');const pieces=String(r.reply||'Brak odpowiedzi modelu').split(/(\*\*[^*\n]+\*\*)/g);for(const segment of pieces){if(segment.startsWith('**')&&segment.endsWith('**'))answer.appendChild(reportNode('strong',segment.slice(2,-2)));else answer.appendChild(document.createTextNode(segment));}section.appendChild(answer);report.appendChild(section);
  }
  report.appendChild(reportNode('p','Uwaga: obraz po przetworzeniu, oznaczenia i wyniki AI mają charakter pomocniczy. Dokument nie stanowi opinii biegłego ani identyfikacji indywidualnej.','report-disclaimer'));
  root.appendChild(report);
  const cleanup=()=>{root.style.display='none';window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup,{once:true});
  requestAnimationFrame(()=>window.print());
}

init();
