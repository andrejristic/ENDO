/**
 * Provider adapters: Anthropic (Claude), Mistral, Groq, llama.cpp (llama-server).
 * All talk over HTTP with the global fetch (Node 18+/Electron). Keys are supplied by
 * the caller (from the OS keychain, per profile — Q6). Local llama.cpp needs no key.
 */
import {
  Provider, ProviderId, CompletionRequest, CompletionResult, ChatMessage, ToolCall,
} from './types';
import { styleForTheta } from './style';
import { toolsPrompt, parseFallbackToolCalls } from './toolcall';

function applyStyle(req: CompletionRequest): { messages: ChatMessage[]; temperature: number } {
  const theta = req.theta ?? 30;
  const style = styleForTheta(theta, 0.7);
  const messages = [...req.messages];
  const sysIdx = messages.findIndex((m) => m.role === 'system');
  const addendum = `\n[PSE style] ${style.systemAddendum}`;
  if (sysIdx >= 0) messages[sysIdx] = { ...messages[sysIdx], content: messages[sysIdx].content + addendum };
  else messages.unshift({ role: 'system', content: addendum.trim() });
  return { messages, temperature: req.temperature ?? style.temperature };
}

async function postJSON(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- Anthropic (native tools) ----------
export function anthropic(apiKey: string): Provider {
  const base = 'https://api.anthropic.com/v1';
  return {
    id: 'anthropic', online: true, supportsNativeTools: true,
    async listModels() { return ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5-20251001']; },
    async complete(req, model) {
      const { messages, temperature } = applyStyle(req);
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
      const msgs = messages.filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      const body: any = { model, max_tokens: req.maxTokens ?? 1024, temperature, system, messages: msgs };
      if (req.tools?.length) body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
      const j = await postJSON(`${base}/messages`, { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body);
      const text = (j.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
      const toolCalls: ToolCall[] = (j.content || []).filter((c: any) => c.type === 'tool_use').map((c: any) => ({ name: c.name, args: c.input }));
      return { text, toolCalls, provider: 'anthropic', model, governed: true };
    },
  };
}

// ---------- OpenAI-compatible (Mistral, Groq, llama.cpp) ----------
function openAICompatible(id: ProviderId, base: string, apiKey: string, online: boolean, nativeTools: boolean, models: string[]): Provider {
  return {
    id, online, supportsNativeTools: nativeTools,
    async listModels() {
      if (!online) {
        try { const j = await (await fetch(`${base}/models`)).json(); return (j.data || []).map((m: any) => m.id); }
        catch { return models; }
      }
      return models;
    },
    async complete(req, model) {
      let { messages, temperature } = applyStyle(req);
      const body: any = { model, temperature, max_tokens: req.maxTokens ?? 1024, stream: false };
      if (req.tools?.length && nativeTools) {
        body.tools = req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
      } else if (req.tools?.length) {
        // fallback parser path for models without native tools
        messages = [{ role: 'system', content: toolsPrompt(req.tools) }, ...messages];
      }
      body.messages = messages.map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }));
      const headers: Record<string, string> = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
      const j = await postJSON(`${base}/chat/completions`, headers, body);
      const choice = j.choices?.[0]?.message ?? {};
      let text: string = choice.content ?? '';
      let toolCalls: ToolCall[] = [];
      if (choice.tool_calls?.length) {
        toolCalls = choice.tool_calls.map((tc: any) => ({ name: tc.function.name, args: safeJSON(tc.function.arguments) }));
      } else if (req.tools?.length && !nativeTools) {
        const parsed = parseFallbackToolCalls(text);
        toolCalls = parsed.toolCalls; text = parsed.text;
      }
      return { text, toolCalls, provider: id, model, governed: true };
    },
  };
}

function safeJSON(s: string): Record<string, unknown> { try { return JSON.parse(s); } catch { return {}; } }

export function mistral(apiKey: string): Provider {
  return openAICompatible('mistral', 'https://api.mistral.ai/v1', apiKey, true, true,
    ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest']);
}
export function groq(apiKey: string): Provider {
  return openAICompatible('groq', 'https://api.groq.com/openai/v1', apiKey, true, true,
    ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
}
/** Local llama.cpp llama-server, OpenAI-compatible endpoint (Q1: offline path). */
export function llamacpp(endpoint = 'http://127.0.0.1:8080/v1'): Provider {
  return openAICompatible('llamacpp', endpoint, '', false, false, ['local-gguf']);
}
