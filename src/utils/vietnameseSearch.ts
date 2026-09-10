/**
 * Utilities for Vietnamese text normalization and smart student name matching
 */

export interface ParsedVietnameseName {
  raw: string;
  norm: string;
  words: string[];
  origWords: string[];
  lastName: string;
  origLastName: string;
  firstName: string;
  origFirstName: string;
  middleWords: string[];
  origMiddleWords: string[];
}

export interface StudentMatchResult {
  matched: boolean;
  score: number;
  reason: string;
  type?: 'FIRST_NAME' | 'LAST_NAME' | 'MIDDLE_NAME' | 'PHRASE' | 'MULTI_WORD' | 'WORD' | 'PHONE' | 'SUBSTRING' | 'ALL';
}

/**
 * Remove Vietnamese accents and diacritics, lowercase and trim
 */
export const normalizeVietnamese = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

/**
 * Parse a Vietnamese full name into parts: Họ (lastName), Tên đệm (middleWords), Tên cuối (firstName)
 */
export const parseVietnameseName = (fullName: string): ParsedVietnameseName => {
  const norm = normalizeVietnamese(fullName);
  const words = norm.split(/\s+/).filter(Boolean);
  const origWords = (fullName || '').trim().split(/\s+/).filter(Boolean);
  
  const lastName = words[0] || '';
  const firstName = words.length > 1 ? words[words.length - 1] : words[0] || '';
  const origLastName = origWords[0] || '';
  const origFirstName = origWords.length > 1 ? origWords[origWords.length - 1] : origWords[0] || '';
  
  return {
    raw: fullName,
    norm,
    words,
    origWords,
    lastName,
    origLastName,
    firstName,
    origFirstName,
    middleWords: words.length > 2 ? words.slice(1, -1) : [],
    origMiddleWords: origWords.length > 2 ? origWords.slice(1, -1) : []
  };
};

/**
 * Match a student by query supporting given name (tên cuối), surname (họ), middle name, phone, with ranking
 */
export const matchStudentSearch = (
  student: { name: string; parentPhone?: string },
  query: string
): StudentMatchResult => {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { matched: true, score: 0, reason: '', type: 'ALL' };
  }

  const qNorm = normalizeVietnamese(trimmed);
  const qPhone = trimmed.replace(/\D/g, '');
  
  // 1. Check phone number match
  if (qPhone && student.parentPhone) {
    const studentPhoneNorm = student.parentPhone.replace(/\D/g, '');
    if (studentPhoneNorm.includes(qPhone)) {
      return {
        matched: true,
        score: studentPhoneNorm.endsWith(qPhone) ? 80 : 60,
        reason: `📞 Khớp SĐT: ${student.parentPhone}`,
        type: 'PHONE'
      };
    }
  }

  const p = parseVietnameseName(student.name);
  const qWords = qNorm.split(/\s+/).filter(Boolean);

  if (qWords.length === 0) {
    return { matched: true, score: 0, reason: '', type: 'ALL' };
  }

  // Single word search (e.g. "an", "kiet", "nguyen", "tuan")
  if (qWords.length === 1) {
    const w = qWords[0];

    // 1. EXACT match on Tên cuối (Given name) -> TOP PRIORITY
    if (p.firstName === w) {
      return {
        matched: true,
        score: 100,
        reason: `🎯 Khớp Tên: "${p.origFirstName}"`,
        type: 'FIRST_NAME'
      };
    }

    // 2. Tên cuối STARTS WITH query (e.g. "an" -> "Anh")
    if (p.firstName.startsWith(w)) {
      return {
        matched: true,
        score: 90,
        reason: `🎯 Tên bắt đầu: "${p.origFirstName}"`,
        type: 'FIRST_NAME'
      };
    }

    // 3. EXACT match on Họ (Surname) (e.g. "nguyen" -> "Nguyễn", "tran" -> "Trần")
    if (p.lastName === w) {
      return {
        matched: true,
        score: 80,
        reason: `👤 Khớp Họ: "${p.origLastName}"`,
        type: 'LAST_NAME'
      };
    }

    // 4. Họ STARTS WITH query (e.g. "nguy" -> "Nguyễn")
    if (p.lastName.startsWith(w)) {
      return {
        matched: true,
        score: 75,
        reason: `👤 Họ bắt đầu: "${p.origLastName}"`,
        type: 'LAST_NAME'
      };
    }

    // 5. Any middle word exact match (e.g. "an" in "Nguyễn Vũ An Khánh")
    if (p.middleWords.includes(w)) {
      const idx = p.middleWords.indexOf(w);
      const origMid = p.origMiddleWords[idx] || w;
      return {
        matched: true,
        score: 65,
        reason: `🔍 Tên đệm: "${origMid}"`,
        type: 'MIDDLE_NAME'
      };
    }

    // 6. Any word starts with query
    const wordStartIdx = p.words.findIndex(item => item.startsWith(w));
    if (wordStartIdx !== -1) {
      const origWord = p.origWords[wordStartIdx] || w;
      return {
        matched: true,
        score: 55,
        reason: `🔍 Có từ: "${origWord}"`,
        type: 'WORD'
      };
    }

    // 7. Substring match inside full name (only if query is >= 3 chars to avoid noisy fragments)
    if (w.length >= 3 && p.norm.includes(w)) {
      return {
        matched: true,
        score: 35,
        reason: `🔍 Khớp một phần: "${student.name}"`,
        type: 'SUBSTRING'
      };
    }
  } else {
    // Multi-word search (e.g. "binh an", "nguyen kiet", "hoang tuan")
    // Exact contiguous phrase
    if (p.norm.includes(qNorm)) {
      return {
        matched: true,
        score: 95,
        reason: `✨ Khớp chính xác: "${student.name}"`,
        type: 'PHRASE'
      };
    }

    // All tokens match words in student's name (e.g. "nguyen kiet" in "Nguyễn Tuấn Kiệt")
    const allWordsMatch = qWords.every(qw => p.words.some(sw => sw.startsWith(qw)));
    if (allWordsMatch) {
      return {
        matched: true,
        score: 85,
        reason: `✨ Khớp các từ trong tên`,
        type: 'MULTI_WORD'
      };
    }
  }

  return { matched: false, score: 0, reason: '' };
};

/**
 * Extract distinct popular given names (Tên cuối) and surnames (Họ) from a student list for quick suggestion chips
 */
export const extractNameSuggestions = (
  students: { name: string }[]
): {
  givenNames: { name: string; count: number }[];
  surnames: { name: string; count: number }[];
} => {
  const givenMap = new Map<string, number>();
  const surnameMap = new Map<string, number>();

  students.forEach(s => {
    const p = parseVietnameseName(s.name);
    if (p.origFirstName) {
      givenMap.set(p.origFirstName, (givenMap.get(p.origFirstName) || 0) + 1);
    }
    if (p.origLastName) {
      surnameMap.set(p.origLastName, (surnameMap.get(p.origLastName) || 0) + 1);
    }
  });

  const givenNames = Array.from(givenMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));

  const surnames = Array.from(surnameMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));

  return { givenNames, surnames };
};
