# Cloudflare Worker Deployment Instructions

## Prerequisites
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`

## Deployment Steps

### 1. Navigate to Worker Directory
```bash
cd cloudflare-worker
```

### 2. Set Environment Variables
```bash
wrangler secret put BYBIT_API_KEY
wrangler secret put BYBIT_API_SECRET
```

### 3. Deploy Worker
```bash
wrangler deploy
```

### 4. Get Worker URL
After deployment, Wrangler will output your Worker URL, something like:
`https://crypto-terminal-api.your-subdomain.workers.dev`

## Update React App

### 1. Update PortfolioContext.tsx
Replace the placeholder URL in line 133:
```typescript
const response = await fetch('YOUR_ACTUAL_WORKER_URL', {
```

### 2. Update SmartConverter.tsx
Replace the placeholder URL in lines 50 and 122:
```typescript
const response = await fetch('YOUR_ACTUAL_WORKER_URL', {
```

### 3. Deploy React App
```bash
cd ..
npm run build
npm run deploy
```

## Benefits
- ✅ No Vercel 403 errors
- ✅ Global CDN distribution
- ✅ Better performance
- ✅ Server-side API key security
- ✅ CORS handled automatically

## Testing
After deployment, test the Worker:
```bash
curl -X POST YOUR_ACTUAL_WORKER_URL \
  -H "Content-Type: application/json" \
  -H "BYBIT_API_KEY: your_key" \
  -H "BYBIT_API_SECRET: your_secret"
```
