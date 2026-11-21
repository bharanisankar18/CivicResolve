# Deployment Guide - CivicResolve

CivicResolve is architected for modern serverless and cloud hosting using **Firebase Hosting** for the React Vite SPA and **Google Cloud Run** for the Node.js Express API.

---

## 1. Architecture Overview

```
[Citizens / Admins]
        │
        ├──> [Firebase Hosting (CDN)] ────> React 18 SPA (apps/web/dist)
        │
        └──> [Google Cloud Run] ─────────> Node.js Express Container (apps/api)
                     │
                     ├──> Google Cloud SQL / Litestream SQLite
                     └──> Google Gemini 1.5 Flash API
```

---

## 2. Deploying Web to Firebase Hosting

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase in Root

```bash
firebase init hosting
```

- Select public directory: `apps/web/dist`
- Configure as single-page app (rewrite all URLs to `/index.html`): `Yes`
- Set up automatic builds and deploys with GitHub: `Optional`

### Step 3: Build & Deploy

```bash
# Build shared contracts and web client
npm --workspace=@civicresolve/shared run build
npm --workspace=@civicresolve/web run build

# Deploy to Firebase
firebase deploy --only hosting
```

---

## 3. Deploying Unified Fullstack to Google Cloud Run (Free Tier)

Google Cloud Run provides auto-scaling, containerized execution with automatic HTTPS, custom domains, and a **2,000,000 free requests/month** always-free tier.

### Single-Command Deployment (Cloud Shell or Local CLI)

From the project root:

```bash
gcloud run deploy civicresolve \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080
```

Cloud Run will automatically build the multi-stage `Dockerfile`, push and seed the database, and assign you a live HTTPS URL (e.g. `https://civicresolve-xxxxxx.a.run.app`).

---

## 4. Deploying to Render.com (100% Free, No Credit Card)

1. Sign up on [Render.com](https://render.com) using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Select your repository: `bharanisankar18/CivicResolve`.
4. Choose **Docker** as environment (Render auto-detects root `Dockerfile`).
5. Select the **Free** instance plan ($0/month) and click **Deploy Web Service**.
6. Render will build and deploy the entire fullstack app with a live domain: `https://civicresolve.onrender.com`.

---

## 5. Production Environment Variables Checklist

| Variable         | Description                       | Example                        |
| :--------------- | :-------------------------------- | :----------------------------- |
| `NODE_ENV`       | Environment identifier            | `production`                   |
| `PORT`           | API Server listen port            | `5000`                         |
| `DATABASE_URL`   | SQLite / PostgreSQL connection    | `file:/data/civicresolve.db`   |
| `JWT_SECRET`     | Secret key for JWT session tokens | Strong 64-char random string   |
| `CORS_ORIGIN`    | Allowed web frontend origin       | `https://civicresolve.web.app` |
| `GEMINI_API_KEY` | Google AI Studio API Key          | `AIzaSy...`                    |
| `GEMINI_MODEL`   | Gemini model name                 | `gemini-1.5-flash`             |
