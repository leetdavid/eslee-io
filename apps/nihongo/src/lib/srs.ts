/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality grades:
 * 0 - Complete blackout
 * 1 - Incorrect, but recognized after seeing answer
 * 2 - Incorrect, but answer seemed easy to recall
 * 3 - Correct, but with significant difficulty
 * 4 - Correct, with some hesitation
 * 5 - Perfect response
 */

export interface SRSResult {
  ease: number;
  interval: number;
  nextReview: Date;
}

export function calculateSRS(
  quality: number,
  currentEase: number,
  currentInterval: number,
): SRSResult {
  // Clamp quality between 0-5
  const q = Math.max(0, Math.min(5, quality));

  let newInterval: number;
  let newEase: number;

  if (q < 3) {
    // Failed: reset to beginning
    newInterval = 0;
    newEase = Math.max(1.3, currentEase - 0.2);
  } else {
    // Passed: calculate new interval
    if (currentInterval === 0) {
      newInterval = 1;
    } else if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEase);
    }

    // Update ease factor
    newEase = Math.max(1.3, currentEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    ease: newEase,
    interval: newInterval,
    nextReview,
  };
}

export function getQualityLabel(quality: number): string {
  switch (quality) {
    case 0:
      return "Again";
    case 1:
      return "Hard";
    case 2:
      return "Hard";
    case 3:
      return "OK";
    case 4:
      return "Good";
    case 5:
      return "Easy";
    default:
      return "Unknown";
  }
}
