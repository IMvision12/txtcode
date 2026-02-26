import fs from "fs";
import path from "path";

export interface Model {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

export interface Provider {
  name: string;
  apiKeyEnv: string;
  models: Model[];
}

export interface ModelsCatalog {
  providers: Record<string, Provider>;
}

let cachedCatalog: ModelsCatalog | null = null;

/**
 * Loads the models catalog from individual provider JSON files
 * This approach keeps the catalog modular and easier to maintain
 */
export function loadModelsCatalog(): ModelsCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const dataDir = path.join(__dirname, "..", "data");
  const catalog: ModelsCatalog = { providers: {} };

  try {
    // Load all provider JSON files from the data directory
    const files = fs.readdirSync(dataDir);

    for (const file of files) {
      if (file.endsWith("_models.json")) {
        const providerId = file.replace("_models.json", "");
        const filePath = path.join(dataDir, file);
        const data = fs.readFileSync(filePath, "utf-8");
        catalog.providers[providerId] = JSON.parse(data);
      }
    }

    // Fallback to monolithic file if no provider files found
    if (Object.keys(catalog.providers).length === 0) {
      const catalogPath = path.join(dataDir, "models-catalog.json");
      if (fs.existsSync(catalogPath)) {
        const data = fs.readFileSync(catalogPath, "utf-8");
        const monolithicCatalog = JSON.parse(data) as ModelsCatalog;
        cachedCatalog = monolithicCatalog;
        return monolithicCatalog;
      }
      throw new Error("No provider files found");
    }

    cachedCatalog = catalog;
    return catalog;
  } catch (error) {
    throw new Error(
      `Failed to load models catalog: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error },
    );
  }
}

/**
 * Clears the cached catalog (useful for testing)
 */
export function clearCatalogCache(): void {
  cachedCatalog = null;
}
