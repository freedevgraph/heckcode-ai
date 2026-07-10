import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  ProviderCompletionParams,
  ProviderCompletionResult,
  ToolUseBlock,
  ContentBlock,
} from "../types/provider.js";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(
    params: ProviderCompletionParams
  ): Promise<ProviderCompletionResult> {
    const { messages, tools, system, config, onStream } = params;

    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? "user" : ("assistant" as const),
        content: this.toAnthropicContent(m.content),
      }));

    const anthropicTools = tools?.map((t) => {
      const schema = (t.inputSchema ?? t.parameters) as Record<string, unknown>;
      return {
        name: t.name,
        description: t.description,
        input_schema: { ...schema, type: "object" as const } as any,
      };
    });

    const systemText = system || "";

    if (onStream) {
      const stream = this.client.messages.stream({
        model: config.provider.model,
        max_tokens: config.provider.maxTokens,
        messages: anthropicMessages,
        tools: anthropicTools,
        system: systemText || undefined,
      });

      let fullContent = "";
      const collectedToolCalls: ToolUseBlock[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullContent += event.delta.text;
          onStream(event.delta.text);
        }
        if (
          event.type === "content_block_start" &&
          event.content_block.type === "tool_use"
        ) {
          collectedToolCalls.push({
            type: "tool_use",
            id: event.content_block.id,
            name: event.content_block.name,
            input: {} as Record<string, unknown>,
          });
        }
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "input_json_delta"
        ) {
          const last = collectedToolCalls[collectedToolCalls.length - 1];
          if (last) {
            try {
              const parsed = JSON.parse(event.delta.partial_json);
              last.input = { ...last.input, ...parsed };
            } catch {}
          }
        }
      }

      const finalMessage = await stream.finalMessage();

      return {
        message: {
          role: "assistant",
          content: fullContent
            ? [{ type: "text", text: fullContent }]
            : collectedToolCalls.length > 0
              ? collectedToolCalls
              : [],
        },
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
        usage: finalMessage.usage
          ? {
              inputTokens: finalMessage.usage.input_tokens,
              outputTokens: finalMessage.usage.output_tokens,
            }
          : undefined,
      };
    }

    const response = await this.client.messages.create({
      model: config.provider.model,
      max_tokens: config.provider.maxTokens,
      messages: anthropicMessages,
      tools: anthropicTools,
      system: systemText || undefined,
    });

    const toolCalls: ToolUseBlock[] = [];
    let textContent = "";

    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      }
      if (block.type === "tool_use") {
        toolCalls.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      message: {
        role: "assistant",
        content: textContent
          ? [{ type: "text", text: textContent }]
          : toolCalls.length > 0
            ? toolCalls
            : [],
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    };
  }

  private toAnthropicContent(
    content: string | ContentBlock[]
  ): Array<
    | Anthropic.Messages.TextBlockParam
    | Anthropic.Messages.ToolUseBlockParam
    | Anthropic.Messages.ToolResultBlockParam
  > {
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    }
    return content.map((block) => {
      switch (block.type) {
        case "text":
          return { type: "text", text: block.text };
        case "tool_use":
          return {
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input,
          };
        case "tool_result":
          return {
            type: "tool_result",
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          };
        default:
          return { type: "text", text: JSON.stringify(block) };
      }
    }) as any;
  }
}
