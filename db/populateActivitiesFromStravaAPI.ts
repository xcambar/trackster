import { getStravaAPIClient } from "app/lib/strava/api";
import { AccessToken, DetailedActivity, SummaryActivity } from "strava";
import { camelCase } from "change-case";

import { activitiesTable } from "./schema";
import { isPlainObject } from "is-plain-object";
import db from "../app/services/db.server";

import { getTableColumns } from "drizzle-orm";
import { PgTimestamp } from "drizzle-orm/pg-core";

function findDateColumns(table) {
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
  const dateColumns = findDateColumns(activitiesTable);
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

async function extract(token: AccessToken): Promise<DetailedActivity[]> {
  const client = getStravaAPIClient(token);

  let activityIDs: number[] = [];
  let page = 1;
  let hasNewActivities = true;
  while (hasNewActivities) {
    console.log(`Fetching page ${page}`);
    const newActivities: SummaryActivity[] =
      await client.activities.getLoggedInAthleteActivities({
        page: page++,
      });

    activityIDs = [
      ...activityIDs,
      ...newActivities.map((activity) => activity.id as number),
    ];
    hasNewActivities = !!newActivities.length;
  }
  return Promise.all(
    activityIDs.map((id) => {
      console.log(`fetching activity ${id}`);
      return client.activities.getActivityById({
        id,
        include_all_efforts: true, // Uncomment if needed
      });
    })
  );
}

function transform(
  activities: DetailedActivity[]
): (typeof activitiesTable.$inferInsert)[] {
  return activities.map(({ athlete: { id: athlete_id }, ...payload }) => {
    console.log(`mapping for DB ${payload.id}`);
    return convertToCamelCase({
      athlete_id,
      ...payload,
    }) as typeof activitiesTable.$inferInsert;
  });
}

async function load(dbReadyObjects: (typeof activitiesTable.$inferInsert)[]) {
  let rows;
  try {
    console.log(`inserting ${dbReadyObjects.length} entries into DB`);
    rows = await db.insert(activitiesTable).values(dbReadyObjects).returning();
  } catch (e) {
    console.log(e);
    return [];
  }
  return rows;
}

export const populateActivitiesFromAPI = async (token: AccessToken) => {
  try {
    const plainAPIObjects = await extract(token);
    const dbReadyObjects = await transform(plainAPIObjects);
    const rows = await load(dbReadyObjects);

    rows.forEach((row) => {
      console.log(`New activity "${row.name}" (${row.id}) created!`);
    });
  } catch (e) {
    console.log(e);
  }
};
