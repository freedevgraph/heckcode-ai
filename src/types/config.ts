import { z } from "zod";

export const ProviderConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "local"]),
  apiKey: z.string().optional(),
  model: z.string(),
  baseUrl: z.string().optional(),
  maxTokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const HumanInLoopConfigSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(["always", "on_tool", "never"]).default("on_tool"),
  confirmOn: z.array(z.string()).default(["bash", "write-file"]),
});

export const CallingModeSchema = z.enum(["function", "instruction"]);
export type CallingMode = z.infer<typeof CallingModeSchema>;

export const HecKCodeConfigSchema = z.object({
  version: z.string().default("1.0"),
  provider: ProviderConfigSchema,
  humanInLoop: HumanInLoopConfigSchema.default({}),
  callingMode: CallingModeSchema.default("function"),
  tools: z
    .object({
      enabled: z.array(z.string()).default([]),
      disabled: z.array(z.string()).default([]),
    })
    .default({ enabled: [], disabled: [] }),
  systemPrompt: z.string().optional(),
  workspace: z.string().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type HumanInLoopConfig = z.infer<typeof HumanInLoopConfigSchema>;
export type HecKCodeConfig = z.infer<typeof HecKCodeConfigSchema>;

export const DEFAULT_CONFIG: HecKCodeConfig = {
  version: "1.0",
  provider: {
    provider: "openai",
    model: "gpt-4o",
    maxTokens: 4096,
    temperature: 0.7,
  },
  humanInLoop: {
    enabled: true,
    mode: "on_tool",
    confirmOn: ["bash", "write-file"],
  },
  callingMode: "function",
  tools: { enabled: [], disabled: [] },
};
