import fs from "fs";
import path from "path";

export interface MCPAdditionalToken {
  tokenPrompt: string;
  tokenEnvKey: string;
  keychainKey: string;
}

export interface MCPCatalogServer {
  id: string;
  name: string;
  description: string;
  category: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  requiresToken: boolean;
  tokenPrompt?: string;
  tokenEnvKey?: string;
  keychainKey: string;
  tokenIsArg?: boolean;
  additionalTokens?: MCPAdditionalToken[];
}

export interface MCPServersCatalog {
  servers: MCPCatalogServer[];
  categories: Record<string, string>;
}

let cachedCatalog: MCPServersCatalog | null = null;

export function loadMCPServersCatalog(): MCPServersCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  try {
    const catalogPath = path.join(__dirname, "..", "data", "mcp_servers.json");
    const data = fs.readFileSync(catalogPath, "utf-8");
    cachedCatalog = JSON.parse(data) as MCPServersCatalog;
    return cachedCatalog;
  } catch {
    return { servers: [], categories: {} };
  }
}

export function clearMCPCatalogCache(): void {
  cachedCatalog = null;
}
