# Supabase

## Enabled features

- Auth
- Queues
- Webhook

### Auth

Auth requires to:

- disable email confirmation, since the User is created from the Strava login.

## Queues

Queues require to:

- enable to expose from PostgREST
- expose the schema `pgmq_public` (maybe only on development, to be confirmed)
- Expose the Service Role key (`SUPABASE_SERVICE_ROLE_KEY` or similar, NOT the `SUPABASE_ANON_KEY`) to grant write authorization

Queues setup:
- `strava_api`

## Webhooks

- 1 webhook triggered on INSERT on `auth.users` to dispatch to the appropriate edge function

## Edge functions

### `strava-webhook`

This Edge function listens to the Strava webhooks and dispatchs updates on the athletes and their activities. Hence, it is a publicly available function.