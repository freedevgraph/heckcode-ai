import type { Tool, ToolInput, ToolOutput, ToolContext } from "../../types/tool.js";

export const questionTool: Tool = {
  definition: {
    name: "question",
    description: "Ask the user a question and get their response. Use this to gather preferences, clarifications, or decisions.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question to ask the user" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of predefined choices",
        },
      },
    },
    required: ["question"],
  },

  async execute(input: ToolInput, ctx?: ToolContext): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { question, options } = input.args as {
        question: string;
        options?: string[];
      };

      if (!ctx) {
        return {
          name: "question",
          result: { answer: null, error: "No tool context available for user interaction" },
          duration: performance.now() - start,
        };
      }

      ctx.logger.info(`[QUESTION] ${question}`);

      const { default: inquirer } = await import("inquirer");

      if (options && options.length > 0) {
        const answer = await inquirer.prompt([
          {
            type: "list",
            name: "response",
            message: question,
            choices: [...options, new inquirer.Separator(), "Type my own answer"],
          },
        ]);
        return {
          name: "question",
          result: { answer: answer.response },
          duration: performance.now() - start,
        };
      }

      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "response",
          message: question,
        },
      ]);

      return {
        name: "question",
        result: { answer: answer.response },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "question",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
