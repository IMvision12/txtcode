import fs from "fs";
import os from "os";
import path from "path";

const SERVICE_NAME = "txtcode";
const FALLBACK_DIR = path.join(os.homedir(), ".txtcode");
const FALLBACK_FILE = path.join(FALLBACK_DIR, ".credentials.json");

let useFileFallback: boolean | null = null;
let keytarModule: typeof import("keytar") | null = null;

async function getKeytar(): Promise<typeof import("keytar") | null> {
  if (useFileFallback === true) {
    return null;
  }
  if (keytarModule) {
    return keytarModule;
  }
  try {
    keytarModule = await import("keytar");
    // Quick smoke test – if keytar loads but the backend is broken (e.g. no
    // D-Bus / no libsecret inside a container) the first call will throw.
    await keytarModule.findCredentials(SERVICE_NAME);
    useFileFallback = false;
    return keytarModule;
  } catch {
    useFileFallback = true;
    return null;
  }
}

// ---------- File-based fallback (Docker / CI / headless) ----------

function readFallbackStore(): Record<string, string> {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf-8")) as Record<string, string>;
    }
  } catch {
    // Corrupt file – start fresh
  }
  return {};
}

function writeFallbackStore(store: Record<string, string>): void {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
  try {
    if (process.platform !== "win32") {
      fs.chmodSync(FALLBACK_DIR, 0o700);
    }
  } catch {
    // Best-effort
  }
}

// ---------- Public API (unchanged signatures) ----------

/**
 * Store API key securely in OS keychain (falls back to encrypted file in Docker)
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  const account = `${provider}-api-key`;
  const kt = await getKeytar();
  if (kt) {
    try {
      await kt.setPassword(SERVICE_NAME, account, apiKey);
      return;
    } catch (error) {
      throw new Error(`Failed to store API key in keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  store[account] = apiKey;
  writeFallbackStore(store);
}

/**
 * Retrieve API key from OS keychain
 */
export async function getApiKey(provider: string): Promise<string | null> {
  const account = `${provider}-api-key`;
  const kt = await getKeytar();
  if (kt) {
    try {
      return await kt.getPassword(SERVICE_NAME, account);
    } catch (error) {
      throw new Error(`Failed to retrieve API key from keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  return store[account] || null;
}

/**
 * Delete API key from OS keychain
 */
export async function deleteApiKey(provider: string): Promise<boolean> {
  const account = `${provider}-api-key`;
  const kt = await getKeytar();
  if (kt) {
    try {
      return await kt.deletePassword(SERVICE_NAME, account);
    } catch (error) {
      throw new Error(`Failed to delete API key from keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  if (account in store) {
    delete store[account];
    writeFallbackStore(store);
    return true;
  }
  return false;
}

/**
 * Store bot token securely in OS keychain
 */
export async function setBotToken(platform: string, token: string): Promise<void> {
  const account = `${platform}-bot-token`;
  const kt = await getKeytar();
  if (kt) {
    try {
      await kt.setPassword(SERVICE_NAME, account, token);
      return;
    } catch (error) {
      throw new Error(`Failed to store bot token in keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  store[account] = token;
  writeFallbackStore(store);
}

/**
 * Retrieve bot token from OS keychain
 */
export async function getBotToken(platform: string): Promise<string | null> {
  const account = `${platform}-bot-token`;
  const kt = await getKeytar();
  if (kt) {
    try {
      return await kt.getPassword(SERVICE_NAME, account);
    } catch (error) {
      throw new Error(`Failed to retrieve bot token from keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  return store[account] || null;
}

/**
 * Delete bot token from OS keychain
 */
export async function deleteBotToken(platform: string): Promise<boolean> {
  const account = `${platform}-bot-token`;
  const kt = await getKeytar();
  if (kt) {
    try {
      return await kt.deletePassword(SERVICE_NAME, account);
    } catch (error) {
      throw new Error(`Failed to delete bot token from keychain: ${error}`, { cause: error });
    }
  }
  const store = readFallbackStore();
  if (account in store) {
    delete store[account];
    writeFallbackStore(store);
    return true;
  }
  return false;
}

/**
 * Check if keychain is available
 */
export async function isKeychainAvailable(): Promise<boolean> {
  const kt = await getKeytar();
  if (kt) {
    try {
      await kt.setPassword(SERVICE_NAME, "test-key", "test-value");
      await kt.deletePassword(SERVICE_NAME, "test-key");
      return true;
    } catch {
      return false;
    }
  }
  // File fallback is always "available"
  return true;
}

/**
 * Delete all txtcode credentials from keychain
 */
export async function clearAllCredentials(): Promise<void> {
  const kt = await getKeytar();
  if (kt) {
    try {
      const credentials = await kt.findCredentials(SERVICE_NAME);
      for (const cred of credentials) {
        await kt.deletePassword(SERVICE_NAME, cred.account);
      }
      return;
    } catch (error) {
      throw new Error(`Failed to clear credentials: ${error}`, { cause: error });
    }
  }
  // File fallback: just wipe the file
  if (fs.existsSync(FALLBACK_FILE)) {
    fs.unlinkSync(FALLBACK_FILE);
  }
}
