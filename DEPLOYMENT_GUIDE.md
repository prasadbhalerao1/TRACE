# TRACE — Complete Production Deployment Guide

> [!IMPORTANT]
> **Why TRACE Fails on Standard Free Tiers (Vercel / Render Free)**:
> 1. **PyTorch & BGE-Large Embeddings Footprint**: TRACE uses `torch`, `sentence-transformers`, and `BAAI/bge-large-en-v1.5` (~2.5 GB dependency size, ~1.5GB to 2GB active RAM). Free tiers (Render 512MB RAM, Vercel 1024MB serverless) crash immediately with **OOM (Out Of Memory)**.
> 2. **Serverless Size & Timeout Limits**: Vercel serverless functions cap bundle sizes at 50MB and kill requests after 10–15 seconds. TRACE background GitHub indexing and vector embedding generation exceed these limits.
> 3. **Stateful Services**: TRACE requires persistent PostgreSQL, Qdrant (Vector DB), and Redis.

---

## Deployment Architecture Options

```
+-------------------------------------------------------------------------------------------------------------+
| Deployment Strategy Overview                                                                                |
+--------------------------+--------------------+-------------------------+-----------------------------------+
| Option                   | Cost               | Best For                | Technical Complexity              |
+--------------------------+--------------------+-------------------------+-----------------------------------+
| Option 1: VPS + Docker   | $6 – $12 / month   | Best value, total control| Low (One command via Docker)      |
| (Hetzner/DigitalOcean)   |                    | single 4GB RAM server   |                                   |
+--------------------------+--------------------+-------------------------+-----------------------------------+
| Option 2: Hybrid PaaS    | $5 – $15 / month   | Fully managed scale,    | Medium (Connecting cloud services)|
| (Vercel + Railway + Neon)|                    | zero infra maintenance  |                                   |
+--------------------------+--------------------+-------------------------+-----------------------------------+
```

---

## METHOD 1: $6–$12/month Single VPS Deployment (Recommended & Easiest)

Deploying everything to a single 4GB RAM Linux VPS (Hetzner CX22 / DigitalOcean 4GB Droplet / Linode) running Docker Compose is the cleanest, cheapest, and most reliable way to host TRACE.

### Step 1: Provision a 4GB RAM VPS
* Sign up for **Hetzner Cloud** (CX22 instance, ~€5/mo) or **DigitalOcean** (4GB RAM / 2 vCPU Droplet, $12/mo).
* Choose **Ubuntu 24.04 LTS**.
* Add your SSH key and log in:
  ```bash
  ssh root@<YOUR_SERVER_IP>
  ```

### Step 2: Install Docker & Docker Compose
Run on your server:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker --version
```

### Step 3: Clone Repo & Set Production `.env`
```bash
git clone <YOUR_REPO_URL> TRACE
cd TRACE
cp .env.cloud .env
```

Edit `.env` using `nano .env`:
```ini
ENVIRONMENT=production
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Database (Local Docker Postgres or Neon.tech)
DATABASE_URL=postgresql+asyncpg://dev:dev@postgres:5432/talent_platform

# Redis & Qdrant inside Docker network
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333

# API Keys
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/github/callback

JWT_SECRET_KEY=generate_a_random_64_char_hex_key
```

### Step 4: Full Docker Compose Production File
Create `infra/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: trace_postgres
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: talent_platform
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant
    container_name: trace_qdrant
    volumes:
      - qdrantdata:/qdrant/storage
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: trace_redis
    restart: unless-stopped

  api:
    build:
      context: ..
      dockerfile: services/api/Dockerfile
    container_name: trace_api
    env_file: ../.env
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - qdrant
      - redis
    restart: unless-stopped

  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile
    container_name: trace_web
    ports:
      - "3000:3000"
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    container_name: trace_caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api
    restart: unless-stopped

volumes:
  pgdata:
  qdrantdata:
  caddy_data:
  caddy_config:
```

### Step 5: Caddy Reverse Proxy & SSL Setup
Create `infra/Caddyfile`:

```caddy
yourdomain.com {
    # Reverse proxy API requests to FastAPI
    handle /api/* {
        reverse_proxy api:8000
    }

    # Reverse proxy Web requests to Next.js
    handle /* {
        reverse_proxy web:3000
    }
}
```

> [!NOTE]
> Caddy automatically provisions and renews **free Let's Encrypt SSL certificates** for your domain without any manual configuration!

### Step 6: Launch Production Stack & Run Migrations
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
docker exec -it trace_api uv run alembic upgrade head
```

Your app is now live at `https://yourdomain.com` with automated SSL, PyTorch support, persistent DB, vector search, and background workers!

---

## METHOD 2: Managed PaaS Stack (Vercel + Railway + Neon + Qdrant Cloud)

If you don't want to manage a server, combine managed cloud services:

```
+------------------------------------------------------------------------------------+
| Managed Cloud Stack Breakdown                                                      |
+-------------------+--------------------+-------------------------------------------+
| Layer             | Provider           | Setup Instructions                        |
+-------------------+--------------------+-------------------------------------------+
| Frontend Web App  | Vercel             | Connect GitHub repo, root dir `apps/web`  |
| Backend API & AI  | Railway.app        | Deploy Docker container (`services/api`)  |
|                   |                    | Allocate 2GB–4GB RAM plan ($5–$10/mo)     |
| PostgreSQL DB     | Neon.tech          | Free tier serverless Postgres             |
| Vector Database   | Qdrant Cloud       | Free 1GB cloud cluster                    |
| Redis Cache       | Upstash Redis      | Serverless Redis free tier                |
+-------------------+--------------------+-------------------------------------------+
```

### Step-by-Step Managed Setup:

1. **Database (Neon.tech)**:
   * Create a free Postgres database on [neon.tech](https://neon.tech).
   * Copy the connection string into `DATABASE_URL` (already configured in `.env.cloud`).

2. **Vector DB (Qdrant Cloud)**:
   * Create a free cluster on [cloud.qdrant.io](https://cloud.qdrant.io).
   * Copy `QDRANT_URL` and `QDRANT_API_KEY` into `.env.cloud`.

3. **Backend API (Railway.app)**:
   * Sign up at [Railway.app](https://railway.app).
   * Click **New Project** -> **Deploy from GitHub Repo**.
   * Set root directory to `services/api`.
   * Under service settings, set RAM limit to **2GB or 4GB**.
   * Add Environment Variables from `.env.cloud`.
   * Railway will generate your public backend URL (e.g. `https://trace-api.up.railway.app`).

4. **Frontend (Vercel)**:
   * Go to [vercel.com](https://vercel.com) -> **Add New Project**.
   * Import repo and set Root Directory to `apps/web`.
   * Set Environment Variable: `NEXT_PUBLIC_API_URL=https://trace-api.up.railway.app`.
   * Deploy!

---

## Dockerfiles Reference

### 1. Backend Dockerfile (`services/api/Dockerfile`)
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Copy dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy source code
COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Dockerfile (`apps/web/Dockerfile`)
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Production GitHub OAuth Callback Setup
Remember to update your **GitHub OAuth App settings** on GitHub Developer Settings:
* **Homepage URL**: `https://yourdomain.com`
* **Authorization Callback URL**: `https://yourdomain.com/api/auth/github/callback`
