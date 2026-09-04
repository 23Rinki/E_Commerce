'use client';

import { useState, useEffect } from 'react';
import { invoiceTemplatesApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { CheckCircle2, Eye, Download, X, Loader2 } from 'lucide-react';

// ── Pre-built templates ──────────────────────────────────────────────────────

const TEMPLATES = [
  {
    key:         'Classic',
    description: 'Royal blue header with gold accents. Professional and elegant. GST-compliant with CGST/SGST breakdown.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Georgia',serif;background:#f0f4ff;color:#1a1a2e;min-height:100vh;padding:40px}
.page{background:#fff;max-width:800px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(26,26,46,0.15)}
.header{background:linear-gradient(135deg,#1a1a6e 0%,#2d2d9f 50%,#1a1a6e 100%);padding:36px 50px;display:flex;justify-content:space-between;align-items:flex-start}
.store-name{font-size:26px;font-weight:bold;color:#ffd700;letter-spacing:2px;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.store-address{font-size:12px;color:#b0b8ff;margin-top:4px;line-height:1.6}
.store-gstin{display:inline-block;margin-top:8px;font-size:10px;font-weight:bold;color:#ffd700;border:1px solid rgba(255,215,0,0.5);padding:2px 8px;letter-spacing:1px}
.invoice-badge{background:#ffd700;color:#1a1a6e;font-size:18px;font-weight:900;padding:8px 18px;border-radius:8px;letter-spacing:2px}
.inv-meta{text-align:right;margin-top:8px;font-size:12px;color:#b0b8ff;line-height:1.8}
.body{padding:32px 50px}
.accent-bar{height:4px;background:linear-gradient(90deg,#ffd700,#ff8c00,#ffd700);margin-bottom:22px;border-radius:2px}
.place-row{display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:18px;padding:10px 14px;background:#f0f4ff;border-radius:8px}
.place-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;font-weight:bold;color:#6666aa;margin-bottom:2px}
.bill-section{display:flex;justify-content:space-between;margin-bottom:24px;gap:14px}
.bill-box{background:#f0f4ff;border-left:4px solid #1a1a6e;padding:12px 16px;border-radius:0 8px 8px 0;flex:1}
.bill-box:last-child{border-left-color:#ffd700}
.bill-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#6666aa;margin-bottom:6px;font-weight:bold}
.bill-value{font-size:12px;color:#1a1a2e;line-height:1.6}
.bill-gstin{font-size:10px;color:#6666aa;margin-top:4px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin:8px 0}
thead tr{background:linear-gradient(135deg,#1a1a6e,#2d2d9f)}
th{padding:11px 12px;color:#ffd700;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left}
tbody tr:nth-child(even){background:#f8f9ff}
td{padding:10px 12px;font-size:12px;color:#333;border-bottom:1px solid #e8ecff}
.total-section{background:linear-gradient(135deg,#1a1a6e,#2d2d9f);border-radius:12px;padding:18px 22px;margin-top:14px}
.total-row{display:flex;justify-content:space-between;font-size:12px;color:#b0b8ff;margin-bottom:6px}
.grand-total{display:flex;justify-content:space-between;font-size:19px;font-weight:900;color:#ffd700;border-top:1px solid rgba(255,215,0,0.3);padding-top:12px;margin-top:8px}
.footer{background:#f0f4ff;text-align:center;padding:20px;font-size:11px;color:#6666aa;border-top:3px solid #ffd700}
.footer strong{color:#1a1a6e}
</style>{{StyleOverride}}</head><body>
<div class="page">
  <div class="header">
    <div>
      {{Logo}}<div class="store-name">{{StoreName}}</div>
      <div class="store-address">{{StoreAddress}}</div>
      <div class="store-gstin">GSTIN: {{VendorGSTIN}}</div>
    </div>
    <div>
      <div class="invoice-badge">TAX INVOICE</div>
      <div class="inv-meta">Inv #{{InvoiceNumber}}<br/>Order Ref: {{OrderNumber}}<br/>{{OrderDate}}</div>
    </div>
  </div>
  <div class="body">
    <div class="accent-bar"></div>
    <div class="place-row">
      <div><div class="place-label">Place of Supply</div><strong>{{PlaceOfSupply}}</strong></div>
    </div>
    <div class="bill-section">
      <div class="bill-box">
        <div class="bill-label">Bill To</div>
        <div class="bill-value">{{CustomerName}}<br/>{{CustomerPhone}}<br/>{{ShippingAddress}}</div>
        <div class="bill-gstin">GSTIN: {{CustomerGSTIN}}</div>
      </div>
      <div class="bill-box">
        <div class="bill-label">Invoice Info</div>
        <div class="bill-value">Invoice #{{InvoiceNumber}}<br/>Date: {{OrderDate}}</div>
      </div>
    </div>
    {{ExtraFields}}<table>
      <thead><tr><th>Item Description</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Taxable</th><th>Total</th></tr></thead>
      <tbody>{{Items}}</tbody>
    </table>
    <div class="total-section">
      <div class="total-row"><span>Taxable Amount</span><span>{{TaxableAmount}}</span></div>
      <div class="total-row"><span>CGST @ 9%</span><span>{{CGST}}</span></div>
      <div class="total-row"><span>SGST @ 9%</span><span>{{SGST}}</span></div>
      <div class="total-row"><span>Shipping</span><span>{{Shipping}}</span></div>
      <div class="grand-total"><span>Grand Total</span><span>{{TotalAmount}}</span></div>
    </div>
  </div>
  <div class="footer">Tax Invoice &middot; <strong>{{StoreName}}</strong> &middot; GSTIN: {{VendorGSTIN}} &middot; Computer-generated document.</div>
</div>
</body></html>`,
  },
  {
    key:         'Modern',
    description: 'Vibrant purple & coral gradient. Bold and contemporary. GST-compliant with full tax breakdown.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:40px}
.page{max-width:800px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(102,126,234,0.4)}
.header{background:linear-gradient(135deg,#667eea 0%,#f64f59 100%);padding:40px 50px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-50%;right:-10%;width:300px;height:300px;background:rgba(255,255,255,0.08);border-radius:50%}
.header::after{content:'';position:absolute;bottom:-60%;left:5%;width:250px;height:250px;background:rgba(255,255,255,0.06);border-radius:50%}
.store-name{font-size:26px;font-weight:900;color:#fff;letter-spacing:1px;position:relative}
.store-detail{font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;position:relative;line-height:1.6}
.store-gstin{display:inline-block;margin-top:8px;font-size:10px;font-weight:bold;color:rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.4);padding:2px 8px;border-radius:4px;position:relative;letter-spacing:1px}
.inv-badge{position:absolute;top:38px;right:50px;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,0.4);border-radius:12px;padding:12px 18px;text-align:center}
.inv-title{font-size:15px;font-weight:900;color:#fff;letter-spacing:2px}
.inv-num{font-size:11px;color:rgba(255,255,255,0.85);margin-top:4px;line-height:1.7}
.body{padding:32px 50px}
.place-strip{background:linear-gradient(135deg,#f8f9ff,#eef0ff);border-radius:10px;padding:10px 16px;margin-bottom:18px;font-size:12px}
.place-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px;font-weight:bold}
.place-value{font-weight:700;color:#333}
.stats{display:flex;gap:10px;margin-bottom:22px}
.stat{flex:1;background:linear-gradient(135deg,#f8f9ff,#eef0ff);border-radius:12px;padding:12px;border-top:3px solid}
.stat:nth-child(1){border-color:#667eea}
.stat:nth-child(2){border-color:#f64f59}
.stat:nth-child(3){border-color:#43e97b}
.stat-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:3px}
.stat-value{font-size:12px;font-weight:700;color:#333;line-height:1.5}
.stat-gstin{font-size:10px;color:#888;margin-top:3px}
table{width:100%;border-collapse:collapse}
thead tr{background:linear-gradient(135deg,#667eea,#764ba2)}
th{padding:11px 12px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left}
tbody tr:nth-child(even){background:#fafbff}
td{padding:11px 12px;font-size:12px;color:#444;border-bottom:1px solid #eee}
.totals{margin-top:14px;background:linear-gradient(135deg,#f8f9ff,#eef0ff);border-radius:12px;padding:14px 18px}
.total-row{display:flex;justify-content:space-between;font-size:12px;color:#555;padding:5px 0;border-bottom:1px solid #e0e4ff}
.total-row:last-of-type{border-bottom:none}
.total-grand{display:flex;justify-content:space-between;margin-top:12px;padding:14px 18px;background:linear-gradient(135deg,#667eea,#f64f59);border-radius:10px}
.grand-label{font-size:15px;color:rgba(255,255,255,0.9);font-weight:700}
.grand-value{font-size:22px;font-weight:900;color:#fff}
.footer{background:linear-gradient(135deg,#f8f9ff,#eef0ff);padding:18px 50px;text-align:center;font-size:11px;color:#888}
.footer strong{background:linear-gradient(135deg,#667eea,#f64f59);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900}
</style>{{StyleOverride}}</head><body>
<div class="page">
  <div class="header">
    {{Logo}}<div class="store-name">{{StoreName}}</div>
    <div class="store-detail">{{StoreAddress}}</div>
    <div class="store-gstin">GSTIN: {{VendorGSTIN}}</div>
    <div class="inv-badge">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num">Inv #{{InvoiceNumber}}<br/>Order: {{OrderNumber}}<br/>{{OrderDate}}</div>
    </div>
  </div>
  <div class="body">
    <div class="place-strip">
      <div class="place-label">Place of Supply</div><div class="place-value">{{PlaceOfSupply}}</div>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Bill To</div>
        <div class="stat-value">{{CustomerName}}</div>
        <div class="stat-gstin">{{CustomerPhone}}</div>
        <div class="stat-gstin">GSTIN: {{CustomerGSTIN}}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Ship To</div>
        <div class="stat-value" style="font-size:11px">{{ShippingAddress}}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Invoice Date</div>
        <div class="stat-value">{{OrderDate}}</div>
      </div>
    </div>
    {{ExtraFields}}<table>
      <thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Taxable</th><th>Total</th></tr></thead>
      <tbody>{{Items}}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Taxable Amount</span><span>{{TaxableAmount}}</span></div>
      <div class="total-row"><span>CGST @ 9%</span><span>{{CGST}}</span></div>
      <div class="total-row"><span>SGST @ 9%</span><span>{{SGST}}</span></div>
      <div class="total-row"><span>Shipping</span><span>{{Shipping}}</span></div>
    </div>
    <div class="total-grand"><span class="grand-label">Grand Total</span><span class="grand-value">{{TotalAmount}}</span></div>
  </div>
  <div class="footer">Tax Invoice &middot; <strong>{{StoreName}}</strong> &middot; GSTIN: {{VendorGSTIN}} &middot; Computer-generated document.</div>
</div>
</body></html>`,
  },
  {
    key:         'Minimal',
    description: 'Fresh teal & green tones with clean lines. GST-compliant with CGST/SGST breakdown.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;background:#e8f5f0;min-height:100vh;padding:40px}
.page{max-width:800px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,150,100,0.15)}
.header{background:linear-gradient(135deg,#0f9b58 0%,#00c9a7 100%);padding:38px 50px;display:flex;justify-content:space-between;align-items:flex-start}
.store-name{font-size:24px;font-weight:800;color:#fff;letter-spacing:1px}
.store-detail{font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;line-height:1.6}
.store-gstin{display:inline-block;margin-top:8px;font-size:10px;font-weight:bold;color:rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.4);padding:2px 8px;letter-spacing:1px;border-radius:3px}
.inv-right{text-align:right}
.inv-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7)}
.inv-title{font-size:20px;font-weight:900;color:#fff;margin-top:2px;letter-spacing:1px}
.inv-num{font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;line-height:1.8}
.stripe{height:6px;background:linear-gradient(90deg,#0f9b58,#00c9a7,#43e97b,#00c9a7,#0f9b58)}
.body{padding:32px 50px}
.place-row{display:flex;justify-content:space-between;background:linear-gradient(135deg,#e8f5f0,#d4f0e8);border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:12px}
.place-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0f9b58;font-weight:800;margin-bottom:2px}
.place-value{font-weight:700;color:#1a3d2e}
.bill-row{display:flex;gap:14px;margin-bottom:24px}
.bill-card{flex:1;background:linear-gradient(135deg,#e8f5f0,#d4f0e8);border-radius:12px;padding:14px 16px;border-left:4px solid #0f9b58}
.bill-card:nth-child(2){border-left-color:#00c9a7}
.bc-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0f9b58;font-weight:800;margin-bottom:6px}
.bc-value{font-size:12px;color:#1a3d2e;line-height:1.6}
.bc-gstin{font-size:10px;color:#4a7a5e;margin-top:4px;font-weight:bold}
table{width:100%;border-collapse:collapse}
thead tr{background:linear-gradient(135deg,#0f9b58,#00c9a7)}
th{padding:11px 12px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left}
tbody tr:nth-child(even){background:#f0faf6}
td{padding:10px 12px;font-size:12px;color:#2d5a42;border-bottom:1px solid #e0f0e8}
.totals{margin-top:16px;background:linear-gradient(135deg,#e8f5f0,#d4f0e8);border-radius:14px;padding:16px 20px}
.total-line{display:flex;justify-content:space-between;font-size:12px;color:#4a7a5e;padding:5px 0;border-bottom:1px solid rgba(15,155,88,0.1)}
.total-line:last-of-type{border-bottom:none}
.grand{display:flex;justify-content:space-between;font-size:19px;font-weight:900;color:#0f9b58;border-top:2px solid #0f9b58;margin-top:10px;padding-top:12px}
.footer{background:linear-gradient(135deg,#0f9b58,#00c9a7);padding:18px 50px;text-align:center;font-size:11px;color:rgba(255,255,255,0.9)}
.footer strong{color:#fff;font-weight:900}
</style>{{StyleOverride}}</head><body>
<div class="page">
  <div class="header">
    <div>
      {{Logo}}<div class="store-name">{{StoreName}}</div>
      <div class="store-detail">{{StoreAddress}}</div>
      <div class="store-gstin">GSTIN: {{VendorGSTIN}}</div>
    </div>
    <div class="inv-right">
      <div class="inv-label">Document Type</div>
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num">Inv #{{InvoiceNumber}}<br/>Order: {{OrderNumber}}<br/>{{OrderDate}}</div>
    </div>
  </div>
  <div class="stripe"></div>
  <div class="body">
    <div class="place-row">
      <div><div class="place-label">Place of Supply</div><div class="place-value">{{PlaceOfSupply}}</div></div>
    </div>
    <div class="bill-row">
      <div class="bill-card">
        <div class="bc-label">Bill To</div>
        <div class="bc-value">{{CustomerName}}<br/>{{CustomerPhone}}</div>
        <div class="bc-gstin">GSTIN: {{CustomerGSTIN}}</div>
      </div>
      <div class="bill-card">
        <div class="bc-label">Ship To</div>
        <div class="bc-value" style="font-size:11px">{{ShippingAddress}}</div>
      </div>
    </div>
    {{ExtraFields}}<table>
      <thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Taxable</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>{{Items}}</tbody>
    </table>
    <div class="totals">
      <div class="total-line"><span>Taxable Amount</span><span>{{TaxableAmount}}</span></div>
      <div class="total-line"><span>CGST @ 9%</span><span>{{CGST}}</span></div>
      <div class="total-line"><span>SGST @ 9%</span><span>{{SGST}}</span></div>
      <div class="total-line"><span>Shipping</span><span>{{Shipping}}</span></div>
      <div class="grand"><span>Grand Total</span><span>{{TotalAmount}}</span></div>
    </div>
  </div>
  <div class="footer">Tax Invoice &middot; <strong>{{StoreName}}</strong> &middot; GSTIN: {{VendorGSTIN}} &middot; Computer-generated document.</div>
</div>
</body></html>`,
  },
  {
    key:         'Corporate',
    description: 'Clean black & white. Formal and print-ready. Best for official GST records, accounting, and packing slips.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;background:#f0f0f0;color:#111;min-height:100vh;padding:40px}
.page{background:#fff;max-width:800px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,0.12)}
.header{background:#111;padding:30px 40px;display:flex;justify-content:space-between;align-items:flex-start}
.store-name{font-size:22px;font-weight:900;color:#fff;letter-spacing:1px}
.store-detail{font-size:12px;color:#aaa;margin-top:4px;line-height:1.6}
.store-gstin{display:inline-block;margin-top:8px;font-size:10px;font-weight:bold;color:#888;border:1px solid #555;padding:2px 8px;letter-spacing:1px;text-transform:uppercase}
.inv-right{text-align:right}
.inv-title{font-size:24px;font-weight:900;color:#fff;letter-spacing:2px}
.inv-num{font-size:12px;color:#bbb;margin-top:6px;line-height:1.9}
.accent{height:4px;background:#333}
.body{padding:26px 40px}
.meta-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #ddd}
.meta-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:bold;margin-bottom:3px}
.meta-value{font-size:13px;color:#111;font-weight:600}
.bill-section{display:flex;gap:0;margin-bottom:22px;border:1px solid #ddd}
.bill-box{flex:1;padding:13px 16px;border-right:1px solid #ddd}
.bill-box:last-child{border-right:none}
.bill-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:bold;margin-bottom:6px}
.bill-value{font-size:12px;color:#111;line-height:1.6}
.bill-gstin{font-size:10px;color:#888;margin-top:4px;font-weight:bold}
table{width:100%;border-collapse:collapse}
thead tr{background:#f0f0f0;border-top:2px solid #111;border-bottom:2px solid #111}
th{padding:10px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#333;font-weight:bold;text-align:left}
tbody tr{border-bottom:1px solid #eee}
tbody tr:last-child{border-bottom:2px solid #bbb}
td{padding:10px 12px;font-size:12px;color:#333}
.totals{margin-top:0}
.total-row{display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee}
.total-row.grand{background:#111;color:#fff;font-size:16px;font-weight:900;padding:14px 12px;border-bottom:none}
.footer{background:#f8f8f8;text-align:center;padding:16px;font-size:11px;color:#888;border-top:2px solid #111}
</style>{{StyleOverride}}</head><body>
<div class="page">
  <div class="header">
    <div>
      {{Logo}}<div class="store-name">{{StoreName}}</div>
      <div class="store-detail">{{StoreAddress}}</div>
      <div class="store-gstin">GSTIN: {{VendorGSTIN}}</div>
    </div>
    <div class="inv-right">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num">
        Inv No: <strong>#{{InvoiceNumber}}</strong><br/>
        Order Ref: {{OrderNumber}}<br/>
        Date: {{OrderDate}}
      </div>
    </div>
  </div>
  <div class="accent"></div>
  <div class="body">
    <div class="meta-row">
      <div><div class="meta-label">Place of Supply</div><div class="meta-value">{{PlaceOfSupply}}</div></div>
      <div style="text-align:right"><div class="meta-label">Payment Method</div><div class="meta-value">{{PaymentMethod}}</div></div>
    </div>
    <div class="bill-section">
      <div class="bill-box">
        <div class="bill-label">Bill To</div>
        <div class="bill-value">{{CustomerName}}<br/>{{CustomerPhone}}</div>
        <div class="bill-gstin">GSTIN: {{CustomerGSTIN}}</div>
      </div>
      <div class="bill-box">
        <div class="bill-label">Ship To</div>
        <div class="bill-value">{{ShippingAddress}}</div>
      </div>
    </div>
    {{ExtraFields}}<table>
      <thead><tr><th>#</th><th>Item Description</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Taxable Amt</th><th>Total</th></tr></thead>
      <tbody>{{Items}}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Taxable Amount</span><span>{{TaxableAmount}}</span></div>
      <div class="total-row"><span>CGST @ 9%</span><span>{{CGST}}</span></div>
      <div class="total-row"><span>SGST @ 9%</span><span>{{SGST}}</span></div>
      <div class="total-row"><span>Shipping</span><span>{{Shipping}}</span></div>
      <div class="total-row grand"><span>Grand Total</span><span>{{TotalAmount}}</span></div>
    </div>
  </div>
  <div class="footer">This is a system-generated tax invoice. No physical signature required. &nbsp;&middot;&nbsp; {{StoreName}} &nbsp;&middot;&nbsp; GSTIN: {{VendorGSTIN}}</div>
</div>
</body></html>`,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

interface SavedTemplate {
  id: number;
  name: string;
  isDefault: boolean;
}

export default function InvoicesPage() {
  const { designation } = useVendorStore();
  useVendorAccess('invoices', designation);

  const [saved, setSaved]         = useState<SavedTemplate[]>([]);
  const [busy, setBusy]           = useState<string | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    if (ok) setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    try {
      const r = await invoiceTemplatesApi.getAll();
      setSaved(r.data?.data ?? []);
    } catch { }
  };

  useEffect(() => { load(); }, []);

  const savedMap = Object.fromEntries(saved.map(s => [s.name, s]));

  const useTemplate = async (t: typeof TEMPLATES[0]) => {
    setBusy(t.key);
    try {
      const existing = savedMap[t.key];
      if (existing) {
        await invoiceTemplatesApi.setDefault(existing.id);
      } else {
        await invoiceTemplatesApi.create({ name: t.key, htmlTemplate: t.html, isDefault: true, isActive: true });
      }
      await load();
      showToast(`"${t.key}" template is now your default`);
    } catch {
      showToast('Failed to apply template', false);
    } finally {
      setBusy(null);
    }
  };

  const defaultName = saved.find(s => s.isDefault)?.name;

  const handleDownload = (html: string) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          <span>{toast.msg}</span>
          {!toast.ok && (
            <button onClick={() => setToast(null)} className="ml-1 hover:opacity-75 transition-opacity">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Full-screen preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl" style={{ height: '85vh' }}>
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={15} className="text-gray-600" />
            </button>
            <iframe srcDoc={preview} className="w-full h-full border-0" sandbox="allow-same-origin" title="Full Preview" />
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-xl font-black text-slate-900">Invoice Templates</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Choose a design for your tax invoices. All templates include GSTIN, CGST/SGST breakdown, HSN codes, and Place of Supply — fully GST-compliant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {TEMPLATES.map((t) => {
          const isDefault = defaultName === t.key;
          const isLoading = busy === t.key;

          return (
            <div key={t.key}
              className={`bg-white rounded-2xl border-2 overflow-hidden transition-all shadow-sm hover:shadow-lg
                ${isDefault ? 'border-orange-400 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
            >
              {/* Mini preview */}
              <div className="relative bg-gray-50 overflow-hidden" style={{ height: '300px' }}>
                <iframe
                  srcDoc={t.html}
                  sandbox="allow-same-origin"
                  title={`${t.key} preview`}
                  style={{
                    width: '900px',
                    height: '900px',
                    transform: 'scale(0.44)',
                    transformOrigin: 'top left',
                    border: 'none',
                    pointerEvents: 'none',
                  }}
                />
                {/* Full preview + download buttons */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(t.html)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 px-3 py-2 rounded-lg shadow transition-colors"
                  >
                    <Download size={12} /> Download
                  </button>
                  <button
                    onClick={() => setPreview(t.html)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 px-3 py-2 rounded-lg shadow transition-colors"
                  >
                    <Eye size={12} /> Full Preview
                  </button>
                </div>
                {isDefault && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full shadow">
                    <CheckCircle2 size={11} /> Current Default
                  </div>
                )}
              </div>

              {/* Info + action */}
              <div className="p-5">
                <h3 className="text-sm font-bold text-slate-900">{t.key}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t.description}</p>

                <button
                  onClick={() => useTemplate(t)}
                  disabled={isDefault || isLoading}
                  className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${isDefault
                      ? 'bg-orange-50 text-orange-500 cursor-default border border-orange-200'
                      : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98]'}`}
                >
                  {isLoading
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> Applying…</span>
                    : isDefault ? '✓ Active Template' : 'Use This Template'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
