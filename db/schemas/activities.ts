import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  DetailedSegmentEffort,
  Lap,
  PhotoSummary,
  PolylineMap,
  Split,
  SportType,
  SummaryGear,
} from "strava";

export const activitiesTable = pgTable("activities", {
  id: bigint({ mode: "number" }).primaryKey(),
  externalId: text("external_id"),
  resourceState: integer("resource_state"),
  uploadId: bigint("upload_id", { mode: "number" }),

  // Athlete reference (simplified - you may want a separate athletes table)
  athleteId: bigint("athlete_id", { mode: "number" }).notNull(),

  name: text("name").notNull(),
  distance: real("distance").notNull().default(0), // in meters
  movingTime: integer("moving_time"), // in seconds
  elapsedTime: integer("elapsed_time"), // in seconds
  totalElevationGain: real("total_elevation_gain"), // in meters

  sportType: text("sport_type").$type<SportType>().notNull(), // More specific sport type like "MountainBikeRide"

  startDate: timestamp("start_date", { withTimezone: true }),
  startDateLocal: timestamp("start_date_local", { withTimezone: true }),
  timezone: text("timezone"),
  utcOffset: bigint("utc_offset", { mode: "number" }), // in seconds

  // Location data - stored as arrays [lat, lng] or null
  startLatlng: jsonb("start_latlng").$type<[number, number] | null>(),
  endLatlng: jsonb("end_latlng").$type<[number, number] | null>(),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationCountry: text("location_country"),

  // activity stats
  achievementCount: integer("achievement_count"),
  kudosCount: integer("kudos_count"),
  commentCount: integer("comment_count"),
  athleteCount: integer("athlete_count"),

  // Map data
  map: jsonb("map").$type<PolylineMap>().notNull(),
  // mapResourceState: integer("map_resource_state"),
  // Activity flags
  trainer: boolean("trainer").default(false),
  commute: boolean("commute").default(false),
  manual: boolean("manual").default(false),
  private: boolean("private").default(false),
  flagged: boolean("flagged").default(false),
  // fromAcceptedTag: boolean("from_accepted_tag").default(false),
  hasKudoed: boolean("has_kudoed").default(false),

  // Performance metrics
  averageSpeed: real("average_speed").notNull().default(0), // in m/s
  maxSpeed: real("max_speed"), // in m/s
  averageCadence: real("average_cadence"),
  averageTemp: real("average_temp"), // in Celsius
  averageWatts: real("average_watts"),
  weightedAverageWatts: real("weighted_average_watts"),
  kilojoules: real("kilojoules"),
  deviceWatts: boolean("device_watts"),
  hasHeartrate: boolean("has_heartrate"),
  maxWatts: real("max_watts"),

  // Elevation data
  elevHigh: real("elev_high"), // in meters
  elevLow: real("elev_low"), // in meters

  // Photo
  photoCount: integer("photo_count"),
  totalPhotoCount: integer("total_photo_count"),
  photos: jsonb("photos").$type<PhotoSummary>(),

  // Other metrics
  prCount: integer("pr_count"),
  workoutType: integer("workout_type"),
  sufferScore: real("suffer_score"),
  description: text("description"),
  calories: real("calories"),

  // Gear reference
  gearId: text("gear_id"),
  gear: jsonb("gear").$type<SummaryGear>(),

  // // Additional metadata
  // partnerBrandTag: text("partner_brand_tag"),
  hideFromHome: boolean("hide_from_home").default(false),
  deviceName: text("device_name"),
  embedToken: text("embed_token"),
  // segmentLeaderboardOptOut: boolean("segment_leaderboard_opt_out").default(
  //   false
  // ),
  // leaderboardOptOut: boolean("leaderboard_opt_out").default(false),
  splitsMetric: jsonb("splits_metric").$type<Split[]>().default([]),
  splitsStandard: jsonb("splits_standard").$type<Split[]>().default([]),
  segmentEfforts: jsonb("segment_efforts")
    .$type<DetailedSegmentEffort[]>()
    .default([]),
  laps: jsonb("laps").$type<Lap[]>().default([]),
  bestEfforts: jsonb("best_efforts")
    .$type<DetailedSegmentEffort[]>()
    .default([]),

  // Timestamps for tracking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Activity = typeof activitiesTable.$inferSelect;
export type NewActivity = typeof activitiesTable.$inferInsert;
