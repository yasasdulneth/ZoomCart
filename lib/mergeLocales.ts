/** Shallow-merge i18n namespaces: later chunks override string keys per namespace. */
export function mergeLocales(
  ...parts: Array<Record<string, Record<string, string>>>
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const p of parts) {
    for (const ns of Object.keys(p)) {
      const chunk = p[ns];
      if (!chunk || typeof chunk !== 'object') continue;
      out[ns] = { ...(out[ns] ?? {}), ...chunk };
    }
  }
  return out;
}
