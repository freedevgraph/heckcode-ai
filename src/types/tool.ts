export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
  inputSchema?: Record<string, unknown>;
}

export interface ToolInput {
  name: string;
  args: Record<string, unknown>;
  threadId?: string;
}

export interface ToolOutput {
  name: string;
  result: unknown;
  error?: string;
  duration: number;
}

export interface Tool {
  definition: ToolDefinition;
  execute(input: ToolInput, ctx?: ToolContext): Promise<ToolOutput>;
}

export interface ToolContext {
  confirm: (message: string) => Promise<boolean>;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export type ToolCategory = "file" | "code" | "shell" | "web" | "utility";
