# Cloudflare Pages Deployment Instructions

## Prerequisites
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`

## Deployment Steps

### 1. Navigate to Project Root
```bash
cd c:\Users\07dan\Desktop\CryptoApp
```

### 2. Set Environment Variables
```bash
wrangler secret put BYBIT_API_KEY
wrangler secret put BYBIT_API_SECRET
```

### 3. Build the Project
```bash
npm run build
```

### 4. Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy
```

## Expected Output
After deployment, Wrangler will output something like:
```
✨ Deployment complete! Project deployed at:
https://crypto-terminal.pages.dev
```

## Configuration Files Created

### wrangler.toml
- **Purpose**: Cloudflare Pages configuration
- **Environment**: Production and preview environments
- **Secrets**: Secure API key bindings
- **Compatibility**: Latest Cloudflare Workers runtime

### package.json
- **Build Command**: Already configured (`"vite build"`)
- **PWA Plugin**: Installed and configured
- **TypeScript**: Proper build setup

## Benefits of Cloudflare Pages

- ✅ **Global CDN**: Faster than Vercel
- ✅ **No 403 Errors**: Bypass Vercel limitations
- ✅ **Free Hosting**: Generous free tier
- ✅ **Custom Domain**: Can connect custom domain later
- ✅ **PWA Support**: Full PWA functionality
- ✅ **Build Integration**: Works with existing Vite setup

## Post-Deployment

1. Update any hardcoded URLs if needed
2. Test PWA installation on mobile devices
3. Monitor Cloudflare Pages analytics
4. Set up custom domain if desired
