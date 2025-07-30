# Race Predictor Data Population Workflow

This document outlines the recommended workflow for keeping the race predictor up-to-date when new activities are added to the system.

## Overview

The race predictor relies on precomputed performance models stored in the database to provide fast, accurate predictions. When new activities are added, these models need to be updated to maintain prediction accuracy.

## Workflow Steps

### 1. New Activity Added to Database
When a new activity is imported from Strava:
```
activities table ← New activity record inserted
```

### 2. Populate Activity Streams (if available)
If the activity has GPS and sensor data, populate the streams:
```bash
# Run the streams ETL for the specific activity
npx tsx db/populateActivityStreamsFromStravaAPI.ts <activity_id>
```
This will:
- Fetch streams from Strava API (GPS, heart rate, grade, etc.)
- Store in `activity_streams` table with athlete_id
- Skip if streams already exist or unavailable

### 3. Update Athlete Performance Profile
When new stream data is available, update the athlete's performance model:

#### Option A: Immediate Update (for critical athletes)
```bash
# Update specific athlete profile immediately
npx tsx scripts/buildAthletePerformanceProfiles.ts <athlete_id>
```

#### Option B: Batch Update (recommended for efficiency)
```bash
# Update all athlete profiles (run nightly)
npx tsx scripts/buildAthletePerformanceProfiles.ts
```

### 4. Data Quality Thresholds
The profile builder only updates when there's significant new data:

**Minimum Data Requirements:**
- At least 10 new GPS points per grade range
- Activity distance > 1km  
- Valid velocity and grade data

**Update Triggers:**
- New activity adds >5% to total distance
- New activity covers previously uncovered grade ranges
- First activity in a new distance category (5K, 10K, half marathon, etc.)

## Automated Workflow (Recommended)

### Database Triggers
```sql
-- Example trigger to mark athletes for profile updates
CREATE OR REPLACE FUNCTION mark_athlete_for_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark athlete profile as needing update
    UPDATE athlete_performance_profiles 
    SET last_updated = last_updated -- Touch to trigger update flag
    WHERE athlete_id = NEW.athlete_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_streams_updated
    AFTER INSERT OR UPDATE ON activity_streams
    FOR EACH ROW
    EXECUTE FUNCTION mark_athlete_for_update();
```

### Scheduled Batch Jobs

#### Daily Profile Updates (Recommended)
```bash
# Run at 2 AM daily
0 2 * * * cd /app && npx tsx scripts/buildAthletePerformanceProfiles.ts >> /var/log/profile-updates.log 2>&1
```

#### Weekly Full Rebuild (Data Quality)
```bash
# Full rebuild every Sunday at 3 AM
0 3 * * 0 cd /app && npx tsx scripts/buildAthletePerformanceProfiles.ts --force-rebuild >> /var/log/full-rebuild.log 2>&1
```

## Performance Considerations

### Incremental vs. Full Updates

**Incremental Updates** (Preferred):
- Only recalculate when new data significantly changes averages
- Check if new data > 5% of existing data volume
- Update in-place rather than full recalculation

**Full Updates** (When necessary):
- New athlete (no existing profile)
- Data quality issues detected
- Major algorithm changes

### Batch Processing
```typescript
// Example batch update logic
async function batchUpdateProfiles() {
  // Get athletes with new stream data since last update
  const athletesToUpdate = await db
    .select({ athleteId: activityStreamsTable.athleteId })
    .from(activityStreamsTable)
    .innerJoin(
      athletePerformanceProfilesTable,
      eq(activityStreamsTable.athleteId, athletePerformanceProfilesTable.athleteId)
    )
    .where(
      gt(activityStreamsTable.createdAt, athletePerformanceProfilesTable.lastUpdated)
    )
    .groupBy(activityStreamsTable.athleteId);

  // Update in parallel (limit concurrency)
  await Promise.allSettled(
    athletesToUpdate.map(athlete => 
      buildAthleteProfile(athlete.athleteId)
    )
  );
}
```

## Monitoring & Alerts

### Data Quality Checks
- Monitor profile update success rates
- Alert if athlete profiles haven't updated in >7 days with new activities
- Check for performance regressions in prediction accuracy

### Performance Metrics
- Track profile update duration
- Monitor database query performance
- Alert if batch updates take >30 minutes

## Manual Intervention Scenarios

### When to Manually Update
1. **High-priority athlete** adds significant training data
2. **Race prediction requested** for athlete with outdated profile
3. **Data quality issues** detected in automated updates
4. **Algorithm improvements** require profile rebuilds

### Emergency Profile Rebuild
```bash
# Force rebuild single athlete (ignores update thresholds)
npx tsx scripts/buildAthletePerformanceProfiles.ts <athlete_id> --force

# Rebuild all profiles (use sparingly)
npx tsx scripts/buildAthletePerformanceProfiles.ts --rebuild-all
```

## Best Practices

### 1. Lazy Loading Strategy
- Only update profiles when prediction is requested
- Cache recent predictions to avoid redundant calculations
- Use background jobs for non-urgent updates

### 2. Data Validation
- Verify stream data quality before updating profiles
- Flag suspicious data (GPS errors, unrealistic speeds)
- Maintain data lineage for debugging

### 3. Rollback Strategy
- Keep previous profile versions for 30 days
- Enable quick rollback if new algorithm performs poorly
- A/B test major changes before full deployment

### 4. Scalability
- Partition profile updates by athlete activity level
- Prioritize active athletes for real-time updates
- Use read replicas for prediction queries during updates

## Integration Points

### With Strava Sync
```typescript
// After successful activity import
await importStravaActivity(activityData);
await populateActivityStreams(stravaToken, activity.id);
// Queue profile update (don't block user)
await queueProfileUpdate(activity.athleteId);
```

### With Prediction API
```typescript
// Check profile freshness before prediction
const profile = await getAthleteProfile(athleteId);
if (isProfileStale(profile)) {
  await updateAthleteProfile(athleteId);
}
return await predictRaceTime(input);
```

This workflow ensures the race predictor maintains high accuracy while optimizing for performance and resource utilization.