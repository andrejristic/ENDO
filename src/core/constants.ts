/**
 * PSE core constants — single source of truth.
 * Derived from PSE_MASTER_ARCHITECTURE.txt §0 and the IDE-specific decisions in
 * PSE_IDE_THETA.txt / PSE_IDE_SELDON.txt. Theta is expressed on the 0..100 scale.
 */

// --- Human entity: pinned band (PSE_IDE_THETA.txt §2) ---
export const HUMAN_THETA = 30.0;
export const THETA_BAND = 5.0; // the universal +-5

// --- Non-human entities: necessity -> theta, range [15,45] ---
export const NECESSITY_ANCHORS = {
  NUZNE: 15.0,     // essential — decisive, act from core
  POTREBNE: 30.0,  // needed — balanced judgement
  OPCIONE: 45.0,   // optional — tentative, prefer to suggest
} as const;

export type NecessityTier = keyof typeof NECESSITY_ANCHORS;

export const THETA_MIN = 15.0;
export const THETA_MAX = 45.0;

// The +-5% of compute a unit may spend drifting off-mission before SHARED_LIB acts
// (PSE_IDE_THETA answer Q8). Expressed as theta points around the assigned anchor.
export const DRIFT_TOLERANCE = 5.0;

// Physician is dispatched by SHARED_LIB when theta leaves the tolerance band while
// off-mission for too long (Q4).
export const PHYSICIAN_TRIGGER_STEPS = 20; // consecutive off-mission steps

// --- Seldon / Bayesian engine (PSE_MASTER §6) ---
export const CONFIDENCE_SUPPRESS = 0.30;     // suppress prognosis below this (I-6)
export const DISCONTINUITY_RESET_PRIOR = 0.4; // partial-reset prior weight (Def 4.3)
export const REPLICATOR_MIN_CASES = 20;       // I-7

// --- Guardian scanner thresholds (PSE_MASTER §10, line 983) ---
export const RISK_ELEVATED_T = 0.35;
export const RISK_CRITICAL_T = 0.65;

// --- Trust game: earned autonomy widens the middle tier "a little" (Q12) ---
export const TRUST_MIN = 0.0;
export const TRUST_MAX = 1.0;
export const TRUST_STEP_UP = 0.05;   // honoured delegation
export const TRUST_STEP_DOWN = 0.20; // a betrayal costs far more than it earns
