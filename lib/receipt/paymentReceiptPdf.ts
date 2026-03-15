import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

import { formatLkr } from '../utils/currency';
import { calculateEarnedPoints } from '../services/loyalty.service';

const LOGO_MODULE = require('../../assets/images/zoomcart-logo.png');

export type PaymentReceiptLine = {
  name: string;
  price: number;
  quantity: number;
};

export type PaymentReceiptPdfInput = {
  paymentId: string;
  orderId: string;
  /** Amount paid in LKR (after ZOOMPOINTS). */
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paidAtIso: string;
  /** Purchased lines (shown in PDF). */
  items: PaymentReceiptLine[];
  profileZoomPoints?: number;
  /** Cart subtotal before redemption. */
  orderSubtotal?: number;
  loyaltyPointsRedeemed?: number;
};

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPaidAt(iso: string): string {
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

function buildItemsRows(items: PaymentReceiptLine[]): string {
  if (!items.length) {
    return `<tr><td colspan="4" class="td-empty">No line items recorded for this receipt.</td></tr>`;
  }
  return items
    .map((line, idx) => {
      const lineTotal = line.price * line.quantity;
      const zebra = idx % 2 === 0 ? 'row-even' : 'row-odd';
      return `<tr class="${zebra}">
        <td class="td-name">${escapeHtml(line.name)}</td>
        <td class="td-num">${line.quantity}</td>
        <td class="td-num">${formatLkr(line.price)}</td>
        <td class="td-line">${formatLkr(lineTotal)}</td>
      </tr>`;
    })
    .join('');
}

function buildPaymentReceiptHtml(input: PaymentReceiptPdfInput, logoDataUri: string | undefined): string {
  const earned = calculateEarnedPoints(input.amount);
  const redeemedPts = Math.max(0, Math.floor(Number(input.loyaltyPointsRedeemed ?? 0)));
  const subtotal =
    typeof input.orderSubtotal === 'number' && Number.isFinite(input.orderSubtotal)
      ? input.orderSubtotal
      : input.amount + redeemedPts;

  const redemptionBlock =
    redeemedPts > 0
      ? `<div class="meta-grid" style="margin-bottom:14px">
          <div class="meta-row">
            <span class="meta-label">Order subtotal</span>
            <span class="meta-val">${escapeHtml(formatLkr(subtotal))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">ZOOMPOINTS redeemed</span>
            <span class="meta-val">${redeemedPts.toLocaleString()} pts (−${escapeHtml(formatLkr(redeemedPts))})</span>
          </div>
        </div>`
      : '';
  const logoBlock = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="ZoomCart" />`
    : `<div class="logo-fallback">🛒</div>`;

  const profileLine =
    typeof input.profileZoomPoints === 'number'
      ? `<p class="points-balance"><strong>Your ZOOMPOINTS balance:</strong> ${Math.round(
          input.profileZoomPoints,
        ).toLocaleString()} pts</p>`
      : '';

  const itemRows = buildItemsRows(input.items);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZoomCart — Payment receipt</title>
  <style>
    @page { margin: 16mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      color: #1c1c1e;
      background: #ececf0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 620px; margin: 0 auto; padding: 0 0 28px; }
    .hero {
      background: linear-gradient(135deg, #007aff 0%, #5ac8fa 40%, #34c759 100%);
      border-radius: 0 0 22px 22px;
      padding: 26px 22px 28px;
      color: #fff;
      text-align: center;
      box-shadow: 0 10px 36px rgba(0, 122, 255, 0.28);
    }
    .logo {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      object-fit: contain;
      display: block;
      margin: 0 auto 10px;
      background: rgba(255,255,255,0.22);
      padding: 4px;
    }
    .logo-fallback {
      width: 70px;
      height: 70px;
      line-height: 70px;
      font-size: 34px;
      border-radius: 16px;
      background: rgba(255,255,255,0.22);
      margin: 0 auto 10px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.18em;
      margin: 0 0 4px;
    }
    .tagline {
      font-size: 10px;
      letter-spacing: 0.14em;
      opacity: 0.92;
      text-transform: uppercase;
      margin: 0;
    }
    .badge-paid {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.25);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .sheet {
      margin: -18px 14px 0;
      background: #ffffff;
      border-radius: 16px;
      padding: 22px 18px 22px;
      box-shadow: 0 6px 28px rgba(0,0,0,0.09);
      border: 1px solid rgba(0,0,0,0.06);
    }
    .receipt-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #8e8e93;
      text-transform: uppercase;
      margin: 0 0 18px;
      text-align: center;
    }
    .section-block { margin-top: 22px; }
    .section-block:first-of-type { margin-top: 0; }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #636366;
      text-transform: uppercase;
      margin: 0 0 12px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 0;
      border-radius: 10px;
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
      padding: 11px 8px;
      border-bottom: 1px solid #f2f2f7;
      vertical-align: top;
    }
    .td-name { font-weight: 600; color: #1c1c1e; }
    .td-num { text-align: right; color: #636366; }
    .td-line { text-align: right; font-weight: 700; color: #007aff; }
    .td-empty { text-align: center; color: #8e8e93; padding: 18px !important; font-size: 12px; }
    .row-even { background: #fafafa; }
    .row-odd { background: #fff; }
    .grand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 14px;
      margin: 0;
      background: #ffffff;
      border: 2px solid #1c1c1e;
      border-radius: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .grand-label { font-size: 14px; font-weight: 700; color: #1c1c1e; }
    .grand-val {
      font-size: 24px;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.02em;
    }
    .meta-grid { width: 100%; font-size: 12px; margin: 0; }
    .meta-row { display: table; width: 100%; }
    .meta-label, .meta-val {
      display: table-cell;
      padding: 8px 0;
      border-bottom: 1px solid #f2f2f7;
      vertical-align: top;
    }
    .meta-label { color: #8e8e93; width: 34%; }
    .meta-val { font-weight: 600; color: #1c1c1e; text-align: right; word-break: break-all; }
    .points-section {
      padding: 16px 14px;
      background: rgba(255, 214, 10, 0.09);
      border-radius: 12px;
      border: 1px solid rgba(255, 214, 10, 0.45);
    }
    .points-title-sm {
      font-size: 11px;
      letter-spacing: 0.06em;
      color: #8e8e93;
      margin: 0 0 6px;
      font-weight: 600;
    }
    .points-big { font-size: 26px; font-weight: 800; margin: 0 0 8px; color: #1c1c1e; }
    .points-sub { font-size: 10px; color: #8e8e93; margin: 0; line-height: 1.45; }
    .points-balance { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e5ea; font-size: 12px; color: #636366; }
    .footer {
      text-align: center;
      padding: 22px 20px 6px;
      font-size: 10px;
      color: #aeaeb2;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      ${logoBlock}
      <h1 class="brand">ZOOMCART</h1>
      <p class="tagline">Smart way to shop</p>
      <div class="badge-paid">PAYMENT CONFIRMED</div>
    </div>
    <div class="sheet">
      <p class="receipt-title">Official payment receipt</p>

      <div class="section-block">
        <p class="section-label">Transaction details</p>
        <div class="meta-grid">
          <div class="meta-row">
            <span class="meta-label">Order ID</span>
            <span class="meta-val">${escapeHtml(input.orderId)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Payment ID</span>
            <span class="meta-val">${escapeHtml(input.paymentId)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Date &amp; time</span>
            <span class="meta-val">${escapeHtml(formatPaidAt(input.paidAtIso))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Customer</span>
            <span class="meta-val">${escapeHtml(input.customerName)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Phone</span>
            <span class="meta-val">${escapeHtml(input.customerPhone)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Email</span>
            <span class="meta-val">${escapeHtml(input.customerEmail)}</span>
          </div>
        </div>
      </div>

      <div class="section-block">
        <p class="section-label">Items purchased</p>
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
            ${itemRows}
          </tbody>
        </table>
      </div>

      <div class="section-block">
        <p class="section-label">Amount paid</p>
        ${redemptionBlock}
        <div class="grand">
          <span class="grand-label">Payable total</span>
          <span class="grand-val">${escapeHtml(formatLkr(input.amount))}</span>
        </div>
      </div>

      <div class="section-block">
        <p class="section-label">ZOOMPOINTS earned</p>
        <div class="points-section">
          <p class="points-title-sm">This purchase</p>
          <p class="points-big">${earned.toLocaleString()} pts</p>
          <p class="points-sub">1 ZOOMPOINT per LKR 100 spent. Totals sync to your profile after successful payment.</p>
          ${profileLine}
        </div>
      </div>
    </div>
    <div class="footer">
      Thank you for shopping with ZoomCart.
    </div>
  </div>
</body>
</html>`;
}

export async function sharePaymentReceiptPdf(input: PaymentReceiptPdfInput): Promise<void> {
  const logoDataUri = await loadLogoDataUri();
  const html = buildPaymentReceiptHtml(input, logoDataUri);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save ZoomCart receipt (PDF)',
  });
}
