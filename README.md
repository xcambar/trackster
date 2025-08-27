# Trackster

The prokect aims at being a central hub for your running, cycling, training, workouts. It is still in its infancy.

## Features

### 🏃‍♂️ Activity Analysis and Performance prediction
Trackster analyses your training history to predict your performance on any route, giving you realistic pace targets and finish time estimates.

### 🗺️ Route Generation
Trackster generates new paths tailored to your fitness level and goals, and predicts how you'll perform.

### 📊 Visual Training Insights
Beautiful, interactive maps bring your training data to life. See your progress over time, visualize your routes, and spot trends that help you train smarter, not just harder.

## Technology

The project is built using Supabase and Remix. It uses OAuth to login with Strava, Drizzle to interact with the PostgreSQL database, uses a message queue and Edge function to handle async jobs, the interface is built using MaterialUI, the maps are displayed with Leaflet.

See [README.remix.md](./README.remix.md) and [README.supabase.md](./README.supabase.md) for details and instructions.

## Publishing Packages

This monorepo uses [Changesets](https://github.com/changesets/changesets) for automated package publishing to GitHub NPM registry.

### To publish a new version:

1. Make your changes to packages in `packages/@trackster/*`
2. Run `npm run changeset` to create a changeset describing your changes (select affected packages and change type: patch/minor/major)
3. Commit and push the changeset file to the main branch
4. GitHub Actions will automatically create a "Version Packages" PR with updated versions and changelogs
5. Review and merge the PR to trigger automated publishing to `https://npm.pkg.github.com`. 

> [!note] 
> Packages are published with restricted access, scoped to this GitHub organization. The workflow handles semantic versioning, changelog generation, and dependency updates automatically.