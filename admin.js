 

'use strict';

const API = 'https://jsegogloballtd.com/api';  // ← update when deployed live
const PRICE_PER = 400;

let currentFilter = 'all';
let currentView   = 'orders';
let allOrders     = [];
let toastTimer    = null;

 

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}


async function loadOrders() {
  try {
    const data = await apiFetch('/orders');
    allOrders  = data.orders || [];
    renderTable();
    renderProductStats();
  } catch (err) {
    console.error('Failed to load orders:', err);
    toast('⚠️ Cannot reach server. Is server.js running?', 4000);
    allOrders = [];
    renderTable();
  }
}

 
async function quickStatus(orderId, newStatus) {
  try {
    await apiFetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status: newStatus }),
    });
    const o = allOrders.find(o => o.id === orderId);
    if (o) o.status = newStatus;
    renderTable();
    toast(`✓ Order ${orderId} → ${newStatus}`);
  } catch {
    toast('⚠️ Status update failed');
  }
}

async function updateStatus(orderId, newStatus) {
  await quickStatus(orderId, newStatus);
  openModal(orderId);
}

 
async function deleteOrder(orderId) {
  if (!confirm(`Delete order ${orderId}? This cannot be undone.`)) return;
  try {
    await apiFetch(`/orders/${orderId}`, { method: 'DELETE' });
    allOrders = allOrders.filter(o => o.id !== orderId);
    closeModal();
    renderTable();
    toast(`Order ${orderId} deleted`);
  } catch {
    toast('⚠️ Delete failed');
  }
}

 

async function clearOrders() {
  if (!confirm('Delete ALL orders? This cannot be undone.')) return;
  try {
    await apiFetch('/orders', { method: 'DELETE' });
    allOrders = [];
    renderTable();
    toast(' All orders cleared');
  } catch {
    toast('⚠️ Clear failed');
  }
}
 

async function refresh() {
  const btn = document.getElementById('rfbtn');
  btn?.classList.add('spin');
  await loadOrders();
  setTimeout(() => btn?.classList.remove('spin'), 700);
  toast(' Dashboard refreshed');
}

 
function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-NG', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  };
  tick();
  setInterval(tick, 1000);
}

 
function toast(msg, duration = 2800) {
  const el = document.getElementById('atst');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

 

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebarOverlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}

 

function setView(view, btn) {
  currentView = view;
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
  const target = document.getElementById(`view-${view}`);
  if (target) target.style.display = 'flex';

  const titles  = { orders: 'Orders Dashboard', product: 'Product Details' };
  const titleEl = document.getElementById('vw-title');
  if (titleEl) titleEl.textContent = titles[view] || view;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn?.classList.contains('nav-btn')) btn.classList.add('active');

  if (view === 'product') renderProductStats();
  if (window.innerWidth <= 900) closeSidebar();
}

function setBottomNav(btn) {
  document.querySelectorAll('.bn-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
}

 
function statusClass(s) {
  const map = {
    Pending: 'pending', Processing: 'processing',
    Shipped: 'shipped', Delivered: 'delivered', Cancelled: 'cancelled',
  };
  return map[s] || 'pending';
}
function statusBadge(s) {
  return `<span class="sb ${statusClass(s)}"><span class="sb-d"></span>${s}</span>`;
}
const STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
function statusSelect(orderId, current, onchange) {
  return `
    <select class="ssel" onchange="${onchange}('${orderId}', this.value)">
      ${STATUS_OPTIONS.map(s =>
        `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`
      ).join('')}
    </select>`;
}

 
function renderStats(orders) {
  const total     = orders.reduce((s, o) => s + o.total, 0);
  const pending   = orders.filter(o => o.status === 'Pending').length;
  const delivered = orders.filter(o => o.status === 'Delivered').length;

  const pb = document.getElementById('pend-badge');
  if (pb) pb.textContent = pending;

  const row = document.getElementById('stats-row');
  if (!row) return;

  row.innerHTML = `
    <div class="stat-card">
      <div class="stat-ico">📦</div>
      <div class="stat-lbl">Total Orders</div>
      <div class="stat-val">${orders.length}</div>
      <div class="stat-s">All time</div>
    </div>
    <div class="stat-card gc">
      <div class="stat-ico">💰</div>
      <div class="stat-lbl">Total Revenue</div>
      <div class="stat-val">₦${total.toLocaleString()}</div>
      <div class="stat-s">Gross earnings</div>
    </div>
    <div class="stat-card oc">
      <div class="stat-ico">⏳</div>
      <div class="stat-lbl">Pending</div>
      <div class="stat-val">${pending}</div>
      <div class="stat-s">Awaiting action</div>
    </div>
    <div class="stat-card grc">
      <div class="stat-ico">✅</div>
      <div class="stat-lbl">Delivered</div>
      <div class="stat-val">${delivered}</div>
      <div class="stat-s">Completed</div>
    </div>
  `;
}

 
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.fp').forEach(p => p.classList.remove('active'));
  btn?.classList.add('active');
  renderTable();
}

function getFiltered() {
  let orders = [...allOrders];
  const q    = (document.getElementById('srch-in')?.value || '').toLowerCase().trim();
  if (currentFilter !== 'all') orders = orders.filter(o => o.status === currentFilter);
  if (q) {
    orders = orders.filter(o =>
      o.customer.name.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      o.customer.address.toLowerCase().includes(q)
    );
  }
  return orders;
}

 
function renderTable() {
  renderStats(allOrders);

  const orders = getFiltered();
  const tbody  = document.getElementById('tbody');
  const mcards = document.getElementById('mobile-cards');
  const empt   = document.getElementById('empt');
  const cntEl  = document.getElementById('ord-cnt');

  if (cntEl) cntEl.textContent = orders.length;

  if (!orders.length) {
    if (tbody)  tbody.innerHTML  = '';
    if (mcards) mcards.innerHTML = '';
    if (empt)   empt.style.display = 'block';
    return;
  }
  if (empt) empt.style.display = 'none';

  if (tbody) {
    tbody.innerHTML = orders.map(o => {
      const packs = o.items.reduce((s, i) => s + i.qty, 0);
      return `
        <tr onclick="openModal('${o.id}')">
          <td class="tid">${o.id}</td>
          <td class="tname">${o.customer.name}<span>${o.customer.phone}</span></td>
          <td class="tqty">${packs}</td>
          <td class="ttot">₦${o.total.toLocaleString()}</td>
          <td>${statusBadge(o.status)}</td>
          <td class="tdate">${o.date}</td>
          <td class="taddr">${o.customer.address}</td>
          <td onclick="event.stopPropagation()">
            ${statusSelect(o.id, o.status, 'quickStatus')}
          </td>
        </tr>`;
    }).join('');
  }

  if (mcards) {
    mcards.innerHTML = orders.map(o => {
      const packs = o.items.reduce((s, i) => s + i.qty, 0);
      return `
        <div class="mob-card">
          <div class="mob-card-top">
            <div>
              <div class="mob-id">${o.id}</div>
              <div class="mob-name">${o.customer.name}</div>
              <div class="mob-phone">${o.customer.phone}</div>
            </div>
            ${statusBadge(o.status)}
          </div>
          <div class="mob-card-mid">
            <span class="mob-total">₦${o.total.toLocaleString()}</span>
            <span class="mob-packs">${packs} pack${packs !== 1 ? 's' : ''}</span>
          </div>
          <div class="mob-card-bot">
            <span class="mob-date">${o.date}</span>
            <span class="mob-addr">${o.customer.address}</span>
          </div>
          <div class="mob-status-row">
            ${statusSelect(o.id, o.status, 'quickStatus')}
            <button class="mob-detail-btn" onclick="openModal('${o.id}')">View →</button>
          </div>
        </div>`;
    }).join('');
  }
}

 
function openModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const packs = order.items.reduce((s, i) => s + i.qty, 0);
  const panel = document.getElementById('mod-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="mhero">
      <div class="mhero-top">
        <div>
          <div class="m-oid">${order.id}</div>
          <div class="m-date">${order.date}</div>
        </div>
        <button class="m-close" onclick="closeModal()">✕</button>
      </div>
      ${statusBadge(order.status)}
    </div>
    <div class="mbody">

      <div class="dblock">
        <div class="dblk-title">Customer Details</div>
        <div class="drow"><span class="dl">Name</span><span class="dv">${order.customer.name}</span></div>
        <div class="drow"><span class="dl">Phone</span><span class="dv">${order.customer.phone}</span></div>
        ${order.customer.email ? `<div class="drow"><span class="dl">Email</span><span class="dv">${order.customer.email}</span></div>` : ''}
        <div class="drow"><span class="dl">Address</span><span class="dv">${order.customer.address}</span></div>
        ${order.note ? `<div class="drow"><span class="dl">Note</span><span class="dv" style="color:#c9a84c;font-style:italic">"${order.note}"</span></div>` : ''}
      </div>

      <div class="dblock">
        <div class="dblk-title">Items Ordered</div>
        ${order.items.map(i => `
          <div class="item-row">
            <div class="ir-left">
              <div class="ir-ico">🌾</div>
              <div>
                <div class="ir-name">${i.name}</div>
                <div class="ir-unit">₦${i.price.toLocaleString()} × ${i.qty} pack${i.qty !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="ir-total">₦${(i.price * i.qty).toLocaleString()}</div>
          </div>
        `).join('')}
        ${order.discount > 0 ? `
          <div class="total-bar" style="background:rgba(46,204,113,0.07)">
            <span>Discount (${order.coupon})</span>
            <span style="color:#2ecc71">-₦${order.discount.toLocaleString()}</span>
          </div>` : ''}
        <div class="total-bar">
          <span>Order Total (${packs} pack${packs !== 1 ? 's' : ''})</span>
          <span class="tamt">₦${order.total.toLocaleString()}</span>
        </div>
      </div>

      <div class="dblock">
        <div class="dblk-title">Update Status</div>
        <div class="drow">
          <span class="dl">Current</span>
          <span class="dv">${statusBadge(order.status)}</span>
        </div>
      </div>

      <div class="mactions">
        <button class="ma-proc" onclick="updateStatus('${order.id}','Processing')">Mark Processing</button>
        <button class="ma-ship" onclick="updateStatus('${order.id}','Shipped')">Mark Shipped</button>
        <button class="ma-del"  onclick="updateStatus('${order.id}','Delivered')">Mark Delivered</button>
        <button class="ma-can"  onclick="updateStatus('${order.id}','Cancelled')">Cancel</button>
        <button class="ma-can"  style="background:rgba(231,76,60,0.15);color:#e74c3c;" onclick="deleteOrder('${order.id}')">🗑️ Delete</button>
        <button class="ma-cls"  onclick="closeModal()">Close</button>
      </div>

    </div>
  `;

  document.getElementById('mod')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('mod')?.classList.remove('open');
  document.body.style.overflow = '';
}
function modClick(e) {
  if (e.target === document.getElementById('mod')) closeModal();
}

 
function renderProductStats() {
  const orders    = allOrders.filter(o => o.status !== 'Cancelled');
  const packsSold = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const revenue   = orders.reduce((s, o) => s + o.total, 0);
  const avgPacks  = orders.length ? (packsSold / orders.length).toFixed(1) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('pp-sold', packsSold);
  set('pp-rev',  `₦${revenue.toLocaleString()}`);
  set('pp-avg',  `${avgPacks} packs`);
}

 
function exportCSV() {
  if (!allOrders.length) { toast('⚠️ No orders to export'); return; }
  const headers = ['Order ID','Customer Name','Phone','Email','Address','Packs','Total (₦)','Status','Date'];
  const rows    = allOrders.map(o => {
    const packs = o.items.reduce((s, i) => s + i.qty, 0);
    const esc   = v => `"${String(v).replace(/"/g,'""')}"`;
    return [
      esc(o.id), esc(o.customer.name), esc(o.customer.phone),
      esc(o.customer.email || ''), esc(o.customer.address),
      packs, o.total, esc(o.status), esc(o.date),
    ].join(',');
  });
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `jsego-orders-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`📥 Exported ${allOrders.length} orders`);
}

 
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const mod = document.getElementById('mod');
    if (mod?.classList.contains('open')) { closeModal(); return; }
    if (window.innerWidth <= 900) closeSidebar();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); exportCSV(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); refresh(); }
});

 
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadOrders();
  setInterval(loadOrders, 30000);   // poll server every 30s

  const ordersView  = document.getElementById('view-orders');
  const productView = document.getElementById('view-product');
  if (ordersView)  ordersView.style.display  = 'flex';
  if (productView) productView.style.display = 'none';
});