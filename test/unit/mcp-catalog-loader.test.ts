import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import {
  loadMCPServersCatalog,
  clearMCPCatalogCache,
} from "../../src/utils/mcp-catalog-loader";

vi.mock("../../src/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("MCP Catalog Loader", () => {
  beforeEach(() => {
    clearMCPCatalogCache();
  });

  it("loads the catalog from mcp_servers.json", () => {
    const catalog = loadMCPServersCatalog();

    expect(catalog.servers).toBeDefined();
    expect(Array.isArray(catalog.servers)).toBe(true);
    expect(catalog.servers.length).toBe(13);
    expect(catalog.categories).toBeDefined();
  });

  it("returns all 13 expected servers", () => {
    const catalog = loadMCPServersCatalog();
    const ids = catalog.servers.map((s) => s.id);

    expect(ids).toContain("github");
    expect(ids).toContain("brave-search");
    expect(ids).toContain("puppeteer");
    expect(ids).toContain("postgres");
    expect(ids).toContain("mongodb");
    expect(ids).toContain("redis");
    expect(ids).toContain("elasticsearch");
    expect(ids).toContain("aws");
    expect(ids).toContain("gcp");
    expect(ids).toContain("cloudflare");
    expect(ids).toContain("vercel");
    expect(ids).toContain("atlassian");
    expect(ids).toContain("supabase");
  });

  it("stdio servers have command field", () => {
    const catalog = loadMCPServersCatalog();
    const stdioServers = catalog.servers.filter((s) => s.transport === "stdio");

    expect(stdioServers.length).toBeGreaterThan(0);
    for (const server of stdioServers) {
      expect(server.command).toBeDefined();
      expect(typeof server.command).toBe("string");
    }
  });

  it("HTTP servers have url field", () => {
    const catalog = loadMCPServersCatalog();
    const httpServers = catalog.servers.filter((s) => s.transport === "http");

    expect(httpServers.length).toBeGreaterThan(0);
    for (const server of httpServers) {
      expect(server.url).toBeDefined();
      expect(typeof server.url).toBe("string");
    }
  });

  it("every server has a keychainKey", () => {
    const catalog = loadMCPServersCatalog();

    for (const server of catalog.servers) {
      expect(server.keychainKey).toBeDefined();
      expect(server.keychainKey.startsWith("mcp-")).toBe(true);
    }
  });

  it("every server has a category", () => {
    const catalog = loadMCPServersCatalog();
    const validCategories = Object.keys(catalog.categories);

    for (const server of catalog.servers) {
      expect(server.category).toBeDefined();
      expect(validCategories).toContain(server.category);
    }
  });

  it("caches the catalog on subsequent calls", () => {
    const readSpy = vi.spyOn(fs, "readFileSync");

    const first = loadMCPServersCatalog();
    const second = loadMCPServersCatalog();

    expect(first).toBe(second);
    expect(readSpy).toHaveBeenCalledTimes(1);

    readSpy.mockRestore();
  });

  it("clearMCPCatalogCache resets the cache", () => {
    const readSpy = vi.spyOn(fs, "readFileSync");

    loadMCPServersCatalog();
    clearMCPCatalogCache();
    loadMCPServersCatalog();

    expect(readSpy).toHaveBeenCalledTimes(2);

    readSpy.mockRestore();
  });

  it("returns empty catalog when file does not exist", () => {
    clearMCPCatalogCache();
    const readSpy = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const catalog = loadMCPServersCatalog();
    expect(catalog.servers).toEqual([]);
    expect(catalog.categories).toEqual({});

    readSpy.mockRestore();
  });

  describe("GitHub server entry", () => {
    it("has correct configuration", () => {
      const catalog = loadMCPServersCatalog();
      const github = catalog.servers.find((s) => s.id === "github");

      expect(github).toBeDefined();
      expect(github!.transport).toBe("stdio");
      expect(github!.command).toBe("npx");
      expect(github!.args).toContain("@modelcontextprotocol/server-github");
      expect(github!.requiresToken).toBe(true);
      expect(github!.tokenEnvKey).toBe("GITHUB_PERSONAL_ACCESS_TOKEN");
      expect(github!.keychainKey).toBe("mcp-github");
      expect(github!.category).toBe("developer");
    });
  });

  describe("Supabase server entry (HTTP)", () => {
    it("has correct configuration", () => {
      const catalog = loadMCPServersCatalog();
      const supabase = catalog.servers.find((s) => s.id === "supabase");

      expect(supabase).toBeDefined();
      expect(supabase!.transport).toBe("http");
      expect(supabase!.url).toContain("mcp.supabase.com");
      expect(supabase!.requiresToken).toBe(true);
      expect(supabase!.keychainKey).toBe("mcp-supabase");
    });
  });

  describe("AWS server entry (multi-token)", () => {
    it("has additional tokens configured", () => {
      const catalog = loadMCPServersCatalog();
      const aws = catalog.servers.find((s) => s.id === "aws");

      expect(aws).toBeDefined();
      expect(aws!.additionalTokens).toBeDefined();
      expect(aws!.additionalTokens!.length).toBeGreaterThanOrEqual(2);

      const envKeys = aws!.additionalTokens!.map((t) => t.tokenEnvKey);
      expect(envKeys).toContain("AWS_SECRET_ACCESS_KEY");
      expect(envKeys).toContain("AWS_REGION");
    });
  });
});
