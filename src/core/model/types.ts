/** Model layer types. L-MODEL exists only on PATH 1 (PSE-native). */
import { NecessityTier } from '../constants';

export type ProviderId = 'anthropic' | 'mistral' | 'groq' | 'llamacpp';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
  /** theta -> output style (Q4). */
  theta?: number;
  tier?: NecessityTier;
}

export interface CompletionResult {
  text: string;
  toolCalls: ToolCall[];
  provider: ProviderId;
  model: string;
  governed: true; // always PSE-governed on PATH 1 — provenance badge source
}

export interface Provider {
  id: ProviderId;
  online: boolean; // whether it needs the network
  supportsNativeTools: boolean;
  listModels(): Promise<string[]>;
  complete(req: CompletionRequest, model: string): Promise<CompletionResult>;
}
