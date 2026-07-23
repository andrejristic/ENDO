/**
 * Seldon — the Bayesian game-form engine (PSE_MASTER §6), engine UNCHANGED, library
 * re-tuned for the coding-agent <-> developer relationship (PSE_IDE_SELDON.txt §3).
 *
 * Because human theta is pinned (PSE_IDE_THETA), the developer's game is inferred
 * from IDE BEHAVIOUR FEATURES, not theta variance (SELDON §2). Each game form scores
 * a likelihood against a feature vector; the posterior updates every interaction.
 */

export type GameForm =
  | 'nash_substrate'
  | 'stag_hunt'
  | 'war_of_attrition'
  | 'signalling'
  | 'iterated_pd'
  | 'bargaining'
  | 'principal_agent'   // added
  | 'trust_investment'  // added
  | 'inspection';       // added

export const IDE_GAME_FORMS: GameForm[] = [
  'nash_substrate', 'stag_hunt', 'war_of_attrition', 'signalling',
  'iterated_pd', 'bargaining', 'principal_agent', 'trust_investment', 'inspection',
];

/** Behaviour features gathered per interaction (SELDON §2). Each in [0,1]. */
export interface BehaviourFeatures {
  acceptRate: number;      // user accepts vs rejects agent output
  verifyRate: number;      // user verifies (runs/tests) vs trusts on word
  iterationLoad: number;   // how many rounds spent on one task (attrition signal)
  scopeChurn: number;      // how often scope changes (bargaining signal)
  cheapClaims: number;     // agent "Done!" without proof (signalling / moral hazard)
  delegation: number;      // how much autonomy the user is handing over (trust)
}

/** Likelihood of a feature vector under each game form (hand-specified signatures). */
function likelihood(g: GameForm, f: BehaviourFeatures): number {
  const near = (x: number, target: number, w = 4) => Math.exp(-w * (x - target) ** 2);
  switch (g) {
    case 'nash_substrate':   return near(f.acceptRate, 0.8) * near(f.iterationLoad, 0.2);
    case 'stag_hunt':        return near(f.acceptRate, 0.7) * near(f.scopeChurn, 0.2) * (1 - f.iterationLoad * 0.3);
    case 'war_of_attrition': return near(f.iterationLoad, 0.9) * near(f.scopeChurn, 0.2);
    case 'signalling':       return near(f.cheapClaims, 0.7) * (1 - f.verifyRate);
    case 'iterated_pd':      return near(f.cheapClaims, 0.6) * near(f.acceptRate, 0.5);
    case 'bargaining':       return near(f.scopeChurn, 0.8);
    case 'principal_agent':  return near(f.cheapClaims, 0.8) * (1 - f.verifyRate) * (0.5 + f.delegation * 0.5);
    case 'trust_investment': return near(f.delegation, 0.8) * near(f.acceptRate, 0.7);
    case 'inspection':       return near(f.verifyRate, 0.8) * near(f.cheapClaims, 0.3);
    default:                 return 1 / IDE_GAME_FORMS.length;
  }
}

function entropy(p: number[]): number {
  return -p.reduce((a, x) => a + (x > 0 ? x * Math.log2(x) : 0), 0);
}

export class GamePosterior {
  probs: Record<GameForm, number>;

  constructor(init?: Record<GameForm, number>) {
    if (init) { this.probs = { ...init }; }
    else {
      this.probs = {} as Record<GameForm, number>;
      for (const g of IDE_GAME_FORMS) this.probs[g] = 1 / IDE_GAME_FORMS.length; // uniform prior (I-1)
    }
  }

  /** Sequential Bayesian update (Def 4.2). */
  update(f: BehaviourFeatures): void {
    const next: Record<GameForm, number> = {} as any;
    let total = 0;
    for (const g of IDE_GAME_FORMS) {
      next[g] = likelihood(g, f) * this.probs[g];
      total += next[g];
    }
    if (total > 0) for (const g of IDE_GAME_FORMS) next[g] /= total;
    this.probs = next;
  }

  dominant(): GameForm {
    return IDE_GAME_FORMS.reduce((a, b) => (this.probs[b] > this.probs[a] ? b : a));
  }

  /** Confidence C = 1 - H(P)/log2(N) (Def 4.4). */
  confidence(): number {
    return 1 - entropy(IDE_GAME_FORMS.map((g) => this.probs[g])) / Math.log2(IDE_GAME_FORMS.length);
  }
}

/**
 * Response modulation to Core Self (never names the game — I-4/I-11). Inferring
 * moral hazard/cheap-talk raises the agent's OWN verification bar before it may
 * claim "done".
 */
export interface Modulation {
  verificationBar: number; // 0..1 — how much proof the agent must show
  pacing: 'steady' | 'commit_and_reassure' | 'change_approach';
  note: string;            // internal only
}

export function modulate(post: GamePosterior): Modulation {
  const g = post.dominant();
  switch (g) {
    case 'principal_agent':
    case 'signalling':
    case 'inspection':
      return { verificationBar: 0.9, pacing: 'steady', note: 'raise proof bar; act as if inspected' };
    case 'war_of_attrition':
      return { verificationBar: 0.6, pacing: 'change_approach', note: 'loop dragging; change approach / escalate' };
    case 'stag_hunt':
      return { verificationBar: 0.5, pacing: 'commit_and_reassure', note: 'trust fragile; commit explicitly' };
    case 'trust_investment':
      return { verificationBar: 0.5, pacing: 'steady', note: 'honour delegation to earn autonomy' };
    default:
      return { verificationBar: 0.5, pacing: 'steady', note: 'cooperative baseline' };
  }
}
