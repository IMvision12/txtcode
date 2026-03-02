import { describe, it, expect, beforeEach } from "vitest";
import { loadModelsCatalog, clearCatalogCache } from "../../src/utils/models-catalog-loader";

describe("Z.ai provider", () => {
  beforeEach(() => {
    clearCatalogCache();
  });

  describe("model catalog", () => {
    it("is discovered by the catalog loader", () => {
      const catalog = loadModelsCatalog();
      expect(catalog.providers.zai).toBeDefined();
    });

    it("has correct provider name", () => {
      const catalog = loadModelsCatalog();
      expect(catalog.providers.zai.name).toBe("Z.ai");
    });

    it("includes all expected models", () => {
      const catalog = loadModelsCatalog();
      const ids = catalog.providers.zai.models.map((m) => m.id);
      expect(ids).toContain("glm-5");
      expect(ids).toContain("glm-4.7");
      expect(ids).toContain("glm-4.6");
    });

    it("has glm-5 marked as recommended", () => {
      const catalog = loadModelsCatalog();
      const glm5 = catalog.providers.zai.models.find((m) => m.id === "glm-5");
      expect(glm5).toBeDefined();
      expect(glm5!.recommended).toBe(true);
    });

    it("every model has a description", () => {
      const catalog = loadModelsCatalog();
      for (const model of catalog.providers.zai.models) {
        expect(model.description).toBeDefined();
        expect(model.description.length).toBeGreaterThan(0);
      }
    });
  });
});
