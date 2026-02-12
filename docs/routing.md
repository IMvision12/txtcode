# OpenCode Message Routing

OpenCode uses intelligent routing to send messages to the appropriate AI system based on the content.

## Two-Tier Architecture

### 1. Primary LLM (General Chat)
- **Purpose**: Handle general questions, explanations, conversations
- **Providers**: Anthropic Claude, OpenAI GPT, Google Gemini
- **Cost**: Low (standard API pricing)
- **Speed**: Fast
- **Use Cases**:
  - "What is Python?"
  - "Explain async/await"
  - "Hi, how are you?"
  - General programming questions

### 2. Code Assistant (Claude Code)
- **Purpose**: Execute actual coding tasks with file operations
- **Providers**: Claude Code (Official) or Ollama (Local)
- **Cost**: Higher (API) or Free (Ollama)
- **Speed**: Slower (model loading)
- **Use Cases**:
  - "Create a file named app.py"
  - "Fix the bug in main.js"
  - "Run the script"
  - "Add a new feature"

## Routing Logic

The agent automatically detects coding tasks based on:

### Coding Keywords
- File operations: create, make, write, delete, modify, edit, update
- Code operations: code, function, class, implement, refactor, debug, fix
- Actions: run, execute, compile, test, install, setup
- Project terms: project, app, script, program, api, database

### Code Patterns
- File extensions: `.py`, `.js`, `.ts`, `.java`, etc.
- Code blocks: ` ``` `
- Code syntax: `import`, `function`, `class`, `const`, `def`

## Examples

### Routed to Primary LLM
```
User: "What's the difference between let and const?"
→ Primary LLM (Gemini/GPT/Claude API)
→ Fast, cheap response
```

### Routed to Code Assistant
```
User: "Create a Python calculator in calc.py"
→ Claude Code (with file tools)
→ File created with working code
```

## Benefits

1. **Cost Optimization**: Simple questions don't use expensive code execution
2. **Speed**: General chat is faster without model loading
3. **Appropriate Tools**: Code tasks get file operations, chat gets knowledge
4. **Better UX**: Right tool for the right job

## Configuration

Set your primary LLM provider:
```bash
opencode config
# Select AI Provider: Anthropic/OpenAI/Gemini
```

Set your code assistant:
```bash
opencode config
# Select IDE: Claude Code (Official) or Ollama
```

## Manual Override

If routing is incorrect, you can be explicit:
- For coding: Use keywords like "create file", "run code"
- For chat: Ask questions without coding keywords
