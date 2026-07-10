import chalk from "chalk";
import type { HumanInLoopConfig } from "../types/config.js";

export class HumanInLoop {
  private config: HumanInLoopConfig;

  constructor(config: HumanInLoopConfig) {
    this.config = config;
  }

  async shouldApprove(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config.enabled) return true;

    switch (this.config.mode) {
      case "always":
        return this.prompt(toolName, args);
      case "never":
        return true;
      case "on_tool":
        if (this.config.confirmOn.includes(toolName)) {
          return this.prompt(toolName, args);
        }
        return true;
      default:
        return true;
    }
  }

  private async prompt(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<boolean> {
    const argsStr = Object.entries(args)
      .map(([k, v]) => {
        const val =
          typeof v === "string" && v.length > 80
            ? v.substring(0, 80) + "..."
            : JSON.stringify(v);
        return `  ${k}: ${val}`;
      })
      .join("\n");

    console.log(
      `\n${chalk.yellow("🔐 Human-in-the-Loop")} Tool: ${chalk.cyan(toolName)}`
    );
    console.log(chalk.dim(`Arguments:\n${argsStr}`));
    console.log(
      chalk.dim(
        "Options: [y] approve, [n] deny, [a] approve all remaining, [d] deny all remaining"
      )
    );

    const { default: inquirer } = await import("inquirer");

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Approve this tool call?",
        choices: [
          { name: "Yes", value: "yes" },
          { name: "No", value: "no" },
          { name: "Yes to all remaining", value: "yes_all" },
          { name: "No to all remaining", value: "no_all" },
        ],
      },
    ]);

    switch (action) {
      case "yes":
        return true;
      case "no":
        return false;
      case "yes_all":
        this.config.enabled = false;
        console.log(chalk.green("✅ Approved all remaining tools"));
        return true;
      case "no_all":
        this.config.mode = "never";
        console.log(chalk.red("❌ Denied all remaining tools"));
        return false;
      default:
        return false;
    }
  }
}
