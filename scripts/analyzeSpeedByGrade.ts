import db from "../app/services/db.server";
import { activityStreamsTable } from "../db/schema";
import { eq } from "drizzle-orm";

interface GradeBucket {
  gradeRange: string;
  minGrade: number;
  maxGrade: number;
  avgSpeed: number;
  dataPoints: number;
}

function getGradeBucket(grade: number): string {
  // Round to nearest 3% bucket
  const bucket = Math.floor(grade / 3) * 3;
  return `${bucket}% to ${bucket + 3}%`;
}

async function analyzeSpeedByGrade(athleteId: number): Promise<GradeBucket[]> {
  console.log(`Analyzing speed by grade for athlete ${athleteId}`);

  // Get all activity streams for the athlete
  const streams = await db
    .select({
      activityId: activityStreamsTable.activityId,
      velocityData: activityStreamsTable.velocitySmoothData,
      gradeData: activityStreamsTable.gradeSmoothData,
    })
    .from(activityStreamsTable)
    .where(eq(activityStreamsTable.athleteId, athleteId));

  console.log(`Found ${streams.length} activities with stream data`);

  // Collect all speed-grade pairs
  const speedGradePairs: Array<{ speed: number; grade: number }> = [];

  for (const stream of streams) {
    const velocityData = stream.velocityData as number[] | null;
    const gradeData = stream.gradeData as number[] | null;

    if (!velocityData || !gradeData) continue;

    // Ensure both arrays have the same length
    const minLength = Math.min(velocityData.length, gradeData.length);

    for (let i = 0; i < minLength; i++) {
      const speed = velocityData[i];
      const grade = gradeData[i];

      // Filter out invalid data points
      if (speed > 0 && !isNaN(speed) && !isNaN(grade) && Math.abs(grade) <= 50) {
        speedGradePairs.push({ speed, grade });
      }
    }
  }

  console.log(`Collected ${speedGradePairs.length} speed-grade data points`);

  // Group by grade buckets
  const gradeBuckets = new Map<string, { speeds: number[]; minGrade: number; maxGrade: number }>();

  for (const { speed, grade } of speedGradePairs) {
    const bucketKey = getGradeBucket(grade);
    
    if (!gradeBuckets.has(bucketKey)) {
      const bucketMin = Math.floor(grade / 3) * 3;
      gradeBuckets.set(bucketKey, { 
        speeds: [], 
        minGrade: bucketMin, 
        maxGrade: bucketMin + 3 
      });
    }
    
    gradeBuckets.get(bucketKey)!.speeds.push(speed);
  }

  // Calculate average speed for each bucket
  const results: GradeBucket[] = [];

  for (const [gradeRange, data] of gradeBuckets.entries()) {
    const avgSpeed = data.speeds.reduce((sum, speed) => sum + speed, 0) / data.speeds.length;
    
    results.push({
      gradeRange,
      minGrade: data.minGrade,
      maxGrade: data.maxGrade,
      avgSpeed: avgSpeed,
      dataPoints: data.speeds.length,
    });
  }

  // Sort by grade (ascending)
  results.sort((a, b) => a.minGrade - b.minGrade);

  return results;
}

// Export for use as module
export { analyzeSpeedByGrade };

// Run if called directly
if (require.main === module) {
  analyzeSpeedByGrade(147083611)
    .then((results) => {
      console.log('\n=== SPEED BY ELEVATION GRADE ANALYSIS ===');
      console.log(`Athlete ID: 147083611\n`);
      
      console.log('Grade Range        | Avg Speed (m/s) | Avg Speed (km/h) | Data Points');
      console.log('-------------------|-----------------|------------------|------------');
      
      for (const bucket of results) {
        const speedKmh = (bucket.avgSpeed * 3.6).toFixed(2);
        const speedMs = bucket.avgSpeed.toFixed(2);
        
        console.log(
          `${bucket.gradeRange.padEnd(18)} | ${speedMs.padStart(13)} | ${speedKmh.padStart(14)} | ${bucket.dataPoints.toString().padStart(10)}`
        );
      }
      
      console.log(`\nTotal grade buckets: ${results.length}`);
      console.log(`Total data points: ${results.reduce((sum, b) => sum + b.dataPoints, 0)}`);
    })
    .catch(console.error)
    .finally(() => process.exit(0));
}