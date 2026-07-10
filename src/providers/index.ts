import type { HecKCodeConfig } from "../types/config.js";
import type { AIProvider } from "../types/provider.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { LocalProvider } from "./local.js";

export * from "./openai.js";
export * from "./anthropic.js";
export * from "./google.js";
export * from "./local.js";

export function createProvider(config: HecKCodeConfig): AIProvider {
  switch (config.provider.provider) {
    case "openai":
      return new OpenAIProvider(
        config.provider.apiKey,
        config.provider.baseUrl
      );
    case "anthropic":
      return new AnthropicProvider(config.provider.apiKey);
    case "google":
      return new GoogleProvider(config.provider.apiKey);
    case "local":
      return new LocalProvider(config.provider.baseUrl);
    default: {
      const _exhaustive: never = config.provider.provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}
