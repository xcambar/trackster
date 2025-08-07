import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const webhookEventsTable = pgTable("webhook_events", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  objectType: text("object_type").notNull(),
  objectId: bigint("object_id", { mode: "number" }).notNull(),
  aspectType: text("aspect_type").notNull(),
  ownerId: bigint("owner_id", { mode: "number" }).notNull(),
  subscriptionId: integer("subscription_id").notNull(),
  eventTime: timestamp("event_time", { withTimezone: true }).notNull(),
  updates: jsonb("updates"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
export type NewWebhookEvent = typeof webhookEventsTable.$inferInsert;