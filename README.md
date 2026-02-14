# AgentCode

A messaging-based agentic AI development environment with rainbow-powered CLI.

Control your local IDE remotely via WhatsApp, Telegram, or Discord using AI agents.

## Features

- 🌈 Beautiful rainbow gradient CLI interface
- 🤖 AI-powered code assistance via messaging apps
- 📱 Remote IDE control from your phone
- 🔧 Support for multiple AI agents (Claude Code, Ollama, Gemini CLI)
- 🔐 Secure authentication and user whitelisting
- ⚡ Simple installation via npm

## Installation

```bash
npm install -g @agentcode/cli
```

Or use npx without installing:

```bash
npx @agentcode/cli auth
```

## Quick Start

### 1. Authenticate
```bash
agentcode auth
```

This will guide you through:
- Choosing your messaging platform (WhatsApp/Telegram/Discord)
- Selecting your IDE
- Configuring AI provider (Anthropic/OpenAI/Gemini)

### 2. Start Agent
```bash
agentcode start
```

### 3. Connect from Phone
- **WhatsApp**: Scan the QR code displayed in terminal
- **Telegram**: Message your bot

### 4. Start Coding!
Send natural language instructions:
- "Create a new React component for user profile"
- "Fix the bug in auth.ts where login fails"
- "Add error handling to the API routes"

## Commands

```bash
agentcode auth         # Authenticate and configure
agentcode start        # Start the agent
agentcode config       # Update configuration
agentcode status       # Check agent status
agentcode stop         # Stop the agent
agentcode --help       # Show help
agentcode --version    # Show version
```

## Configuration

Configuration is stored in `~/.agentcode/config.json`

You can update settings anytime with:
```bash
agentcode config
```

## Supported IDEs

- Claude Code (Official - Anthropic API)
- Claude Code via Ollama (Local & Free)
- Gemini Code (Google AI API)

## Requirements

- Node.js 18 or higher
- npm or yarn

## Usage Examples

Once connected, send messages to control your IDE:

### Create Files
```
Create a new React component called UserProfile with props for name and email
```

### Fix Bugs
```
Fix the authentication bug in src/auth.ts where users can't login
```

### Add Features
```
Add error handling to all API routes in the backend
```

### Refactor Code
```
Refactor the database queries in models/user.js to use async/await
```

## Troubleshooting

### "Command not found: agentcode"
- Restart your terminal
- Check if npm global bin is in PATH: `npm config get prefix`

### WhatsApp QR code not working
- Make sure you have a stable internet connection
- Try restarting the agent

### Telegram bot not responding
- Verify your bot token in config
- Make sure the bot is not blocked

### AI not responding
- Verify your API key is correct
- Check your API provider account has credits
- Run `agentcode config` to update settings

## Uninstall

```bash
npm uninstall -g @agentcode/cli
```

Configuration will remain at `~/.agentcode/` - delete manually if needed.

## Development

```bash
git clone https://github.com/IMvision12/agentcode.git
cd agentcode
npm install
npm run build
npm link
```

## License

MIT
