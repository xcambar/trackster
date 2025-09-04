import { camelCase } from "change-case";
import { isPlainObject } from "es-toolkit";
import { AccessToken, DetailedActivity, SummaryActivity } from "strava";

import db from "@xcambar/trackster-db/client";
import { activitiesTable } from "./schema";

import { getTableColumns, sql } from "drizzle-orm";
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
  const scheduler = buildStravaAPIScheduler(token);

  let activityIDs: number[] = [];
  let page = 1;
  let hasNewActivities = true;
  while (hasNewActivities) {
    const _page = page++;
    const newActivities: SummaryActivity[] = await scheduler.request(
      async (client, name) => {
        console.log(`${name} | Fetching page ${_page}`);
        return await client.activities.getLoggedInAthleteActivities({
          page: _page,
        });
      },
      `athlete-activities-page-${_page}`
    );

    activityIDs = [
      ...activityIDs,
      ...newActivities.map((activity) => activity.id as number),
    ];
    hasNewActivities = !!newActivities.length;
  }

  // The requests run in parallel to save time
  return Promise.all<DetailedActivity>(
    activityIDs.map((id) => {
      console.log(`Scheduling activity ${id}`);
      return scheduler.request((client) => {
        console.log(`Fetching activity ${id}`);
        return client.activities.getActivityById({
          id,
          include_all_efforts: true, // Uncomment if needed
        });
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
    console.log(`upserting ${dbReadyObjects.length} entries into DB`);

    // Build the update set dynamically from the table schema
    const columns = getTableColumns(activitiesTable);
    const updateSet = Object.entries(columns).reduce(
      (acc, [columnName, column]) => {
        // Skip primary key and timestamps that should be preserved
        if (columnName === "id" || columnName === "createdAt") {
          return acc;
        }
        // Update updatedAt to current time
        if (columnName === "updatedAt") {
          acc[columnName] = new Date();
          return acc;
        }

        // For all other columns, use the excluded (new) value
        // Use the actual database column name from the column definition
        const dbColumnName = column.name;
        acc[columnName] = sql`excluded.${sql.identifier(dbColumnName)}`;
        return acc;
      },
      {} as Record<string, unknown>
    );

    rows = await db
      .insert(activitiesTable)
      .values(dbReadyObjects)
      .onConflictDoUpdate({
        target: activitiesTable.id,
        set: updateSet,
      })
      .returning();
  } catch (e) {
    console.log(e);
    return [];
  }
  return rows;
}

export const populateActivitiesFromAPI = async (token: AccessToken) => {
  const plainAPIObjects = await extract(token);
  const dbReadyObjects = await transform(plainAPIObjects);
  const rows = await load(dbReadyObjects);

  rows.forEach((row) => {
    console.log(`New activity "${row.name}" (${row.id}) created!`);
  });
  return rows;
};
