import {
  pgTable,
  serial,
  real,
} from "drizzle-orm/pg-core";

export const gapLookupTable = pgTable("gap_lookup", {
  id: serial("id").primaryKey(),
  gradePercent: real("grade_percent").notNull().unique(), // -50.0 to +50.0 in 0.1% increments
  paceAdjustmentFactor: real("pace_adjustment_factor").notNull(), // Multiplier for base pace
});

export type GapLookup = typeof gapLookupTable.$inferSelect;
export type NewGapLookup = typeof gapLookupTable.$inferInsert;