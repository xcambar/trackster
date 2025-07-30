import db from "../app/services/db.server";
import { 
  athletePerformanceProfilesTable, 
  activityStreamsTable, 
  activitiesTable 
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

interface GradeSpeedData {
  grade0To5: number[];
  grade5To10: number[];
  grade10To15: number[];
  grade15To25: number[];
  gradeOver25: number[];
}

interface DistancePaceData {
  pace5k: number[];
  pace10k: number[];
  paceHalfMarathon: number[];
  paceMarathon: number[];
}

/**
 * Grade coverage flags (bitfield):
 * Bit 0: 0-5% grade has data
 * Bit 1: 5-10% grade has data  
 * Bit 2: 10-15% grade has data
 * Bit 3: 15-25% grade has data
 * Bit 4: >25% grade has data
 */
const GRADE_COVERAGE_FLAGS = {
  GRADE_0_5: 1 << 0,
  GRADE_5_10: 1 << 1,
  GRADE_10_15: 1 << 2,
  GRADE_15_25: 1 << 3,
  GRADE_OVER_25: 1 << 4,
};

function categorizeByGrade(
  velocityData: number[], 
  gradeData: number[]
): GradeSpeedData {
  const data: GradeSpeedData = {
    grade0To5: [],
    grade5To10: [],
    grade10To15: [],
    grade15To25: [],
    gradeOver25: [],
  };

  const minLength = Math.min(velocityData.length, gradeData.length);
  
  for (let i = 0; i < minLength; i++) {
    const speed = velocityData[i];
    const grade = gradeData[i];
    
    // Filter valid data points (positive uphill grades only)
    if (speed > 0 && !isNaN(speed) && !isNaN(grade) && grade >= 0 && grade <= 50) {
      if (grade >= 0 && grade < 5) {
        data.grade0To5.push(speed);
      } else if (grade >= 5 && grade < 10) {
        data.grade5To10.push(speed);
      } else if (grade >= 10 && grade < 15) {
        data.grade10To15.push(speed);
      } else if (grade >= 15 && grade < 25) {
        data.grade15To25.push(speed);
      } else if (grade >= 25) {
        data.gradeOver25.push(speed);
      }
    }
  }
  
  return data;
}

function categorizeByDistance(activities: Array<{ distance: number; averageSpeed: number }>): DistancePaceData {
  const data: DistancePaceData = {
    pace5k: [],
    pace10k: [],
    paceHalfMarathon: [],
    paceMarathon: [],
  };
  
  for (const activity of activities) {
    const distanceKm = activity.distance / 1000; // Convert meters to km
    const paceMinPerKm = activity.averageSpeed > 0 ? 1000 / (activity.averageSpeed * 60) : 0;
    
    // Only include reasonable paces (3-20 min/km)
    if (paceMinPerKm >= 3 && paceMinPerKm <= 20) {
      if (distanceKm >= 4 && distanceKm <= 6) {
        data.pace5k.push(paceMinPerKm);
      } else if (distanceKm >= 8 && distanceKm <= 12) {
        data.pace10k.push(paceMinPerKm);
      } else if (distanceKm >= 18 && distanceKm <= 24) {
        data.paceHalfMarathon.push(paceMinPerKm);
      } else if (distanceKm >= 35 && distanceKm <= 45) {
        data.paceMarathon.push(paceMinPerKm);
      }
    }
  }
  
  return data;
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateGradeCoverageFlags(gradeData: GradeSpeedData): number {
  let flags = 0;
  
  if (gradeData.grade0To5.length >= 50) flags |= GRADE_COVERAGE_FLAGS.GRADE_0_5;
  if (gradeData.grade5To10.length >= 50) flags |= GRADE_COVERAGE_FLAGS.GRADE_5_10;
  if (gradeData.grade10To15.length >= 30) flags |= GRADE_COVERAGE_FLAGS.GRADE_10_15;
  if (gradeData.grade15To25.length >= 20) flags |= GRADE_COVERAGE_FLAGS.GRADE_15_25;
  if (gradeData.gradeOver25.length >= 10) flags |= GRADE_COVERAGE_FLAGS.GRADE_OVER_25;
  
  return flags;
}

async function buildAthleteProfile(athleteId: number): Promise<void> {
  console.log(`Building performance profile for athlete ${athleteId}`);
  
  // Get all activity streams for the athlete
  const streams = await db
    .select({
      activityId: activityStreamsTable.activityId,
      velocityData: activityStreamsTable.velocitySmoothData,
      gradeData: activityStreamsTable.gradeSmoothData,
    })
    .from(activityStreamsTable)
    .where(eq(activityStreamsTable.athleteId, athleteId));
    
  if (streams.length === 0) {
    console.log(`No stream data found for athlete ${athleteId}`);
    return;
  }

  // Get activity details for distance-based analysis
  const activities = await db
    .select({
      distance: activitiesTable.distance,
      averageSpeed: activitiesTable.averageSpeed,
    })
    .from(activitiesTable)
    .where(eq(activitiesTable.athleteId, athleteId));

  console.log(`Processing ${streams.length} activities with stream data`);

  // Aggregate all grade-speed data
  const allGradeData: GradeSpeedData = {
    grade0To5: [],
    grade5To10: [],
    grade10To15: [],
    grade15To25: [],
    gradeOver25: [],
  };

  for (const stream of streams) {
    const velocityData = stream.velocityData as number[] | null;
    const gradeData = stream.gradeData as number[] | null;
    
    if (!velocityData || !gradeData) continue;
    
    const gradeSpeedData = categorizeByGrade(velocityData, gradeData);
    
    // Merge into aggregate data
    allGradeData.grade0To5.push(...gradeSpeedData.grade0To5);
    allGradeData.grade5To10.push(...gradeSpeedData.grade5To10);
    allGradeData.grade10To15.push(...gradeSpeedData.grade10To15);
    allGradeData.grade15To25.push(...gradeSpeedData.grade15To25);
    allGradeData.gradeOver25.push(...gradeSpeedData.gradeOver25);
  }

  // Process distance-based pace data
  const distancePaceData = categorizeByDistance(
    activities.filter(a => a.averageSpeed && a.distance)
  );

  // Calculate averages
  const profile = {
    athleteId,
    speedGrade0To5: calculateAverage(allGradeData.grade0To5),
    speedGrade5To10: calculateAverage(allGradeData.grade5To10),
    speedGrade10To15: calculateAverage(allGradeData.grade10To15),
    speedGrade15To25: calculateAverage(allGradeData.grade15To25),
    speedGradeOver25: calculateAverage(allGradeData.gradeOver25),
    avgPace5k: calculateAverage(distancePaceData.pace5k),
    avgPace10k: calculateAverage(distancePaceData.pace10k),
    avgPaceHalfMarathon: calculateAverage(distancePaceData.paceHalfMarathon),
    avgPaceMarathon: calculateAverage(distancePaceData.paceMarathon),
    // Simple pace degradation: assume 2% slower per 10km
    paceDegradationPerKm: 0.002,
    // Default efficiency factor (1.0 = standard GAP)
    elevationEfficiencyFactor: 1.0,
    totalActivities: activities.length,
    totalDistanceKm: activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000,
    gradeCoverageFlags: calculateGradeCoverageFlags(allGradeData),
  };

  // Insert or update the profile
  const existingProfile = await db
    .select()
    .from(athletePerformanceProfilesTable)
    .where(eq(athletePerformanceProfilesTable.athleteId, athleteId))
    .limit(1);

  if (existingProfile.length > 0) {
    await db
      .update(athletePerformanceProfilesTable)
      .set({
        ...profile,
        lastUpdated: new Date(),
      })
      .where(eq(athletePerformanceProfilesTable.athleteId, athleteId));
    console.log(`✅ Updated profile for athlete ${athleteId}`);
  } else {
    await db.insert(athletePerformanceProfilesTable).values(profile);
    console.log(`✅ Created profile for athlete ${athleteId}`);
  }

  // Log profile summary
  console.log(`Profile Summary for Athlete ${athleteId}:`);
  console.log(`- Total activities: ${profile.totalActivities}`);
  console.log(`- Total distance: ${profile.totalDistanceKm.toFixed(1)} km`);
  console.log(`- Speed on 0-5% grade: ${profile.speedGrade0To5?.toFixed(2) || 'N/A'} m/s`);
  console.log(`- Speed on 5-10% grade: ${profile.speedGrade5To10?.toFixed(2) || 'N/A'} m/s`);
  console.log(`- Grade coverage flags: ${profile.gradeCoverageFlags.toString(2).padStart(5, '0')} (binary)`);
}

async function buildAllAthleteProfiles(): Promise<void> {
  console.log("Building performance profiles for all athletes...");
  
  // Get all unique athlete IDs that have stream data
  const athletes = await db
    .selectDistinct({ athleteId: activityStreamsTable.athleteId })
    .from(activityStreamsTable);
    
  console.log(`Found ${athletes.length} athletes with stream data`);
  
  for (const athlete of athletes) {
    try {
      await buildAthleteProfile(athlete.athleteId);
    } catch (error) {
      console.error(`Error building profile for athlete ${athlete.athleteId}:`, error);
    }
  }
  
  console.log("🎉 All athlete profiles built successfully!");
}

// Export for use as module
export { buildAthleteProfile, buildAllAthleteProfiles };

// Run if called directly
if (require.main === module) {
  const athleteId = process.argv[2];
  
  if (athleteId && !isNaN(Number(athleteId))) {
    buildAthleteProfile(Number(athleteId))
      .then(() => console.log(`Profile built for athlete ${athleteId}`))
      .catch(console.error)
      .finally(() => process.exit(0));
  } else {
    buildAllAthleteProfiles()
      .catch(console.error)
      .finally(() => process.exit(0));
  }
}