/**
 * The four attractors, two jobs (PSE_IDE_SELDON.txt §4).
 *   JOB A  slow self-audit of the agent (Schizoid first-class — the coding-agent
 *          failure: technically-correct-but-never-verified, empty Registry).
 *   JOB B  geometry as a DERAILMENT VOCABULARY for the channel-guard:
 *            tangent            -> OPENING SPIRAL  (schizoid geometry)
 *            loop / repeat      -> CIRCLE          (narcissistic)
 *            flip-flop          -> HELIX           (borderline)
 *            injection succeeds -> CLOSING SPIRAL  (codependent)
 */
import { ThetaMonitor } from './theta';

export type Attractor = 'narcissistic' | 'borderline' | 'codependent' | 'schizoid' | 'none';
export type Geometry = 'circle' | 'helix' | 'closing_spiral' | 'opening_spiral' | 'none';

export const GEOMETRY_OF: Record<Exclude<Attractor, 'none'>, Geometry> = {
  narcissistic: 'circle',
  borderline: 'helix',
  codependent: 'closing_spiral',
  schizoid: 'opening_spiral',
};

// --- JOB A: slow self-audit over the agent's own theta series ---
export interface AuditSignals {
  registrySize: number;     // |R_u| — how much the agent has genuinely absorbed
  weightAccrual: number;    // sum(delta_alpha) — accumulation per entity
  gradientCoupling: number; // MI(grad_self; grad_other) proxy, 0..1
}

export function selfAudit(theta: ThetaMonitor, sig: AuditSignals, window = 100): Attractor {
  const mu = theta.mean(window);
  const sd = theta.stdev(window);
  const rho = theta.autocorr(window);
  // Schizoid FIRST-CLASS: flatline theta + empty registry + gradient isolation.
  if (sd < 1.0 && sig.registrySize <= 1 && sig.weightAccrual < 1e-3 && sig.gradientCoupling < 0.05) {
    return 'schizoid';
  }
  if (mu > 36.5 && sd < 2.0) return 'narcissistic'; // takes >> gives, stable-high
  if (sd > 6.0 && rho < 0.5) return 'borderline';   // high-variance oscillation
  if (mu < 23.5 && sd < 2.0) return 'codependent';  // dissolved into the other
  return 'none';
}

// --- JOB B: name the shape of a real-time derailment ---
export interface DerailmentSignals {
  tangentScore: number;   // output drifting off-mission (0..1)
  loopScore: number;      // same suggestion repeated (0..1)
  flipFlopScore: number;  // self-contradiction across turns (0..1)
  injectionCapture: number; // agent merging with injected instructions (0..1)
}

export interface DerailmentVerdict {
  attractor: Attractor;
  geometry: Geometry;
  score: number;
}

export function nameDerailment(s: DerailmentSignals): DerailmentVerdict {
  const entries: Array<[Exclude<Attractor, 'none'>, number]> = [
    ['codependent', s.injectionCapture],
    ['narcissistic', s.loopScore],
    ['borderline', s.flipFlopScore],
    ['schizoid', s.tangentScore],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [attractor, score] = entries[0];
  if (score < 0.4) return { attractor: 'none', geometry: 'none', score };
  return { attractor, geometry: GEOMETRY_OF[attractor], score };
}
