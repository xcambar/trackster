import {
  pgTable,
  bigint,
  text,
  integer,
  jsonb,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { activitiesTable } from "./activities";

export const activityStreamsTable = pgTable(
  "activity_streams",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    activityId: bigint("activity_id", { mode: "number" })
      .notNull()
      .references(() => activitiesTable.id, { onDelete: "cascade" }),

    // Stream metadata from BaseStream interface
    originalSize: integer("original_size").notNull(),
    resolution: text("resolution").$type<"low" | "medium" | "high">().notNull(),
    seriesType: text("series_type").$type<"distance" | "time">().notNull(),

    // Stream data arrays - each stream type stored as JSONB array
    // All streams are optional since not all activities have all stream types
    timeData: jsonb("time_data").$type<number[] | null>(),
    distanceData: jsonb("distance_data").$type<number[] | null>(),
    latlngData: jsonb("latlng_data").$type<[number, number][] | null>(),
    altitudeData: jsonb("altitude_data").$type<number[] | null>(),
    velocitySmoothData: jsonb("velocity_smooth_data").$type<number[] | null>(),
    heartrateData: jsonb("heartrate_data").$type<number[] | null>(),
    cadenceData: jsonb("cadence_data").$type<number[] | null>(),
    wattsData: jsonb("watts_data").$type<number[] | null>(),
    tempData: jsonb("temp_data").$type<number[] | null>(),
    movingData: jsonb("moving_data").$type<number[] | null>(),
    gradeSmoothData: jsonb("grade_smooth_data").$type<number[] | null>(),

    // Timestamps for tracking
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Ensure one streams record per activity
    uniqueActivityStream: foreignKey({
      columns: [table.activityId],
      foreignColumns: [activitiesTable.id],
      name: "activity_streams_activity_id_unique",
    }),
  })
);

export type ActivityStreams = typeof activityStreamsTable.$inferSelect;
export type NewActivityStreams = typeof activityStreamsTable.$inferInsert;