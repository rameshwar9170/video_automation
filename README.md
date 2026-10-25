# 🤖 AI YouTube Automation Platform

An autonomous, end-to-end AI YouTube Shorts production engine built according to the specifications in [`AI_YouTube_Backend_Working_Flow.md`](./AI_YouTube_Backend_Working_Flow.md) and [`AI_YouTube_Frontend_Working_Flow.md`](./AI_YouTube_Frontend_Working_Flow.md).

---

## 🌟 Architecture Overview

```
                                  +-----------------------------+
                                  |   Next.js 15 Web Dashboard  |
                                  |      (Port 3000 / Dark UI)   |
                                  +--------------+--------------+
                                                 | (REST / Proxy)
                                                 v
                                  +-----------------------------+
                                  |   Express + TypeScript API  |
                                  |         (Port 4000)         |
                                  +--------------+--------------+
                                                 |
         +---------------------------------------+---------------------------------------+
         |                       |                       |                               |
         v                       v                       v                               v
+-----------------+     +-----------------+     +-----------------+             +-----------------+
|   AI Research   |     | Script & Voice  |     | Image & Video   |             | YouTube & Cron  |
|  Tavily Search  |     |  Gemini 1.5 Pro |     |  Vertex Imagen  |             |  OAuth & Upload |
|  & Scorer Agent |     |   ElevenLabs    |     |  FFmpeg Engine  |             | node-cron Auton |
+-----------------+     +-----------------+     +-----------------+             +-----------------+
```

---

## 🚀 Key Features

### 1. Fully Autonomous Pipeline
- **Trend Research Engine:** Scrapes & analyzes trending topics using Tavily Search + Gemini scoring.
- **Hook & Script Generation:** Generates viral 30–60s vertical short scripts with dynamic scene timing.
- **Voiceover Synthesis:** Ultra-realistic voiceovers generated via ElevenLabs API.
- **Image Generation:** 9:16 vertical scene visuals generated with Google Imagen (Vertex AI) with fallback rendering.
- **FFmpeg 1080x1920 Video Rendering:** Concat demuxer, scaling, padding, and multi-track audio sync.
- **YouTube API Integration:** Automated title, tags, description generation, and upload with OAuth token refresh.
- **Autonomous Scheduler:** `node-cron` scheduler running at configured daily intervals (e.g., 01:00 & 13:00 UTC).

### 2. High-Performance Web Dashboard
- **Autonomous Mode Switch:** One-click toggle between fully autonomous and manual operation.
- **Live Pipeline Tracker:** Real-time visual progress through the 8 pipeline stages (`RESEARCHING` → `PUBLISHED`).
- **Video Management:** Comprehensive library of generated shorts with playback links and status badges.
- **Topic Research Feed:** Inspect candidate topics, virality scores, and selection criteria.
- **Channel Connection:** Google OAuth YouTube account management.
- **Full Configuration:** Adjust niche, tone, video duration, upload frequency, and quality thresholds.

---

## 🛠️ Project Structure

```
video automation/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # PostgreSQL schema (Channels, Videos, Topics, Logs)
│   ├── src/
│   │   ├── config/               # Environment & constants
│   │   ├── controllers/          # Express REST route controllers
│   │   ├── database/             # Prisma client connection
│   │   ├── middleware/           # Error handling & CORS
│   │   ├── providers/            # Gemini, ElevenLabs, Tavily, Imagen, YouTube providers
│   │   ├── routes/               # API endpoint routing
│   │   ├── services/             # Pipeline, Research, Script, Audio, Video, Scheduler
│   │   ├── utils/                # FFmpeg wrapper, logger, file manager
│   │   └── server.ts             # Express entry point
│   ├── .env                      # Backend environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/        # Main control hub & live pipeline monitor
│   │   │   ├── videos/           # Video list & single video inspector ([id])
│   │   │   ├── research/         # Topic candidates & trend analysis
│   │   │   ├── youtube/          # YouTube channel integration & OAuth
│   │   │   ├── settings/         # Channel & automation settings
│   │   │   ├── globals.css       # Custom dark design system
│   │   │   └── layout.tsx        # App shell with TanStack Query provider
│   │   ├── components/common/    # Sidebar navigation
│   │   ├── services/             # Axios API client services
│   │   └── types/                # Unified TypeScript interfaces
│   ├── next.config.js            # Next.js config with /api rewrite proxy
│   └── package.json
│
├── docker-compose.yml            # PostgreSQL & pgAdmin containers
├── package.json                  # Root monorepo scripts
├── AI_YouTube_Backend_Working_Flow.md
└── AI_YouTube_Frontend_Working_Flow.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18 or v20+)
- **Docker Desktop** (for PostgreSQL)
- **FFmpeg** installed and accessible in your system `PATH`

### 2. Start PostgreSQL Database
```bash
docker compose up -d
```
*(Starts PostgreSQL on port `5432` with user `ytauto` and password `ytauto_secret`)*

### 3. Configure Backend Environment
Edit `backend/.env` and add your API keys:
- `GEMINI_API_KEY`: From Google AI Studio
- `ELEVENLABS_API_KEY`: From ElevenLabs
- `TAVILY_API_KEY`: From Tavily AI
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console (YouTube Data API v3 enabled)

### 4. Run Database Migrations
```bash
npm run prisma:migrate
```

### 5. Start Development Servers

In one terminal, start the **backend**:
```bash
npm run dev:backend
```
*Backend runs on `http://localhost:4000`*

In a second terminal, start the **frontend**:
```bash
npm run dev:frontend
```
*Frontend runs on `http://localhost:3000`*

---

## 📡 API Endpoints Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/videos` | GET | List all generated videos with pagination |
| `/api/videos/:id` | GET | Detailed video metadata & render assets |
| `/api/videos/:id/status` | GET | Status polling for progress bar |
| `/api/videos/generate` | POST | Trigger instant manual generation run |
| `/api/videos/:id/retry` | POST | Retry failed generation run |
| `/api/research/topics` | GET | List researched topic candidates |
| `/api/youtube/auth-url` | GET | Generate Google OAuth authorization URL |
| `/api/youtube/callback` | GET | Google OAuth callback handler |
| `/api/youtube/channel` | GET | Fetch connected channel profile |
| `/api/scheduler/status` | GET | Autonomous scheduler state & next run time |
| `/api/scheduler/start` | POST | Activate autonomous scheduler |
| `/api/scheduler/stop` | POST | Deactivate autonomous scheduler |
| `/api/settings` | GET / PUT | Fetch or update channel and AI configurations |
