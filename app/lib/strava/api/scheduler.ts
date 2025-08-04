import { roundToNearestMinutes, startOfTomorrow } from "date-fns";
import { getStravaAPIClient } from "../api";
import { AccessToken, Strava } from "strava";
import { CronJob } from "cron";

export const findNearestQuarter = (d: Date): Date => {
  return roundToNearestMinutes(d, { roundingMethod: "ceil", nearestTo: 15 });
};

type StravaRequestFn = (client: Strava) => Promise<any>;
type StravaRateLimit = [number, number];
type SchedulerPeriod = "now" | Date;

const MAX_ATTEMPTS = 3;

function findNextPeriod(
  [limit15Min, limitDaily]: StravaRateLimit,
  [usage15Min, usageDaily]: StravaRateLimit
): SchedulerPeriod {
  if (usage15Min < limit15Min) {
    return "now";
  }
  if (usageDaily > limitDaily) {
    return startOfTomorrow();
  }

  return findNearestQuarter(new Date());
}

export class StravaAPIScheduler {
  #client: Strava;
  #limits = {
    readratelimit: [Infinity, Infinity],
    ratelimit: [Infinity, Infinity],
  };
  #usage = {
    readratelimit: [0, 0],
    ratelimit: [0, 0],
  };

  #nextPeriod: SchedulerPeriod = "now";

  constructor(token: AccessToken) {
    this.#client = getStravaAPIClient(token);
  }

  #canPerformReadRequestNow() {
    const limit15Min: number = this.#limits.readratelimit[0] || Infinity;
    const limitDaily: number = this.#limits.readratelimit[1] || Infinity;
    const usage15Min: number = this.#usage.readratelimit[0] || 0;
    const usageDaily: number = this.#usage.readratelimit[1] || 0;

    return usage15Min < limit15Min && usageDaily < limitDaily;
  }

  async #schedule(fn: StravaRequestFn): Promise<any> {
    const when = this.#nextPeriod;
    if (when === "now") {
      return await fn(this.#client);
    }
    return new Promise((resolve, reject) => {
      console.log(`Scheduling at ${when}`);
      const job = new CronJob(when, async () => {
        this.#nextPeriod = "now";
        try {
          resolve(await fn(this.#client));
        } catch (err) {
          reject(err);
        }
      });
      job.start();
    });
  }

  async #request<T>(fn: StravaRequestFn, iter = 0): Promise<T> {
    try {
      return await this.#schedule(fn);
    } catch (err) {
      const response = err as Response;
      if (response.status !== 429) {
        throw err;
      }
      this.#nextPeriod = findNextPeriod(
        response.headers
          .get("x-readratelimit-limit")
          ?.split(",")
          .map(Number) as StravaRateLimit,
        response.headers
          .get("x-readratelimit-usage")
          ?.split(",")
          .map(Number) as StravaRateLimit
      );
      if (iter + 1 < MAX_ATTEMPTS) {
        return await this.#request(fn, iter + 1);
      }
      throw err;
    }
  }

  async request<T>(fn: StravaRequestFn) {
    return this.#request<T>(fn, 0);
  }
}
