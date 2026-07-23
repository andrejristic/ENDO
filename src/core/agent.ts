/**
 * The PSE-governed agent loop (Phase 1). Endo actually DOES things: each tool call
 * passes through necessity->theta (Axis 1) and the consequence gate (Axis 2), Seldon
 * updates from behaviour, the channel-guard screens I/O, and durable understanding is
 * proposed for human-confirmed absorption. All side effects are injected so this stays
 * shell-independent and verifiable.
 */
import { ThetaMonitor } from './theta';
import { GamePosterior, modulate, BehaviourFeatures } from './seldon';
import { classify, ActionKind } from './necessity';
import { decideGate, updateTrust, GateContext } from './gate';
import { guardInput, guardOutput } from './channelGuard';
import { ToolCall, CompletionRequest, CompletionResult, ChatMessage } from './model/types';
import { TOOLS, TOOL_ACTION, describeCall } from './tools';

export interface AgentDeps {
  complete(req: CompletionRequest): Promise<CompletionResult>;
  execute(call: ToolCall): Promise<string>;                 // run a tool, return result text
  gateAsk(action: ActionKind, detail: string): Promise<'approve' | 'reject' | 'always'>;
  injectionAsk(matched: string[]): Promise<boolean>;         // Q14: alert human, proceed?
  hooks?: AgentHooks;
  gateCtx: GateContext;
  maxSteps?: number;
}

export interface AgentHooks {
  onText?(text: string, governed: boolean): void;
  onTool?(call: ToolCall, tier: string, gated: boolean): void;
  onToolResult?(name: string, result: string): void;
  onTheta?(theta: number, health: { ok: boolean; distance: number }): void;
  onTangent?(prompt: string): void;
  onAbsorptionProposal?(summary: string): void;
  onPhysician?(): void;
}

export class Agent {
  readonly theta = new ThetaMonitor({ rate: 0.5, relax: 0.2 });
  readonly post = new GamePosterior();
  private messages: ChatMessage[] = [];

  constructor(public id: string, private deps: AgentDeps) {
    this.messages.push({ role: 'system', content: `You are ${id}, the PSE IDE assistant. Use tools to read, edit, create, and run. Show proof before claiming something works.` });
  }

  private feats = { accept: 0.7, verify: 0.5, iter: 0.2, scope: 0.2, cheap: 0.3, deleg: 0.4 };

  private updateSeldon(text: string, toolUsed: boolean) {
    // cheap-claims heuristic: says "done/works/fixed" without having run anything
    const claims = /\b(done|works|fixed|готово|gotovo|radi)\b/i.test(text);
    this.feats.cheap = Math.min(1, this.feats.cheap * 0.7 + (claims && !toolUsed ? 0.6 : 0));
    this.feats.iter = Math.min(1, this.feats.iter + 0.05);
    const f: BehaviourFeatures = {
      acceptRate: this.feats.accept, verifyRate: this.feats.verify, iterationLoad: this.feats.iter,
      scopeChurn: this.feats.scope, cheapClaims: this.feats.cheap, delegation: this.feats.deleg,
    };
    this.post.update(f);
  }

  async run(userText: string): Promise<string> {
    // channel-guard on the human's own message (Q14)
    const gin = guardInput(userText);
    if (gin.injection && !(await this.deps.injectionAsk(gin.matched))) {
      return 'Blocked a possible prompt injection at your request.';
    }
    this.messages.push({ role: 'user', content: userText });

    const maxSteps = this.deps.maxSteps ?? 8;
    let finalText = '';
    for (let step = 0; step < maxSteps; step++) {
      const mod = modulate(this.post);
      // Seldon response modulation -> Core Self (never names the game, I-4/I-11)
      if (mod.pacing === 'change_approach') {
        this.deps.hooks?.onTangent?.('This loop is dragging — try a different approach.');
      }
      const res = await this.deps.complete({
        messages: this.messages, tools: TOOLS, theta: this.theta.current,
      });
      // output channel-guard (profanity + derailment shape)
      const og = guardOutput(res.text, { tangentScore: 0, loopScore: 0, flipFlopScore: 0, injectionCapture: 0 });
      if (og.tangentPrompt) this.deps.hooks?.onTangent?.(og.tangentPrompt);
      finalText = og.sanitized;
      if (res.text) this.deps.hooks?.onText?.(og.sanitized, res.governed === true);

      if (!res.toolCalls.length) { this.updateSeldon(res.text, false); break; }

      this.messages.push({ role: 'assistant', content: res.text || '(tool call)' });
      for (const call of res.toolCalls) {
        const action = (TOOL_ACTION[call.name] || 'read_file') as ActionKind;
        const spec = classify(action);
        this.theta.step_action(spec.tier, true);
        const health = this.theta.health();
        this.deps.hooks?.onTheta?.(this.theta.current, health);
        if (this.theta.needsPhysician()) this.deps.hooks?.onPhysician?.();

        const decision = decideGate(action, this.deps.gateCtx);
        this.deps.hooks?.onTool?.(call, spec.tier, decision.requiresHuman);
        let allowed = !decision.requiresHuman;
        if (decision.requiresHuman) {
          const ans = await this.deps.gateAsk(action, describeCall(call.name, call.args));
          allowed = ans !== 'reject';
          if (ans === 'always') this.deps.gateCtx.preAuthorized.add(action);
          this.deps.gateCtx.trust = updateTrust(this.deps.gateCtx.trust, allowed);
        }

        let result: string;
        if (!allowed) result = 'User declined this action.';
        else {
          try { result = await this.deps.execute(call); this.feats.verify = Math.min(1, this.feats.verify + 0.1); }
          catch (e: any) { result = 'ERROR: ' + e.message; }
        }
        this.deps.hooks?.onToolResult?.(call.name, result);
        this.messages.push({ role: 'tool', content: result, toolName: call.name });

        // durable understanding worth remembering? (human-confirmed later)
        if (call.name === 'run_command' && allowed && /pass|ok|success/i.test(result)) {
          this.deps.hooks?.onAbsorptionProposal?.(`command works: ${describeCall(call.name, call.args)}`);
        }
      }
      this.updateSeldon(res.text, true);
    }
    return finalText;
  }
}
