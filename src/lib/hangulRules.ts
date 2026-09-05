/**
 * 한글 두음법칙 및 단어 연결 판정 엔진
 * 표준 한국어 두음법칙 (국립국어원 규정 및 끝말잇기 표준 룰) 완벽 구현
 */

// 초성, 중성, 종성 목록
const INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const MEDIALS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// '야, 여, 예, 요, 유, 이, 얘' 계열 모음 인덱스: ㅑ(2), ㅒ(3), ㅕ(6), ㅖ(7), ㅛ(12), ㅠ(17), ㅣ(20)
const Y_I_MEDIAL_INDICES = new Set([2, 3, 6, 7, 12, 17, 20]);

export interface HangulCharDecomp {
  initial: string;
  initialIdx: number;
  medial: string;
  medialIdx: number;
  final: string;
  finalIdx: number;
}

/**
 * 한글 음절 분해
 */
export function decomposeHangul(char: string): HangulCharDecomp | null {
  if (!char || char.length === 0) return null;
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;

  const offset = code - 0xac00;
  const finalIdx = offset % 28;
  const medialIdx = Math.floor((offset / 28) % 21);
  const initialIdx = Math.floor(offset / (28 * 21));

  return {
    initial: INITIALS[initialIdx],
    initialIdx,
    medial: MEDIALS[medialIdx],
    medialIdx,
    final: FINALS[finalIdx],
    finalIdx,
  };
}

/**
 * 초성, 중성, 종성 인덱스로 한글 음절 합성
 */
export function composeHangul(initialIdx: number, medialIdx: number, finalIdx: number = 0): string {
  const code = 0xac00 + (initialIdx * 21 + medialIdx) * 28 + finalIdx;
  return String.fromCharCode(code);
}

// 명시적 두음법칙 매핑 사전 (자주 쓰이는 주요 음절 및 변형)
const EXPLICIT_DUEUM_MAP: Record<string, string[]> = {
  // ㄹ -> ㅇ (모음: ㅑ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ 등)
  '리': ['이'],
  '림': ['임'],
  '력': ['역'],
  '례': ['예'],
  '료': ['요'],
  '류': ['유'],
  '률': ['율'],
  '량': ['양'],
  '려': ['여'],
  '련': ['연'],
  '렬': ['열'],
  '령': ['영'],
  '린': ['인'],
  '립': ['입'],
  '략': ['약'],
  '륙': ['육'],
  '렴': ['염'],
  '렵': ['엽'],

  // ㄹ -> ㄴ (그 외 모음: ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅐ, ㅔ, ㅚ 등)
  '라': ['나'],
  '락': ['낙'],
  '란': ['난'],
  '랄': ['날'],
  '람': ['남'],
  '랍': ['납'],
  '랑': ['낭'],
  '래': ['내'],
  '랭': ['냉'],
  '로': ['노'],
  '록': ['녹'],
  '론': ['논'],
  '롱': ['농'],
  '뢰': ['뇌'],
  '루': ['누'],
  '륵': ['늑'],
  '름': ['늠'],
  '릉': ['능'],
  '릇': ['늣'],
  '렁': ['넝'],
  '러': ['너'],
  '럼': ['넘'],
  '럽': ['넙'],

  // ㄴ -> ㅇ (모음: ㅑ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ)
  '녀': ['여'],
  '뇨': ['요'],
  '뉴': ['유'],
  '니': ['이'],
  '냐': ['야'],
  '녜': ['예'],
  '년': ['연'],
  '념': ['염'],
  '녕': ['영'],
  '닉': ['익'],
  '님': ['임'],
  '닐': ['일'],
  '늅': ['읍'],
};

/**
 * 마지막 글자로부터 올 수 있는 시작 글자 후보 목록 반환 (원본 글자 + 두음법칙 변환 글자)
 * 예: '리' -> ['리', '이']
 * 예: '녀' -> ['녀', '여']
 * 예: '락' -> ['락', '낙']
 * 예: '과' -> ['과']
 */
export function getValidStartingChars(lastChar: string): string[] {
  if (!lastChar) return [];
  const results = new Set<string>();
  results.add(lastChar);

  // 1. 명시적 사전 룩업
  if (EXPLICIT_DUEUM_MAP[lastChar]) {
    for (const alt of EXPLICIT_DUEUM_MAP[lastChar]) {
      results.add(alt);
    }
  }

  // 2. 한글 음절 구조 분석을 통한 일반화된 두음법칙 변환
  const decomp = decomposeHangul(lastChar);
  if (decomp) {
    const { initial, medialIdx, finalIdx } = decomp;

    // ㄹ 두음법칙
    if (initial === 'ㄹ') {
      if (Y_I_MEDIAL_INDICES.has(medialIdx)) {
        // [ㅑ, ㅒ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ] 앞의 'ㄹ' -> 'ㅇ'
        const oIdx = INITIALS.indexOf('ㅇ');
        results.add(composeHangul(oIdx, medialIdx, finalIdx));
      } else {
        // 그 외 모음 앞의 'ㄹ' -> 'ㄴ'
        const nIdx = INITIALS.indexOf('ㄴ');
        results.add(composeHangul(nIdx, medialIdx, finalIdx));
      }
    }

    // ㄴ 두음법칙
    if (initial === 'ㄴ') {
      if (Y_I_MEDIAL_INDICES.has(medialIdx)) {
        // [ㅑ, ㅒ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ] 앞의 'ㄴ' -> 'ㅇ'
        const oIdx = INITIALS.indexOf('ㅇ');
        results.add(composeHangul(oIdx, medialIdx, finalIdx));
      }
    }
  }

  return Array.from(results);
}

/**
 * 순수 한글 완성형 단어인지 검증 (특수문자, 숫자, 영문, 이모지, 자음단독 불가)
 */
export function isPureHangul(text: string): boolean {
  if (!text || text.length === 0) return false;
  return /^[가-힣]+$/.test(text);
}

/**
 * 단어 유효성 기본 검증
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  isDueum?: boolean;
  matchedChar?: string;
}

export function validateWordRules(
  newWord: string,
  lastWord: string | null,
  usedWords: string[]
): ValidationResult {
  // Strip internal whitespace so compound terms with spaces (e.g. "기체 크로마토그래피 분석법") are processed smoothly
  const trimmed = String(newWord || '').replace(/\s+/g, '').trim();

  // 1. 공백 및 기본 형식
  if (!trimmed) {
    return { valid: false, reason: '단어를 입력해주세요.' };
  }

  // 2. 한글 여부
  if (!isPureHangul(trimmed)) {
    return { valid: false, reason: '한글 단어만 입력할 수 있습니다. (숫자/기호/영문 불가)' };
  }

  // 3. 단어 길이 (최소 2글자)
  if (trimmed.length < 2) {
    return { valid: false, reason: '최소 2글자 이상의 단어만 사용할 수 있습니다.' };
  }

  // 4. 중복 단어 검사
  if (usedWords.includes(trimmed)) {
    return { valid: false, reason: `이미 사용된 단어입니다: "${trimmed}"` };
  }

  // 5. 첫 단어인 경우 (이어받을 단어 없음)
  if (!lastWord) {
    return { valid: true, matchedChar: trimmed[0], isDueum: false };
  }

  // 6. 끝말잇기 연결 & 두음법칙 검사
  const cleanLastWord = lastWord.replace(/\s+/g, '').trim();
  const lastChar = cleanLastWord[cleanLastWord.length - 1];
  const firstChar = trimmed[0];
  const validChars = getValidStartingChars(lastChar);

  if (!validChars.includes(firstChar)) {
    const dueumText = validChars.length > 1 ? ` (두음법칙: ${validChars.join(', ')})` : '';
    return {
      valid: false,
      reason: `'${lastChar}'${dueumText}로 시작하는 단어를 입력해야 합니다.`,
    };
  }

  const isDueum = firstChar !== lastChar;
  return {
    valid: true,
    matchedChar: firstChar,
    isDueum,
  };
}
