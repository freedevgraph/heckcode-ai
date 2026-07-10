import type { Tool, ToolInput, ToolOutput } from "../../types/tool.js";

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "## $1\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const webFetchTool: Tool = {
  definition: {
    name: "web_fetch",
    description: "Fetch and retrieve content from a URL",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch content from" },
        format: {
          type: "string",
          enum: ["markdown", "text", "html"],
          description: "Response format (default: markdown)",
        },
      },
    },
    required: ["url"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { url, format } = input.args as {
        url: string;
        format?: string;
      };

      const response = await fetch(url, {
        headers: { "User-Agent": "HeckCode/1.0" },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      let result = text;
      if (format === "markdown" || format === undefined) {
        if (contentType.includes("text/html")) {
          result = htmlToMarkdown(text);
        }
      }

      return {
        name: "web_fetch",
        result: { content: result.slice(0, 50000), url, contentType },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "web_fetch",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
