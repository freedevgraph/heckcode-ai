import OpenAI from "openai";
import type {
  AIProvider,
  ProviderCompletionParams,
  ProviderCompletionResult,
  ToolUseBlock,
  ContentBlock,
  TextBlock,
} from "../types/provider.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      baseURL,
    });
  }

  async complete(
    params: ProviderCompletionParams
  ): Promise<ProviderCompletionResult> {
    const { messages, tools, system, config, onStream } = params;

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        openaiMessages.push({
          role: "system",
          content: typeof msg.content === "string" ? msg.content : "",
        });
      } else if (msg.role === "user") {
        openaiMessages.push({
          role: "user",
          content: this.serializeContent(msg.content),
        });
      } else if (msg.role === "assistant") {
        const content = typeof msg.content === "string" ? msg.content : "";
        const toolCalls = this.extractToolCalls(msg.content);
        const entry: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: content || null,
        };
        if (toolCalls.length > 0) {
          entry.tool_calls = toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          }));
        }
        openaiMessages.push(entry);
      }
    }

    const openaiTools = tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: (t.inputSchema ?? t.parameters) as Record<string, unknown>,
      },
    }));

    const stream = onStream !== undefined || config.provider.provider === "openai";

    if (stream && onStream) {
      const streamResponse = await this.client.chat.completions.create({
        model: config.provider.model,
        messages: openaiMessages,
        tools: openaiTools,
        max_tokens: config.provider.maxTokens,
        temperature: config.provider.temperature,
        stream: true,
      });

      let fullContent = "";
      const collectedToolCalls: Map<
        number,
        { id: string; name: string; args: string }
      > = new Map();

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onStream(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!collectedToolCalls.has(index)) {
              collectedToolCalls.set(index, {
                id: tc.id ?? `call_${index}`,
                name: tc.function?.name ?? "",
                args: tc.function?.arguments ?? "",
              });
            } else {
              const existing = collectedToolCalls.get(index)!;
              existing.args += tc.function?.arguments ?? "";
            }
          }
        }
      }

      const toolCalls: ToolUseBlock[] = [];
      for (const [, tc] of collectedToolCalls) {
        toolCalls.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.args || "{}"),
        });
      }

      return {
        message: {
          role: "assistant",
          content: fullContent
            ? [{ type: "text", text: fullContent }]
            : toolCalls.length > 0
              ? toolCalls
              : [],
        },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    }

    const response = await this.client.chat.completions.create({
      model: config.provider.model,
      messages: openaiMessages,
      tools: openaiTools,
      max_tokens: config.provider.maxTokens,
      temperature: config.provider.temperature,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("No completion choice returned");

    const content = choice.message.content ?? "";
    const toolCalls: ToolUseBlock[] = (
      choice.message.tool_calls ?? []
    ).map((tc) => ({
      type: "tool_use",
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || "{}"),
    }));

    return {
      message: {
        role: "assistant",
        content: content
          ? [{ type: "text", text: content }]
          : toolCalls.length > 0
            ? toolCalls
            : [],
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }

  private serializeContent(
    content: string | ContentBlock[]
  ): string | Array<OpenAI.Chat.ChatCompletionContentPart> {
    if (typeof content === "string") return content;
    return content.map((block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text } as const;
      }
      if (block.type === "image") {
        return {
          type: "image_url",
          image_url: {
            url: `data:${block.source.mediaType};base64,${block.source.data}`,
          },
        } as const;
      }
      if (block.type === "tool_result") {
        return {
          type: "text",
          text: block.content,
        } as const;
      }
      return { type: "text", text: JSON.stringify(block) } as const;
    });
  }

  private extractToolCalls(
    content: string | ContentBlock[]
  ): ToolUseBlock[] {
    if (typeof content === "string") return [];
    return content.filter((b): b is ToolUseBlock => b.type === "tool_use");
  }
}
