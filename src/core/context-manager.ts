import { randomUUID } from "crypto";
import { logger } from "../shared/logger";
import { ConversationEntry, ContextSession, TrackedFiles } from "../shared/types";
import { generateHandoffPrompt, summarizeHistory } from "./context-prompt";
import { saveSession, loadLatestSession } from "./context-store";

export class ContextManager {
  private history: ConversationEntry[] = [];
  private currentAdapter: string = "";
  private maxEntries: number = 50;

  setCurrentAdapter(adapter: string): void {
    this.currentAdapter = adapter;
  }

  addEntry(role: "user" | "assistant", content: string): void {
    this.history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      adapter: this.currentAdapter,
    });

    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(-this.maxEntries);
    }
  }

  /**
   * Called when switching adapters. Saves current session to disk,
   * generates a handoff prompt, and resets in-memory history.
   */
  handleSwitch(fromAdapter: string, toAdapter: string, trackedFiles?: TrackedFiles): string | null {
    if (this.history.length === 0) {
      logger.debug("No conversation history to transfer");
      return null;
    }

    const summary = summarizeHistory(this.history);

    const session: ContextSession = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      adapter: fromAdapter,
      task: summary.task,
      approaches: summary.approaches,
      decisions: summary.decisions,
      currentState: summary.currentState,
      conversationHistory: [...this.history],
      trackedFiles: trackedFiles,
    };

    saveSession(session);

    const prompt = generateHandoffPrompt(session, fromAdapter, toAdapter);

    this.history = [];
    this.currentAdapter = toAdapter;

    logger.debug(
      `Context handoff: ${fromAdapter} → ${toAdapter} (${session.conversationHistory.length} entries, ${(trackedFiles?.modified.length || 0) + (trackedFiles?.read.length || 0)} tracked files)`,
    );

    return prompt;
  }

  /**
   * Load the latest persisted session (for restart recovery).
   */
  loadPreviousSession(): ContextSession | null {
    return loadLatestSession();
  }

  getEntryCount(): number {
    return this.history.length;
  }

  getHistory(): ConversationEntry[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}
