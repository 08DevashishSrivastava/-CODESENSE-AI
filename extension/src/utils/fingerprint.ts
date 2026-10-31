/**
 * Generates a stable deterministic fingerprint string for a diagnostic.
 * This ensures that identical errors across keystrokes or frames are recognized,
 * preventing duplicate voice alerts and flickering decorations.
 */
export function generateDiagnosticFingerprint(
  language: string,
  line: number,
  category: string,
  message: string
): string {
  // Normalize message by removing dynamic column numbers or volatile whitespace
  const normalizedMsg = message
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  const raw = `${language.toLowerCase()}:${line}:${category.toLowerCase()}:${normalizedMsg}`;
  
  // Quick DJB2 hash
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `cs_diag_${Math.abs(hash).toString(36)}`;
}
