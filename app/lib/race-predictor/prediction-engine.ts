import {
  athletePerformanceProfilesTable,
  gapLookupTable,
} from "@xcambar/trackster-db";
import { and, eq, gte, lte } from "drizzle-orm";
import db from "../../services/db.server";

export interface RacePredictionInput {
  athleteId: number;
  // Race profile (simplified - no GPX parsing for now)
  totalDistanceKm: number;
  totalElevationGainM: number;
  gradeDistribution: {
    grade0To5Km: number; // km in 0-5% grade range
    grade5To10Km: number; // km in 5-10% grade range
    grade10To15Km: number; // km in 10-15% grade range
    grade15To25Km: number; // km in 15-25% grade range
    gradeOver25Km: number; // km in >25% grade range
  };
}

export interface GradePrediction {
  gradeRange: string;
  distanceKm: number;
  baseSpeedMs: number;
  adjustedSpeedMs: number;
  paceMinPerKm: number;
  segmentTimeMinutes: number;
}

export interface RacePrediction {
  predictedTimeMinutes: number;
  confidenceScore: number; // 0-1 based on data coverage
  gradeBreakdown: GradePrediction[];
  limitingFactors: string[];
  athleteProfile: {
    totalActivities: number;
    totalDistanceKm: number;
    dataConfidence: string;
  };
}

/**
 * Grade coverage flags interpretation
 */
const GRADE_COVERAGE_FLAGS = {
  GRADE_0_5: 1 << 0,
  GRADE_5_10: 1 << 1,
  GRADE_10_15: 1 << 2,
  GRADE_15_25: 1 << 3,
  GRADE_OVER_25: 1 << 4,
};

class RacePredictionEngine {
  private gapCache = new Map<number, number>();

  /**
   * Get GAP adjustment factor for a given grade
   */
  private async getGAPAdjustment(gradePercent: number): Promise<number> {
    // Check cache first
    if (this.gapCache.has(gradePercent)) {
      return this.gapCache.get(gradePercent)!;
    }

    // Find closest GAP value (within 0.1%)
    const gapResult = await db
      .select({ paceAdjustmentFactor: gapLookupTable.paceAdjustmentFactor })
      .from(gapLookupTable)
      .where(
        and(
          gte(gapLookupTable.gradePercent, gradePercent - 0.05),
          lte(gapLookupTable.gradePercent, gradePercent + 0.05)
        )
      )
      .limit(1);

    const adjustment = gapResult[0]?.paceAdjustmentFactor || 1.0;
    this.gapCache.set(gradePercent, adjustment);
    return adjustment;
  }

  /**
   * Apply distance-based pace degradation
   */
  private applyDistanceDegradation(
    baseSpeed: number,
    distanceKm: number,
    degradationPerKm: number
  ): number {
    // Apply degradation: speed reduces by degradationPerKm for each km
    const degradationFactor = 1 - distanceKm * degradationPerKm;
    return baseSpeed * Math.max(0.5, degradationFactor); // Cap at 50% of base speed
  }

  /**
   * Calculate confidence score based on data coverage
   */
  private calculateConfidenceScore(
    profile: any,
    gradeDistribution: RacePredictionInput["gradeDistribution"]
  ): number {
    let confidence = 0;
    let weightedCoverage = 0;
    let totalWeight = 0;

    // Check coverage for each grade range used in the race
    const gradeChecks = [
      {
        km: gradeDistribution.grade0To5Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_0_5,
        speed: profile.speedGrade0To5,
      },
      {
        km: gradeDistribution.grade5To10Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_5_10,
        speed: profile.speedGrade5To10,
      },
      {
        km: gradeDistribution.grade10To15Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_10_15,
        speed: profile.speedGrade10To15,
      },
      {
        km: gradeDistribution.grade15To25Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_15_25,
        speed: profile.speedGrade15To25,
      },
      {
        km: gradeDistribution.gradeOver25Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_OVER_25,
        speed: profile.speedGradeOver25,
      },
    ];

    for (const check of gradeChecks) {
      if (check.km > 0) {
        const hasData = (profile.gradeCoverageFlags & check.flag) !== 0;
        const hasSpeedData = check.speed !== null;

        const gradeConfidence = hasData && hasSpeedData ? 1.0 : 0.3;
        weightedCoverage += gradeConfidence * check.km;
        totalWeight += check.km;
      }
    }

    confidence = totalWeight > 0 ? weightedCoverage / totalWeight : 0;

    // Boost confidence based on total training volume
    const volumeBoost = Math.min(0.2, profile.totalDistanceKm / 5000); // Max 20% boost at 5000km
    confidence = Math.min(1.0, confidence + volumeBoost);

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Identify limiting factors for the prediction
   */
  private identifyLimitingFactors(
    profile: any,
    input: RacePredictionInput
  ): string[] {
    const factors: string[] = [];

    // Check for missing grade data
    const gradeChecks = [
      {
        km: input.gradeDistribution.grade0To5Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_0_5,
        range: "0-5%",
      },
      {
        km: input.gradeDistribution.grade5To10Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_5_10,
        range: "5-10%",
      },
      {
        km: input.gradeDistribution.grade10To15Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_10_15,
        range: "10-15%",
      },
      {
        km: input.gradeDistribution.grade15To25Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_15_25,
        range: "15-25%",
      },
      {
        km: input.gradeDistribution.gradeOver25Km,
        flag: GRADE_COVERAGE_FLAGS.GRADE_OVER_25,
        range: ">25%",
      },
    ];

    for (const check of gradeChecks) {
      if (check.km > 0 && (profile.gradeCoverageFlags & check.flag) === 0) {
        factors.push(`Limited data for ${check.range} grade terrain`);
      }
    }

    // Check distance experience
    if (input.totalDistanceKm > 25 && !profile.avgPaceHalfMarathon) {
      factors.push("No half-marathon experience for long distance prediction");
    }
    if (input.totalDistanceKm > 35 && !profile.avgPaceMarathon) {
      factors.push("No marathon experience for ultra-distance prediction");
    }

    // Check training volume
    if (profile.totalActivities < 10) {
      factors.push("Limited training history (fewer than 10 activities)");
    }
    if (profile.totalDistanceKm < 100) {
      factors.push("Limited training volume (less than 100km total)");
    }

    return factors;
  }

  /**
   * Get distance-based pace if available and suitable
   */
  private getDistanceBasedPace(
    profile: any,
    distanceKm: number
  ): number | null {
    // For races close to known distances, use distance-specific paces
    if (distanceKm >= 4.5 && distanceKm <= 5.5 && profile.avgPace5k) {
      return profile.avgPace5k; // min/km
    }
    if (distanceKm >= 9 && distanceKm <= 11 && profile.avgPace10k) {
      return profile.avgPace10k; // min/km
    }
    if (distanceKm >= 19 && distanceKm <= 23 && profile.avgPaceHalfMarathon) {
      return profile.avgPaceHalfMarathon; // min/km
    }
    if (distanceKm >= 40 && distanceKm <= 44 && profile.avgPaceMarathon) {
      return profile.avgPaceMarathon; // min/km
    }
    return null;
  }

  /**
   * Main prediction method
   */
  async predictRaceTime(input: RacePredictionInput): Promise<RacePrediction> {
    // Load athlete performance profile
    const profileResult = await db
      .select()
      .from(athletePerformanceProfilesTable)
      .where(eq(athletePerformanceProfilesTable.athleteId, input.athleteId))
      .limit(1);

    if (profileResult.length === 0) {
      throw new Error(
        `No performance profile found for athlete ${input.athleteId}`
      );
    }

    const profile = profileResult[0];

    // Check if we can use distance-based prediction for simpler, more accurate results
    const distanceBasedPace = this.getDistanceBasedPace(
      profile,
      input.totalDistanceKm
    );
    if (distanceBasedPace && input.totalElevationGainM < 200) {
      // For relatively flat races with known distance paces, use simplified prediction
      const baseTimeMinutes = input.totalDistanceKm * distanceBasedPace;

      // Apply minimal elevation adjustment (much less aggressive)
      const elevationAdjustmentFactor =
        1 + (input.totalElevationGainM / 1000) * 0.1; // 10% per 1000m gain
      const adjustedTimeMinutes = baseTimeMinutes * elevationAdjustmentFactor;

      return {
        predictedTimeMinutes: Math.round(adjustedTimeMinutes * 100) / 100,
        confidenceScore: 0.9, // High confidence for distance-based predictions
        gradeBreakdown: [
          {
            gradeRange: "Distance-based prediction",
            distanceKm: input.totalDistanceKm,
            baseSpeedMs: 1000 / (distanceBasedPace * 60),
            adjustedSpeedMs:
              1000 / (distanceBasedPace * elevationAdjustmentFactor * 60),
            paceMinPerKm: distanceBasedPace * elevationAdjustmentFactor,
            segmentTimeMinutes: adjustedTimeMinutes,
          },
        ],
        limitingFactors:
          input.totalElevationGainM >= 200
            ? ["Significant elevation gain"]
            : [],
        athleteProfile: {
          totalActivities: profile.totalActivities,
          totalDistanceKm: profile.totalDistanceKm,
          dataConfidence: "High - Distance-based prediction",
        },
      };
    }

    // Fall back to grade-based prediction for complex terrain
    const gradeBreakdown: GradePrediction[] = [];
    let totalTimeMinutes = 0;

    // Process each grade range
    const gradeSegments = [
      {
        range: "0-5%",
        distanceKm: input.gradeDistribution.grade0To5Km,
        baseSpeed: profile.speedGrade0To5,
        avgGrade: 2.5,
      },
      {
        range: "5-10%",
        distanceKm: input.gradeDistribution.grade5To10Km,
        baseSpeed: profile.speedGrade5To10,
        avgGrade: 7.5,
      },
      {
        range: "10-15%",
        distanceKm: input.gradeDistribution.grade10To15Km,
        baseSpeed: profile.speedGrade10To15,
        avgGrade: 12.5,
      },
      {
        range: "15-25%",
        distanceKm: input.gradeDistribution.grade15To25Km,
        baseSpeed: profile.speedGrade15To25,
        avgGrade: 20.0,
      },
      {
        range: ">25%",
        distanceKm: input.gradeDistribution.gradeOver25Km,
        baseSpeed: profile.speedGradeOver25,
        avgGrade: 30.0,
      },
    ];

    for (const segment of gradeSegments) {
      if (segment.distanceKm > 0) {
        // Use base speed or fall back to estimated speed
        let baseSpeed = segment.baseSpeed;
        if (!baseSpeed && profile.speedGrade0To5) {
          // Estimate speed based on grade using GAP
          const gapFactor = await this.getGAPAdjustment(segment.avgGrade);
          baseSpeed = profile.speedGrade0To5 / gapFactor;
        } else if (!baseSpeed) {
          // Last resort: assume reasonable running speed
          baseSpeed = 2.5; // ~6 min/km pace
        }

        // Apply distance-based degradation
        const adjustedSpeed = this.applyDistanceDegradation(
          baseSpeed,
          input.totalDistanceKm,
          profile.paceDegradationPerKm || 0.002
        );

        // Apply GAP efficiency factor
        const finalSpeed =
          adjustedSpeed * (profile.elevationEfficiencyFactor || 1.0);

        const paceMinPerKm = 1000 / (finalSpeed * 60); // Convert m/s to min/km
        const segmentTimeMinutes = segment.distanceKm * paceMinPerKm;

        gradeBreakdown.push({
          gradeRange: segment.range,
          distanceKm: segment.distanceKm,
          baseSpeedMs: baseSpeed,
          adjustedSpeedMs: finalSpeed,
          paceMinPerKm: paceMinPerKm,
          segmentTimeMinutes: segmentTimeMinutes,
        });

        totalTimeMinutes += segmentTimeMinutes;
      }
    }

    const confidenceScore = this.calculateConfidenceScore(
      profile,
      input.gradeDistribution
    );
    const limitingFactors = this.identifyLimitingFactors(profile, input);

    return {
      predictedTimeMinutes: Math.round(totalTimeMinutes * 100) / 100,
      confidenceScore,
      gradeBreakdown,
      limitingFactors,
      athleteProfile: {
        totalActivities: profile.totalActivities,
        totalDistanceKm: profile.totalDistanceKm,
        dataConfidence:
          confidenceScore >= 0.8
            ? "High"
            : confidenceScore >= 0.6
              ? "Medium"
              : "Low",
      },
    };
  }
}

// Export singleton instance
export const racePredictionEngine = new RacePredictionEngine();

// Export class for testing
export { RacePredictionEngine };
