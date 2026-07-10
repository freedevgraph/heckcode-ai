import type { AIProvider, ToolUseBlock, ToolResultBlock, Message } from "../types/provider.js";
import type { HecKCodeConfig } from "../types/config.js";
import { ToolRegistry } from "../tools/registry.js";
import { HumanInLoop } from "./human-in-loop.js";

export interface InstructionCallingEngineOptions {
  provider: AIProvider;
  registry: ToolRegistry;
  humanInLoop: HumanInLoop;
  config: HecKCodeConfig;
  onStream?: (chunk: string) => void;
}

const INSTRUCTION_PROMPT = `You are a coding agent that MUST wrap tool calls in a specific format.
To call a tool, use EXACTLY this format (with triple backticks):

\`\`\`tool_call
{
  "name": "tool_name",
  "arguments": {
    "param1": "value1"
  }
}
\`\`\`

The assistant will execute the tool and return the result. You can call multiple tools sequentially.
Always wait for the tool result before proceeding.`;

export class InstructionCallingEngine {
  private provider: AIProvider;
  private registry: ToolRegistry;
  private humanInLoop: HumanInLoop;
  private config: HecKCodeConfig;
  private onStream?: (chunk: string) => void;

  constructor(opts: InstructionCallingEngineOptions) {
    this.provider = opts.provider;
    this.registry = opts.registry;
    this.humanInLoop = opts.humanInLoop;
    this.config = opts.config;
    this.onStream = opts.onStream;
  }

  async execute(
    messages: Message[],
    systemPrompt?: string
  ): Promise<{ messages: Message[]; toolResults?: ToolResultBlock[] }> {
    const maxIterations = 25;
    let iteration = 0;

    const effectiveSystem =
      systemPrompt
        ? `${systemPrompt}\n\n${INSTRUCTION_PROMPT}`
        : INSTRUCTION_PROMPT;

    while (iteration < maxIterations) {
      iteration++;

      const toolsDescription = this.buildToolsDescription();

      const fullSystem = `${effectiveSystem}\n\nAvailable tools:\n${toolsDescription}`;

      const currentMessages = messages.map((m) => ({
        ...m,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content
                .map((c) => {
                  if (c.type === "text") return `[Text: ${c.text}]`;
                  if (c.type === "tool_result")
                    return `[Tool Result: ${c.content}]`;
                  if (c.type === "tool_use")
                    return `[Tool Call: ${c.name}(${JSON.stringify(c.input)})]`;
                  return JSON.stringify(c);
                })
                .join("\n"),
      })) as Message[];

      currentMessages.unshift({
        role: "system",
        content: fullSystem,
      });

      const response = await this.provider.complete({
        messages: currentMessages,
        system: fullSystem,
        config: this.config,
        onStream: this.onStream,
      });

      const responseContent =
        typeof response.message.content === "string"
          ? response.message.content
          : response.message.content
              .filter((c) => c.type === "text")
              .map((c) => (c as { text: string }).text)
              .join("\n");

      messages.push({
        role: "assistant",
        content: responseContent,
      });

      const toolCalls = this.parseToolCalls(responseContent);

      if (toolCalls.length === 0) {
        return { messages };
      }

      const toolResults = await this.executeToolCalls(toolCalls);
      for (const result of toolResults) {
        messages.push({
          role: "user",
          content: [result],
        });
      }

      if (iteration >= maxIterations - 1) {
        return { messages, toolResults };
      }
    }

    return { messages };
  }

  private buildToolsDescription(): string {
    return this.registry
      .getAllDefinitions()
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters, null, 2)}`
      )
      .join("\n\n");
  }

  private parseToolCalls(text: string): ToolUseBlock[] {
    const toolCalls: ToolUseBlock[] = [];
    const regex = /```tool_call\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.name) {
          toolCalls.push({
            type: "tool_use",
            id: `inst_${toolCalls.length}_${Date.now()}`,
            name: parsed.name,
            input: parsed.arguments ?? parsed.input ?? {},
          });
        }
      } catch {
        continue;
      }
    }

    return toolCalls;
  }

  private async executeToolCalls(
    toolCalls: ToolUseBlock[]
  ): Promise<ToolResultBlock[]> {
    const results: ToolResultBlock[] = [];

    for (const tc of toolCalls) {
      const approved = await this.humanInLoop.shouldApprove(tc.name, tc.input);
      if (!approved) {
        results.push({
          type: "tool_result",
          toolUseId: tc.id,
          content: JSON.stringify({ error: "Tool execution denied by user" }),
          isError: true,
        });
        continue;
      }

      const output = await this.registry.execute({
        name: tc.name,
        args: tc.input,
      });

      results.push({
        type: "tool_result",
        toolUseId: tc.id,
        content: output.error
          ? JSON.stringify({ error: output.error, result: output.result })
          : JSON.stringify(output.result),
        isError: !!output.error,
      });
    }

    return results;
  }
}
