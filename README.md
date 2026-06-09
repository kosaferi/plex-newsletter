# 📺 Plex Newsletter

Weekly personalized email digest for Plex server users — powered by **Tautulli** and the **Plex API**.

## Features

- **Per-user personalized emails** with individual watch history, hours, active days, favourite genre, and most-binged show
- **User ranking** — each user sees their position vs. the whole server
- **Server-wide top charts** — top movies & shows by play count
- **Recently added** — new content added in the past week
- **New member shoutouts** — welcome new users
- **Weekly cron schedule** — fires every Monday at 9am by default
- **Preview server** — view any user's newsletter in the browser before sending
- **Docker-ready** — single `docker compose up` to deploy

## Prerequisites

| Service   | Required | Notes |
|-----------|----------|-------|
| Plex      | ✅       | Plex token needed |
| Tautulli  | ✅       | API key needed; users **must have email set** in Tautulli |
| SMTP      | ✅       | Gmail App Password, Mailgun, etc. |

## Quick Start

```bash
# 1. Clone & install
git clone <repo>
cd plex-newsletter
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your Plex, Tautulli & SMTP details

# 3. Preview newsletter in browser (no emails sent)
npm run preview
# Open http://localhost:3000

# 4. Send immediately
npm run send:now

# 5. Start daemon (runs on cron schedule)
npm start
```

## Docker

```bash
# Build & run daemon
cd docker
docker compose up -d

# With preview server
docker compose --profile preview up -d
```

## Environment Variables

| Variable           | Description                              | Default              |
|--------------------|------------------------------------------|----------------------|
| `PLEX_URL`         | Plex server URL                          | —                    |
| `PLEX_TOKEN`       | Plex auth token                          | —                    |
| `TAUTULLI_URL`     | Tautulli URL                             | —                    |
| `TAUTULLI_API_KEY` | Tautulli API key                         | —                    |
| `SMTP_HOST`        | SMTP hostname                            | —                    |
| `SMTP_PORT`        | SMTP port                                | `587`                |
| `SMTP_USER`        | SMTP username                            | —                    |
| `SMTP_PASS`        | SMTP password / app password             | —                    |
| `SMTP_FROM`        | From address                             | —                    |
| `NEWSLETTER_TITLE` | Title shown in email header              | `Weekly Plex Digest` |
| `CRON_SCHEDULE`    | Cron expression                          | `0 9 * * 1` (Mon 9am)|
| `STATS_DAYS`       | Look-back window in days                 | `7`                  |
| `ADMIN_EMAIL`      | Admin email for alerts                   | —                    |
| `PREVIEW_PORT`     | Port for preview server                  | `3000`               |

## How Users Are Selected

Only Tautulli users with a **non-empty email** field receive the newsletter. Set emails in Tautulli under **Users → Edit User**.

## Project Structure

```
src/
  api/
    plex.js           # Plex API client
    tautulli.js       # Tautulli API client
  services/
    statsCollector.js # Gathers all data
    templateRenderer.js # Handlebars → HTML
    mailer.js         # SMTP sending
    newsletterRunner.js # Orchestrator
  scheduler/
    cron.js           # node-cron wrapper
  templates/
    newsletter.hbs    # Email HTML template
  utils/
    logger.js         # Winston logger
  index.js            # Entry point (daemon)
  preview.js          # Preview server
config/
  index.js            # Env var loader
docker/
  Dockerfile
  docker-compose.yml
```

## Web UI

The app ships with a full graphical interface accessible at `http://localhost:3000` (or your configured `PREVIEW_PORT`).

### Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Server stats, live streams, top movies/shows, recently added |
| **Preview** | Per-user email preview rendered in-browser — switch between users instantly |
| **Send** | Select recipients, send with live progress log |
| **Users** | All Tautulli users, inline email editing, play counts |
| **Settings** | Plex, Tautulli, SMTP config with one-click connection testing; send test email |

### Key features
- **Test connections** — Plex, Tautulli, and SMTP can each be tested with one click before sending
- **Send test email** — fire a test email to any address from the Settings page  
- **Inline email editing** — set or correct a user's email directly in the Users table
- **Per-user preview** — preview is cached per session; hit Regenerate to refresh
- **Live stream feed** — Dashboard shows currently active Plex sessions with playback progress
- **Send log** — real-time progress bar and per-user result log on the Send page
