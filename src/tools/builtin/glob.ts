import { glob } from "fs/promises";
import type { Tool, ToolInput, ToolOutput } from "../../types/tool.js";

export const globTool: Tool = {
  definition: {
    name: "glob",
    description: "Find files by glob pattern matching",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern to match files (e.g. src/**/*.ts)",
        },
        path: {
          type: "string",
          description: "Directory to search in (defaults to cwd)",
        },
      },
    },
    required: ["pattern"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { pattern, path: searchPath } = input.args as {
        pattern: string;
        path?: string;
      };

      const results: string[] = [];
      const cwd = searchPath ?? process.cwd();

      for await (const file of glob(pattern, { cwd })) {
        results.push(file);
      }

      return {
        name: "glob",
        result: { files: results, count: results.length },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "glob",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
