import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

import { formatLkr } from '../utils/currency';
import { calculateEarnedPoints } from '../services/loyalty.service';

const LOGO_MODULE = require('../../assets/images/zoomcart-logo.png');

export type SessionReceiptLine = {
  name: string;
  price: number;
  quantity: number;
};

export type SessionReceiptPdfInput = {
  sessionId: string;
  createdAt: string;
  endedAt: string;
  customerName: string;
  items: SessionReceiptLine[];
  totalAmount: number;
  participantCount: number;
  /** Current profile ZOOMPOINTS balance (optional). */
  profileZoomPoints?: number;
};

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

async function loadLogoDataUri(): Promise<string | undefined> {
  try {
    const asset = Asset.fromModule(LOGO_MODULE);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return undefined;
    const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return undefined;
  }
}

function buildReceiptHtml(input: SessionReceiptPdfInput, logoDataUri: string | undefined): string {
  const earned = calculateEarnedPoints(input.totalAmount);
  const rows = input.items
    .map((line, idx) => {
      const lineTotal = line.price * line.quantity;
      const zebra = idx % 2 === 0 ? 'row-even' : 'row-odd';
      return `<tr class="${zebra}">
        <td class="td-name">${escapeHtml(line.name)}</td>
        <td class="td-num">${line.quantity}</td>
        <td class="td-num">${formatLkr(line.price)}</td>
        <td class="td-total">${formatLkr(lineTotal)}</td>
      </tr>`;
    })
    .join('');

  const logoBlock = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="ZoomCart" />`
    : `<div class="logo-fallback">🛒</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZoomCart — Session receipt</title>
  <style>
    @page { margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      color: #1c1c1e;
      background: #f2f2f7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 640px;
      margin: 0 auto;
      padding: 0 0 32px;
    }
    .hero {
      background: linear-gradient(140deg, #007aff 0%, #5ac8fa 45%, #34c759 100%);
      border-radius: 0 0 24px 24px;
      padding: 28px 24px 32px;
      color: #fff;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0, 122, 255, 0.25);
    }
    .logo {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      object-fit: contain;
      display: block;
      margin: 0 auto 12px;
      background: rgba(255,255,255,0.2);
      padding: 4px;
    }
    .logo-fallback {
      width: 72px;
      height: 72px;
      line-height: 72px;
      font-size: 36px;
      border-radius: 18px;
      background: rgba(255,255,255,0.2);
      margin: 0 auto 12px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.2em;
      margin: 0 0 6px;
    }
    .tagline {
      font-size: 11px;
      letter-spacing: 0.15em;
      opacity: 0.92;
      text-transform: uppercase;
      margin: 0;
    }
    .sheet {
      margin: -20px 16px 0;
      background: #ffffff;
      border-radius: 16px;
      padding: 22px 20px 18px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.06);
    }
    .receipt-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #8e8e93;
      text-transform: uppercase;
      margin: 0 0 16px;
      text-align: center;
    }
    .meta-grid {
      display: table;
      width: 100%;
      font-size: 12px;
      margin-bottom: 18px;
    }
    .meta-row {
      display: table-row;
    }
    .meta-label, .meta-val {
      display: table-cell;
      padding: 6px 0;
      border-bottom: 1px solid #f2f2f7;
    }
    .meta-label { color: #8e8e93; width: 38%; }
    .meta-val { font-weight: 600; color: #1c1c1e; text-align: right; word-break: break-all; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
      border-radius: 12px;
      overflow: hidden;
    }
    .items th {
      text-align: left;
      padding: 10px 8px;
      background: #f2f2f7;
      color: #636366;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .items th:nth-child(2), .items th:nth-child(3), .items th:nth-child(4) { text-align: right; }
    .items td {
      padding: 12px 8px;
      border-bottom: 1px solid #f2f2f7;
      vertical-align: top;
    }
    .td-name { font-weight: 600; color: #1c1c1e; }
    .td-num { text-align: right; color: #636366; }
    .td-total { text-align: right; font-weight: 700; color: #007aff; }
    .row-even { background: #fafafa; }
    .row-odd { background: #fff; }
    .grand {
      margin-top: 16px;
      padding: 18px 16px;
      background: #ffffff;
      border: 2px solid #1c1c1e;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .grand-label {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #1c1c1e;
    }
    .grand-val {
      font-size: 22px;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.02em;
    }
    .points-card {
      margin: 16px 16px 0;
      padding: 18px 20px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid rgba(255, 214, 10, 0.45);
      box-shadow: 0 4px 16px rgba(255, 214, 10, 0.12);
    }
    .points-title {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #b8860b;
      margin: 0 0 8px;
      font-weight: 700;
    }
    .points-big {
      font-size: 26px;
      font-weight: 800;
      color: #1c1c1e;
      margin: 0 0 4px;
    }
    .points-sub {
      font-size: 11px;
      color: #8e8e93;
      margin: 0;
      line-height: 1.5;
    }
    .points-balance {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e5e5ea;
      font-size: 13px;
      color: #636366;
    }
    .footer {
      text-align: center;
      padding: 28px 24px 8px;
      font-size: 11px;
      color: #aeaeb2;
      line-height: 1.6;
    }
    .heart { color: #ff3b30; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      ${logoBlock}
      <h1 class="brand">ZOOMCART</h1>
      <p class="tagline">Smart way to shop</p>
    </div>
    <div class="sheet">
      <p class="receipt-title">Shared session receipt</p>
      <div class="meta-grid">
        <div class="meta-row">
          <span class="meta-label">Customer</span>
          <span class="meta-val">${escapeHtml(input.customerName)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Session ID</span>
          <span class="meta-val">${escapeHtml(input.sessionId)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Started</span>
          <span class="meta-val">${escapeHtml(formatShortDate(input.createdAt))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Ended</span>
          <span class="meta-val">${escapeHtml(formatShortDate(input.endedAt))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Participants</span>
          <span class="meta-val">${input.participantCount}</span>
        </div>
      </div>
      <table class="items">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="4" style="text-align:center;color:#8e8e93;padding:20px;">No line items</td></tr>`}
        </tbody>
      </table>
      <div class="grand">
        <span class="grand-label">Session total</span>
        <span class="grand-val">${formatLkr(input.totalAmount)}</span>
      </div>
    </div>
    <div class="points-card">
      <p class="points-title">ZOOMPOINTS</p>
      <p class="points-big">${earned.toLocaleString()} pts</p>
      <p class="points-sub">
        Eligible reward on this session total (1 pt per LKR 100 spent — credited after successful checkout where applicable).
      </p>
      ${
        typeof input.profileZoomPoints === 'number'
          ? `<p class="points-balance"><strong>Profile balance:</strong> ${Math.round(
              input.profileZoomPoints,
            ).toLocaleString()} ZOOMPOINTS</p>`
          : ''
      }
    </div>
    <div class="footer">
      Thank you for shopping with ZoomCart.<br />
      <span class="heart">♥</span> Built for smarter grocery runs.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders an HTML receipt to PDF and opens the system share sheet (save to Files, Drive, etc.).
 */
export async function shareSessionReceiptPdf(input: SessionReceiptPdfInput): Promise<void> {
  const [logoDataUri] = await Promise.all([loadLogoDataUri()]);
  const html = buildReceiptHtml(input, logoDataUri);
  const { uri } = await Print.printToFileAsync({ html });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save ZoomCart receipt',
  });
}
