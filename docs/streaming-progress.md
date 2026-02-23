# Output Streaming & Progress Callbacks

## Overview

The system supports real-time streaming of output from CLI adapters to platforms using an intelligent block-based pipeline inspired by OpenClaw. Streaming is only active when executing code tasks in CODE mode. Users get live progress updates during long-running operations, while commands and chat interactions remain instant and clean.

## Architecture

The streaming system uses a multi-layer pipeline:

1. **BlockChunker** - Intelligently breaks text into readable chunks at paragraph/sentence/newline boundaries
2. **StreamNormalizer** - Strips ANSI codes, control characters, and heartbeat tokens
3. **TypingSignaler** - Platform-specific typing indicators (Discord, Telegram, WhatsApp)
4. **BlockReplyPipeline** - Orchestrates the entire streaming flow with rate limiting

## When Streaming is Active

Streaming is **only enabled** when:
- User is in **CODE mode** (not CHAT mode)
- Message is **not a command** (`/code`, `/chat`, `/switch`, `help`, `status`)
- User is **not selecting an adapter** (not in the middle of `/switch`)

Streaming is **disabled** for:
- All commands (`/code`, `/chat`, `/switch`, `help`, `status`)
- CHAT mode interactions
- Adapter selection prompts

## How It Works

### Flow

1. **User sends message** → Platform (Discord/Telegram/WhatsApp)
2. **Platform checks mode** → If command or CHAT mode, skip streaming
3. **CODE mode task** → Platform sends initial "Working..." message
4. **Heartbeat starts** → Sends "Still working... (Xs elapsed)" every 5 seconds
5. **CLI outputs** → Platform sends progress updates with actual output
6. **Task completes** → Heartbeat stops, final response sent

### Implementation Details

#### Agent Core

```typescript
export class AgentCore {
  isUserInCodeMode(userId: string): boolean {
    return this.userModes.get(userId) === "code";
  }

  isPendingSwitch(userId: string): boolean {
    return this.pendingSwitch.get(userId) === true;
  }
}
```

#### IDEAdapter Interface

```typescript
export interface IDEAdapter {
  executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
    onProgress?: (chunk: string) => void,  // Optional progress callback
  ): Promise<string>;
}
```

#### Adapter Implementation

All adapters (Claude Code, Gemini CLI, Kiro CLI, Ollama, OpenAI Codex) call the progress callback when data arrives:

```typescript
child.stdout.on("data", (data) => {
  const text = data.toString();
  output += text;

  // Send progress update if callback provided
  if (onProgress) {
    onProgress(text);
  }

  // Only log important status, filter out code diffs
  // ... logging logic
});
```

#### Code Filtering in Adapters

Adapters filter out verbose code content from logs:
- Diff markers (`+`, `-`, `@@`, `diff`, `index`, `---`, `+++`)
- Code lines (`def`, `class`, `import`, `from`, `return`)
- Indented code (4+ spaces)
- Long lines (>150 chars)

Only important status messages are logged:
- `thinking`, `tokens used`, `succeeded in`
- `exec`, `file update`, `apply_patch`
- `Command executed`, `Success`

#### Platform Implementation

Platforms implement mode checking, heartbeat mechanism, and BlockReplyPipeline:

**Mode Check (All Platforms):**
```typescript
const lowerText = text.toLowerCase();
const isCommand =
  lowerText === "/code" ||
  lowerText === "/chat" ||
  lowerText === "/switch" ||
  lowerText === "help" ||
  lowerText === "/help" ||
  lowerText === "status" ||
  lowerText === "/status" ||
  !this.agent.isUserInCodeMode(from) ||
  this.agent.isPendingSwitch(from);

// For commands and chat mode, no streaming
if (isCommand) {
  const response = await this.agent.processMessage({ from, text, timestamp });
  await sendMessage(response);
  return;
}
```

**BlockReplyPipeline Setup:**
```typescript
// Create typing signaler
const typingSignaler = new WhatsAppTypingSignaler(sock, from);

// Create block reply pipeline
const pipeline = new BlockReplyPipeline({
  chunking: {
    minChars: 150,
    maxChars: 500,
    breakPreference: "paragraph",
    flushOnParagraph: true,
  },
  typingSignaler,
  onChunk: async (chunk: StreamChunk) => {
    const prefix = chunk.isComplete ? "✅" : "⏳ Progress...";
    await sendMessage(`${prefix}\n\`\`\`\n${chunk.text}\n\`\`\`\`);
  },
});

// Process CLI output through pipeline
const response = await agent.processMessage(
  { from, text, timestamp },
  async (chunk: string) => {
    await pipeline.processText(chunk);
  }
);

// Flush remaining content
await pipeline.flush({ force: true });
```

**Heartbeat Implementation:**
- Initial message: "⏳ Working on your request..."
- Periodic updates: "⏳ Still working... (Xs elapsed)" every 25 seconds
- Progress chunks: "⏳ Progress... [CLI output]" sent intelligently (min 2s interval)
- Cleanup: Heartbeat cleared on completion or error

**Discord:**
- Edits the same message to show progress
- Uses DiscordTypingSignaler (refreshes every 8 seconds)
- Intelligent chunking at paragraph boundaries

**Telegram:**
- Edits the same message to show progress
- Uses TelegramTypingSignaler (refreshes every 4 seconds)
- Intelligent chunking at paragraph boundaries

**WhatsApp:**
- Sends new messages for progress (WhatsApp doesn't support message editing)
- Uses WhatsAppTypingSignaler (refreshes every 3 seconds)
- Intelligent chunking at paragraph boundaries

## Example User Experience

### Commands (No Streaming)
```
User: /code
Bot: [CODE MODE] Switched to CODE mode
     (instant response)

User: help
Bot: TxtCode Agent
     Available commands: ...
     (instant response)
```

### Chat Mode (No Streaming)
```
User: Hi
Bot: Hello! I'm a coding assistant...
     (instant response)
```

### CODE Mode Task (With Streaming)
```
User: Create a new React component
Bot: ⏳ Working on your request...

[25 seconds later]
Bot: ⏳ Still working... (25s elapsed)

[50 seconds later]
Bot: ⏳ Still working... (50s elapsed)

[CLI outputs something]
Bot: ⏳ Progress...
```
Analyzing files...
Creating component file...
```

[Final]
Bot: Created React component at src/components/MyComponent.tsx
     [Complete formatted response]
```

## Benefits

1. **Clean UX for Commands** - Instant responses for `/code`, `/chat`, `/switch`, `help`, `status`
2. **Fast Chat Mode** - No streaming overhead for conversational interactions
3. **Detailed Progress for Tasks** - Users see what's happening during long code operations
4. **Transparency** - Users can see file creation, test running, etc.
5. **Reduced Anxiety** - Heartbeat shows the system is still working
6. **Better Debugging** - Easier to identify where a process might be stuck
7. **Clean Logs** - Code diffs filtered out, only important status logged

## Configuration

No configuration needed - the feature is automatically enabled based on user mode:
- **CHAT mode or commands**: No streaming (instant responses)
- **CODE mode tasks**: Full streaming with heartbeat

## Technical Details

### Heartbeat Interval
- 25 seconds between updates
- Tracks elapsed time from task start
- Automatically cleared on completion or error

### Intelligent Chunking
- **minChars**: 150 - Minimum characters before sending a chunk
- **maxChars**: 500 - Maximum characters in a single chunk
- **breakPreference**: "paragraph" - Prefers breaking at paragraph boundaries
- **flushOnParagraph**: true - Sends chunk immediately after paragraph
- Breaks at: paragraph > sentence > newline > word boundaries

### Stream Normalization
- Strips ANSI escape codes (colors, cursor movements)
- Removes control characters
- Filters heartbeat tokens
- Preserves meaningful content

### Rate Limiting
- Minimum 2 seconds between progress chunks
- Prevents message spam
- Deduplicates identical chunks
- Typing indicators refresh at platform-specific intervals

### CLI Buffering Limitation
CLI tools (Codex, Claude, Gemini, etc.) often buffer their output and send it in chunks rather than streaming continuously. The heartbeat mechanism ensures users still get periodic updates even when the CLI produces no output.

### Error Handling
- Heartbeat cleared on any error
- Progress messages fail gracefully
- Final response always sent

## Components

### BlockChunker (`shared/block-chunker.ts`)
Intelligently breaks text into readable chunks at natural boundaries.

### StreamNormalizer (`shared/stream-normalizer.ts`)
Cleans CLI output by removing ANSI codes and control characters.

### TypingSignaler (`shared/typing-signaler.ts`)
Platform-specific typing indicators:
- `DiscordTypingSignaler` - Refreshes every 8 seconds
- `TelegramTypingSignaler` - Refreshes every 4 seconds
- `WhatsAppTypingSignaler` - Refreshes every 3 seconds

### BlockReplyPipeline (`shared/block-reply-pipeline.ts`)
Orchestrates the entire streaming flow with rate limiting and deduplication.

### StreamChunk Type (`shared/streaming-types.ts`)
```typescript
export interface StreamChunk {
  text: string;
  timestamp: number;
  isComplete: boolean;
}
```

## Backward Compatibility

The `onProgress` parameter is optional, so:
- Existing code works without changes
- Platforms can choose to implement streaming or not
- Adapters work with or without the callback
