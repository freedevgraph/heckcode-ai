import { execSync } from "child_process";
import type { Tool, ToolInput, ToolOutput, ToolContext } from "../../types/tool.js";

export const bashTool: Tool = {
  definition: {
    name: "bash",
    description: "Execute a shell command and get the output",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        workdir: {
          type: "string",
          description: "Working directory to run the command in",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 120000)",
        },
      },
    },
    required: ["command"],
  },

  async execute(input: ToolInput, ctx?: ToolContext): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { command, workdir, timeout } = input.args as {
        command: string;
        workdir?: string;
        timeout?: number;
      };

      if (ctx) {
        const confirmed = await ctx.confirm(
          `Run shell command: ${command.substring(0, 100)}${command.length > 100 ? "..." : ""}`
        );
        if (!confirmed) {
          return {
            name: "bash",
            result: { skipped: true, reason: "User declined" },
            duration: performance.now() - start,
          };
        }
      }

      const output = execSync(command, {
        cwd: workdir ?? process.cwd(),
        timeout: timeout ?? 120000,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        name: "bash",
        result: { stdout: output, stderr: "", exitCode: 0 },
        duration: performance.now() - start,
      };
    } catch (err: unknown) {
      const error = err as Error & { stderr?: string; stdout?: string; status?: number };
      return {
        name: "bash",
        result: {
          stdout: error.stdout ?? "",
          stderr: error.stderr ?? error.message,
          exitCode: error.status ?? 1,
        },
        duration: performance.now() - start,
      };
    }
  },
};
