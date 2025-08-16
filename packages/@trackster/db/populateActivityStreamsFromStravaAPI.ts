import { getStravaAPIClient } from "../../../app/lib/strava/api";
import { AccessToken, Stream, StreamSet } from "strava";
import { isPlainObject } from "es-toolkit";
import { camelCase } from "change-case";

import { activityStreamsTable, activitiesTable } from "./schema";
import db from "../../../app/services/db.server";

import { getTableColumns, eq } from "drizzle-orm";
import { PgTable, PgTimestamp } from "drizzle-orm/pg-core";
import { buildStravaAPIScheduler } from "../../../app/services/strava.server";

function findDateColumns(table: PgTable) {
  const columns = getTableColumns(table);
  return Object.entries(columns)
    .filter(([, column]) => column instanceof PgTimestamp)
    .map(([name]) => name);
}

/**
 * Helper function to convert recursively the keys of an object to camelCase
 * @param obj an object with potentially non-camelcased keys
 * @returns an object with camelcased keys
 */
function convertToCamelCase(obj: object): object {
  const dateColumns = findDateColumns(activityStreamsTable);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (isPlainObject(value)) {
      value = convertToCamelCase(value);
    }
    const camelCaseColumnName = camelCase(key);
    if (dateColumns.includes(camelCaseColumnName)) {
      value = new Date(value);
    }
    return { ...acc, [camelCaseColumnName]: value };
  }, {});
}

async function extract(
  client: ReturnType<typeof getStravaAPIClient>,
  activityId: number
): Promise<{ streams: StreamSet; athleteId: number } | null> {
  console.log(`Fetching streams for activity ${activityId}`);

  // Get athlete ID from existing activity in database
  const [activity] = await db
    .select({ athleteId: activitiesTable.athleteId })
    .from(activitiesTable)
    .where(eq(activitiesTable.id, activityId))
    .limit(1);

  if (!activity) {
    throw new Error(`Activity ${activityId} not found in database`);
  }

  const streams = await client.streams.getActivityStreams({
    id: activityId,
    keys: [
      "time",
      "distance",
      "latlng",
      "altitude",
      "velocity_smooth",
      "heartrate",
      "cadence",
      "watts",
      "temp",
      "moving",
      "grade_smooth",
    ],
  });

  return { streams, athleteId: activity.athleteId };
}

function transform(
  streams: StreamSet,
  activityId: number,
  athleteId: number
): typeof activityStreamsTable.$inferInsert {
  console.log(`Transforming streams for activity ${activityId}`);

  // Use the first available stream's metadata for the record
  const firstStream =
    streams.time || streams.distance || streams.latlng || streams.altitude;
  if (!firstStream) {
    throw new Error(`No valid streams found for activity ${activityId}`);
  }

  const dbObject = {
    activity_id: activityId,
    athlete_id: athleteId,
    original_size: firstStream.original_size,
    resolution: firstStream.resolution,
    series_type: firstStream.series_type,

    // Map each stream type to its data array (or null if not present)
    time_data: streams.time?.data || null,
    distance_data: streams.distance?.data || null,
    latlng_data: streams.latlng?.data || null,
    altitude_data: streams.altitude?.data || null,
    velocity_smooth_data: streams.velocity_smooth?.data || null,
    heartrate_data: streams.heartrate?.data || null,
    cadence_data: streams.cadence?.data || null,
    watts_data: streams.watts?.data || null,
    temp_data: streams.temp?.data || null,
    moving_data: streams.moving?.data || null,
    grade_smooth_data: streams.grade_smooth?.data || null,
  };

  return convertToCamelCase(
    dbObject
  ) as typeof activityStreamsTable.$inferInsert;
}

async function load(dbReadyObject: typeof activityStreamsTable.$inferInsert) {
  try {
    console.log(
      `Inserting streams for activity ${dbReadyObject.activityId} into DB`
    );

    // Check if streams already exist for this activity
    const existing = await db
      .select()
      .from(activityStreamsTable)
      .where(eq(activityStreamsTable.activityId, dbReadyObject.activityId!))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `Streams already exist for activity ${dbReadyObject.activityId}, updating...`
      );
      const [row] = await db
        .update(activityStreamsTable)
        .set({
          ...dbReadyObject,
          updatedAt: new Date(),
        })
        .where(eq(activityStreamsTable.activityId, dbReadyObject.activityId!))
        .returning();
      return row;
    } else {
      const [row] = await db
        .insert(activityStreamsTable)
        .values(dbReadyObject)
        .returning();
      return row;
    }
  } catch (e) {
    console.log("Error inserting/updating streams:", e);
    throw e;
  }
}

export const populateActivityStreamsFromAPI = async (
  token: AccessToken,
  activityId: number
) => {
  try {
    const scheduler = buildStravaAPIScheduler(token);
    const extractResult: Awaited<ReturnType<typeof extract>> =
      await scheduler.request(async (client) => {
        return await extract(client, activityId);
      });

    if (!extractResult) {
      console.log(`No streams available for activity ${activityId}`);
      return null;
    }

    const { streams, athleteId } = extractResult;
    const dbReadyObject = transform(streams, activityId, athleteId);
    const row = await load(dbReadyObject);

    console.log(
      `Activity streams for "${activityId}" (athlete ${athleteId}) saved/updated!`
    );
    return row;
  } catch (e) {
    console.log(`Error populating streams for activity ${activityId}:`, e);
    throw e;
  }
};
