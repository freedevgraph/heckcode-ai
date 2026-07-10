import type { Tool, ToolInput, ToolOutput, ToolContext } from "../../types/tool.js";
import { readFile } from "fs/promises";

export const readFileTool: Tool = {
  definition: {
    name: "read",
    description: "Read the contents of a file at the given path",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the file to read",
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-indexed)",
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read",
        },
      },
    },
    required: ["filePath"],
  },

  async execute(input: ToolInput, _ctx?: ToolContext): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { filePath, offset, limit } = input.args as {
        filePath: string;
        offset?: number;
        limit?: number;
      };
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const startLine = offset ? Math.max(0, offset - 1) : 0;
      const endLine = limit ? startLine + limit : lines.length;
      const result = lines.slice(startLine, endLine).join("\n");
      return {
        name: "read",
        result: { content: result, totalLines: lines.length },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "read",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
