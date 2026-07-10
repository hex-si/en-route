// Strip everything except digits and return the normalized number.
// Accepts "+91...", "91...", or bare 10-digit numbers.
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

// Compare two phone numbers for equality regardless of "+91" prefix formatting.
// Matches when the digit strings are identical, or when one is the other with
// the leading Indian country code (91) added/removed.
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const stripCode = (n: string) => (n.startsWith("91") && n.length === 12 ? n.slice(2) : n);
  return stripCode(na) === stripCode(nb);
}
