import type { AIProvider } from "../types/provider.js";
import type { ToolDefinition } from "../types/tool.js";
import type { HecKCodeConfig } from "../types/config.js";
import { ToolRegistry } from "../tools/registry.js";
import { HumanInLoop } from "./human-in-loop.js";
import type { Message, ToolUseBlock, ToolResultBlock } from "../types/provider.js";

export interface FunctionCallingEngineOptions {
  provider: AIProvider;
  registry: ToolRegistry;
  humanInLoop: HumanInLoop;
  config: HecKCodeConfig;
  onStream?: (chunk: string) => void;
}

export class FunctionCallingEngine {
  private provider: AIProvider;
  private registry: ToolRegistry;
  private humanInLoop: HumanInLoop;
  private config: HecKCodeConfig;
  private onStream?: (chunk: string) => void;

  constructor(opts: FunctionCallingEngineOptions) {
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

    while (iteration < maxIterations) {
      iteration++;

      const availableTools = this.registry.getAllDefinitions();

      const response = await this.provider.complete({
        messages,
        tools: availableTools,
        system: systemPrompt,
        config: this.config,
        onStream: this.onStream,
      });

      messages.push(response.message);

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { messages };
      }

      const toolResults = await this.executeToolCalls(response.toolCalls);
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
