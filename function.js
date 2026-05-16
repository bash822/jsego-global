/* ─────────────────────────────────────────────
   J-SEGO GLOBAL — function.js
   Original site JS + Cart with real backend
───────────────────────────────────────────── */

const API = 'http://localhost:3000/api';   // ← change to your live URL when deployed

/* ══ SITE FUNCTIONS ══════════════════════════ */

// Preloader
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('hidden');
  }, 2000);
});

// Nav scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('back-top').classList.toggle('visible', window.scrollY > 400);
});

// Hamburger
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const observer  = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

// Subscribe
function handleSubscribe(btn) {
  btn.textContent = '✓ Subscribed!';
  btn.style.background = 'var(--gold)';
  setTimeout(() => { btn.textContent = 'Subscribe ✓'; btn.style.background = ''; }, 3000);
}

// Pills
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', function () {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
  });
});


/* ══ CART ════════════════════════════════════ */

const CART_KEY    = 'jsego_cart';
const DELIVERY_FEE = 0;
const FREE_THRESH  = 15000;
const COUPONS      = { 'JSEGO10': 10, 'WELCOME': 15, 'GARRI20': 20 };

let cart          = [];
let appliedCoupon = null;
let customerData  = null;

/* Storage */
function cartSave() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartLoad() {
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (_) { cart = []; }
}

/* Maths */
function cartSubtotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount()    { return cart.reduce((s, i) => s + i.qty, 0); }
function discountAmt()  { return appliedCoupon ? Math.round(cartSubtotal() * appliedCoupon.pct / 100) : 0; }
function deliveryAmt()  { return cartSubtotal() >= FREE_THRESH ? 0 : DELIVERY_FEE; }
function grandTotal()   { return cartSubtotal() - discountAmt() + deliveryAmt(); }
function fmtN(n)        { return '₦' + Number(n).toLocaleString('en-NG'); }

/* Badge */
function updateBadge() {
  document.querySelectorAll('.cart-badge').forEach(el => el.textContent = cartCount());
  const dc = document.getElementById('drawerCount');
  if (dc) dc.textContent = cartCount();
}

/* ADD TO CART */
function addToCart(id, name, price, image) {
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ id, name, price: +price, image: image || null, qty: 1 }); }
  cartSave();
  updateBadge();
  renderDrawerItems();
  renderDrawerFooter();
  showToast('✓ "' + name + '" added to cart');
}

/* REMOVE */
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  cartSave(); updateBadge(); renderDrawerItems(); renderDrawerFooter();
}

/* QTY */
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  cartSave(); updateBadge(); renderDrawerItems(); renderDrawerFooter();
}

/* CLEAR */
function clearCart() {
  if (!confirm('Remove all items?')) return;
  cart = []; appliedCoupon = null;
  cartSave(); updateBadge(); renderDrawerItems(); renderDrawerFooter();
}

/* Drawer open/close */
function openCartDrawer() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* Render drawer items */
function renderDrawerItems() {
  const list      = document.getElementById('cartItemsList');
  const empty     = document.getElementById('cartEmptyState');
  const couponRow = document.getElementById('cartCouponRow');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    if (couponRow) couponRow.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  if (couponRow) couponRow.style.display = 'flex';

  list.innerHTML = cart.map((item, i) => `
    <div class="cart-item" style="animation-delay:${i * 0.05}s">
      <div class="cart-item-thumb">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">` : '🌾'}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-unit">${fmtN(item.price)} each</div>
        <div class="cart-qty-control">
          <button class="cart-qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty('${item.id}',1)">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-total">${fmtN(item.price * item.qty)}</div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

/* Render drawer footer */
function renderDrawerFooter() {
  const footer = document.getElementById('cartDrawerFooter');
  if (!footer) return;
  if (cart.length === 0) { footer.style.display = 'none'; return; }
  footer.style.display = 'block';

  document.getElementById('drawerSubtotal').textContent = fmtN(cartSubtotal());
  document.getElementById('drawerDelivery').textContent =
    deliveryAmt() === 0 ? '🎉 Free!' : fmtN(deliveryAmt());
  document.getElementById('drawerTotal').textContent = fmtN(grandTotal());

  const discRow = document.getElementById('drawerDiscountRow');
  if (discountAmt() > 0) {
    discRow.style.display = 'flex';
    document.getElementById('drawerDiscount').textContent = '-' + fmtN(discountAmt());
  } else {
    discRow.style.display = 'none';
  }
}

/* Coupon */
function applyCoupon() {
  const input = document.getElementById('cartCouponInput');
  const msg   = document.getElementById('cartCouponMsg');
  const code  = input.value.trim().toUpperCase();
  if (!code) { setMsg(msg, 'Enter a coupon code.', 'err'); return; }
  if (COUPONS[code]) {
    appliedCoupon = { code, pct: COUPONS[code] };
    setMsg(msg, `✅ "${code}" applied — ${COUPONS[code]}% off!`, 'ok');
    input.value = '';
    renderDrawerFooter();
  } else {
    appliedCoupon = null;
    setMsg(msg, '❌ Invalid coupon code.', 'err');
  }
}

function setMsg(el, text, type) {
  el.textContent = text;
  el.className   = 'cart-coupon-msg ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'cart-coupon-msg'; }, 4000);
}

/* Checkout modal */
function openCheckoutModal() {
  if (cart.length === 0) return;
  closeCartDrawer();
  document.getElementById('checkoutModalOverlay').classList.add('open');
  showCheckoutStep('details');
}
function closeCheckoutModal() {
  document.getElementById('checkoutModalOverlay').classList.remove('open');
  openCartDrawer();
}
function closeCheckoutOverlay(e) {
  if (e.target === document.getElementById('checkoutModalOverlay')) closeCheckoutModal();
}
function showCheckoutStep(step) {
  ['details', 'confirm', 'success'].forEach(s => {
    const el = document.getElementById(
      'checkoutStep' + s.charAt(0).toUpperCase() + s.slice(1)
    );
    if (el) el.style.display = s === step ? 'block' : 'none';
  });
}

function goToConfirm() {
  const name    = document.getElementById('cdName');
  const phone   = document.getElementById('cdPhone');
  const address = document.getElementById('cdAddress');
  let ok        = true;
  [name, phone, address].forEach(el => {
    el.classList.remove('err');
    if (!el.value.trim()) { el.classList.add('err'); ok = false; }
  });
  if (!ok) {
    const panel = document.getElementById('checkoutModalPanel');
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = 'shakeModal 0.4s ease';
    return;
  }
  customerData = {
    name:    name.value.trim(),
    phone:   phone.value.trim(),
    email:   document.getElementById('cdEmail').value.trim(),
    address: address.value.trim(),
    note:    document.getElementById('cdNote').value.trim(),
  };
  renderConfirm();
  showCheckoutStep('confirm');
}

function backToDetails() { showCheckoutStep('details'); }

function renderConfirm() {
  document.getElementById('confirmCustomerBlock').innerHTML = `
    <div class="confirm-customer-card">
      <div><span>Name</span><strong>${customerData.name}</strong></div>
      <div><span>Phone</span><strong>${customerData.phone}</strong></div>
      ${customerData.email ? `<div><span>Email</span><strong>${customerData.email}</strong></div>` : ''}
      <div><span>Address</span><strong>${customerData.address}</strong></div>
      ${customerData.note ? `<div><span>Note</span><strong style="color:#c9a84c;font-style:italic">"${customerData.note}"</strong></div>` : ''}
    </div>`;
  document.getElementById('confirmItemsBlock').innerHTML = cart.map(i => `
    <div class="confirm-item-row">
      <span>${i.name} <span style="opacity:.55">×${i.qty}</span></span>
      <span>${fmtN(i.price * i.qty)}</span>
    </div>`).join('');
  document.getElementById('confirmGrandTotal').textContent = fmtN(grandTotal());
}

/* ══ PLACE ORDER — sends to backend API ══ */
async function placeOrder() {
  if (!customerData || !cart.length) return;

  const placeBtn = document.querySelector('.checkout-btn-place');
  if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Placing order…'; }

  try {
    const response = await fetch(`${API}/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerData,
        items:    cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        coupon:   appliedCoupon?.code || null,
        discount: discountAmt(),
        delivery: deliveryAmt(),
        total:    grandTotal(),
        note:     customerData.note,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Order failed');
    }

    /* Success */
    document.getElementById('successOrderId').textContent = data.orderId;
    cart = []; appliedCoupon = null; customerData = null;
    cartSave(); updateBadge(); renderDrawerItems(); renderDrawerFooter();
    showCheckoutStep('success');

  } catch (err) {
    console.error('Order error:', err);
    if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '🛒 Place Order'; }
    showToast('❌ Could not place order. Please try again.');
  }
}

function closeAfterSuccess() {
  document.getElementById('checkoutModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* Toast */
function showToast(msg) {
  let t = document.getElementById('cartToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'cartToast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ESC key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCartDrawer();
    document.getElementById('checkoutModalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* Init */
cartLoad();
updateBadge();