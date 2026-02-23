# Output Streaming & Progress Callbacks

## Overview

The system supports real-time streaming of output from CLI adapters to platforms, but only when executing code tasks in CODE mode. Users get live progress updates during long-running operations, while commands and chat interactions remain instant and clean.

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

Platforms implement mode checking and heartbeat mechanism:

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

**Heartbeat Implementation:**
- Initial message: "⏳ Working on your request..."
- Periodic updates: "⏳ Still working... (Xs elapsed)" every 5 seconds
- Progress updates: "⏳ Progress... [CLI output]" when CLI outputs
- Cleanup: Heartbeat cleared on completion or error

**Discord:**
- Edits the same message to show progress
- Shows last 5 lines (max 300 chars) as preview
- Heartbeat every 5 seconds

**Telegram:**
- Edits the same message to show progress
- Shows last 5 lines (max 300 chars) as preview
- Heartbeat every 5 seconds

**WhatsApp:**
- Sends new messages for progress (WhatsApp doesn't support message editing)
- Shows last 5 lines (max 300 chars) as preview
- Heartbeat every 5 seconds

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

[5 seconds later]
Bot: ⏳ Still working... (5s elapsed)

[10 seconds later]
Bot: ⏳ Still working... (10s elapsed)

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
- 5 seconds between updates
- Tracks elapsed time from task start
- Automatically cleared on completion or error

### Progress Preview
- Extracts last 5 lines from buffer
- Maximum 300 characters
- Filters out verbose code content

### CLI Buffering Limitation
CLI tools (Codex, Claude, Gemini, etc.) often buffer their output and send it in chunks rather than streaming continuously. The heartbeat mechanism ensures users still get periodic updates even when the CLI produces no output.

### Error Handling
- Heartbeat cleared on any error
- Progress messages fail gracefully
- Final response always sent

## Backward Compatibility

The `onProgress` parameter is optional, so:
- Existing code works without changes
- Platforms can choose to implement streaming or not
- Adapters work with or without the callback
