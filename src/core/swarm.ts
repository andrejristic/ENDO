/**
 * Swarm + SHARED_LIB-lite (Phase 6). Registry of active agents, Physician dispatch on
 * drift, and simple fission/fusion decisions. Not owned by any agent (PSE_MASTER §3/§4).
 */
import { Agent } from './agent';
import { boundaryReset, PhysicianEvent } from './physician';

export class Swarm {
  private agents = new Map<string, Agent>();
  readonly physicianLog: PhysicianEvent[] = [];

  register(a: Agent): void { this.agents.set(a.id, a); }
  unregister(id: string): void { this.agents.delete(id); }
  list(): Agent[] { return [...this.agents.values()]; }

  /** Call periodically (or after each action). Dispatches the Physician to any drifter. */
  tick(now: number): PhysicianEvent[] {
    const events: PhysicianEvent[] = [];
    for (const a of this.agents.values()) {
      if (a.theta.needsPhysician()) {
        const ev = boundaryReset(a.id, a.theta, now);
        this.physicianLog.push(ev);
        events.push(ev);
      }
    }
    return events;
  }

  /** Fusion eligibility: two agents fuse iff their mean theta lands in the healthy band. */
  canFuse(a: Agent, b: Agent): boolean {
    const mean = (a.theta.current + b.theta.current) / 2;
    return mean >= 25 && mean <= 35;
  }

  /** Fission signal: an agent sustained far from its anchor wants to split roles. */
  shouldFission(a: Agent): boolean {
    return a.theta.stdev(50) > 6 && a.theta.series.length > 50;
  }
}
