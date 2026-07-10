import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { HecKCodeConfigSchema, type HecKCodeConfig, DEFAULT_CONFIG } from "../types/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function findConfigPath(customPath?: string): string | null {
  if (customPath) {
    return existsSync(customPath) ? customPath : null;
  }

  const candidates = [
    join(process.cwd(), "heckcode.json"),
    join(process.cwd(), "heckcode.jsonc"),
    join(process.cwd(), ".heckcoderc"),
    join(process.cwd(), ".heckcode", "config.json"),
    join(osHomedir(), ".config", "heckcode", "config.json"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return null;
}

export function loadConfig(customPath?: string): HecKCodeConfig {
  const configPath = findConfigPath(customPath);

  if (!configPath) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = HecKCodeConfigSchema.safeParse(parsed);

    if (!result.success) {
      console.warn(
        `[HeckCode] Config validation errors:\n${result.error.errors
          .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
          .join("\n")}`
      );
      console.warn("[HeckCode] Falling back to defaults where invalid");
      return { ...DEFAULT_CONFIG, ...parsed };
    }

    return result.data;
  } catch (err) {
    console.warn(
      `[HeckCode] Failed to load config from ${configPath}: ${(err as Error).message}`
    );
    return { ...DEFAULT_CONFIG };
  }
}

function osHomedir(): string {
  return process.env.HOME || process.env.USERPROFILE || "~";
}
