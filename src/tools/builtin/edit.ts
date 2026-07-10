import { readFile, writeFile } from "fs/promises";
import type { Tool, ToolInput, ToolOutput, ToolContext } from "../../types/tool.js";

export const editTool: Tool = {
  definition: {
    name: "edit",
    description: "Edit a file by replacing exact string matches (supports replaceAll)",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Absolute path to the file to edit" },
        oldString: { type: "string", description: "Text to replace" },
        newString: { type: "string", description: "Text to replace it with" },
        replaceAll: {
          type: "boolean",
          description: "Replace all occurrences (default: false)",
        },
      },
    },
    required: ["filePath", "oldString", "newString"],
  },

  async execute(input: ToolInput, ctx?: ToolContext): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { filePath, oldString, newString, replaceAll } = input.args as {
        filePath: string;
        oldString: string;
        newString: string;
        replaceAll?: boolean;
      };

      if (ctx) {
        const confirmed = await ctx.confirm(
          `Edit ${filePath} (replace "${oldString.substring(0, 40)}..." -> "${newString.substring(0, 40)}...")?`
        );
        if (!confirmed) {
          return {
            name: "edit",
            result: { skipped: true, reason: "User declined" },
            duration: performance.now() - start,
          };
        }
      }

      const content = await readFile(filePath, "utf-8");

      if (replaceAll) {
        if (!content.includes(oldString)) {
          return {
            name: "edit",
            result: null,
            error: `oldString not found in ${filePath}`,
            duration: performance.now() - start,
          };
        }
        const updated = content.replaceAll(oldString, newString);
        await writeFile(filePath, updated, "utf-8");
        return {
          name: "edit",
          result: { replaced: true, occurrences: (content.match(new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length + 1 },
          duration: performance.now() - start,
        };
      }

      if (!content.includes(oldString)) {
        return {
          name: "edit",
          result: null,
          error: `oldString not found in ${filePath}`,
          duration: performance.now() - start,
        };
      }

      const updated = content.replace(oldString, newString);
      await writeFile(filePath, updated, "utf-8");
      return {
        name: "edit",
        result: { replaced: true },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "edit",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
