import fs from "fs";
import os from "os";
import path from "path";
import { logger } from "../shared/logger";
import { ContextSession } from "../shared/types";

const SESSIONS_DIR = path.join(os.homedir(), ".txtcode", "sessions");

function ensureDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

export function saveSession(session: ContextSession): string {
  ensureDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  logger.debug(`Context session saved to ${filePath}`);

  return filePath;
}

export function loadLatestSession(): ContextSession | null {
  ensureDir();

  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .toSorted()
    .toReversed();

  if (files.length === 0) {
    return null;
  }

  try {
    const data = fs.readFileSync(path.join(SESSIONS_DIR, files[0]), "utf-8");
    return JSON.parse(data) as ContextSession;
  } catch (error) {
    logger.debug(`Failed to load session: ${error}`);
    return null;
  }
}

export function loadAllSessions(): ContextSession[] {
  ensureDir();

  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .toSorted()
    .toReversed();

  const sessions: ContextSession[] = [];

  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(SESSIONS_DIR, file), "utf-8");
      sessions.push(JSON.parse(data) as ContextSession);
    } catch (error) {
      logger.debug(`Failed to load session ${file}: ${error}`);
    }
  }

  return sessions;
}

export function clearSessions(): void {
  ensureDir();

  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    fs.unlinkSync(path.join(SESSIONS_DIR, file));
  }

  logger.debug(`Cleared ${files.length} session files`);
}
