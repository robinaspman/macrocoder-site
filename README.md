# MacroCoder Site

A Vite + React + Cloudflare Worker application for AI-powered code analysis.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Client    │────▶│  GitHub Pages │────▶│  GitHub OAuth    │
│  (Browser)  │     │   (Static)    │     │                  │
└──────┬──────┘     └──────────────┘     └──────────────────┘
       │
       │              ┌─────────────────┐
       └─────────────▶│ Cloudflare      │
                      │ Worker          │
                      │ - Claude API    │
                      │ - GitHub token  │
                      │ - KV storage    │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   Anthropic     │
                      │   Claude API    │
                      └─────────────────┘
```

## Features

- **Connect Page** (`/connect/:projectId`): OAuth with GitHub, fetch repository snapshot
- **Chat Interface** (`/chat`): Real-time chat with Claude about codebase
- **Cloudflare Worker**: Secure API proxy, token exchange, conversation storage
- **Streaming Responses**: Claude responses stream in real-time

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173/macrocoder-site/`

## Deployment

### Deploy to GitHub Pages

```bash
npm run build
npm run deploy
```

### Deploy Cloudflare Worker

```bash
# Set your secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GITHUB_CLIENT_SECRET

# Deploy
npm run deploy:worker
```

## Environment Variables

### Client (.env)

- `VITE_GITHUB_CLIENT_ID` - GitHub OAuth App client ID
- `VITE_WORKER_URL` - Cloudflare Worker URL

### Worker Secrets (wrangler secret)

- `ANTHROPIC_API_KEY` - Anthropic API key
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App client secret

## Project Structure

```
macrocoder-site/
├── src/
│   ├── components/
│   │   ├── Chat.tsx          # Main chat interface
│   │   ├── ChatPage.tsx      # Chat page wrapper
│   │   └── ConnectPage.tsx   # GitHub OAuth flow
│   ├── lib/
│   │   ├── api.ts            # Worker API calls
│   │   └── github.ts         # GitHub OAuth & repo fetch
│   ├── App.tsx               # Router setup
│   └── main.tsx              # Entry point
├── worker/
│   └── index.ts              # Cloudflare Worker
├── connect/
│   └── index.html            # Connect page entry
├── chat/
│   └── index.html            # Chat page entry
├── index.html                # Home page
├── vite.config.ts            # Vite config
├── wrangler.toml             # Worker config
└── tailwind.config.js        # Tailwind CSS config
```

## How It Works

1. **User visits** `/connect/owner-repo`
2. **Clicks "Connect with GitHub"** - OAuth flow starts
3. **GitHub redirects back** with auth code
4. **Worker exchanges code** for access token
5. **Fetches repo snapshot** (tree, package.json, README, key files)
6. **Redirects to chat** with snapshot data
7. **User chats with Claude** - streamed via Worker
8. **Conversation saved** to KV for later review

## GitHub OAuth Setup

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Set:
   - Application name: MacroCoder
   - Homepage URL: `https://yourusername.github.io/macrocoder-site/`
   - Authorization callback URL: `https://yourusername.github.io/macrocoder-site/connect/callback`
4. Copy Client ID to `.env`
5. Copy Client Secret to `wrangler secret put GITHUB_CLIENT_SECRET`

## Cloudflare Setup

1. Install Wrangler: `npm i -g wrangler`
2. Login: `wrangler login`
3. Create KV namespace: `wrangler kv:namespace create "MACROCODER_KV"`
4. Copy namespace ID to `wrangler.toml`
5. Set secrets:
   ```bash
   wrangler secret put ANTHROPIC_API_KEY
   wrangler secret put GITHUB_CLIENT_SECRET
   ```
6. Deploy: `wrangler deploy`

## Development

### Add a New Page

1. Create `src/components/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Create `newpage/index.html` entry point
4. Add to `vite.config.ts` rollupOptions.input

### Customize Claude System Prompt

Edit `worker/index.ts` → `handleChat()` → `systemPrompt`

## License

MIT
