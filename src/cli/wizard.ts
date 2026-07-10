import chalk from "chalk";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { HecKCodeConfig, CallingMode, HumanInLoopConfig } from "../types/config.js";

type ProviderName = "openai" | "anthropic" | "google" | "local";

interface WizardAnswers {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  callingMode: CallingMode;
  humanInLoop: boolean;
  hilMode: "always" | "on_tool" | "never";
  workspace: string;
}

export async function runWizard(): Promise<HecKCodeConfig> {
  const { default: inquirer } = await import("inquirer");

  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║     HecKCode Setup Wizard v0.1.0     ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════╝\n"));

  const providerChoices = [
    {
      name: "OpenAI (GPT-4o, GPT-4, GPT-3.5) - Recommended",
      value: "openai" as const,
    },
    {
      name: "Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)",
      value: "anthropic" as const,
    },
    {
      name: "Google (Gemini 1.5 Pro, Gemini 1.5 Flash)",
      value: "google" as const,
    },
    {
      name: "Local (Ollama, llama.cpp, etc.)",
      value: "local" as const,
    },
  ];

  const answers: WizardAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Which AI provider do you want to use?",
      choices: providerChoices,
    },
    {
      type: "input",
      name: "model",
      message: "Model name:",
      default: (answers: Record<string, unknown>) => {
        const models: Record<string, string> = {
          openai: "gpt-4o",
          anthropic: "claude-sonnet-4-20250514",
          google: "gemini-2.0-flash",
          local: "llama3.2",
        };
        return models[answers.provider as string] ?? "gpt-4o";
      },
    },
    {
      type: "password",
      name: "apiKey",
      message: "API Key (leave blank to use environment variable):",
      when: (answers: Record<string, unknown>) => answers.provider !== "local",
    },
    {
      type: "input",
      name: "baseUrl",
      message: "Base URL (leave blank for default):",
      when: (answers: Record<string, unknown>) => answers.provider === "local",
      default: "http://localhost:11434",
    },
    {
      type: "list",
      name: "callingMode",
      message: "Tool calling method:",
      choices: [
        {
          name: "API-level function calling (recommended) - Native tool calling via provider API",
          value: "function" as const,
        },
        {
          name: "Instruction-based - Tool calls embedded in text responses (use only when needed)",
          value: "instruction" as const,
        },
      ],
    },
    {
      type: "confirm",
      name: "humanInLoop",
      message: "Enable Human-in-the-Loop? (approve/deny tool executions)",
      default: true,
    },
    {
      type: "list",
      name: "hilMode",
      message: "When should HecKCode ask for approval?",
      choices: [
        {
          name: "On sensitive tools only (bash, write, edit) - Balanced",
          value: "on_tool" as const,
        },
        {
          name: "Every tool call - Maximum safety",
          value: "always" as const,
        },
        {
          name: "Never - Full autonomy",
          value: "never" as const,
        },
      ],
      when: (answers: Record<string, unknown>) => answers.humanInLoop as boolean,
    },
    {
      type: "input",
      name: "workspace",
      message: "Workspace directory (default: current directory):",
      default: process.cwd(),
    },
  ]);

  const humanInLoopConfig: HumanInLoopConfig = {
    enabled: answers.humanInLoop,
    mode: answers.humanInLoop ? (answers.hilMode ?? "on_tool") : "never",
    confirmOn: ["bash", "write", "edit"],
  };

  const config: HecKCodeConfig = {
    version: "1.0",
    provider: {
      provider: answers.provider,
      model: answers.model,
      ...(answers.apiKey ? { apiKey: answers.apiKey } : {}),
      ...(answers.baseUrl ? { baseUrl: answers.baseUrl } : {}),
      maxTokens: 4096,
      temperature: 0.7,
    },
    humanInLoop: humanInLoopConfig,
    callingMode: answers.callingMode,
    tools: { enabled: [], disabled: [] },
    workspace: answers.workspace,
  };

  const configPath = join(answers.workspace, "heckcode.json");
  const configDir = join(answers.workspace);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  console.log(chalk.green(`\n✅ Configuration saved to ${configPath}\n`));
  console.log(chalk.bold("Next steps:"));
  console.log(`  1. ${chalk.cyan("heckcode")} - Start interactive session`);
  console.log(`  2. ${chalk.cyan("heckcode run <prompt>")} - Run a single prompt`);
  console.log(
    `  3. Edit ${chalk.cyan("heckcode.json")} for advanced configuration\n`
  );

  return config;
}
