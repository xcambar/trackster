# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trackster is a running/cycling activity tracking application built with Remix and Supabase. It integrates with Strava for OAuth authentication and activity data synchronization, displays interactive maps using Leaflet, and stores activity data in PostgreSQL.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run test` - Run tests with Vitest
- `npm run lint` - Lint code with ESLint
- `npm run typecheck` - Type check with TypeScript
- `npm run format` - Format code with Prettier

## Architecture

### Core Technologies
- **Frontend**: Remix with React, Material-UI components, Leaflet maps
- **Backend**: Remix server-side rendering with Supabase PostgreSQL
- **Database**: Drizzle ORM with PostgreSQL (snake_case naming)
- **Authentication**: Remix Auth with Strava OAuth2 strategy
- **Maps**: Leaflet with react-leaflet for activity visualization
- **Queue System**: Supabase message queues for async processing

### Key Directories
- `app/` - Remix application code
  - `routes/` - Remix file-based routing
  - `components/` - React components including Leaflet map components
  - `lib/` - Business logic, models, and utilities
  - `services/` - Server-side services (auth, database, session)
- `db/` - Database schema and migration utilities
- `lib/` - Shared libraries and utilities
- `scripts/` - Utility scripts for testing and database operations

### Database Schema
Activities are stored with comprehensive Strava data including:
- Activity metadata (name, sport type, distance, time)
- Geographic data (start/end coordinates, polyline maps)
- Performance metrics (splits, laps, efforts)
- Gear and athlete associations

### Authentication Flow
1. Users authenticate via Strava OAuth2
2. User profile and tokens stored in Supabase Auth
3. Strava API tokens auto-refresh with callback handling
4. Session management via Remix Auth

### Environment Configuration
The application uses `lib/environment.ts` for centralized environment variable management. Key variables include:
- `SUPABASE_DATABASE_URL` - Database connection
- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` - OAuth credentials

### Map Integration
- Leaflet maps with Strava polyline visualization
- Client-side only rendering for map components (`.client.tsx` suffix)
- Polyline decoding from Google polyline format
- Segment and activity route overlays

### Testing
- Vitest for unit testing
- Testing utilities in place for React components
- Database population scripts for development/testing

## Important Patterns

### Client-Side Components
Map-related components use `.client.tsx` suffix and are wrapped with `ClientOnly` from remix-utils for hydration safety.

### Database Queries
Use Drizzle ORM with the activities table schema. Database operations are centralized in `app/lib/models/`.

### Strava Integration
API calls use the centralized client in `app/lib/strava/api.ts` with automatic token refresh handling.

## Methodology - best practices

- Always import dotenv when writing CLI scripts
- Propose changes to the database schema to avoid reccurring computations
- Never output raw SQL unless specified or agreed upon, always rely on Drizzle+TS. An exception is when the complexity becomes overwhelming to the reader and SQL would be preferred.
- 