# /switch Command

The `/switch` command allows you to dynamically switch between different configurations without restarting the agent.

## Usage

Simply type `/switch` in any mode (chat or code) to start the switching process.

## Flow

### Step 1: Choose What to Switch

When you use `/switch`, you'll see:

```
🔄 Switch Configuration

What would you like to switch?

1. Primary LLM (Chat Mode)
2. Coding Adaptor (Code Mode)

Reply with 1 or 2:
```

### Step 2a: Switching Primary LLM

If you choose option 1, you'll see available providers:

```
🤖 Switch Primary LLM

Current: anthropic (claude-sonnet-4-20250514)

1. Anthropic (Claude)
2. OpenAI (GPT)
3. Google Gemini
4. OpenRouter

Reply with a number (1-4) to switch:
```

After selecting a provider, you'll be prompted for an API key:

```
Please enter your API key for openai:

(Your API key will be saved securely in ~/.txtcode/config.json)
```

Once you provide the API key, the system will:
- Update your configuration file
- Set a default recommended model for that provider
- Switch the primary LLM immediately

### Step 2b: Switching Coding Adaptor

If you choose option 2, you'll see available adapters:

```
🔄 Switch Coding Adapter

Current: claude-code

1. Claude Code (Anthropic API)
2. Gemini Code (Google AI API)
3. OpenAI Codex (OpenAI API)
4. Claude Code via Ollama (Local)
5. Kiro CLI (AWS)

Reply with a number (1-5) to switch:
```

After selecting an adapter, the system will:
- Save your current conversation context
- Disconnect from the old adapter
- Connect to the new adapter
- Transfer context if available

## Features

- **No restart required**: Switch configurations on the fly
- **Context preservation**: When switching adapters, your conversation history is saved and transferred
- **Secure storage**: API keys are stored in `~/.txtcode/config.json`
- **Default models**: Automatically selects recommended models for each provider
- **Works in any mode**: Can be used in both chat and code modes

## Examples

### Example 1: Switch from Anthropic to OpenAI

```
User: /switch
Agent: [Shows main menu]
User: 1
Agent: [Shows provider list]
User: 2
Agent: Please enter your API key for openai:
User: sk-proj-xxxxx
Agent: ✅ Primary LLM switched!
       Provider: openai
       Model: gpt-4o
```

### Example 2: Switch from Claude Code to Codex

```
User: /switch
Agent: [Shows main menu]
User: 2
Agent: [Shows adapter list]
User: 3
Agent: ✅ Adapter switched!
       claude-code → codex
       📋 Context saved & transferred (5 exchanges)
```

## Notes

- The system automatically selects the first recommended model for each provider
- Your API key is stored securely and reused for future sessions
- Context handoff ensures smooth transitions between adapters
- All changes are persisted to `~/.txtcode/config.json`
