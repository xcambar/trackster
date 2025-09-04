import { findNearestQuarter } from "./timing";

describe("Strava API rate limiter handler", function () {
  describe("reschedule to the nearest 15 minutes", function () {
    it("returns the next quarter for the given Date, given minutes are < 15", function () {
      const d = new Date(2014, 6, 10, 12, 12, 34);
      const nearestQuarter = findNearestQuarter(d);
      expect(nearestQuarter.toString()).toBe(
        new Date(2014, 6, 10, 12, 15, 0).toString()
      );
    });

    it("returns the next quarter for the given Date, given minutes are < 30", function () {
      const d = new Date(2014, 6, 10, 12, 22, 34);
      const nearestQuarter = findNearestQuarter(d);
      expect(nearestQuarter.toString()).toBe(
        new Date(2014, 6, 10, 12, 30, 0).toString()
      );
    });

    it("returns the next quarter for the given Date, given minutes are < 45", function () {
      const d = new Date(2014, 6, 10, 12, 32, 34);
      const nearestQuarter = findNearestQuarter(d);
      expect(nearestQuarter.toString()).toBe(
        new Date(2014, 6, 10, 12, 45, 0).toString()
      );
    });

    it("returns the next quarter for the given Date, given minutes are > 45", function () {
      const d = new Date(2014, 6, 10, 12, 52, 34);
      const nearestQuarter = findNearestQuarter(d);
      expect(nearestQuarter.toString()).toBe(
        new Date(2014, 6, 10, 13, 0, 0).toString()
      );
    });
  });
});
