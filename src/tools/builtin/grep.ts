import { execSync } from "child_process";
import type { Tool, ToolInput, ToolOutput } from "../../types/tool.js";

export const grepTool: Tool = {
  definition: {
    name: "grep",
    description: "Search file contents using regular expressions",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regular expression pattern to search for",
        },
        include: {
          type: "string",
          description: "File glob pattern to filter (e.g. *.ts)",
        },
        path: {
          type: "string",
          description: "Directory to search (defaults to cwd)",
        },
      },
    },
    required: ["pattern"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { pattern, include, path: searchPath } = input.args as {
        pattern: string;
        include?: string;
        path?: string;
      };

      let cmd = `rg --line-number --no-heading "${pattern.replace(/"/g, '\\"')}"`;
      if (include) cmd += ` -g "${include}"`;
      cmd += ` ${searchPath ?? process.cwd()}`;

      const output = execSync(cmd, {
        timeout: 30000,
        encoding: "utf-8",
        maxBuffer: 5 * 1024 * 1024,
      });

      const lines = output.trim().split("\n").filter(Boolean);
      const results = lines.map((line) => {
        const [file, lineNum, ...rest] = line.split(":");
        return { file, line: parseInt(lineNum), content: rest.join(":") };
      });

      return {
        name: "grep",
        result: { matches: results, count: results.length },
        duration: performance.now() - start,
      };
    } catch (err) {
      const error = err as Error & { status?: number; stderr?: string };
      if (error.status === 1) {
        return {
          name: "grep",
          result: { matches: [], count: 0 },
          duration: performance.now() - start,
        };
      }
      return {
        name: "grep",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
