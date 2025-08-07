# Strava Webhoof Edge Function

This function interacts with the Strava API and listens to events.

> [!WARNING]
> The webhook must be registered. It is at the moment a manual operation.

## Registration of the webhook

```bash
http POST https://www.strava.com/api/v3/push_subscriptions \
client_id="${STRAVA_CLIENT_ID}" \
client_secret="${STRAVA_CLIENT_SECRET}" \
callback_url="https://${YOUR_WEBHOOK_URL}" \
verify_token="${YOUR_GENERATED_VERIFY_TOKEN}"
```

> [!NOTE]
> The generated verify token can be any string that you create. It will be
> resent by the Strava API to your webhook for verification.

## Examples

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
    --header 'Content-Type: application/json' \
    --data '{
      "object_type": "activity",
      "object_id": 1234567890,
      "aspect_type": "create",
      "owner_id": 134815,
      "subscription_id": 120475,
      "event_time": 1516126040,
      "updates": {}
    }'
```

### Test Activity Update (Title Change)

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
  --header 'Content-Type: application/json' \
  --data '{
    "object_type": "activity",
    "object_id": 9876543210,
    "aspect_type": "update",
    "owner_id": 987654,
    "subscription_id": 120475,
    "event_time": 1516126100,
    "updates": {
      "title": "Morning Run Updated"
    }
  }'
```

### Test Activity Update (Multiple Fields)

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
  --header 'Content-Type: application/json' \
  --data '{
    "object_type": "activity",
    "object_id": 5555555555,
    "aspect_type": "update",
    "owner_id": 123456,
    "subscription_id": 120475,
    "event_time": 1516126200,
    "updates": {
      "title": "Evening Bike Ride",
      "type": "Ride",
      "private": true
    }
  }'
```

### Test Activity Deletion

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
  --header 'Content-Type: application/json' \
  --data '{
    "object_type": "activity",
    "object_id": 7777777777,
    "aspect_type": "delete",
    "owner_id": 234567,
    "subscription_id": 120475,
    "event_time": 1516126300,
    "updates": {}
  }'
```

### Test Athlete Deauthorization

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
  --header 'Content-Type: application/json' \
  --data '{
    "object_type": "athlete",
    "object_id": 134815,
    "aspect_type": "update",
    "owner_id": 134815,
    "subscription_id": 120475,
    "event_time": 1516126400,
    "updates": {
      "authorized": "false"
    }
  }'
```

### Test Webhook Verification (GET)

```bash
curl -X GET 'http://127.0.0.1:54321/functions/v1/strava-webhook?hub.mode=subscribe&hub.challen
ge=test_challenge_123&hub.verify_token=STRAVA'
```
