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

  // Include recent conversation (last 10 exchanges, truncated)
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

  prompt += `Continue from where the previous session left off. Only respond to the user's new message — do not repeat or summarize the above context.`;

  return prompt;
}

export function summarizeHistory(history: ConversationEntry[]): {
  task: string;
  approaches: string[];
  decisions: string[];
  currentState: string;
} {
  // Extract task from the first user message
  const firstUser = history.find((e) => e.role === "user");
  const task = firstUser ? firstUser.content.substring(0, 200) : "Coding session";

  // Extract current state from the last assistant response
  const lastAssistant = [...history].toReversed().find((e) => e.role === "assistant");
  const currentState = lastAssistant ? lastAssistant.content.substring(0, 200) : "In progress";

  // Extract approaches from user messages (each user message is roughly an approach/instruction)
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
