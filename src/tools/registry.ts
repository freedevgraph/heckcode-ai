import type { Tool, ToolDefinition, ToolInput, ToolOutput, ToolContext } from "../types/tool.js";
import { readFileTool } from "./builtin/read-file.js";
import { writeFileTool } from "./builtin/write-file.js";
import { editTool } from "./builtin/edit.js";
import { bashTool } from "./builtin/bash.js";
import { globTool } from "./builtin/glob.js";
import { grepTool } from "./builtin/grep.js";
import { webFetchTool } from "./builtin/web-fetch.js";
import { webSearchTool } from "./builtin/web-search.js";
import { questionTool } from "./builtin/question.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private toolContext?: ToolContext;

  constructor(context?: ToolContext) {
    this.toolContext = context;
    this.registerDefaults();
  }

  setContext(ctx: ToolContext) {
    this.toolContext = ctx;
  }

  private registerDefaults() {
    const defaults: Tool[] = [
      readFileTool,
      writeFileTool,
      editTool,
      bashTool,
      globTool,
      grepTool,
      webFetchTool,
      webSearchTool,
      questionTool,
    ];
    for (const tool of defaults) {
      this.tools.set(tool.definition.name, tool);
    }
  }

  register(tool: Tool) {
    this.tools.set(tool.definition.name, tool);
  }

  unregister(name: string) {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  getDefinitions(names?: string[]): ToolDefinition[] {
    if (!names || names.length === 0) return this.getAllDefinitions();
    return names
      .map((n) => this.tools.get(n)?.definition)
      .filter((d): d is ToolDefinition => !!d);
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    const tool = this.tools.get(input.name);
    if (!tool) {
      return {
        name: input.name,
        result: null,
        error: `Unknown tool: ${input.name}`,
        duration: 0,
      };
    }

    return tool.execute(input, this.toolContext);
  }
}
