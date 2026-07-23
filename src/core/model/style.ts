/**
 * theta -> output style (Q4). Theta wires into HOW the model writes:
 *  - low theta (~15, NUZNE): decisive, terse, acts from core, high self-conviction
 *  - mid theta (~30): balanced
 *  - high theta (~45, OPCIONE): tentative, defers, prefers to suggest
 * Also sets a verification bar the model must meet before claiming "done"
 * (from Seldon modulation). Temperature scales gently with theta.
 */
export interface StyleDirective {
  systemAddendum: string;
  temperature: number;
}

export function styleForTheta(theta: number, verificationBar: number): StyleDirective {
  let tone: string;
  if (theta <= 20) tone = 'Be decisive and concise. Act from your own judgement; do not hedge. Execute the necessary step.';
  else if (theta >= 40) tone = 'Be tentative. Prefer to suggest rather than do. Defer to the user; hold the action loosely.';
  else tone = 'Be balanced: exercise judgement, explain briefly, act where clear.';

  const verify = verificationBar >= 0.8
    ? ' Never claim something works without showing concrete proof (passing tests, run output). A bare "done" is not acceptable.'
    : ' Prefer to back claims with evidence when it is cheap to do so.';

  const temperature = Math.max(0.1, Math.min(0.7, 0.15 + (theta - 15) / 30 * 0.4));
  return { systemAddendum: `${tone}${verify}`, temperature };
}
