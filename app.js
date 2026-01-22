/* Kasir Offline - single device (localStorage) */
const STORE = {
  products: 'pos_products_v1',
  cart: 'pos_cart_v1',
  tx: 'pos_transactions_v1',
};

const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Nasi Kepal Ayam Suwir', price: 0 },
  { id: 'p2', name: 'Nasi Kepal Ayam Geprek', price: 0 },
  { id: 'p3', name: 'Indomie', price: 0 },
  { id: 'p4', name: 'Magic Water', price: 0 },
  { id: 'p5', name: 'Stiker ITS', price: 0 },
];

function load(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function save(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

function rupiah(n){
  const x = Math.round(Number(n || 0));
  return 'Rp ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function nowISO(){
  return new Date().toISOString();
}

function fmtTime(iso){
  const d = new Date(iso);
  // Format simple: 22 Jan 2026 • 10:15
  const optDate = { day:'2-digit', month:'short', year:'numeric' };
  const optTime = { hour:'2-digit', minute:'2-digit' };
  return d.toLocaleDateString('id-ID', optDate) + ' • ' + d.toLocaleTimeString('id-ID', optTime);
}

function uid(){
  return 'trx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
}

// State
let products = load(STORE.products, DEFAULT_PRODUCTS);
let cart = load(STORE.cart, {}); // { [productId]: qty }
let transactions = load(STORE.tx, []); // newest last

// Elements
const elProducts = document.getElementById('products');
const elSumItems = document.getElementById('sum-items');
const elSumTotal = document.getElementById('sum-total');
const elCheckout = document.getElementById('btn-checkout');
const elSearch = document.getElementById('search');
const elReset = document.getElementById('btn-reset');

const tabKasir = document.getElementById('tab-kasir');
const tabRiwayat = document.getElementById('tab-riwayat');
const viewKasir = document.getElementById('view-kasir');
const viewRiwayat = document.getElementById('view-riwayat');

const elTxList = document.getElementById('transactions');
const elTxEmpty = document.getElementById('tx-empty');
const elExport = document.getElementById('btn-export');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalX = document.getElementById('modal-x');
const modalTitle = document.getElementById('modal-title');
const modalSub = document.getElementById('modal-sub');
const modalBody = document.getElementById('modal-body');

const toast = document.getElementById('toast');

function showToast(msg){
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.classList.add('hidden'), 1600);
}

function persist(){
  save(STORE.products, products);
  save(STORE.cart, cart);
  save(STORE.tx, transactions);
}

function getQty(pid){
  return Number(cart[pid] || 0);
}
function setQty(pid, qty){
  const q = Math.max(0, Math.floor(Number(qty || 0)));
  if (q === 0) delete cart[pid];
  else cart[pid] = q;
  persist();
}

function totals(){
  let items = 0;
  let total = 0;
  for (const p of products){
    const q = getQty(p.id);
    if (q > 0){
      items += q;
      total += (Number(p.price||0) * q);
    }
  }
  return { items, total };
}

function renderProducts(){
  const query = (elSearch.value || '').trim().toLowerCase();
  const list = query
    ? products.filter(p => p.name.toLowerCase().includes(query))
    : products;

  elProducts.innerHTML = '';
  for (const p of list){
    const q = getQty(p.id);

    const card = document.createElement('div');
    card.className = 'card';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = p.name;

    const price = document.createElement('div');
    price.className = 'price';
    const priceText = document.createElement('span');
    priceText.textContent = (Number(p.price||0) > 0)
      ? ('Harga: ' + rupiah(p.price))
      : 'Harga: (belum diisi)';
    priceText.style.cursor = 'pointer';
    priceText.title = 'Tap untuk isi/ubah harga';
    priceText.addEventListener('click', () => {
      const current = Number(p.price||0);
      const input = prompt('Masukkan harga untuk: ' + p.name + '\n(contoh: 12000)', String(current));
      if (input === null) return;
      const cleaned = String(input).replace(/[^0-9]/g,'');
      const val = cleaned ? Number(cleaned) : 0;
      p.price = val;
      persist();
      renderAll();
      showToast('Harga tersimpan');
    });

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Tap harga buat edit';

    price.appendChild(priceText);
    price.appendChild(badge);

    const qtybar = document.createElement('div');
    qtybar.className = 'qtybar';

    const qty = document.createElement('div');
    qty.className = 'qty';

    const minus = document.createElement('button');
    minus.className = 'qbtn';
    minus.textContent = '−';
    minus.addEventListener('click', () => {
      setQty(p.id, getQty(p.id) - 1);
      renderAll();
    });

    const val = document.createElement('div');
    val.className = 'qval';
    val.textContent = String(q);

    const plus = document.createElement('button');
    plus.className = 'qbtn';
    plus.textContent = '+';
    plus.addEventListener('click', () => {
      setQty(p.id, getQty(p.id) + 1);
      renderAll();
    });

    qty.appendChild(minus);
    qty.appendChild(val);
    qty.appendChild(plus);

    const quick = document.createElement('button');
    quick.className = 'btn';
    quick.textContent = 'Tambah';
    quick.addEventListener('click', () => {
      setQty(p.id, getQty(p.id) + 1);
      renderAll();
      showToast('Ditambahkan: ' + p.name);
    });

    qtybar.appendChild(qty);
    qtybar.appendChild(quick);

    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(qtybar);

    elProducts.appendChild(card);
  }
}

function renderSummary(){
  const { items, total } = totals();
  elSumItems.textContent = String(items);
  elSumTotal.textContent = rupiah(total);
  elCheckout.disabled = items === 0;
}

function buildTransaction(){
  const items = [];
  let total = 0;

  for (const p of products){
    const qty = getQty(p.id);
    if (qty > 0){
      const price = Number(p.price||0);
      const subtotal = price * qty;
      total += subtotal;
      items.push({
        product_id: p.id,
        name: p.name,
        price,
        qty,
        subtotal
      });
    }
  }

  return {
    id: uid(),
    created_at: nowISO(),
    total,
    items
  };
}

function checkout(){
  const { items } = totals();
  if (items === 0) return;

  const trx = buildTransaction();
  transactions.push(trx);

  // clear cart
  cart = {};
  persist();

  showToast('Transaksi tersimpan ✅');
  renderAll();
  // switch to history to confirm saved
  openRiwayat();
}

function renderTransactions(){
  elTxList.innerHTML = '';
  if (!transactions.length){
    elTxEmpty.classList.remove('hidden');
    return;
  }
  elTxEmpty.classList.add('hidden');

  // show newest first
  const list = [...transactions].reverse();
  for (const t of list){
    const box = document.createElement('div');
    box.className = 'tx';

    const top = document.createElement('div');
    top.className = 'top';

    const left = document.createElement('div');
    const id = document.createElement('div');
    id.className = 'id';
    id.textContent = t.id;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = fmtTime(t.created_at) + ' • ' + (t.items?.length || 0) + ' jenis item';

    left.appendChild(id);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.style.textAlign = 'right';
    const total = document.createElement('div');
    total.className = 'total';
    total.textContent = rupiah(t.total);
    const small = document.createElement('div');
    small.className = 'meta';
    small.textContent = 'Tap untuk detail';

    right.appendChild(total);
    right.appendChild(small);

    top.appendChild(left);
    top.appendChild(right);

    box.appendChild(top);

    box.addEventListener('click', () => openModal(t));

    elTxList.appendChild(box);
  }
}

function openModal(trx){
  modalTitle.textContent = 'Detail Transaksi';
  modalSub.textContent = trx.id + ' • ' + fmtTime(trx.created_at);

  modalBody.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'row';
  head.innerHTML = `<div><strong>Total</strong><div class="small">${trx.items.length} item</div></div>
                    <div><strong>${rupiah(trx.total)}</strong></div>`;
  modalBody.appendChild(head);

  for (const it of trx.items){
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div>
        <div><strong>${it.name}</strong></div>
        <div class="small">${it.qty} × ${rupiah(it.price)}</div>
      </div>
      <div><strong>${rupiah(it.subtotal)}</strong></div>`;
    modalBody.appendChild(row);
  }

  modal.classList.remove('hidden');
}

function closeModal(){
  modal.classList.add('hidden');
}

function openKasir(){
  tabKasir.classList.add('active');
  tabRiwayat.classList.remove('active');
  tabKasir.setAttribute('aria-selected', 'true');
  tabRiwayat.setAttribute('aria-selected', 'false');
  viewKasir.classList.remove('hidden');
  viewRiwayat.classList.add('hidden');
}

function openRiwayat(){
  tabRiwayat.classList.add('active');
  tabKasir.classList.remove('active');
  tabRiwayat.setAttribute('aria-selected', 'true');
  tabKasir.setAttribute('aria-selected', 'false');
  viewRiwayat.classList.remove('hidden');
  viewKasir.classList.add('hidden');
  renderTransactions();
}

function exportJSON(){
  const data = {
    exported_at: nowISO(),
    products,
    transactions
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kasir-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 250);
}

function resetAll(){
  const ok = confirm('Reset semua data?\nIni akan hapus: produk, harga, keranjang, dan riwayat transaksi.');
  if (!ok) return;
  products = [...DEFAULT_PRODUCTS];
  cart = {};
  transactions = [];
  persist();
  renderAll();
  showToast('Data direset');
}

function renderAll(){
  renderProducts();
  renderSummary();
  renderTransactions();
}

// Events
elSearch.addEventListener('input', () => renderProducts());
elCheckout.addEventListener('click', checkout);
tabKasir.addEventListener('click', openKasir);
tabRiwayat.addEventListener('click', openRiwayat);
elExport.addEventListener('click', exportJSON);
elReset.addEventListener('click', resetAll);

modalClose.addEventListener('click', closeModal);
modalX.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// First run
persist();
renderAll();
openKasir();
