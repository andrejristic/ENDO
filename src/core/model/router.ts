/**
 * Model router (Q1). If both an API and a GGUF path are configured, the machine
 * picks whatever is handier: online -> API, offline -> GGUF. Always overridable in a
 * menu. Keys live per profile (Q6): e.g. "work" / "personal".
 */
import { Provider, ProviderId, CompletionRequest, CompletionResult } from './types';
import { anthropic, mistral, groq, llamacpp } from './adapters';

export interface KeyProfile {
  name: string; // e.g. "work", "personal"
  keys: Partial<Record<Exclude<ProviderId, 'llamacpp'>, string>>;
  ggufEndpoint?: string; // llama-server URL if a local model is running
}

export interface RouterConfig {
  profiles: KeyProfile[];
  activeProfile: string;
  /** null = auto (online->API, offline->GGUF). Otherwise force a provider. */
  override: ProviderId | null;
  preferredOnline: Exclude<ProviderId, 'llamacpp'>; // default cloud provider
  isOnline: () => boolean;
}

export class ModelRouter {
  constructor(private cfg: RouterConfig) {}

  private profile(): KeyProfile {
    return this.cfg.profiles.find((p) => p.name === this.cfg.activeProfile) ?? this.cfg.profiles[0];
  }

  private make(id: ProviderId): Provider | null {
    const p = this.profile();
    switch (id) {
      case 'anthropic': return p.keys.anthropic ? anthropic(p.keys.anthropic) : null;
      case 'mistral':   return p.keys.mistral ? mistral(p.keys.mistral) : null;
      case 'groq':      return p.keys.groq ? groq(p.keys.groq) : null;
      case 'llamacpp':  return llamacpp(p.ggufEndpoint);
    }
  }

  /** Resolve which provider handles this request. */
  select(): Provider {
    if (this.cfg.override) {
      const p = this.make(this.cfg.override);
      if (p) return p;
    }
    if (this.cfg.isOnline()) {
      const cloud = this.make(this.cfg.preferredOnline)
        ?? this.make('anthropic') ?? this.make('mistral') ?? this.make('groq');
      if (cloud) return cloud;
    }
    // offline (or no cloud key): local GGUF
    return this.make('llamacpp')!;
  }

  async complete(req: CompletionRequest, model?: string): Promise<CompletionResult> {
    const provider = this.select();
    const models = await provider.listModels();
    return provider.complete(req, model ?? models[0]);
  }
}
