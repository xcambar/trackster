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