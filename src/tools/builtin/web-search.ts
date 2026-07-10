import type { Tool, ToolInput, ToolOutput } from "../../types/tool.js";

function parseResults(html: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const resultRegex =
    /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__url"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    results.push({
      title: match[1].replace(/<[^>]+>/g, "").trim(),
      url: match[2].replace(/<[^>]+>/g, "").trim(),
      snippet: match[3].replace(/<[^>]+>/g, "").trim(),
    });
  }

  return results;
}

export const webSearchTool: Tool = {
  definition: {
    name: "web_search",
    description: "Search the web for information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        numResults: {
          type: "number",
          description: "Number of results (default: 8)",
        },
      },
    },
    required: ["query"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const start = performance.now();
    try {
      const { query } = input.args as { query: string; numResults?: number };

      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(15000),
      });

      const html = await response.text();
      const results = parseResults(html).slice(0, 8);

      return {
        name: "web_search",
        result: { results, query },
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        name: "web_search",
        result: null,
        error: (err as Error).message,
        duration: performance.now() - start,
      };
    }
  },
};
