/**
 * Physician (Phase 6) — the swarm's clinician (PSE_MASTER §8). Its primary tool is
 * BOUNDARY RESET: it clears an agent's accumulated drift and returns theta toward the
 * human anchor WITHOUT touching what the agent has legitimately learned. Dispatched by
 * the swarm when an agent strays off-mission past tolerance (Q4).
 */
import { ThetaMonitor } from './theta';
import { HUMAN_THETA } from './constants';

export interface PhysicianEvent { agentId: string; before: number; after: number; at: number; }

export function boundaryReset(agentId: string, theta: ThetaMonitor, at: number): PhysicianEvent {
  const before = theta.current;
  // gentle pull back toward the human anchor; does not wipe history, just recalibrates
  theta.current = before + (HUMAN_THETA - before) * 0.6;
  return { agentId, before, after: theta.current, at };
}
