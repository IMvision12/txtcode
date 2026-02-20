<div align="center">
  <img src="assets/logo.jpg" alt="txtcode" width="450" />
</div>

<br>
<p align="center">
  <a href="https://www.npmjs.com/package/txtcode"><img src="https://img.shields.io/npm/v/txtcode?color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/txtcode"><img src="https://img.shields.io/npm/dm/txtcode" alt="downloads" /></a>
  <a href="https://github.com/yourusername/txtcode/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node version" />
</p>

<br />

**Control your IDE from your phone.** Use WhatsApp, Telegram, or Discord to send natural-language instructions to AI coding assistants and run commands on your machine.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Supported platforms & IDEs](#supported-platforms--ides)
- [Environment variables](#environment-variables)
- [Usage examples](#usage-examples)
- [Logs](#logs)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## Features

- **Messaging-first** — Use WhatsApp, Telegram, or Discord as your remote control
- **Multiple AI backends** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), OpenRouter
- **Multiple coding adapters** — Claude Code, OpenAI Codex, Gemini CLI, Kiro CLI, Ollama (local)
- **Chat vs Code modes** — `/chat` for general LLM + tools, `/code` for full IDE adapter
- **Session logs** — Per-session log files with `txtcode logs`
- **Single-user auth** — First user to connect is authorized; reset with `txtcode reset`

---

## Installation

**Requires Node.js 18+.**

```bash
npm install -g txtcode
```

Or run without installing:

```bash
npx txtcode auth
npx txtcode start
```

---

## Quick start

| Step | Command / action |
|------|------------------|
| 1. Configure | `txtcode auth` — pick platform, AI provider, and coding adapter |
| 2. Start agent | `txtcode start` |
| 3. Connect | **WhatsApp:** scan QR in terminal. **Telegram/Discord:** use bot token from config |
| 4. Use | Send messages. Use `/code` for IDE adapter, `/chat` for primary LLM (default). |

<details>
<summary><strong>First-time auth flow (expand)</strong></summary>

- Choose **messaging platform**: WhatsApp, Telegram, or Discord  
- Choose **AI provider** for chat mode: Anthropic, OpenAI, Google, or OpenRouter  
- Choose **coding adapter** for code mode: Claude Code, OpenAI Codex, Gemini CLI, Kiro CLI, or Ollama Claude Code  
- Set API keys and project path when prompted  
- Config is saved to `~/.txtcode/config.json`

</details>

---

## Commands

| Command | Description |
|--------|-------------|
| `txtcode auth` | First-time setup: platform, AI provider, coding adapter, API keys |
| `txtcode start` | Start the agent (option: `--daemon`) |
| `txtcode config` | Change settings without full auth |
| `txtcode status` | Show connection and adapter status |
| `txtcode logs [session]` | List or view session logs (see [Logs](#logs)) |
| `txtcode reset` | Clear authorized user so the next user can claim access |
| `txtcode logout` | WhatsApp: delete session (re-auth with new QR) |
| `txtcode hard-reset` | Remove all config and auth data in `~/.txtcode` |
| `txtcode stop` | Stop the agent |
| `txtcode --help` | Show help |
| `txtcode --version` | Show version |

<details>
<summary><strong>Logs command options (expand)</strong></summary>

- `txtcode logs` — List session log files (newest first)  
- `txtcode logs 1` — View session by index (e.g. latest = 1)  
- `txtcode logs -f` — Follow latest session log (like `tail -f`)  
- `txtcode logs -n 100` — Show last 100 lines (default 50)  
- `txtcode logs --clear` — Delete all session log files  

Logs live in `~/.txtcode/logs/`. Old sessions are pruned after 7 days.

</details>

---

## Configuration

Stored in **`~/.txtcode/config.json`**. Edit manually or run:

```bash
txtcode config
```

Use **Code mode** (`/code`) to send messages to your coding adapter (e.g. Claude Code, Codex). Use **Chat mode** (`/chat`, default) to talk to the primary LLM with tool support (e.g. terminal, process management).

---

## Supported platforms & IDEs

**Messaging:** WhatsApp · Telegram · Discord  

**Coding adapters (code mode):**

| Adapter | Backend | Notes |
|---------|---------|--------|
| Claude Code | Anthropic API | Official Claude CLI |
| OpenAI Codex | OpenAI API | Model in `~/.codex/config.toml` |
| Gemini CLI | Google AI API | `gemini` CLI, optional `GEMINI_MODEL` |
| Kiro CLI | AWS | Kiro subscription |
| Ollama Claude Code | Local (Ollama) | Free, no API key |

**Chat mode providers:** Anthropic, OpenAI, Google (Gemini), OpenRouter

---

## Environment variables

Optional overrides (also set via `txtcode config`):

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `anthropic` \| `openai` \| `gemini` \| `openrouter` |
| `AI_API_KEY` | API key for the chosen provider |
| `AI_MODEL` | Model id (e.g. `claude-sonnet-4`, `gpt-4o`) |
| `IDE_TYPE` | `claude-code` \| `codex` \| `gemini-code` \| `kiro` \| `ollama-claude-code` |
| `PROJECT_PATH` | Working directory for the coding adapter (default: current dir) |
| `CLAUDE_MODEL` | Claude model for Claude Code adapter |
| `GEMINI_MODEL` | Model for Gemini CLI |
| `OLLAMA_MODEL` | Model for Ollama adapter (e.g. `gpt-oss:20b`) |
| `OPENROUTER_API_KEY` | Required when `AI_PROVIDER=openrouter` |

---

## Usage examples

Once connected, send plain text or use commands:

**Switch modes**

- ` /code` — All messages go to coding adapter  
- ` /chat` — All messages go to primary LLM (default)  
- `status` or `/status` — Adapter/connection status  
- `help` or `/help` — In-chat help  

**Natural language (code or chat)**

- *"Create a React component UserProfile with name and email props"*  
- *"Fix the auth bug in src/auth.ts where login fails"*  
- *"Add error handling to all API routes"*  
- *"Run the tests and paste the output"*  

---

## Logs

- **Location:** `~/.txtcode/logs/`  
- **Naming:** `session-YYYY-MM-DD-HHmmss.log` (one file per `txtcode start`)  
- **Cleanup:** Files older than 7 days are removed automatically.  
- **View:** `txtcode logs` to list, `txtcode logs 1` to open latest, `txtcode logs -f` to follow.

Verbose and debug output goes to the log file; the terminal shows only key status lines.

---

## Troubleshooting

<details>
<summary><strong>Command not found: txtcode</strong></summary>

- Restart the terminal after `npm install -g txtcode`  
- Ensure global bin is in PATH: `npm config get prefix`  

</details>

<details>
<summary><strong>WhatsApp QR / connection</strong></summary>

- Use a stable connection; try `txtcode logout` then `txtcode start` to get a new QR  
- Session is stored under `~/.txtcode`; don’t delete it if you want to keep the same number  

</details>

<details>
<summary><strong>Telegram / Discord not responding</strong></summary>

- Confirm bot token in `~/.txtcode/config.json` or `txtcode config`  
- For Telegram: ensure the bot is not blocked and you’ve started a chat with it  

</details>

<details>
<summary><strong>AI or adapter errors</strong></summary>

- Check API keys and credits for the chosen provider  
- Code mode: ensure the CLI for your adapter is installed and in PATH (e.g. `claude`, `codex`, `gemini`, `kiro-cli`, `ollama`)  
- Run `txtcode status` to see current adapter and connection  
- Check `txtcode logs` or `~/.txtcode/logs/` for detailed errors  

</details>

---

## Development

```bash
git clone https://github.com/yourusername/txtcode.git
cd txtcode
npm install
npm run build
npm link
```

Then run `txtcode` from anywhere (or `node dist/cli/index.js` from the repo).

---

## License

MIT
