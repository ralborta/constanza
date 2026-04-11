/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function telefonoDigits(raw) {
  const d = (raw ?? '').replace(/\D/g, '');
  return d.length > 0 ? d : null;
}

/**
 * @param {string} wantDigits
 * @returns {string[]}
 */
export function telefonoLookupVariants(wantDigits) {
  const s = new Set();
  if (!wantDigits) return [];
  s.add(wantDigits);
  if (wantDigits.startsWith('54') && wantDigits.charAt(2) !== '9') {
    s.add(`549${wantDigits.slice(2)}`);
  }
  if (wantDigits.startsWith('549')) {
    s.add(`54${wantDigits.slice(3)}`);
  }
  return [...s];
}
