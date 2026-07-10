import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProvider,
  ProviderCompletionParams,
  ProviderCompletionResult,
  ToolUseBlock,
  ContentBlock,
} from "../types/provider.js";

export class GoogleProvider implements AIProvider {
  readonly name = "google" as const;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(
      apiKey ?? process.env.GOOGLE_API_KEY ?? ""
    );
  }

  async complete(
    params: ProviderCompletionParams
  ): Promise<ProviderCompletionResult> {
    const { messages, tools, system, config } = params;

    const toolDefs = tools?.length
      ? [
          {
            functionDeclarations: tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: {
                type: "object",
                properties: (t.inputSchema ?? t.parameters) as Record<string, unknown>,
              },
            })),
          },
        ]
      : undefined;

    const model = this.genAI.getGenerativeModel({
      model: config.provider.model,
      systemInstruction: system ? { role: "user", parts: [{ text: system }] } : undefined,
      tools: toolDefs as any,
    });

    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : ("user" as const),
        parts: this.toGoogleParts(m.content),
      }));

    const chat = model.startChat({ history: history as any });
    const lastUserMsg = history.pop();

    if (!lastUserMsg) throw new Error("No user message found");

    const result = await chat.sendMessage(lastUserMsg.parts as any);
    const response = result.response;
    const text = response.text();

    const toolCalls: ToolUseBlock[] = [];
    const candidates = response.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        const fc = (part as any).functionCall;
        if (fc) {
          toolCalls.push({
            type: "tool_use",
            id: `fc_${fc.name}`,
            name: fc.name,
            input: fc.args as Record<string, unknown>,
          });
        }
      }
    }

    return {
      message: {
        role: "assistant",
        content: text
          ? [{ type: "text", text }]
          : toolCalls.length > 0
            ? toolCalls
            : [],
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: (response as any).usageMetadata
        ? {
            inputTokens: (response as any).usageMetadata.promptTokenCount ?? 0,
            outputTokens: (response as any).usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }

  private toGoogleParts(
    content: string | ContentBlock[]
  ): Array<{ text?: string }> {
    if (typeof content === "string") {
      return [{ text: content }];
    }
    return content.map((block) => {
      if (block.type === "text") return { text: block.text };
      if (block.type === "tool_result") {
        return { text: `[Tool Result: ${block.content}]` };
      }
      return { text: JSON.stringify(block) };
    });
  }
}
