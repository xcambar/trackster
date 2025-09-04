import { roundToNearestMinutes, startOfTomorrow } from "date-fns";
import { StravaRateLimit } from "../scheduler";

export function findNextPeriod(
  [limit15Min, limitDaily]: StravaRateLimit,
  [usage15Min, usageDaily]: StravaRateLimit
): SchedulerPeriod {
  if (!isNaN(limit15Min) && !isNaN(usage15Min) && usage15Min < limit15Min) {
    return "now";
  }
  if (!isNaN(limitDaily) && !isNaN(limit15Min) && usageDaily > limitDaily) {
    return startOfTomorrow();
  }

  // if the limits and usage are not well-formed, then we proceed immediately
  if (
    isNaN(limitDaily) ||
    isNaN(limit15Min) ||
    isNaN(limit15Min) ||
    isNaN(usage15Min)
  ) {
    return "now";
  }
  return findNearestQuarter(new Date());
}
export type SchedulerPeriod = "now" | Date;
export const findNearestQuarter = (d: Date): Date => {
  return roundToNearestMinutes(d, { roundingMethod: "ceil", nearestTo: 15 });
};
