/**
 * Project memory (Organelle Registry) — Q18/Q19.
 * Lives in app-data by default; a clearly visible menu option can export it to a
 * repo (on the user's machine or online, with a path + credentials the user gives).
 * What gets absorbed: durable understanding, never raw file bodies or secrets.
 * Absorption is HUMAN-CONFIRMED (kernel line 195/1174) — nothing becomes constitutive
 * without the user's yes, which also blocks poisoned organelles.
 */

export type OrganelleKind =
  | 'architecture' | 'convention' | 'domain_vocab' | 'command' | 'fix' | 'decision';

export interface Organelle {
  id: string;
  kind: OrganelleKind;
  summary: string;      // the durable understanding, in words
  evidence: string;     // where it came from (file/commit/session ref)
  weight: number;       // 0..0.20 single-organelle cap (kernel §0)
  confirmed: boolean;   // human-confirmed?
  createdAt: number;
}

const SINGLE_CAP = 0.20;
const BUDGET = 0.30;

export class ProjectMemory {
  private items = new Map<string, Organelle>();

  /** Never absorbs raw file bodies or secrets — callers pass a summary only. */
  proposeAbsorption(o: Omit<Organelle, 'confirmed' | 'weight'> & { weight?: number }): Organelle {
    const weight = Math.min(o.weight ?? 0.1, SINGLE_CAP);
    const org: Organelle = { ...o, weight, confirmed: false };
    this.items.set(o.id, org);
    return org; // provisional until the user confirms
  }

  /** The human gate on constitutive memory. */
  confirm(id: string, yes: boolean): void {
    const o = this.items.get(id);
    if (!o) return;
    if (!yes) { this.items.delete(id); return; }
    o.confirmed = true;
    this.renormalize();
  }

  private renormalize(): void {
    const confirmed = [...this.items.values()].filter((o) => o.confirmed);
    const total = confirmed.reduce((a, b) => a + b.weight, 0);
    if (total > BUDGET) {
      const k = BUDGET / total;
      for (const o of confirmed) o.weight *= k;
    }
  }

  list(): Organelle[] { return [...this.items.values()]; }
  confirmed(): Organelle[] { return this.list().filter((o) => o.confirmed); }
  remove(id: string): void { this.items.delete(id); }

  toJSON(): string { return JSON.stringify([...this.items.values()], null, 2); }
  static fromJSON(s: string): ProjectMemory {
    const m = new ProjectMemory();
    for (const o of JSON.parse(s) as Organelle[]) m['items'].set(o.id, o);
    return m;
  }
}
