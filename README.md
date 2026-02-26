# GoWater HR Portal

A full-stack HR management system for GoWater — a monorepo with a Next.js web dashboard and a React Native mobile app for field employees.

## Apps

| App | Description |
|---|---|
| `apps/web` | Next.js 15 admin dashboard |
| `apps/mobile` | React Native (Expo) employee app |

## Features

- **Attendance Tracking** — check-in/check-out with Cloudinary photo verification and Slack notifications
- **Leave Management** — request, approve, and track employee leave
- **Task Assignment** — assign and monitor tasks across the team
- **Reports** — start-of-day and end-of-day reports sent via WhatsApp
- **File Management** — team file uploads via Cloudinary
- **Webhooks & API Keys** — n8n/Zapier integration support
- **Attendance Edit Requests** — approval workflow for time corrections

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 15 (App Router) |
| Mobile framework | React Native (Expo) |
| Language | TypeScript (strict) |
| Database | Supabase (PostgreSQL) |
| File storage | Cloudinary |
| Messaging | WhatsApp Business API, Slack |
| Package manager | pnpm + Turborepo |

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local  # fill in env vars
pnpm dev:web     # web dashboard
pnpm dev:mobile  # mobile app
```

## Database Setup

Run `apps/web/migrations/run_all_migrations.sql` in the Supabase SQL Editor.
This single file creates all tables, indexes, and applies all migrations in the correct order.

## Project Structure

```
gowater-monorepo/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/           # Pages and API routes
│   │   │   ├── components/    # React components
│   │   │   ├── contexts/      # React context providers
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Supabase, auth, services
│   │   │   ├── styles/        # Global styles
│   │   │   ├── types/         # TypeScript types
│   │   │   └── utils/         # Utility functions
│   │   └── migrations/        # Database setup SQL
│   └── mobile/
│       └── src/
│           ├── contexts/      # Auth context
│           └── services/      # API service layer
└── docs/                      # Reference documentation
```
