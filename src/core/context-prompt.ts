import { ContextSession, ConversationEntry } from "../shared/types";

export function generateHandoffPrompt(
  session: ContextSession,
  fromAdapter: string,
  toAdapter: string,
): string {
  let prompt = `You are continuing a coding session that was started with a different tool.\n\n`;
  prompt += `Previous adapter: ${fromAdapter}\n`;
  prompt += `You are: ${toAdapter}\n\n`;

  if (session.task) {
    prompt += `## Current Task\n${session.task}\n\n`;
  }

  if (session.approaches.length > 0) {
    prompt += `## What Was Tried\n`;
    session.approaches.forEach((a) => (prompt += `- ${a}\n`));
    prompt += `\n`;
  }

  if (session.decisions.length > 0) {
    prompt += `## Key Decisions\n`;
    session.decisions.forEach((d) => (prompt += `- ${d}\n`));
    prompt += `\n`;
  }

  if (session.currentState) {
    prompt += `## Current State\n${session.currentState}\n\n`;
  }

  if (session.trackedFiles) {
    const { modified, read } = session.trackedFiles;
    if (modified.length > 0 || read.length > 0) {
      prompt += `## Files Involved\n`;
      prompt += `These files were already analyzed by the previous adapter. You do NOT need to re-read or re-scan them unless the user asks for new changes to them.\n\n`;

      if (modified.length > 0) {
        prompt += `**Modified files** (already changed — review before overwriting):\n`;
        for (const f of modified.slice(0, 30)) {
          prompt += `- ${f}\n`;
        }
        prompt += `\n`;
      }

      if (read.length > 0) {
        prompt += `**Read/analyzed files** (already reviewed — no need to re-scan):\n`;
        for (const f of read.slice(0, 30)) {
          prompt += `- ${f}\n`;
        }
        prompt += `\n`;
      }
    }
  }

  const recent = session.conversationHistory.slice(-20);
  if (recent.length > 0) {
    prompt += `## Recent Conversation\n`;
    for (const entry of recent) {
      const label = entry.role === "user" ? "User" : "Assistant";
      const content =
        entry.content.length > 300 ? entry.content.substring(0, 300) + "..." : entry.content;
      prompt += `${label}: ${content}\n\n`;
    }
  }

  prompt += `Continue from where the previous session left off. The files listed above were already handled — focus on the user's new message without re-scanning known files.`;

  return prompt;
}

export function summarizeHistory(history: ConversationEntry[]): {
  task: string;
  approaches: string[];
  decisions: string[];
  currentState: string;
} {
  const firstUser = history.find((e) => e.role === "user");
  const task = firstUser ? firstUser.content.substring(0, 200) : "Coding session";

  const lastAssistant = [...history]
    .toReversed()
    .find((e: ConversationEntry) => e.role === "assistant");
  const currentState = lastAssistant ? lastAssistant.content.substring(0, 200) : "In progress";

  const approaches = history
    .filter((e) => e.role === "user")
    .slice(-5)
    .map((e) => e.content.substring(0, 100));

  return {
    task,
    approaches,
    decisions: [],
    currentState,
  };
}
