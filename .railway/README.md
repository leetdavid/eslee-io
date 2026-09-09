# Sushiro Queue Infrastructure

This configuration owns the Sushiro queue collector, its private Redis cache, and the authenticated HTTPS cache gateway used by the Vercel app.

`CRON_SECRET`, `SUSHIRO_CRON_URL`, and `SUSHIRO_CACHE_GATEWAY_TOKEN` remain managed as Railway variables and are intentionally preserved rather than stored in Git.

Changes to `.railway/` are planned on pull requests and applied by GitHub Actions after merge to `main`.
