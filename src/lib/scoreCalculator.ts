/**
 * Word Length Dynamic Score Calculator
 * 
 * Rules:
 * - Base points: length * 15
 * - Progressive Length Multiplier Bonus:
 *   - 2 letters: 30 pts
 *   - 3 letters: 55 pts (+10 bonus)
 *   - 4 letters: 90 pts (+30 bonus)
 *   - 5 letters: 140 pts (+65 bonus)
 *   - 6 letters: 200 pts (+110 bonus)
 *   - 7 letters: 270 pts (+165 bonus)
 *   - 8+ letters: 360+ pts (huge long-word bonus)
 * - Dueum bonus: +10 pts
 */

export interface ScoreBreakdown {
  total: number;
  baseScore: number;
  lengthBonus: number;
  dueumBonus: number;
  label: string;
}

export function calculateWordScore(word: string, isDueum: boolean = false): ScoreBreakdown {
  const len = word.length;
  
  let baseScore = len * 15;
  let lengthBonus = 0;
  let label = '일반';

  if (len === 2) {
    lengthBonus = 0;
    label = '2글자';
  } else if (len === 3) {
    lengthBonus = 10;
    label = '3글자 보너스';
  } else if (len === 4) {
    lengthBonus = 30;
    label = '4글자 보너스';
  } else if (len === 5) {
    lengthBonus = 65;
    label = '5글자 대박!';
  } else if (len === 6) {
    lengthBonus = 110;
    label = '6글자 콤보!';
  } else if (len === 7) {
    lengthBonus = 165;
    label = '7글자 마스터!';
  } else if (len >= 8) {
    // Huge exponential bonus for very long words (e.g. 자라투스트라는이렇게말했다)
    lengthBonus = 200 + (len - 8) * 60;
    label = `${len}글자 초장문 대폭발! 🎉`;
  }

  const dueumBonus = isDueum ? 10 : 0;
  const total = baseScore + lengthBonus + dueumBonus;

  return {
    total,
    baseScore,
    lengthBonus,
    dueumBonus,
    label,
  };
}
