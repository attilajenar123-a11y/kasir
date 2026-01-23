/* Kasir Offline + Game SAYANG (localStorage) */
const STORE = { products:'pos_products_v1', cart:'pos_cart_v1', tx:'pos_transactions_v1', scores:'pos_game_scores_v1' };
const DEFAULT_PRODUCTS = [
  { id:'p1', name:'Nasi Kepal Ayam Suwir', price:0 },
  { id:'p2', name:'Nasi Kepal Ayam Geprek', price:0 },
  { id:'p3', name:'Indomie', price:0 },
  { id:'p4', name:'Magic Water', price:0 },
  { id:'p5', name:'Stiker ITS', price:0 },
];
const load=(k,f)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):f; }catch{return f;} };
const save=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const nowISO=()=>new Date().toISOString();
const uid=()=> 'trx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
const rupiah=(n)=> 'Rp ' + Math.round(Number(n||0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const fmtTime=(iso)=>{ const d=new Date(iso); return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})+' • '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); };

let products = load(STORE.products, DEFAULT_PRODUCTS);
let cart = load(STORE.cart, {});
let transactions = load(STORE.tx, []);
let scores = load(STORE.scores, []);

const elProducts=document.getElementById('products');
const elSumItems=document.getElementById('sum-items');
const elSumTotal=document.getElementById('sum-total');
const elCheckout=document.getElementById('btn-checkout');
const elSearch=document.getElementById('search');
const elReset=document.getElementById('btn-reset');

const tabKasir=document.getElementById('tab-kasir');
const tabRiwayat=document.getElementById('tab-riwayat');
const tabGame=document.getElementById('tab-game');
const viewKasir=document.getElementById('view-kasir');
const viewRiwayat=document.getElementById('view-riwayat');
const viewGame=document.getElementById('view-game');

const elTxList=document.getElementById('transactions');
const elTxEmpty=document.getElementById('tx-empty');
const elExport=document.getElementById('btn-export');

const modal=document.getElementById('modal');
const modalClose=document.getElementById('modal-close');
const modalX=document.getElementById('modal-x');
const modalTitle=document.getElementById('modal-title');
const modalSub=document.getElementById('modal-sub');
const modalBody=document.getElementById('modal-body');

const toast=document.getElementById('toast');

const gameStatus=document.getElementById('game-status');
const btnGameStart=document.getElementById('btn-game-start');
const btnGameStop=document.getElementById('btn-game-stop');
const btnManualSayang=document.getElementById('btn-manual-sayang');
const meterFill=document.getElementById('meter-fill');
const dbNow=document.getElementById('db-now');
const dbPeakEl=document.getElementById('db-peak');
const scoresEl=document.getElementById('scores');
const scoresEmpty=document.getElementById('scores-empty');
const btnGameReset=document.getElementById('btn-game-reset');

const showToast=(m)=>{ toast.textContent=m; toast.classList.remove('hidden'); clearTimeout(showToast._t); showToast._t=setTimeout(()=>toast.classList.add('hidden'),1600); };
const persist=()=>{ save(STORE.products,products); save(STORE.cart,cart); save(STORE.tx,transactions); save(STORE.scores,scores); };

const getQty=(id)=>Number(cart[id]||0);
const setQty=(id,q)=>{ q=Math.max(0,Math.floor(Number(q||0))); if(q===0) delete cart[id]; else cart[id]=q; persist(); };

function totals(){
  let items=0,total=0;
  for(const p of products){
    const q=getQty(p.id);
    if(q>0){ items+=q; total += Number(p.price||0)*q; }
  }
  return {items,total};
}

function renderProducts(){
  const query=(elSearch.value||'').trim().toLowerCase();
  const list=query?products.filter(p=>p.name.toLowerCase().includes(query)):products;

  elProducts.innerHTML='';
  for(const p of list){
    const q=getQty(p.id);
    const card=document.createElement('div'); card.className='card';

    const name=document.createElement('div'); name.className='name'; name.textContent=p.name;

    const price=document.createElement('div'); price.className='price';
    const priceText=document.createElement('span');
    priceText.textContent = Number(p.price||0)>0 ? ('Harga: '+rupiah(p.price)) : 'Harga: (belum diisi)';
    priceText.style.cursor='pointer'; priceText.title='Tap untuk isi/ubah harga';
    priceText.onclick=()=>{
      const current=Number(p.price||0);
      const input=prompt('Masukkan harga untuk: '+p.name+'\n(contoh: 12000)', String(current));
      if(input===null) return;
      const cleaned=String(input).replace(/[^0-9]/g,'');
      p.price = cleaned?Number(cleaned):0;
      persist(); renderAll(); showToast('Harga tersimpan');
    };
    const badge=document.createElement('span'); badge.className='badge'; badge.textContent='Tap harga buat edit';
    price.appendChild(priceText); price.appendChild(badge);

    const qtybar=document.createElement('div'); qtybar.className='qtybar';
    const qty=document.createElement('div'); qty.className='qty';

    const minus=document.createElement('button'); minus.className='qbtn'; minus.textContent='−';
    minus.onclick=()=>{ setQty(p.id, getQty(p.id)-1); renderAll(); };

    const val=document.createElement('div'); val.className='qval'; val.textContent=String(q);

    const plus=document.createElement('button'); plus.className='qbtn'; plus.textContent='+';
    plus.onclick=()=>{ setQty(p.id, getQty(p.id)+1); renderAll(); };

    qty.appendChild(minus); qty.appendChild(val); qty.appendChild(plus);

    const quick=document.createElement('button'); quick.className='btn'; quick.textContent='Tambah';
    quick.onclick=()=>{ setQty(p.id, getQty(p.id)+1); renderAll(); showToast('Ditambahkan: '+p.name); };

    qtybar.appendChild(qty); qtybar.appendChild(quick);

    card.appendChild(name); card.appendChild(price); card.appendChild(qtybar);
    elProducts.appendChild(card);
  }
}

function renderSummary(){
  const {items,total}=totals();
  elSumItems.textContent=String(items);
  elSumTotal.textContent=rupiah(total);
  elCheckout.disabled = items===0;
}

function buildTransaction(){
  const items=[]; let total=0;
  for(const p of products){
    const qty=getQty(p.id);
    if(qty>0){
      const price=Number(p.price||0);
      const subtotal=price*qty;
      total+=subtotal;
      items.push({product_id:p.id,name:p.name,price,qty,subtotal});
    }
  }
  return {id:uid(), created_at:nowISO(), total, items};
}

function checkout(){
  if(totals().items===0) return;
  transactions.push(buildTransaction());
  cart={}; persist();
  showToast('Transaksi tersimpan ✅'); renderAll(); openRiwayat();
}

function renderTransactions(){
  elTxList.innerHTML='';
  if(!transactions.length){ elTxEmpty.classList.remove('hidden'); return; }
  elTxEmpty.classList.add('hidden');

  for(const t of [...transactions].reverse()){
    const box=document.createElement('div'); box.className='tx';
    box.innerHTML = `
      <div class="top">
        <div>
          <div class="id">${t.id}</div>
          <div class="meta">${fmtTime(t.created_at)} • ${(t.items?.length||0)} jenis item</div>
        </div>
        <div style="text-align:right">
          <div class="total">${rupiah(t.total)}</div>
          <div class="meta">Tap untuk detail</div>
        </div>
      </div>`;
    box.onclick=()=>openModal(t);
    elTxList.appendChild(box);
  }
}

function openModal(trx){
  modalTitle.textContent='Detail Transaksi';
  modalSub.textContent = trx.id+' • '+fmtTime(trx.created_at);
  modalBody.innerHTML='';
  const head=document.createElement('div'); head.className='row';
  head.innerHTML = `<div><strong>Total</strong><div class="small">${trx.items.length} item</div></div><div><strong>${rupiah(trx.total)}</strong></div>`;
  modalBody.appendChild(head);
  for(const it of trx.items){
    const row=document.createElement('div'); row.className='row';
    row.innerHTML = `<div><div><strong>${it.name}</strong></div><div class="small">${it.qty} × ${rupiah(it.price)}</div></div><div><strong>${rupiah(it.subtotal)}</strong></div>`;
    modalBody.appendChild(row);
  }
  modal.classList.remove('hidden');
}
const closeModal=()=>modal.classList.add('hidden');

function exportJSON(){
  const data={exported_at:nowISO(), products, transactions, scores};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='kasir-export.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),250);
}

function resetAll(){
  const ok=confirm('Reset semua data?\nIni akan hapus: produk, harga, keranjang, riwayat transaksi, dan skor game.');
  if(!ok) return;
  products=[...DEFAULT_PRODUCTS]; cart={}; transactions=[]; scores=[];
  persist(); renderAll(); showToast('Data direset');
}

function openKasir(){
  tabKasir.classList.add('active'); tabRiwayat.classList.remove('active'); tabGame.classList.remove('active');
  viewKasir.classList.remove('hidden'); viewRiwayat.classList.add('hidden'); viewGame.classList.add('hidden');
}
function openRiwayat(){
  tabRiwayat.classList.add('active'); tabKasir.classList.remove('active'); tabGame.classList.remove('active');
  viewRiwayat.classList.remove('hidden'); viewKasir.classList.add('hidden'); viewGame.classList.add('hidden');
  renderTransactions();
}
function openGame(){
  tabGame.classList.add('active'); tabKasir.classList.remove('active'); tabRiwayat.classList.remove('active');
  viewGame.classList.remove('hidden'); viewKasir.classList.add('hidden'); viewRiwayat.classList.add('hidden');
  renderScores();
}

/* ===== GAME ===== */
let audioCtx=null, analyser=null, mediaStream=null, rafId=null;
let peakDb=-Infinity, heardSayang=false, windowUntil=0;
let recognition=null, speechSupported=false;

const setGameStatus=(t)=>gameStatus.textContent=t;
const clamp01=(x)=>Math.max(0,Math.min(1,x));
const dbFromRMS=(rms)=>20*Math.log10(Math.max(rms,1e-8));

function renderMeter(db){
  const norm=clamp01((db-(-60))/55);
  meterFill.style.width=(norm*100).toFixed(1)+'%';
  dbNow.textContent = (db===-Infinity)?'-∞':db.toFixed(1);
  dbPeakEl.textContent = (peakDb===-Infinity)?'-∞':peakDb.toFixed(1);
}

function setupSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return {ok:false};
  const r=new SR();
  r.continuous=true; r.interimResults=true; r.lang='id-ID';
  r.onresult=(event)=>{
    let text='';
    for(let i=event.resultIndex;i<event.results.length;i++) text+=event.results[i][0].transcript;
    text=(text||'').toLowerCase();
    r._lastTranscript=text;
    if(text.includes('sayang')){
      heardSayang=true;
      windowUntil=Date.now()+2000;
      setGameStatus('Kata terdeteksi ✅ (ambil peak 2 detik)');
      btnManualSayang.disabled=true;
    }
  };
  r.onerror=()=>{ speechSupported=false; btnManualSayang.disabled=false; setGameStatus('Mic aktif • deteksi kata OFF'); };
  return {ok:true, recognition:r};
}

function maybeFinish(){
  if(heardSayang && Date.now()>windowUntil){
    setGameStatus('Selesai ✅');
    scores.push({ts:nowISO(), peakDb:Number(peakDb.toFixed(1)), method:speechSupported?'speech':'manual', transcript:recognition?._lastTranscript||'':''});
    if(scores.length>100) scores=scores.slice(scores.length-100);
    persist(); renderScores();
    showToast('Skor tersimpan: '+peakDb.toFixed(1)+' dB');
    heardSayang=false; windowUntil=0; btnManualSayang.disabled=!speechSupported?false:true;
  }
}

function tick(){
  if(!analyser) return;
  const buf=new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum=0;
  for(let i=0;i<buf.length;i++){ const v=buf[i]; sum+=v*v; }
  const rms=Math.sqrt(sum/buf.length);
  const db=dbFromRMS(rms);
  if(db>peakDb) peakDb=db;
  renderMeter(db);
  maybeFinish();
  rafId=requestAnimationFrame(tick);
}

async function startGame(){
  try{
    setGameStatus('Minta akses mic…');
    peakDb=-Infinity; heardSayang=false; windowUntil=0;
    mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const source=audioCtx.createMediaStreamSource(mediaStream);
    analyser=audioCtx.createAnalyser(); analyser.fftSize=2048;
    source.connect(analyser);

    const sp=setupSpeech();
    if(sp.ok){
      recognition=sp.recognition; speechSupported=true;
      try{ recognition.start(); }catch{}
      setGameStatus('Mic aktif • bilang “SAYANG”');
      btnManualSayang.disabled=true;
    }else{
      recognition=null; speechSupported=false;
      setGameStatus('Mic aktif • mode manual');
      btnManualSayang.disabled=false;
    }

    btnGameStart.disabled=true; btnGameStop.disabled=false;
    btnManualSayang.onclick=()=>{
      heardSayang=true; windowUntil=Date.now()+2000;
      setGameStatus('Manual ✅ (ambil peak 2 detik)');
      btnManualSayang.disabled=true;
    };
    tick();
  }catch{
    setGameStatus('Gagal akses mic');
    showToast('Mic tidak bisa dipakai. Pastikan HTTPS & izin mic diaktifkan.');
    stopGame();
  }
}

function stopGame(){
  if(rafId) cancelAnimationFrame(rafId); rafId=null;
  if(recognition){ try{recognition.stop();}catch{} }
  recognition=null;
  if(mediaStream) mediaStream.getTracks().forEach(t=>t.stop());
  mediaStream=null;
  if(audioCtx){ try{audioCtx.close();}catch{} }
  audioCtx=null; analyser=null;
  btnGameStart.disabled=false; btnGameStop.disabled=true; btnManualSayang.disabled=true;
  setGameStatus('Berhenti');
  renderMeter(-Infinity);
}

function renderScores(){
  scoresEl.innerHTML='';
  if(!scores.length){ scoresEmpty.classList.remove('hidden'); return; }
  scoresEmpty.classList.add('hidden');
  const top=[...scores].sort((a,b)=>b.peakDb-a.peakDb).slice(0,10);
  for(const s of top){
    const box=document.createElement('div'); box.className='tx';
    box.innerHTML = `
      <div class="top">
        <div>
          <div class="id">🏆 ${s.peakDb.toFixed(1)} dB</div>
          <div class="meta">${fmtTime(s.ts)} • ${s.method==='speech'?'deteksi kata':'manual'}</div>
        </div>
        <div style="text-align:right">
          <div class="total">${s.method==='speech'?'SAYANG':'manual'}</div>
          <div class="meta">top score</div>
        </div>
      </div>`;
    scoresEl.appendChild(box);
  }
}

function resetScores(){
  const ok=confirm('Reset semua skor game?');
  if(!ok) return;
  scores=[]; persist(); renderScores(); showToast('Skor direset');
}

function renderAll(){
  renderProducts(); renderSummary(); renderTransactions(); renderScores();
}

/* Events */
elSearch.addEventListener('input', renderProducts);
elCheckout.addEventListener('click', checkout);

// Tab navigation (lebih kebal: event delegation)
document.querySelector('.tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button.tab');
  if (!btn) return;

  if (btn.id === 'tab-kasir') openKasir();
  if (btn.id === 'tab-riwayat') openRiwayat();
  if (btn.id === 'tab-game') openGame();
});


elExport.addEventListener('click', exportJSON);
elReset.addEventListener('click', resetAll);

modalClose.addEventListener('click', closeModal);
modalX.addEventListener('click', closeModal);
window.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeModal(); });

btnGameStart.addEventListener('click', startGame);
btnGameStop.addEventListener('click', stopGame);
btnGameReset.addEventListener('click', resetScores);

/* Init */
persist(); renderAll(); openKasir();
