/**
 * Tool-calling (Q2). Native when the provider supports it; otherwise a text fallback
 * parser so ANY local .gguf works. The fallback prompts the model to emit a fenced
 * JSON block and parses it.
 */
import { ToolCall, ToolDef } from './types';

export const FALLBACK_SYSTEM = `When you need to use a tool, output EXACTLY one fenced block:
\`\`\`tool
{"name": "<tool_name>", "args": { ... }}
\`\`\`
Emit nothing after the block. If no tool is needed, answer normally.`;

export function toolsPrompt(tools: ToolDef[]): string {
  const lines = tools.map((t) => `- ${t.name}: ${t.description} params=${JSON.stringify(t.parameters)}`);
  return `Available tools:\n${lines.join('\n')}\n${FALLBACK_SYSTEM}`;
}

const BLOCK = /```tool\s*([\s\S]*?)```/i;

/** Parse tool calls from free text (fallback path). */
export function parseFallbackToolCalls(text: string): { toolCalls: ToolCall[]; text: string } {
  const m = BLOCK.exec(text);
  if (!m) return { toolCalls: [], text };
  try {
    const obj = JSON.parse(m[1].trim());
    if (obj && typeof obj.name === 'string') {
      return { toolCalls: [{ name: obj.name, args: obj.args || {} }], text: text.replace(BLOCK, '').trim() };
    }
  } catch {
    // malformed — surface nothing, keep the text (fragile-but-safe)
  }
  return { toolCalls: [], text };
}
