interface HFModelEntry {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  name?: string;
  title?: string;
  display_name?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    [key: string]: unknown;
  };
  providers?: Array<{
    provider?: string;
    context_length?: number;
    status?: string;
    pricing?: { input?: number; output?: number; [key: string]: unknown };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface OpenAIListModelsResponse {
  object?: string;
  data?: HFModelEntry[];
}

export interface DiscoveredModel {
  id: string;
  name: string;
  description?: string;
}

const HUGGINGFACE_BASE_URL = "https://router.huggingface.co/v1";

function inferMetaFromModelId(id: string): { name: string; description: string } {
  const base = id.split("/").pop() ?? id;
  const name = base.replace(/-/g, " ").replace(/\b(\w)/g, (c) => c.toUpperCase());
  
  let description = "HuggingFace model";
  if (/r1|reasoning|thinking/i.test(id)) {
    description = "Reasoning model";
  } else if (/coder|code/i.test(id)) {
    description = "Coding model";
  } else if (/instruct/i.test(id)) {
    description = "Instruction-tuned model";
  } else if (/turbo|fast/i.test(id)) {
    description = "Optimized for speed";
  }
  
  return { name, description };
}

function displayNameFromApiEntry(entry: HFModelEntry, inferredName: string): string {
  const fromApi =
    (typeof entry.name === "string" && entry.name.trim()) ||
    (typeof entry.title === "string" && entry.title.trim()) ||
    (typeof entry.display_name === "string" && entry.display_name.trim());
  
  if (fromApi) {
    return fromApi;
  }
  
  if (typeof entry.owned_by === "string" && entry.owned_by.trim()) {
    const base = entry.id.split("/").pop() ?? entry.id;
    return `${entry.owned_by.trim()}/${base}`;
  }
  
  return inferredName;
}

export async function discoverHuggingFaceModels(apiKey: string): Promise<DiscoveredModel[]> {
  const trimmedKey = apiKey?.trim();
  
  if (!trimmedKey) {
    throw new Error("HuggingFace API key is required to discover models");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${HUGGINGFACE_BASE_URL}/models`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HuggingFace API returned ${response.status}: ${errorText || "Unknown error"}`,
      );
    }

    const body = (await response.json()) as OpenAIListModelsResponse;
    const data = body?.data;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No models returned from HuggingFace API");
    }

    const seen = new Set<string>();
    const models: DiscoveredModel[] = [];

    for (const entry of data) {
      const id = typeof entry?.id === "string" ? entry.id.trim() : "";
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);

      const inferred = inferMetaFromModelId(id);
      const name = displayNameFromApiEntry(entry, inferred.name);

      models.push({
        id,
        name,
        description: inferred.description,
      });
    }

    if (models.length === 0) {
      throw new Error("No valid models found in HuggingFace API response");
    }

    return models;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if ((error as Error).name === "AbortError") {
      throw new Error("HuggingFace API request timed out. Please check your connection and try again.");
    }
    
    throw error;
  }
}
