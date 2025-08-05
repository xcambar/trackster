import { roundToNearestMinutes, startOfTomorrow } from "date-fns";
import { getStravaAPIClient } from "../api";
import { AccessToken, Strava } from "strava";
import { CronJob } from "cron";

export const findNearestQuarter = (d: Date): Date => {
  return roundToNearestMinutes(d, { roundingMethod: "ceil", nearestTo: 15 });
};

type StravaRequestFn = (client: Strava, name: string) => Promise<any>;
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

let requestCounter = 0;

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

  async #schedule(fn: StravaRequestFn, name): Promise<any> {
    const when = this.#nextPeriod;
    console.log(`${name} | Scheduling to begin ${when}`);
    if (when === "now") {
      return await fn(this.#client, name);
    }
    return new Promise((resolve, reject) => {
      const job = new CronJob(when, async () => {
        this.#nextPeriod = "now";
        try {
          console.log(`${name} | Starting `);
          resolve(await fn(this.#client, name));
        } catch (err) {
          reject(err);
        }
      });
      job.start();
    });
  }

  async #request<T>(fn: StravaRequestFn, iter = 0, name: string): Promise<T> {
    console.log(`${name} | Starting attempt #${iter}`);
    try {
      return await this.#schedule(fn, name);
    } catch (err) {
      const response = err as Response;
      console.log(
        `${name} | Attempt #${iter} failed with status ${response.status}`
      );
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
        return await this.#request(fn, iter + 1, name);
      }
      throw err;
    }
  }

  async request<T>(fn: StravaRequestFn, name = "request") {
    name = [name, requestCounter++].join("-");
    return this.#request<T>(fn, 0, name);
  }
}
