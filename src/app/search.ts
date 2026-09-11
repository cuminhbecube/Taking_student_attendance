export function normalizeVietnamese(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, match => match === 'Đ' ? 'D' : 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesVietnameseSearch(haystack: string, query: string) {
  const needle = normalizeVietnamese(query);
  return !needle || normalizeVietnamese(haystack).includes(needle);
}
