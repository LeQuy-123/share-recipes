// Same text rules as db/build_db.py, so typed text matches the stored search terms.

/** Lowercase, accents kept, NFC, single spaces. */
export function lower(text: string): string {
  return text.normalize('NFC').toLowerCase().split(/\s+/).filter(Boolean).join(' ')
}

/** Lowercase without Vietnamese diacritics: "Thịt Ba Chỉ" -> "thit ba chi". */
export function normalize(text: string): string {
  return text
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

/** Parameters for the ingredient search query (see db/queries.sql #1). */
export function searchParams(input: string): { query_norm: string; query_lower: string | null } {
  const cleaned = input.replace(/[%_]/g, ' ')
  const queryNorm = normalize(cleaned)
  const queryLower = lower(cleaned)
  return { query_norm: queryNorm, query_lower: queryLower === queryNorm ? null : queryLower }
}
