# eslee.io

Monorepo for the `eslee.io` domain, built with turborepo and pnpm.

Infrastructure as Code (IaC) is managed using Terraform Cloud.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:next` | Start only the www app |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Run TypeScript checks across the monorepo |
| `pnpm check` | Run Biome linter/formatter checks |
| `pnpm check:fix` | Auto-fix linting and formatting issues |
| `pnpm db:push` | Push database schema changes |
| `pnpm db:studio` | Open Drizzle Studio |

## Apps

### www - [eslee.io](https://eslee.io)

Main portfolio website built with Next.js 14, Tailwind CSS, and tRPC.

### photography - [photography.eslee.io](https://photography.eslee.io)

Photography portfolio showcasing work. Separate subdomain for clean separation.

### cms - [cms.eslee.io](https://cms.eslee.io)

Payload CMS for content management.

### auth-proxy (unused)
Nitro server that proxies OAuth requests in preview deployments.

## Packages

- **@eslee/api** — (unused) tRPC router with type-safe API procedures
- **@eslee/auth** — (unused)
- **@eslee/db** — (unused)
- **@eslee/ui** — (unused) Shared React components built with shadcn/ui
- **@eslee/validators** — (unused) Shared Zod validation schemas
- **@eslee/payload** — Payload CMS shared configuration

## Deployment

All apps are deployed to Vercel.

Domains are on Cloudflare and managed using Terraform Cloud.

## License

Private
