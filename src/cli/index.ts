#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { runWizard } from "./wizard.js";
import { runSinglePrompt, runInteractive, showInfo } from "./commands.js";

const program = new Command();

program
  .name("heckcode")
  .description("A highly modular AI coding agent with human-in-the-loop support")
  .version("0.1.0");

program
  .command("init")
  .description("Run the setup wizard to create a configuration")
  .action(async () => {
    try {
      await runWizard();
    } catch (err) {
      console.error(chalk.red(`Wizard failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("run [prompt]")
  .description("Run a single prompt and exit")
  .option("-c, --config <path>", "Path to config file")
  .action(async (prompt?: string, opts?: { config?: string }) => {
    try {
      const config = loadConfig(opts?.config);
      if (!prompt) {
        await runInteractive(config);
      } else {
        await runSinglePrompt(config, prompt);
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("interactive")
  .description("Start an interactive session")
  .option("-c, --config <path>", "Path to config file")
  .alias("i")
  .action(async (opts?: { config?: string }) => {
    try {
      const config = loadConfig(opts?.config);
      await runInteractive(config);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("info")
  .description("Show current configuration")
  .option("-c, --config <path>", "Path to config file")
  .action(async (opts?: { config?: string }) => {
    try {
      const config = loadConfig(opts?.config);
      await showInfo(config);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
