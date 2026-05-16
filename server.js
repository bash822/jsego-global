/**
 * J-SEGO GLOBAL — Backend Server
 * Node.js + Express · File-based storage · Email notifications
 *
 * Run:  node server.js
 * API:  http://localhost:3000/api
 */

require('dotenv').config();

const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const cors       = require('cors');
const nodemailer = require('nodemailer');

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'orders.json');

/* ════════════════════════════════════════
   MIDDLEWARE
════════════════════════════════════════ */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/*EMAIL TRANSPORTER */
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error('⚠️  Email not connected:', err.message);
    console.log('   Check your BREVO_USER and BREVO_PASS in .env');
  } else {
    console.log('✅  Email notifications ready →', process.env.NOTIFY_TO);
  }
});

/*  
   EMAIL — COMPANY NOTIFICATION
  */
function buildAdminEmail(order) {
  const packs    = order.items.reduce((s, i) => s + i.qty, 0);
  const itemRows = order.items.map(i => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#e8ede8;">${i.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#777;text-align:center;">×${i.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#c9a84c;text-align:right;font-weight:700;">₦${(i.price * i.qty).toLocaleString()}</td>
    </tr>`).join('');

  const discountRow = order.discount > 0 ? `
    <tr>
      <td colspan="2" style="padding:8px 16px;color:#2ecc71;font-size:13px;">Discount (${order.coupon})</td>
      <td style="padding:8px 16px;color:#2ecc71;text-align:right;font-weight:700;">-₦${order.discount.toLocaleString()}</td>
    </tr>` : '';

  return {
    from:    `"J-Sego Store" <${process.env.EMAIL_USER}>`,
    to:      process.env.NOTIFY_TO,
    subject: `🛒 New Order ${order.id} — ₦${order.total.toLocaleString()} from ${order.customer.name}`,
    html: `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#0b0f0b;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:linear-gradient(135deg,#1a3a1a,#111711);border:1px solid #1e2e1e;border-radius:16px;padding:28px 32px;margin-bottom:16px;">
    <div style="color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">J-Sego Global Limited</div>
    <h1 style="color:#e8ede8;font-size:22px;margin:8px 0 4px;">🛒 New Order Received!</h1>
    <p style="color:#687068;font-size:14px;margin:0;">A customer just placed an order on your store.</p>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;padding:20px 24px;margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="color:#687068;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:6px;">Order ID</td>
        <td style="text-align:right;color:#687068;font-size:11px;text-transform:uppercase;padding-bottom:6px;">Status</td>
      </tr>
      <tr>
        <td style="color:#c9a84c;font-size:22px;font-weight:800;font-family:monospace;">${order.id}</td>
        <td style="text-align:right;">
          <span style="background:rgba(243,156,18,0.15);color:#f39c12;padding:6px 14px;border-radius:50px;font-size:12px;font-weight:700;">⏳ Pending</span>
        </td>
      </tr>
      <tr><td colspan="2" style="color:#687068;font-size:12px;padding-top:6px;">${order.date}</td></tr>
    </table>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;padding:20px 24px;margin-bottom:16px;">
    <div style="color:#687068;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:12px;border-bottom:1px solid #1e2e1e;margin-bottom:14px;">👤 Customer Details</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="color:#687068;font-size:13px;padding:5px 0;width:70px;">Name</td>
        <td style="color:#e8ede8;font-size:13px;font-weight:600;padding:5px 0;">${order.customer.name}</td>
      </tr>
      <tr>
        <td style="color:#687068;font-size:13px;padding:5px 0;">Phone</td>
        <td style="padding:5px 0;"><a href="tel:${order.customer.phone}" style="color:#2ecc71;font-size:13px;font-weight:600;text-decoration:none;">${order.customer.phone}</a></td>
      </tr>
      ${order.customer.email ? `
      <tr>
        <td style="color:#687068;font-size:13px;padding:5px 0;">Email</td>
        <td style="padding:5px 0;"><a href="mailto:${order.customer.email}" style="color:#3498db;font-size:13px;text-decoration:none;">${order.customer.email}</a></td>
      </tr>` : ''}
      <tr>
        <td style="color:#687068;font-size:13px;padding:5px 0;vertical-align:top;">Address</td>
        <td style="color:#e8ede8;font-size:13px;padding:5px 0;">${order.customer.address}</td>
      </tr>
      ${order.note ? `
      <tr>
        <td style="color:#687068;font-size:13px;padding:5px 0;vertical-align:top;">Note</td>
        <td style="color:#c9a84c;font-size:13px;font-style:italic;padding:5px 0;">"${order.note}"</td>
      </tr>` : ''}
    </table>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <div style="padding:14px 24px;border-bottom:1px solid #1e2e1e;color:#687068;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">
      🌾 Items Ordered · ${packs} pack${packs !== 1 ? 's' : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#0d120d;">
          <th style="padding:10px 16px;text-align:left;color:#687068;font-size:11px;text-transform:uppercase;font-weight:600;">Product</th>
          <th style="padding:10px 16px;text-align:center;color:#687068;font-size:11px;text-transform:uppercase;font-weight:600;">Qty</th>
          <th style="padding:10px 16px;text-align:right;color:#687068;font-size:11px;text-transform:uppercase;font-weight:600;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${discountRow}
        <tr style="background:#0d120d;">
          <td colspan="2" style="padding:14px 16px;color:#e8ede8;font-weight:700;font-size:15px;">Order Total</td>
          <td style="padding:14px 16px;color:#c9a84c;font-weight:800;font-size:18px;text-align:right;">₦${order.total.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="text-align:center;margin-bottom:20px;">
    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin.html"
       style="display:inline-block;background:linear-gradient(135deg,#2a6e2a,#1d521d);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">
      Open Admin Dashboard →
    </a>
  </div>

  <div style="text-align:center;color:#3a4a3a;font-size:12px;padding:12px;">
    J-Sego Global Limited · Nigeria 🇳🇬 · Automated notification
  </div>

</div>
</body></html>`,
  };
}

/* ════════════════════════════════════════
   EMAIL — CUSTOMER CONFIRMATION
════════════════════════════════════════ */
function buildCustomerEmail(order) {
  const packs    = order.items.reduce((s, i) => s + i.qty, 0);
  const itemRows = order.items.map(i => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#e8ede8;">${i.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#777;text-align:center;">×${i.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2e1e;color:#c9a84c;text-align:right;font-weight:700;">₦${(i.price * i.qty).toLocaleString()}</td>
    </tr>`).join('');

  return {
    from:    `"J-Sego Global" <${process.env.EMAIL_USER}>`,
    to:      order.customer.email,
    subject: `✅ Order Confirmed — ${order.id} · J-Sego Global`,
    html: `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#0b0f0b;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:linear-gradient(135deg,#1a3a1a,#111711);border:1px solid #1e2e1e;border-radius:16px;padding:32px;margin-bottom:16px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🎉</div>
    <h1 style="color:#e8ede8;font-size:24px;margin:0 0 8px;">Order Confirmed!</h1>
    <p style="color:#687068;font-size:14px;margin:0;">
      Thank you, <strong style="color:#c9a84c;">${order.customer.name}</strong>! We've received your order.
    </p>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;padding:20px 24px;margin-bottom:16px;text-align:center;">
    <div style="color:#687068;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Your Order ID</div>
    <div style="color:#c9a84c;font-size:28px;font-weight:800;font-family:monospace;">${order.id}</div>
    <div style="color:#687068;font-size:12px;margin-top:6px;">${order.date}</div>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <div style="padding:14px 24px;border-bottom:1px solid #1e2e1e;color:#687068;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">
      🌾 Your Items · ${packs} pack${packs !== 1 ? 's' : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>
        ${itemRows}
        <tr style="background:#0d120d;">
          <td colspan="2" style="padding:14px 16px;color:#e8ede8;font-weight:700;">Total</td>
          <td style="padding:14px 16px;color:#c9a84c;font-weight:800;font-size:18px;text-align:right;">₦${order.total.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="background:rgba(46,204,113,0.07);border:1px solid rgba(46,204,113,0.15);border-radius:12px;padding:20px 24px;margin-bottom:16px;">
    <div style="color:#2ecc71;font-size:13px;font-weight:700;margin-bottom:10px;">📦 Delivery Details</div>
    <div style="color:#e8ede8;font-size:13px;margin-bottom:8px;">${order.customer.address}</div>
    <div style="color:#687068;font-size:13px;">
      💳 <strong>Payment on delivery</strong> — our team will call <strong style="color:#e8ede8;">${order.customer.phone}</strong> to confirm your order.
    </div>
  </div>

  <div style="background:#111711;border:1px solid #1e2e1e;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:16px;">
    <div style="color:#687068;font-size:13px;margin-bottom:10px;">Need help? Contact us:</div>
    <a href="mailto:${process.env.NOTIFY_TO}" style="color:#c9a84c;text-decoration:none;font-size:14px;font-weight:600;display:block;margin-bottom:6px;">📧 ${process.env.NOTIFY_TO}</a>
    <a href="tel:+2349166646350" style="color:#2ecc71;text-decoration:none;font-size:14px;font-weight:600;">📞 +234-9166646350</a>
  </div>

  <div style="text-align:center;color:#3a4a3a;font-size:12px;padding:12px;">
    J-Sego Global Limited · Nigeria 🇳🇬<br/>OG's Garri Soaking Mix 4-in-1 · Proudly Nigerian
  </div>

</div>
</body></html>`,
  };
}

/* ════════════════════════════════════════
   SEND EMAILS
════════════════════════════════════════ */
async function sendOrderEmails(order) {
  try {
    await transporter.sendMail(buildAdminEmail(order));
    console.log(`📧 Admin notification sent for ${order.id}`);

    if (order.customer.email) {
      await transporter.sendMail(buildCustomerEmail(order));
      console.log(`📧 Customer confirmation sent to ${order.customer.email}`);
    }
  } catch (err) {
    console.error('⚠️  Email send failed:', err.message);
  }
}

/* ════════════════════════════════════════
   FILE HELPERS
════════════════════════════════════════ */
function readOrders() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}
function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
}
function nextOrderId() {
  return 'ORD-' + String(readOrders().length + 1).padStart(4, '0');
}

/* ════════════════════════════════════════
   ROUTES
════════════════════════════════════════ */
app.get('/api/orders', (req, res) => {
  res.json({ success: true, orders: readOrders() });
});

app.get('/api/orders/:id', (req, res) => {
  const order = readOrders().find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, coupon, discount, delivery, total, note } = req.body;
  if (!customer?.name || !customer?.phone || !customer?.address) {
    return res.status(400).json({ success: false, message: 'Missing required customer fields' });
  }
  if (!items?.length) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const orders = readOrders();
  const order  = {
    id:       nextOrderId(),
    date:     new Date().toLocaleString('en-NG', {
                day:'2-digit', month:'2-digit', year:'numeric',
                hour:'2-digit', minute:'2-digit', second:'2-digit',
              }),
    customer: {
      name:    customer.name,
      phone:   customer.phone,
      email:   customer.email   || '',
      address: customer.address,
    },
    items,
    coupon:   coupon   || null,
    discount: discount || 0,
    delivery: delivery || 0,
    total:    total    || items.reduce((s, i) => s + i.price * i.qty, 0),
    note:     note     || '',
    status:   'Pending',
  };

  orders.unshift(order);
  writeOrders(orders);
  console.log(`[NEW ORDER] ${order.id} — ${order.customer.name} — ₦${order.total.toLocaleString()}`);

  sendOrderEmails(order);   // non-blocking

  res.status(201).json({ success: true, orderId: order.id, order });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['Pending','Processing','Shipped','Delivered','Cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  writeOrders(orders);
  res.json({ success: true, order });
});

app.delete('/api/orders/:id', (req, res) => {
  let orders   = readOrders();
  const before = orders.length;
  orders = orders.filter(o => o.id !== req.params.id);
  if (orders.length === before) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  writeOrders(orders);
  res.json({ success: true, message: 'Order deleted' });
});

app.delete('/api/orders', (req, res) => {
  writeOrders([]);
  res.json({ success: true, message: 'All orders cleared' });
});

app.get('/api/stats', (req, res) => {
  const orders    = readOrders();
  const active    = orders.filter(o => o.status !== 'Cancelled');
  const revenue   = active.reduce((s, o) => s + o.total, 0);
  const pending   = orders.filter(o => o.status === 'Pending').length;
  const delivered = orders.filter(o => o.status === 'Delivered').length;
  const packsSold = active.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  res.json({ success: true, stats: { total: orders.length, revenue, pending, delivered, packsSold } });
});

/* ════════════════════════════════════════
   START
════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`\n🌿 J-Sego Server → http://localhost:${PORT}`);
  console.log(`   Store  → http://localhost:${PORT}/index.html`);
  console.log(`   Admin  → http://localhost:${PORT}/admin.html\n`);
});