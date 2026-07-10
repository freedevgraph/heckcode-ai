import type {
  AIProvider,
  ProviderCompletionParams,
  ProviderCompletionResult,
  ToolUseBlock,
} from "../types/provider.js";

export class LocalProvider implements AIProvider {
  readonly name = "local" as const;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.LOCAL_BASE_URL ?? "http://localhost:11434";
  }

  async complete(
    params: ProviderCompletionParams
  ): Promise<ProviderCompletionResult> {
    const { messages, tools, system, config } = params;

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const toolsDescription = tools?.length
      ? `\n\nAvailable tools:\n${tools
          .map(
            (t) =>
              `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.inputSchema)}`
          )
          .join("\n")}`
      : "";

    const systemMessage = system
      ? `${system}${toolsDescription}`
      : `You are HeckCode, a highly modular AI coding agent.${toolsDescription}`;

    const body: Record<string, unknown> = {
      model: config.provider.model,
      messages: [{ role: "system", content: systemMessage }, ...formattedMessages],
      stream: false,
      options: {
        temperature: config.provider.temperature,
        num_predict: config.provider.maxTokens,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Local provider error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      eval_count?: number;
    };

    const text = data.message?.content ?? "";

    const toolCalls = this.parseToolCalls(text, tools ?? []);

    return {
      message: {
        role: "assistant",
        content: toolCalls.length > 0 ? toolCalls : text,
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.eval_count
        ? { inputTokens: 0, outputTokens: data.eval_count }
        : undefined,
    };
  }

  private parseToolCalls(
    text: string,
    tools: { name: string }[]
  ): ToolUseBlock[] {
    if (!text.includes("```tool_call")) return [];

    const toolCalls: ToolUseBlock[] = [];
    const regex = /```tool_call\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.name && tools.some((t) => t.name === parsed.name)) {
          toolCalls.push({
            type: "tool_use",
            id: `local_${toolCalls.length}`,
            name: parsed.name,
            input: parsed.arguments || parsed.input || {},
          });
        }
      } catch {}
    }

    return toolCalls;
  }
}
