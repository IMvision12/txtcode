import { ConversationEntry, ContextSession } from '../shared/types';
import { saveSession, loadLatestSession } from './context-store';
import { generateHandoffPrompt, summarizeHistory } from './context-prompt';
import { logger } from '../shared/logger';
import { randomUUID } from 'crypto';

export class ContextManager {
    private history: ConversationEntry[] = [];
    private currentAdapter: string = '';
    private maxEntries: number = 50;

    setCurrentAdapter(adapter: string): void {
        this.currentAdapter = adapter;
    }

    addEntry(role: 'user' | 'assistant', content: string): void {
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
    handleSwitch(fromAdapter: string, toAdapter: string): string | null {
        if (this.history.length === 0) {
            logger.debug('No conversation history to transfer');
            return null;
        }

        // Build a structured session from current history
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
        };

        // Persist to disk
        saveSession(session);

        // Generate handoff prompt
        const prompt = generateHandoffPrompt(session, fromAdapter, toAdapter);

        // Reset history for the new adapter
        this.history = [];
        this.currentAdapter = toAdapter;

        logger.debug(`Context handoff: ${fromAdapter} → ${toAdapter} (${session.conversationHistory.length} entries saved)`);

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
