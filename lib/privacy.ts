/**
 * Mask a name for privacy display.
 * Rules: show first 2 chars + asterisks + last 2 chars.
 * Single char names show as-is. Two char names show as-is.
 */
export function maskName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  if (trimmed.length <= 4) return trimmed[0] + "*".repeat(trimmed.length - 1);
  const first = trimmed.slice(0, 2);
  const last = trimmed.slice(-2);
  const middle = "*".repeat(trimmed.length - 4);
  return first + middle + last;
}

/**
 * Mask a full name (first + last) preserving the space between.
 * "Jonathan Shimray" → "Jo**an Sha*ay"
 */
export function maskFullName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return maskName(parts[0]);
  return parts.map(maskName).join(" ");
}
