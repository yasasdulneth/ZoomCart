export function formatLkr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;

  // Prefer Intl when available (adds separators automatically).
  try {
    // Some RN runtimes may not fully support currency formatting;
    // fallback to a simple string below.
    const formatted = new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);

    // en-LK often returns "LKR 1,234.00" which is what we want.
    return formatted.replace(/\s+/g, ' ').trim();
  } catch {
    const fixed = safe.toFixed(2);
    const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `LKR ${withCommas}`;
  }
}

