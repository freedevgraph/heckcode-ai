import chalk from "chalk";
import { Agent } from "../core/agent.js";
import type { HecKCodeConfig } from "../types/config.js";

export async function runSinglePrompt(
  config: HecKCodeConfig,
  prompt: string
): Promise<void> {
  const agent = new Agent({
    config,
    onStream: (chunk) => process.stdout.write(chunk),
  });

  console.log(chalk.dim(`\n[HeckCode] Using ${config.provider.provider} (${config.provider.model}), calling mode: ${config.callingMode}\n`));

  const response = await agent.run(prompt);
  console.log(`\n${chalk.cyan("Response:")}\n${response}\n`);
}

export async function runInteractive(config: HecKCodeConfig): Promise<void> {
  const { default: inquirer } = await import("inquirer");

  const agent = new Agent({
    config,
    onStream: (chunk) => process.stdout.write(chunk),
  });

  console.log(
    chalk.bold.cyan(
      `\n🤖 HecKCode Interactive - ${config.provider.provider} (${config.provider.model})`
    )
  );
  console.log(
    chalk.dim(
      `Tool calling: ${config.callingMode === "function" ? "API-level function calling" : "Instruction-based"}`
    )
  );
  console.log(
    chalk.dim(
      `Human-in-loop: ${config.humanInLoop.enabled ? config.humanInLoop.mode : "disabled"}`
    )
  );
  console.log(chalk.dim('Type "exit" or "quit" to end session\n'));

  while (true) {
    const { prompt } = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: chalk.green("You:"),
        prefix: "",
      },
    ]);

    if (!prompt || prompt.trim() === "") continue;
    if (["exit", "quit", "q"].includes(prompt.trim().toLowerCase())) {
      console.log(chalk.yellow("Goodbye!"));
      break;
    }

    console.log(chalk.cyan("\nHeckCode:"));
    const response = await agent.run(prompt);
    if (response) {
      console.log(response);
    }
    console.log("");
  }
}

export async function showInfo(config: HecKCodeConfig): Promise<void> {
  console.log(chalk.bold.cyan("\n📋 HecKCode Configuration\n"));
  console.log(chalk.bold("Provider:"), config.provider.provider);
  console.log(chalk.bold("Model:"), config.provider.model);
  console.log(chalk.bold("Max Tokens:"), config.provider.maxTokens);
  console.log(chalk.bold("Temperature:"), config.provider.temperature);
  console.log(
    chalk.bold("Calling Mode:"),
    config.callingMode === "function"
      ? "API-level function calling (recommended)"
      : "Instruction-based"
  );
  console.log(
    chalk.bold("Human-in-Loop:"),
    config.humanInLoop.enabled ? config.humanInLoop.mode : "disabled"
  );
  console.log(chalk.bold("Workspace:"), config.workspace ?? process.cwd());
  console.log("");
}
