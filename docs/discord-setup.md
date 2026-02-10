# Discord Bot Setup Guide

This guide will walk you through setting up a Discord bot for OpenCode.

## Prerequisites

- A Discord account
- OpenCode CLI installed (`npm install -g @opencode/cli`)

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "OpenCode")
4. Click **"Create"**

## Step 2: Create a Bot

1. In your application, go to the **"Bot"** tab in the left sidebar
2. Click **"Add Bot"**
3. Click **"Yes, do it!"** to confirm
4. Your bot is now created!

## Step 3: Configure Bot Settings

### Enable Required Intents

Scroll down to **"Privileged Gateway Intents"** and enable:

- ✅ **MESSAGE CONTENT INTENT** (Required for reading messages)

Click **"Save Changes"**

### Copy Bot Token

1. Under the bot's username, click **"Reset Token"**
2. Click **"Yes, do it!"**
3. **Copy the token** - you'll need this for OpenCode configuration
4. ⚠️ **Keep this token secret!** Never share it publicly

## Step 4: Invite Bot to Your Server

### Generate Invite URL

1. Go to the **"OAuth2"** → **"URL Generator"** tab
2. Under **"Scopes"**, select:
   - ✅ `bot`
3. Under **"Bot Permissions"**, select:
   - ✅ `Send Messages` (3072)
   - ✅ `Read Messages/View Channels` (included in 3072)

4. Copy the generated URL at the bottom

### Add Bot to Server

1. Open the invite URL in your browser
2. Select a server where you have **"Manage Server"** permission
3. Click **"Authorize"**
4. Complete the CAPTCHA if prompted

**Don't have a server?** Create one:
- Open Discord
- Click the **"+"** button in the left sidebar
- Select **"Create My Own"**
- Choose **"For me and my friends"**
- Give it a name and click **"Create"**

## Step 5: Configure OpenCode

Run the OpenCode authentication command:

```bash
opencode auth
```

When prompted:
1. Select your AI provider (Anthropic/OpenAI/Gemini)
2. Enter your AI API key
3. Select **"Discord"** as the messaging platform
4. Enter your **Discord Bot Token** (from Step 3)
5. Select your IDE

## Step 6: Start OpenCode

```bash
opencode start
```

You should see:
```
✅ Discord bot logged in as YourBotName#1234!
Waiting for messages...
```

## Step 7: Test Your Bot

### In Server (with mentions)

In your Discord server, mention the bot:
```
@YourBotName hello
```

### In Direct Messages

1. Find your bot in the server member list
2. Right-click → **"Message"**
3. Send a message directly (no need to mention)

## Usage Examples

### Get Help
```
@opencode help
```

### Check Status
```
@opencode status
```

### Natural Language Commands
```
@opencode create a new file called hello.js with a hello world function
```

```
@opencode fix the bug in app.ts where the variable is undefined
```

```
@opencode add a new feature to handle user authentication
```

## Troubleshooting

### Bot doesn't respond in DMs

**Solution**: Make sure you've enabled the **MESSAGE CONTENT INTENT** in the Discord Developer Portal (Step 3).

### Bot doesn't respond in server

**Solution**: Make sure you're mentioning the bot with `@YourBotName` in your message.

### "Invalid Token" error

**Solution**: 
1. Go back to Discord Developer Portal
2. Reset your bot token
3. Run `opencode auth` again with the new token

### Bot appears offline

**Solution**: 
1. Check that `opencode start` is running
2. Verify your bot token is correct
3. Check your internet connection

## Security Best Practices

- ⚠️ **Never share your bot token** publicly or commit it to version control
- 🔒 Keep your bot token in the OpenCode config file (`~/.opencode/config.json`)
- 🔄 If your token is compromised, reset it immediately in the Developer Portal
- 👤 Only the first user to message the bot will be authorized (security feature)

## Reset Authorization

If you need to change the authorized user:

```bash
opencode reset
```

This will clear the authorized user, and the next person to message the bot will become the new authorized user.

## Additional Resources

- [Discord Developer Documentation](https://discord.com/developers/docs)
- [Discord.js Guide](https://discordjs.guide/)
- [OpenCode GitHub Repository](https://github.com/yourusername/opencode)

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console output when running `opencode start`
3. Open an issue on GitHub with error details
