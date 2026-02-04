# Deploy Lead Pipeline Dashboard to Railway

## Prerequisites
1. A [Railway](https://railway.app) account (free tier available)
2. GitHub repository with this code

## Quick Deploy Steps

### Step 1: Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository

### Step 2: Deploy Backend Service
1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select this repo
3. Set the **Root Directory** to: `backend`
4. Railway will auto-detect the Python app

**Add MongoDB:**
1. Click **"New Service"** → **"Database"** → **"MongoDB"**
2. Railway provisions MongoDB automatically

**Set Backend Environment Variables:**
Click on the backend service → **Variables** tab → Add:
```
MONGO_URL=${{MongoDB.MONGO_URL}}
DB_NAME=lead_pipeline
CORS_ORIGINS=https://your-frontend.railway.app
PORT=8001
```
(Replace `your-frontend` with your actual frontend URL after deploying it)

### Step 3: Deploy Frontend Service
1. Click **"New Service"** → **"GitHub Repo"**
2. Select this repo again
3. Set the **Root Directory** to: `frontend`

**Set Frontend Environment Variables:**
Click on the frontend service → **Variables** tab → Add:
```
REACT_APP_BACKEND_URL=https://your-backend.railway.app
```
(Get the backend URL from the backend service's **Settings** → **Domains**)

### Step 4: Generate Public URLs
For each service (backend and frontend):
1. Go to **Settings** tab
2. Under **Networking** → **Public Networking**
3. Click **"Generate Domain"**

## Environment Variables Summary

### Backend (`/backend`)
| Variable | Value | Description |
|----------|-------|-------------|
| `MONGO_URL` | `${{MongoDB.MONGO_URL}}` | Auto-linked from MongoDB service |
| `DB_NAME` | `lead_pipeline` | Database name |
| `CORS_ORIGINS` | `https://your-frontend.railway.app` | Frontend URL for CORS |
| `PORT` | `8001` | Server port |

### Frontend (`/frontend`)
| Variable | Value | Description |
|----------|-------|-------------|
| `REACT_APP_BACKEND_URL` | `https://your-backend.railway.app` | Backend API URL |

## After Deployment

1. **Get your shareable URL**: The frontend domain (e.g., `https://lead-pipeline-frontend.railway.app`)
2. **Initial sync**: Click "Sync Data" button to load data from your Google Sheet
3. **Auto-refresh**: Dashboard automatically checks for sheet updates every 30 seconds

## Costs
- Railway free tier: $5/month credit (usually enough for small dashboards)
- MongoDB free tier: 500MB storage

## Troubleshooting

**Backend not starting?**
- Check logs in Railway dashboard
- Verify MongoDB is connected
- Ensure all environment variables are set

**Frontend can't reach backend?**
- Verify `REACT_APP_BACKEND_URL` points to correct backend domain
- Check `CORS_ORIGINS` includes frontend URL

**Data not syncing?**
- Ensure Google Sheet is publicly accessible
- Check backend logs for fetch errors
