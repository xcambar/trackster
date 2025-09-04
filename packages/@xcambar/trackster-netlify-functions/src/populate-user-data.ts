import { buildAthleteProfile } from "@xcambar/trackster-db/buildAthletePerformanceProfiles";
import db from "@xcambar/trackster-db/client";
import { populateActivitiesFromAPI } from "@xcambar/trackster-db/populateActivitiesFromStravaAPI";
import { populateActivityStreamsFromAPI } from "@xcambar/trackster-db/populateActivityStreamsFromStravaAPI";
import { authSchemaUsersTable } from "@xcambar/trackster-db/supabase_schema";
import { eq } from "drizzle-orm";

interface NetlifyEvent {
  path: string;
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
}

interface NetlifyContext {
  // Netlify context properties
}

export const handler = async (
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}> => {
  // Extract userId from the URL path
  // Expected format: /populate-user-data/{userId}
  const pathSegments = event.path.split("/");
  const userId = pathSegments[pathSegments.length - 1];

  // CORS headers for browser compatibility
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Method not allowed. Use POST.",
        message: "This endpoint only accepts POST requests.",
      }),
    };
  }

  if (!userId || userId === "populate-user-data") {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Missing userId",
        message:
          "Please provide a userId in the URL path: /populate-user-data/{userId}",
      }),
    };
  }

  try {
    // Find the user in the database
    const [user] = await db
      .select()
      .from(authSchemaUsersTable)
      .where(eq(authSchemaUsersTable.id, userId))
      .limit(1);

    if (!user) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "User not found",
          message: `User ${userId} not found in the database`,
        }),
      };
    }

    // Extract Strava token from user metadata
    const token = (user.userMetadata as any)?.strava_profile?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Token not found",
          message: `Strava token not found for user ${userId}`,
        }),
      };
    }

    // Start the data population process
    console.log(`Starting data population for user ${userId}`);

    // Populate activities from Strava API
    const activities = await populateActivitiesFromAPI(token);
    const athleteId = activities[0]?.athleteId;
    const activityIds = activities.map(({ id }) => id);

    console.log(`Found ${activities.length} activities for user ${userId}`);

    // Populate activity streams for each activity
    let streamsPopulated = 0;
    for (const activityId of activityIds) {
      try {
        await populateActivityStreamsFromAPI(token, activityId);
        streamsPopulated++;
        console.log(
          `Populated streams for activity ${activityId} (${streamsPopulated}/${activityIds.length})`
        );
      } catch (streamError) {
        console.warn(
          `Failed to populate streams for activity ${activityId}:`,
          streamError
        );
      }
    }

    // Build athlete performance profile
    if (athleteId) {
      await buildAthleteProfile(athleteId);
      console.log(`Built performance profile for athlete ${athleteId}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: `Successfully populated data for user ${userId}`,
        stats: {
          userId,
          athleteId,
          activitiesPopulated: activities.length,
          streamsPopulated,
          profileBuilt: !!athleteId,
        },
      }),
    };
  } catch (err: any) {
    console.error("Error populating user data:", err);

    // Handle Strava API specific errors
    if (err instanceof Response) {
      let message;
      switch (err.status) {
        case 429:
          message = `Rate limit hit on ${err.url}. Please try again later.`;
          break;
        case 401:
          message =
            "Strava token is invalid or expired. Please re-authenticate.";
          break;
        case 403:
          message = "Access forbidden. Check Strava permissions.";
          break;
        default:
          message = `Strava API error ${err.status}: ${err.statusText}`;
      }

      return {
        statusCode: err.status === 429 ? 429 : 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Strava API Error",
          message,
          status: err.status,
        }),
      };
    }

    // Handle other errors
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message:
          err.message ||
          "An unexpected error occurred while populating user data",
        userId,
      }),
    };
  }
};
