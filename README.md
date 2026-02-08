# OpenCode

```
 ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗  
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝  
╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

Control your local IDE remotely via WhatsApp or Telegram using AI.

## Features

- 🤖 AI-powered code assistance via messaging apps
- 📱 Remote IDE control from your phone
- 🔧 Support for multiple IDEs (Kiro, VS Code, Cursor, Windsurf, Claude Code)
- 🔐 Secure authentication and user whitelisting
- ⚡ Simple installation via npm

## Installation

```bash
npm install -g @opencode/cli
```

Or use npx without installing:

```bash
npx @opencode/cli auth
```

## Quick Start

### 1. Authenticate
```bash
opencode auth
```

This will guide you through:
- Choosing your messaging platform (WhatsApp/Telegram)
- Selecting your IDE
- Configuring AI provider (Anthropic/OpenAI)

### 2. Start Agent
```bash
opencode start
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
opencode auth         # Authenticate and configure
opencode start        # Start the agent
opencode config       # Update configuration
opencode status       # Check agent status
opencode stop         # Stop the agent
opencode --help       # Show help
opencode --version    # Show version
```

## Configuration

Configuration is stored in `~/.opencode/config.json`

You can update settings anytime with:
```bash
opencode config
```

## Supported IDEs

- Kiro
- VS Code
- Cursor
- Windsurf
- Claude Code

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

### "Command not found: opencode"
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
- Run `opencode config` to update settings

## Uninstall

```bash
npm uninstall -g @opencode/cli
```

Configuration will remain at `~/.opencode/` - delete manually if needed.

## Development

```bash
git clone https://github.com/yourusername/opencode.git
cd opencode
npm install
npm run build
npm link
```

## License

MIT
