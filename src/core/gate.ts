/**
 * The human gate (Axis 2) + Trust game (Q11/Q12).
 * When an action's consequence bit is set, the gate fires: the agent surfaces an
 * approval card and waits. Earned trust widens ONLY the middle, autoApprovable set
 * "a little"; the hard top tier (push/deploy/delete/send-external/rotate-keys) always
 * asks. Per-repo, per-category pre-authorisations are honoured.
 */
import { ActionKind, classify } from './necessity';
import { TRUST_MIN, TRUST_MAX, TRUST_STEP_UP, TRUST_STEP_DOWN } from './constants';

export interface GateContext {
  repoId: string;
  /** categories the user pre-authorised for this repo, e.g. "git_commit". */
  preAuthorized: Set<string>;
  /** 0..1 earned autonomy for this repo (Trust game). */
  trust: number;
}

export interface GateDecision {
  action: ActionKind;
  requiresHuman: boolean;
  reason: string;
}

/** How much trust is needed before an autoApprovable gated action skips the prompt. */
const TRUST_AUTO_THRESHOLD = 0.6;

export function decideGate(action: ActionKind, ctx: GateContext): GateDecision {
  const spec = classify(action);
  if (!spec.gate) {
    return { action, requiresHuman: false, reason: 'no consequence gate' };
  }
  if (ctx.preAuthorized.has(action)) {
    return { action, requiresHuman: false, reason: 'pre-authorised for this repo' };
  }
  // Hard top tier: consequence dominates, trust never opens it.
  if (!spec.autoApprovable) {
    return { action, requiresHuman: true, reason: 'irreversible/outbound — always asks' };
  }
  // Middle tier: earned trust may widen the gate a little.
  if (ctx.trust >= TRUST_AUTO_THRESHOLD) {
    return { action, requiresHuman: false, reason: `earned trust (${ctx.trust.toFixed(2)})` };
  }
  return { action, requiresHuman: true, reason: 'gated; trust not yet earned' };
}

/** Repeated play adjusts the autonomy budget (Trust/investment game). */
export function updateTrust(trust: number, honoured: boolean): number {
  const next = honoured ? trust + TRUST_STEP_UP : trust - TRUST_STEP_DOWN;
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, next));
}
