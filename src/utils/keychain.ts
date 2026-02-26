import * as keytar from "keytar";

const SERVICE_NAME = "txtcode";

/**
 * Store API key securely in OS keychain
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  try {
    await keytar.setPassword(SERVICE_NAME, `${provider}-api-key`, apiKey);
  } catch (error) {
    throw new Error(`Failed to store API key in keychain: ${error}`, { cause: error });
  }
}

/**
 * Retrieve API key from OS keychain
 */
export async function getApiKey(provider: string): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE_NAME, `${provider}-api-key`);
  } catch (error) {
    throw new Error(`Failed to retrieve API key from keychain: ${error}`, { cause: error });
  }
}

/**
 * Delete API key from OS keychain
 */
export async function deleteApiKey(provider: string): Promise<boolean> {
  try {
    return await keytar.deletePassword(SERVICE_NAME, `${provider}-api-key`);
  } catch (error) {
    throw new Error(`Failed to delete API key from keychain: ${error}`, { cause: error });
  }
}

/**
 * Store bot token securely in OS keychain
 */
export async function setBotToken(platform: string, token: string): Promise<void> {
  try {
    await keytar.setPassword(SERVICE_NAME, `${platform}-bot-token`, token);
  } catch (error) {
    throw new Error(`Failed to store bot token in keychain: ${error}`, { cause: error });
  }
}

/**
 * Retrieve bot token from OS keychain
 */
export async function getBotToken(platform: string): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE_NAME, `${platform}-bot-token`);
  } catch (error) {
    throw new Error(`Failed to retrieve bot token from keychain: ${error}`, { cause: error });
  }
}

/**
 * Delete bot token from OS keychain
 */
export async function deleteBotToken(platform: string): Promise<boolean> {
  try {
    return await keytar.deletePassword(SERVICE_NAME, `${platform}-bot-token`);
  } catch (error) {
    throw new Error(`Failed to delete bot token from keychain: ${error}`, { cause: error });
  }
}

/**
 * Check if keychain is available
 */
export async function isKeychainAvailable(): Promise<boolean> {
  try {
    // Try to set and delete a test credential
    await keytar.setPassword(SERVICE_NAME, "test-key", "test-value");
    await keytar.deletePassword(SERVICE_NAME, "test-key");
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete all txtcode credentials from keychain
 */
export async function clearAllCredentials(): Promise<void> {
  try {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    for (const cred of credentials) {
      await keytar.deletePassword(SERVICE_NAME, cred.account);
    }
  } catch (error) {
    throw new Error(`Failed to clear credentials: ${error}`, { cause: error });
  }
}
