export type Activity = {
  type: "run" | "bike";
  title: string;
  id: number;
};

function randomType() {
  return Math.round(Math.random()) ? "run" : "bike";
}

export const getActivitiesForUser = async (
  userId?: number | string
): Promise<Activity[]> => {
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
