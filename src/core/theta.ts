/**
 * Theta monitor. SHARED_LIB gives an agent a mission, then measures its theta over
 * time, building a theta/time function (PSE_IDE_THETA Q8). The more of the assigned
 * work the agent actually does, the closer theta stays to its anchor; the more it
 * strays (mapping the environment without need, chatting to other agents without
 * need), the further theta drifts. Each agent has its OWN drift speed (Q8).
 *
 * Theta is measured PER ACTION (Q9): every action carries a necessity tier that sets
 * a target anchor; theta moves toward that target at the agent's individual rate and
 * relaxes toward the human anchor (30) when idle (Null State Drift, kernel line 127).
 */
import {
  HUMAN_THETA, THETA_MIN, THETA_MAX, DRIFT_TOLERANCE,
  NECESSITY_ANCHORS, NecessityTier, PHYSICIAN_TRIGGER_STEPS,
} from './constants';

export interface ThetaSample {
  t: number;        // step index (monotonic)
  theta: number;    // 0..100
  anchor: number;   // target for this action
  onMission: boolean;
  source: string;   // why theta moved (kernel theta-source taxonomy)
}

export interface ThetaConfig {
  /** Individual agent responsiveness — how fast theta chases its target. 0..1. */
  rate: number;
  /** How fast theta relaxes back toward the human anchor when idle. 0..1. */
  relax: number;
}

export class ThetaMonitor {
  current = HUMAN_THETA;
  readonly series: ThetaSample[] = [];
  private step = 0;
  private offMissionRun = 0;

  constructor(private cfg: ThetaConfig = { rate: 0.5, relax: 0.15 }) {}

  private clamp(v: number): number {
    return Math.max(THETA_MIN, Math.min(THETA_MAX, v));
  }

  /** Record one action. Returns the new theta. */
  step_action(tier: NecessityTier, onMission: boolean, source = 'game_dynamic'): number {
    this.step += 1;
    const anchor = NECESSITY_ANCHORS[tier];
    // Move toward the anchor at the agent's individual rate.
    let target: number = anchor;
    if (!onMission) {
      // straying pushes theta away from the anchor, toward the edges
      const dir = this.current >= HUMAN_THETA ? 1 : -1;
      target = this.clamp(anchor + dir * DRIFT_TOLERANCE * 1.5);
      this.offMissionRun += 1;
    } else {
      this.offMissionRun = 0;
    }
    this.current = this.clamp(this.current + (target - this.current) * this.cfg.rate);
    this.series.push({ t: this.step, theta: this.current, anchor, onMission, source });
    return this.current;
  }

  /** Idle relaxation toward the human anchor (Null State Drift analog). */
  idle(): number {
    this.step += 1;
    this.current = this.clamp(this.current + (HUMAN_THETA - this.current) * this.cfg.relax);
    this.series.push({
      t: this.step, theta: this.current, anchor: HUMAN_THETA,
      onMission: true, source: 'internal_drift',
    });
    return this.current;
  }

  /** True while the agent has strayed off-mission long enough to summon the Physician. */
  needsPhysician(): boolean {
    if (this.offMissionRun < PHYSICIAN_TRIGGER_STEPS) return false;
    const anchor = this.series.length ? this.series[this.series.length - 1].anchor : HUMAN_THETA;
    return Math.abs(this.current - anchor) > DRIFT_TOLERANCE;
  }

  mean(window = 100): number {
    const s = this.series.slice(-window);
    if (!s.length) return this.current;
    return s.reduce((a, b) => a + b.theta, 0) / s.length;
  }

  stdev(window = 100): number {
    const s = this.series.slice(-window);
    if (s.length < 2) return 0;
    const m = s.reduce((a, b) => a + b.theta, 0) / s.length;
    const v = s.reduce((a, b) => a + (b.theta - m) ** 2, 0) / (s.length - 1);
    return Math.sqrt(v);
  }

  autocorr(window = 100): number {
    const s = this.series.slice(-window).map((x) => x.theta);
    if (s.length < 3) return 0;
    const m = s.reduce((a, b) => a + b, 0) / s.length;
    let num = 0, den = 0;
    for (let i = 0; i < s.length; i++) {
      den += (s[i] - m) ** 2;
      if (i > 0) num += (s[i] - m) * (s[i - 1] - m);
    }
    return den === 0 ? 0 : num / den;
  }

  /** UI health: green when near the current anchor, red when drifting. */
  health(): { ok: boolean; distance: number } {
    const anchor = this.series.length ? this.series[this.series.length - 1].anchor : HUMAN_THETA;
    const distance = Math.abs(this.current - anchor);
    return { ok: distance <= DRIFT_TOLERANCE, distance };
  }
}
