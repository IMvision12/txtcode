# OpenCode Commands Reference

Complete guide to all OpenCode CLI commands and their usage.

## Table of Contents

- [Installation](#installation)
- [Core Commands](#core-commands)
- [Configuration Commands](#configuration-commands)
- [Utility Commands](#utility-commands)
- [Chat Commands](#chat-commands)

---

## Installation

```bash
npm install -g @opencode/cli
```

Or run directly with npx:

```bash
npx @opencode/cli <command>
```

---

## Core Commands

### `opencode auth`

Initial setup and authentication for OpenCode.

**Usage:**
```bash
opencode auth
```

**What it does:**
- Prompts for messaging platform selection (WhatsApp, Telegram, Discord)
- Collects platform-specific tokens (if needed)
- Configures IDE type (Claude Code or Ollama Claude Code)
- Sets up AI provider for general chat (Anthropic, OpenAI, Gemini)
- Saves configuration to `~/.opencode/config.json`

**Interactive Prompts:**
1. Select messaging platform
2. Enter bot token (for Telegram/Discord)
3. Choose IDE type:
   - `claude-code`: Official Claude Code (requires Claude CLI installed & authenticated)
   - `ollama-claude-code`: Claude Code via Ollama (local, free)
4. Select AI provider for general chat
5. Enter AI API key
6. Set project path (optional)
7. Configure Ollama model (if using ollama-claude-code)

**Example:**
```bash
$ opencode auth

🔐 OpenCode Authentication

? Select messaging platform: Discord
? Enter Discord Bot Token: ****
? Select IDE type: Claude Code (Ollama - Local & Free)
? Select AI provider: Gemini
? Enter AI API Key: ****
? Enter project path: /home/user/projects/myapp
? Ollama model: gpt-oss:20b

✅ Configuration saved!
```

---

### `opencode start`

Start the OpenCode agent to listen for messages.

**Usage:**
```bash
opencode start [options]
```

**Options:**
- `-d, --daemon`: Run as daemon (background process)

**What it does:**
- Loads configuration from `~/.opencode/config.json`
- Connects to the selected messaging platform
- Starts listening for messages from authorized users
- Routes messages to appropriate AI (general chat or code assistant)
- Maintains conversation context

**Example:**
```bash
# Start in foreground
opencode start

# Start as daemon
opencode start --daemon
```

**Output:**
```
🤖 Starting OpenCode Agent

Platform: discord
IDE: ollama-claude-code

✅ Connected to Discord
📱 Listening for messages...
```

---

## Configuration Commands

### `opencode config`

Update OpenCode configuration after initial setup.

**Usage:**
```bash
opencode config
```

**What it does:**
- Loads existing configuration
- Allows updating:
  - Messaging platform
  - Platform tokens
  - IDE type
  - AI provider
  - API keys
  - Project path
  - Model settings

**Interactive Menu:**
```
🔧 OpenCode Configuration

? Select messaging platform: (Use arrow keys)
❯ WhatsApp
  Telegram
  Discord

? Select IDE type: (Use arrow keys)
❯ Claude Code (Official - Anthropic API)
  Claude Code (Ollama - Local & Free)
```

---

### `opencode reset`

Reset authorized user.

**Usage:**
```bash
opencode reset
```

**What it does:**
- Clears the authorized user from configuration
- Next person to message the bot becomes the authorized user
- Useful for switching between users

**Example:**
```bash
$ opencode reset

✅ Authorized user reset!
The next person to message will become the authorized user.
```

---

## Utility Commands

### `opencode status`

Check agent status and configuration.

**Usage:**
```bash
opencode status
```

**What it does:**
- Shows current configuration
- Displays connection status
- Shows IDE status
- Lists authorized user

**Example Output:**
```
📊 OpenCode Status

Platform: Discord
IDE: ollama-claude-code
AI Provider: gemini
Project: /home/user/projects/myapp
Authorized User: user#1234

IDE Status:
✅ Claude Code (via Ollama Launch)
📁 Project: myapp
🤖 Model: gpt-oss:20b
🏠 Backend: Ollama (Local)
💰 Cost: Free
🔒 Privacy: 100% Local
```

---

### `opencode stop`

Stop the running agent.

**Usage:**
```bash
opencode stop
```

**What it does:**
- Stops the OpenCode agent process
- Disconnects from messaging platform
- Cleans up resources

---

### `opencode logout`

Logout from WhatsApp (delete session).

**Usage:**
```bash
opencode logout
```

**What it does:**
- Deletes WhatsApp session data (`.wacli_auth` folder)
- Forces re-authentication on next start
- Only applicable for WhatsApp platform

**Example:**
```bash
$ opencode logout

✅ WhatsApp session deleted!
Run "opencode start" to scan QR code again.
```

---

## Chat Commands

These commands are sent via your messaging platform (WhatsApp, Telegram, Discord) to interact with the bot.

### `help` or `/help`

Show available commands and usage information.

**Usage:**
```
help
```

**Response:**
```
🤖 OpenCode Agent - Two-Tier AI System

General Chat Mode (Default):
• Powered by Gemini API for natural conversations
• Ask questions, have conversations, get general help

Code Assistant Mode:
• Powered by Ollama for local code assistance
• Type "code" or "/code" to switch to programming mode
• Get help with coding, file operations, project work

Commands:
• help - Show this message
• status - Check IDE connection
• clear - Clear conversation history
• code - Switch to Code Assistant mode
• chat - Switch to General Chat mode
```

---

### `status` or `/status`

Check IDE connection status.

**Usage:**
```
status
```

**Response:**
```
✅ Claude Code (via Ollama Launch)

📁 Project: myapp
🤖 Model: gpt-oss:20b
🏠 Backend: Ollama (Local)
💰 Cost: Free
🔒 Privacy: 100% Local
🔧 Session: abc123-def456
```

---

### `clear` or `/clear`

Clear conversation history.

**Usage:**
```
clear
```

**Response:**
```
🗑️ Conversation history cleared. Starting fresh!
```

---

### `code` or `/code`

Switch to Code Assistant mode.

**Usage:**
```
code
```

**Response:**
```
🔧 Switched to Code Assistant mode! I can now help you with programming tasks, file operations, and project work.
```

**What it does:**
- Routes subsequent messages to Claude Code (via Ollama or official)
- Enables file operations, code generation, debugging
- Maintains session context for coding tasks

---

### `chat` or `/chat`

Switch to General Chat mode.

**Usage:**
```
chat
```

**Response:**
```
💬 Switched to General Chat mode! We can have normal conversations.
```

**What it does:**
- Routes subsequent messages to general AI (Gemini, Claude, GPT)
- Disables file operations
- Better for general questions and conversations

---

## Environment Variables

OpenCode uses environment variables set through the config file (`~/.opencode/config.json`). These are managed automatically by the `auth` and `config` commands.

**Available Variables:**
- `PLATFORM`: Messaging platform (whatsapp, telegram, discord)
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `DISCORD_BOT_TOKEN`: Discord bot token
- `IDE_TYPE`: IDE type (claude-code, ollama-claude-code)
- `AI_PROVIDER`: AI provider for general chat (anthropic, openai, gemini)
- `AI_API_KEY`: API key for AI provider
- `PROJECT_PATH`: Project directory path
- `OLLAMA_MODEL`: Ollama model name (for ollama-claude-code)
- `CLAUDE_MODEL`: Claude model name (for claude-code)

---

## Configuration File

OpenCode stores configuration in `~/.opencode/config.json`.

**Example Configuration:**
```json
{
  "platform": "discord",
  "discordToken": "YOUR_DISCORD_TOKEN",
  "ideType": "ollama-claude-code",
  "aiProvider": "gemini",
  "aiApiKey": "YOUR_GEMINI_API_KEY",
  "projectPath": "/home/user/projects/myapp",
  "ollamaModel": "gpt-oss:20b",
  "authorizedUser": "user#1234",
  "configuredAt": "2026-02-10T12:00:00.000Z"
}
```

---

## Prerequisites

### For Official Claude Code (`claude-code`)
1. Install Claude CLI:
   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```
2. Authenticate:
   ```bash
   claude setup-token
   ```

### For Ollama Claude Code (`ollama-claude-code`)
1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. Pull a model:
   ```bash
   ollama pull gpt-oss:20b
   ```
3. Start Ollama:
   ```bash
   ollama serve
   ```

### For Messaging Platforms

**WhatsApp:**
- No setup required
- Scan QR code on first run

**Telegram:**
1. Create bot via [@BotFather](https://t.me/botfather)
2. Get bot token
3. Use token during `opencode auth`

**Discord:**
1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create bot and get token
3. Enable Message Content Intent
4. Invite bot to server
5. Use token during `opencode auth`

---

## Troubleshooting

### Agent not responding
```bash
# Check status
opencode status

# Restart agent
opencode stop
opencode start
```

### Reset configuration
```bash
# Reset authorized user
opencode reset

# Reconfigure everything
opencode auth
```

### Clear WhatsApp session
```bash
opencode logout
```

### Check logs
Logs are typically stored in:
- `~/.opencode/logs/` (if implemented)
- Console output when running in foreground

---

## Examples

### Complete Setup Flow

```bash
# 1. Install
npm install -g @opencode/cli

# 2. Initial setup
opencode auth
# Follow prompts...

# 3. Start agent
opencode start

# 4. Send message via Discord/Telegram/WhatsApp
# "hi" -> General chat
# "code" -> Switch to code mode
# "create a file named hello.py" -> Creates file
```

### Switching Between Modes

```
User: hi
Bot: Hello! How can I help you today?

User: code
Bot: 🔧 Switched to Code Assistant mode!

User: create a Python calculator
Bot: [Creates calculator.py file]

User: chat
Bot: 💬 Switched to General Chat mode!

User: what's the weather?
Bot: [Responds with general information]
```

---

## Support

For issues and questions:
- GitHub: [github.com/IMvision12/opencode](https://github.com/IMvision12/opencode)
- Issues: [github.com/IMvision12/opencode/issues](https://github.com/IMvision12/opencode/issues)
