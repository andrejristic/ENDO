/**
 * Guardian Tier 2 — runtime egress monitor (Phase 5). Compares an extension's ACTUAL
 * outbound connections against what its privacy label promised, and flags the
 * low-and-slow (schizoid) pattern: quiet for a long time, then sends. Pure logic;
 * the host feeds it observed connections. Full network capture arrives with the
 * extension host (Phase 4); eBPF deep-mode is deferred.
 */
export interface Connection { host: string; bytes: number; t: number; }

export interface EgressVerdict {
  unpromised: string[];      // hosts not in the promised label
  lowAndSlow: boolean;       // long silence then a burst = schizoid implant
  totalBytes: number;
  note: string;
}

export class EgressMonitor {
  private conns: Connection[] = [];
  constructor(private promisedHosts: string[]) {}

  observe(c: Connection): void { this.conns.push(c); }

  private isPromised(host: string): boolean {
    return this.promisedHosts.some((p) => host.includes(p) || p.includes(host));
  }

  verdict(): EgressVerdict {
    const unpromised = [...new Set(this.conns.filter((c) => !this.isPromised(c.host)).map((c) => c.host))];
    const totalBytes = this.conns.reduce((a, c) => a + c.bytes, 0);
    // low-and-slow: a long gap (>= 300s) followed by a data burst
    let lowAndSlow = false;
    const sorted = [...this.conns].sort((a, b) => a.t - b.t);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].t - sorted[i - 1].t;
      if (gap >= 300 && sorted[i].bytes > 1024) { lowAndSlow = true; break; }
    }
    const note = unpromised.length ? `talks to ${unpromised.length} host(s) it never disclosed`
      : lowAndSlow ? 'quiet-then-send pattern (possible implant)'
      : 'behaviour matches its label';
    return { unpromised, lowAndSlow, totalBytes, note };
  }
}
