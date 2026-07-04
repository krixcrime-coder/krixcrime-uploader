# KrixCrime YouTube Auto Uploader

Fully automated YouTube uploader that picks random videos from Google Drive, adds the KrixCrime watermark + outro, and uploads to YouTube on a schedule via GitHub Actions.

## Architecture

- **Dashboard** (`/dashboard`) — Next.js web app (this Replit) for monitoring and settings
- **Python scripts** (`/scripts`) — Run inside GitHub Actions, not on Replit
- **GitHub Actions** (`.github/workflows/upload.yml`) — The automation engine (cron schedule)
- **Config/State** (`config.json`, `uploaded_log.json`, `used_video_ids.json`) — JSON files committed to the repo

## Running the Dashboard

The Next.js dashboard runs on port 5000 (via the workflow).

## User Preferences

- Dark theme with red/black KrixCrime brand colours
- Dashboard password: set via `DASHBOARD_PASSWORD_HASH` env var (bcrypt hash), or `DASHBOARD_PASSWORD` plain-text fallback (for dev)
- Keep all secrets in environment variables / GitHub Secrets — never hardcode
