import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { Tool, ToolInput, ToolOutput, ToolContext } from "../../types/tool.js";

export const writeFileTool: Tool = {
  definition: {
    name: "write",
    description: "Write content to a file at the given path (creates parent directories if needed)",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the file to write",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
    },
    required: ["filePath", "content"],
  },

  async execute(input: ToolInput, ctx?: ToolContext): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { filePath, content } = input.args as {
        filePath: string;
        content: string;
      };

      if (ctx) {
        const confirmed = await ctx.confirm(
          `Write to ${filePath}?`
        );
        if (!confirmed) {
          return {
            name: "write",
            result: { skipped: true, reason: "User declined" },
            duration: performance.now() - start,
          };
        }
      }

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
      return {
        name: "write",
        result: { written: true, path: filePath },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "write",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
