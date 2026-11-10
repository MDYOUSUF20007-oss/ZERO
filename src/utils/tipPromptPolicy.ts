export const TIP_SNOOZE_SESSIONS = 5;

export interface TipPromptDecision {
  shouldShow: boolean;
  nextSkipRemaining: number;
}

/**
 * Normalizes a persisted snooze count to a non-negative integer.
 */
export function normalizeTipSkipCount(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

/**
 * Evaluates whether the optional post-session Tip Popup should appear after a COMPLETED session.
 * - While skipRemaining > 0: suppresses the popup and decrements skipRemaining by 1.
 * - When skipRemaining === 0: returns shouldShow = true.
 */
export function evaluatePostSessionTipPrompt(skipRemaining: number): TipPromptDecision {
  const safeRemaining = normalizeTipSkipCount(skipRemaining);
  if (safeRemaining > 0) {
    return {
      shouldShow: false,
      nextSkipRemaining: safeRemaining - 1,
    };
  }
  return {
    shouldShow: true,
    nextSkipRemaining: 0,
  };
}
