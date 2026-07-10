import chalk from "chalk";
import type { HecKCodeConfig } from "../types/config.js";
import type { AIProvider, Message } from "../types/provider.js";
import { createProvider } from "../providers/index.js";
import { ToolRegistry } from "../tools/registry.js";
import { HumanInLoop } from "./human-in-loop.js";
import { FunctionCallingEngine } from "./function-calling.js";
import { InstructionCallingEngine } from "./instruction-calling.js";

export interface AgentOptions {
  config: HecKCodeConfig;
  provider?: AIProvider;
  onStream?: (chunk: string) => void;
}

export class Agent {
  private config: HecKCodeConfig;
  private provider: AIProvider;
  private registry: ToolRegistry;
  private humanInLoop: HumanInLoop;
  private functionCalling: FunctionCallingEngine;
  private instructionCalling: InstructionCallingEngine;
  private onStream?: (chunk: string) => void;
  public messages: Message[] = [];

  constructor(opts: AgentOptions) {
    this.config = opts.config;
    this.provider = opts.provider ?? createProvider(opts.config);
    this.onStream = opts.onStream;

    this.humanInLoop = new HumanInLoop(this.config.humanInLoop);

    this.registry = new ToolRegistry({
      confirm: async (message: string) => {
        return this.humanInLoop.shouldApprove("confirm", { message });
      },
      logger: {
        info: (msg) => console.log(chalk.blue("[INFO]"), msg),
        warn: (msg) => console.log(chalk.yellow("[WARN]"), msg),
        error: (msg) => console.log(chalk.red("[ERROR]"), msg),
      },
    });

    this.functionCalling = new FunctionCallingEngine({
      provider: this.provider,
      registry: this.registry,
      humanInLoop: this.humanInLoop,
      config: this.config,
      onStream: this.onStream,
    });

    this.instructionCalling = new InstructionCallingEngine({
      provider: this.provider,
      registry: this.registry,
      humanInLoop: this.humanInLoop,
      config: this.config,
      onStream: this.onStream,
    });
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getRegistry(): ToolRegistry {
    return this.registry;
  }

  async run(input: string): Promise<string> {
    this.messages.push({ role: "user", content: input });

    const result =
      this.config.callingMode === "function"
        ? await this.functionCalling.execute(
            this.messages,
            this.config.systemPrompt
          )
        : await this.instructionCalling.execute(
            this.messages,
            this.config.systemPrompt
          );

    this.messages = result.messages;

    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && typeof lastMessage.content === "string") {
      return lastMessage.content;
    }
    if (lastMessage && Array.isArray(lastMessage.content)) {
      return lastMessage.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("\n");
    }

    return "";
  }

  async *runStream(input: string): AsyncGenerator<string> {
    this.messages.push({ role: "user", content: input });

    const result =
      this.config.callingMode === "function"
        ? await this.functionCalling.execute(
            this.messages,
            this.config.systemPrompt
          )
        : await this.instructionCalling.execute(
            this.messages,
            this.config.systemPrompt
          );

    this.messages = result.messages;
    yield "[DONE]";
  }
}
