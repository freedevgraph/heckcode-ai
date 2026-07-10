import type { ToolDefinition } from "./tool.js";
import type { HecKCodeConfig } from "./config.js";

export type { ToolDefinition };

export type ProviderName = "openai" | "anthropic" | "google" | "local";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface ImageBlock {
  type: "image";
  source: { data: string; mediaType: string };
}

export interface ProviderCompletionParams {
  messages: Message[];
  tools?: ToolDefinition[];
  system?: string;
  config: HecKCodeConfig;
  onStream?: (chunk: string) => void;
}

export interface ProviderCompletionResult {
  message: Message;
  toolCalls?: ToolUseBlock[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  readonly name: ProviderName;
  complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult>;
  completeStream?(
    params: ProviderCompletionParams
  ): AsyncGenerator<ProviderCompletionResult>;
}
