# TxtCode

```
████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗
╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  
   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  
   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

A messaging-based AI development environment with cyan-blue gradient CLI.

Control your local IDE remotely via WhatsApp, Telegram, or Discord using AI agents.

## Features

- 🎨 Beautiful cyan-blue gradient CLI interface (Sunset Tech style)
- 🤖 AI-powered code assistance via messaging apps
- 📱 Remote IDE control from your phone
- 🔧 Support for multiple AI agents (Claude Code, Ollama, Gemini CLI)
- 🔐 Secure authentication and user whitelisting
- ⚡ Simple installation via npm

## Installation

```bash
npm install -g txtcode
```

Or use npx without installing:

```bash
npx txtcode auth
```

## Quick Start

### 1. Authenticate
```bash
txtcode auth
```

This will guide you through:
- Choosing your messaging platform (WhatsApp/Telegram/Discord)
- Selecting your IDE
- Configuring AI provider (Anthropic/OpenAI/Gemini)

### 2. Start Agent
```bash
txtcode start
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
txtcode auth         # Authenticate and configure
txtcode start        # Start the agent
txtcode config       # Update configuration
txtcode status       # Check agent status
txtcode stop         # Stop the agent
txtcode --help       # Show help
txtcode --version    # Show version
```

## Configuration

Configuration is stored in `~/.txtcode/config.json`

You can update settings anytime with:
```bash
txtcode config
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

### "Command not found: txtcode"
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
- Run `txtcode config` to update settings

## Uninstall

```bash
npm uninstall -g txtcode
```

Configuration will remain at `~/.txtcode/` - delete manually if needed.

## Development

```bash
git clone https://github.com/yourusername/txtcode.git
cd txtcode
npm install
npm run build
npm link
```

## License

MIT
