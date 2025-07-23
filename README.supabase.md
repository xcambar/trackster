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
- Expose the Service Role key (`SUPABASE_SECRET_KEY` or similar, NOT the `SUPABASE_ANON_KEY`) to grant write authorization

## Webhooks

- 1 webhook triggered on INSERT on `auth.users` to dispatch to the appropriate edge function
