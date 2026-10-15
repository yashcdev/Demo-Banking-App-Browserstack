const express = require('express');
const PDFDocument = require('pdfkit');
const { sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { serverError } = require('../middleware/error');

const router = express.Router();

const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function drawReceipt(doc, { order, buyerName }) {
  const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items);
  const left = 50;
  const right = doc.page.width - 50;
  const placed = new Date(order.created_at).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(22).text('BrowserStack Bank', left, 50);
  doc.font('Helvetica').fontSize(11).fillColor('#64748B').text('Order receipt', left, 78);

  doc.moveTo(left, 105).lineTo(right, 105).strokeColor('#E2E8F0').stroke();

  doc.fillColor('#64748B').fontSize(10);
  doc.text('RECEIPT NO.', left, 120).text('DATE', 260, 120).text('BILLED TO', 420, 120);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11);
  doc.text(order.reference_id, left, 135, { width: 190 });
  doc.text(placed, 260, 135, { width: 150 });
  doc.text(buyerName, 420, 135, { width: right - 420 });

  let y = 190;
  doc.rect(left, y, right - left, 26).fill('#F1F5F9');
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10);
  doc.text('ITEM', left + 10, y + 8).text('QTY', 340, y + 8).text('PRICE', 400, y + 8).text('TOTAL', 480, y + 8);

  y += 36;
  doc.font('Helvetica').fontSize(11).fillColor('#0F172A');
  for (const item of items) {
    if (y > doc.page.height - 160) { doc.addPage(); y = 60; }
    doc.text(String(item.name), left + 10, y, { width: 270 });
    doc.text(String(item.qty), 340, y);
    doc.text(money(item.price), 400, y);
    doc.text(money(item.price * item.qty), 480, y);
    y += 26;
    doc.moveTo(left, y - 6).lineTo(right, y - 6).strokeColor('#F1F5F9').stroke();
  }

  y += 14;
  doc.font('Helvetica').fillColor('#64748B').fontSize(11);
  doc.text('Shipping', 400, y).text('Free', 480, y);
  y += 24;
  doc.font('Helvetica-Bold').fillColor('#0F172A').fontSize(14);
  doc.text('Total paid', 360, y).text(money(order.total), 460, y, { width: right - 460, align: 'right' });

  doc.font('Helvetica').fontSize(10).fillColor('#94A3B8');
  doc.text('Thank you for your purchase.', left, doc.page.height - 90, { width: right - left, align: 'center' });
}

// GET /shop/orders/:id/receipt — the order receipt as a PDF
router.get('/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const [order] = await sql`
      SELECT o.id, o.items, o.total, o.reference_id, o.created_at, u.full_name
      FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.id = ${req.params.id} AND o.user_id = ${req.user.userId}
    `;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.reference_id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Receipt ${order.reference_id}` } });
    doc.pipe(res);
    drawReceipt(doc, { order, buyerName: order.full_name });
    doc.end();
  } catch (err) {
    if (!res.headersSent) serverError(res, err, 'Receipt');
  }
});

module.exports = router;
