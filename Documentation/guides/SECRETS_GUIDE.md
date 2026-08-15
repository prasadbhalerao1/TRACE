# Environment Secrets Setup Guide

This guide provides step-by-step instructions on how to acquire and configure each secret and API key listed in `.env.example` for the **AI Talent Intelligence & Recruitment Platform**.

---

## Table of Contents
1. [Anthropic API Key](#1-anthropic-api-key)
2. [Database Connection (PostgreSQL / Neon)](#2-database-connection-postgresql--neon)
3. [Redis Cache & Queue](#3-redis-cache--queue)
4. [Qdrant Vector Database](#4-qdrant-vector-database)
5. [Authentication (self-hosted JWT)](#5-authentication-self-hosted-jwt)
6. [GitHub OAuth Application](#6-github-oauth-application)
7. [Cloudinary File Storage](#7-cloudinary-file-storage)
8. [Langfuse Observability](#8-langfuse-observability)
9. [Sentry Error Monitoring](#9-sentry-error-monitoring)

---

## 1. Anthropic API Key

* **Variables**: `ANTHROPIC_API_KEY`
* **Purpose**: Access to Claude AI models (`claude-haiku-4-5-20251001` and `claude-sonnet-4-6`) used for agentic intelligence, candidate matching, and automated interview evaluations.

### How to get it:
1. Navigate to the [Anthropic Console](https://console.anthropic.com/).
2. Create an account or log in.
3. Select **API Keys** from the dashboard or account settings.
4. Click **Create Key**, specify a name (e.g. `TRACE-Dev`), and generate the key.
5. Copy the generated key (starts with `sk-ant-api...`) and assign it to `ANTHROPIC_API_KEY`.

---

## 2. Database Connection (PostgreSQL / Neon)

* **Variables**: `DATABASE_URL`, `DATABASE_SSL_REQUIRED`
* **Purpose**: Primary relational database storage.

### Option A: Local Development (Docker - Recommended for Dev)
No external secrets required.
* `DATABASE_URL=postgresql+asyncpg://dev:dev@localhost:5432/talent_platform`
* `DATABASE_SSL_REQUIRED=false`

### Option B: Cloud Database (Neon Serverless Postgres)
1. Sign up or log in at [Neon Console](https://console.neon.tech/).
2. Create a new project (e.g. `talent-platform-db`).
3. On the **Dashboard**, locate **Connection Details**.
4. Change the dialect dropdown to **SQLAlchemy / asyncpg** (or construct it as `postgresql+asyncpg://<user>:<password>@<ep-hostname>/<dbname>`).
5. Copy the connection string into `DATABASE_URL`.
6. Set `DATABASE_SSL_REQUIRED=true`.

---

## 3. Redis Cache & Queue

* **Variables**: `REDIS_URL`
* **Purpose**: Background task queuing, caching, and rate limiting (via `slowapi`).

### Option A: Local Development (Docker - Recommended for Dev)
* `REDIS_URL=redis://localhost:6379`

### Option B: Managed Cloud (Upstash Redis Free Tier)
1. Sign up or log in at [Upstash Console](https://console.upstash.com/).
2. Click **Create Database**, choose Redis, select a region, and choose the Free plan.
3. Copy the **redis://** connection URI under the **Details** tab into `REDIS_URL`.

---

## 4. Qdrant Vector Database

* **Variables**: `QDRANT_URL`, `QDRANT_API_KEY`
* **Purpose**: High-performance vector database storing candidate embedding vectors for semantic searching and RAG matching.

### Option A: Local Development (Docker - Recommended for Dev)
* `QDRANT_URL=http://localhost:6333`
* `QDRANT_API_KEY=` *(leave blank for local Docker)*

### Option B: Cloud (Qdrant Cloud Free Cluster)
1. Go to [Qdrant Cloud](https://cloud.qdrant.io/) and create an account.
2. Create a free cluster under **Clusters**.
3. Copy the cluster endpoint URL (e.g., `https://<cluster-id>.us-east4-0.gcp.cloud.qdrant.io:6333`) into `QDRANT_URL`.
4. Go to **API Keys** -> **Generate API Key**, copy the key into `QDRANT_API_KEY`.

---

## 5. Authentication (self-hosted JWT)

There is **no external identity provider**. Auth is bcrypt password hashing plus HS256
JWTs issued by this API, so there is no dashboard to visit and no third-party key to
obtain — you generate the signing secret yourself.

* **Variables**:
  * `JWT_SECRET_KEY` — **required**, no default. The API will not start without it.
  * `JWT_ALGORITHM` — defaults to `HS256`.
  * `JWT_EXPIRY_SECONDS` — defaults to `604800` (7 days).

These are the only three settings `services/api/core/config.py` reads for auth.

### How to get it:

Generate a strong random secret:

```powershell
uv run python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put the output in `JWT_SECRET_KEY`. Treat it like a password — anyone holding it can
mint valid tokens for any user. Use a different value in each environment, and rotate it
if it leaks (which invalidates all existing sessions, forcing users to sign in again).

> Tokens are stateless: there is no server-side session to revoke. Shortening
> `JWT_EXPIRY_SECONDS` is the only way to bound the window on a leaked token.

---

## 6. GitHub OAuth Application

* **Variables**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`
* **Purpose**: Per-candidate GitHub authentication and profile/repository indexing.

### How to get it:
1. Log in to [GitHub](https://github.com/) and navigate to **Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **OAuth Apps** (`https://github.com/settings/developers`).
2. Click **New OAuth App**.
3. Fill in the fields:
   * **Application name**: `TRACE Talent Platform`
   * **Homepage URL**: `http://localhost:3000` (or your frontend URL)
   * **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Click **Register application**.
5. Copy the **Client ID** into `GITHUB_CLIENT_ID`.
6. Click **Generate a new client secret**, copy the generated secret string immediately into `GITHUB_CLIENT_SECRET`.

---

## 7. Cloudinary File Storage

* **Variables**:
  * `CLOUDINARY_URL`
  * `CLOUDINARY_CLOUD_NAME`
  * `CLOUDINARY_API_KEY`
  * `CLOUDINARY_API_SECRET`
* **Purpose**: Cloud media storage for candidate resumes, profile pictures, and document attachments.

### How to get it:
1. Log in or create a free account at [Cloudinary Console](https://cloudinary.com/console).
2. On your **Dashboard**, find the **Product Environment Credentials** section:
   * Copy **Cloud Name** $\rightarrow$ `CLOUDINARY_CLOUD_NAME`
   * Copy **API Key** $\rightarrow$ `CLOUDINARY_API_KEY`
   * Copy **API Secret** $\rightarrow$ `CLOUDINARY_API_SECRET`
3. Combine them into `CLOUDINARY_URL` as:
   `cloudinary://<CLOUDINARY_API_KEY>:<CLOUDINARY_API_SECRET>@<CLOUDINARY_CLOUD_NAME>`

---

## 8. Langfuse Observability

* **Variables**: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`
* **Purpose**: AI agent tracing, latency monitoring, cost calculation, and prompt management.

### How to get it:
1. Log in at [Langfuse Cloud](https://cloud.langfuse.com/) (or your self-hosted instance).
2. Create a new project.
3. Go to **Settings** $\rightarrow$ **API Keys**.
4. Click **Create new API Keys**.
5. Copy the generated keys:
   * **Public Key** (`pk-lf-...`) $\rightarrow$ `LANGFUSE_PUBLIC_KEY`
   * **Secret Key** (`sk-lf-...`) $\rightarrow$ `LANGFUSE_SECRET_KEY`
6. Set `LANGFUSE_HOST=https://cloud.langfuse.com` (or your self-hosted URL).

---

## 9. Sentry Error Monitoring

* **Variables**: `SENTRY_DSN`
* **Purpose**: Application crash reporting and exception tracking.

### How to get it:
1. Log in at [Sentry.io](https://sentry.io/).
2. Click **Create Project** (select Python / FastAPI or Next.js).
3. Go to **Project Settings** $\rightarrow$ **Client Keys (DSN)**.
4. Copy the **DSN** URL (`https://<key>@o<org>.ingest.sentry.io/<project-id>`) into `SENTRY_DSN`.
