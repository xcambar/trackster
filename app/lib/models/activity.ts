import { getUserFromSession } from "./user";

export type Activity = {
  type: "run" | "bike";
  title: string;
  id: number;
};

function randomType() {
  return Math.round(Math.random()) ? "run" : "bike";
}

type UserSession = Awaited<ReturnType<typeof getUserFromSession>>;

export const getActivitiesForUser = async (
  user: UserSession
): Promise<Activity[]> => {
  const stravaId = user.user_metadata.strava_profile.id;
  const stravaToken = user.user_metadata.strava_profile.token;
  // console.log(stravaId, stravaToken);
  // @TODO to be continued
  return [
    { id: 1, type: randomType(), title: new Date().toISOString() },
    { id: 2, type: "run", title: "5k training" },
    { id: 3, type: "bike", title: "HIIT" },
    { id: 4, type: "run", title: "5k training" },
    { id: 5, type: "bike", title: "Long distance" },
    { id: 6, type: "run", title: "Morning run" },
    { id: 7, type: "run", title: "Slow run" },
  ];
};
