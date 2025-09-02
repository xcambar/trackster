import {
  pgTable,
  bigint,
  real,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const athletePerformanceProfilesTable = pgTable("athlete_performance_profiles", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  athleteId: bigint("athlete_id", { mode: "number" }).notNull().unique(),

  // Speed by standardized grade buckets (m/s)
  // Uphill grades (positive)
  speedGrade0To5: real("speed_grade_0_5"), // 0-5% grade average speed
  speedGrade5To10: real("speed_grade_5_10"), // 5-10% grade average speed  
  speedGrade10To15: real("speed_grade_10_15"), // 10-15% grade average speed
  speedGrade15To25: real("speed_grade_15_25"), // 15-25% grade average speed
  speedGradeOver25: real("speed_grade_over_25"), // >25% grade average speed
  
  // Downhill grades (negative)
  speedGradeNeg5To0: real("speed_grade_neg_5_to_0"), // -5% to 0% grade average speed
  speedGradeNeg10ToNeg5: real("speed_grade_neg_10_to_neg_5"), // -10% to -5% grade average speed
  speedGradeNeg15ToNeg10: real("speed_grade_neg_15_to_neg_10"), // -15% to -10% grade average speed
  speedGradeNeg25ToNeg15: real("speed_grade_neg_25_to_neg_15"), // -25% to -15% grade average speed
  speedGradeNegOver25: real("speed_grade_neg_over_25"), // <-25% grade average speed

  // Distance-based pace profiles (min/km)
  avgPace5k: real("avg_pace_5k"),
  avgPace10k: real("avg_pace_10k"),
  avgPaceHalfMarathon: real("avg_pace_half_marathon"),
  avgPaceMarathon: real("avg_pace_marathon"),

  // Performance characteristics
  paceDegradationPerKm: real("pace_degradation_per_km"), // How pace slows with distance
  elevationEfficiencyFactor: real("elevation_efficiency_factor"), // Personal GAP adjustment

  // Data quality metrics
  totalActivities: integer("total_activities").notNull().default(0),
  totalDistanceKm: real("total_distance_km").notNull().default(0),
  gradeCoverageFlags: integer("grade_coverage_flags").notNull().default(0), // Bitfield for which grades have data

  // Timestamps
  computedAt: timestamp("computed_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export type AthletePerformanceProfile = typeof athletePerformanceProfilesTable.$inferSelect;
export type NewAthletePerformanceProfile = typeof athletePerformanceProfilesTable.$inferInsert;