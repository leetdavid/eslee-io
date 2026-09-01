# Sushiro Queue Collector

This configuration owns the Railway service that invokes the protected Sushiro queue collector every five minutes.

`CRON_SECRET` and `SUSHIRO_CRON_URL` remain managed as Railway variables and are intentionally preserved rather than stored in Git.

Changes to `.railway/` are planned on pull requests and applied by GitHub Actions after merge to `main`.
