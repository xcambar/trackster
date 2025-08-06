#!/usr/bin/env tsx

import "dotenv/config";
import { eq } from "drizzle-orm";
import db from "../app/services/db.server";
import { athletePerformanceProfilesTable } from "../db/schema";
import { 
  generateRoundTripWithEstimation,
  type RoundTripRequest 
} from "../app/lib/routing/round-trip-generator";

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function testRoundTrip() {
  const athleteId = 147083611;
  
  console.log("🔄 Testing GraphHopper Round Trip Generation");
  console.log("=" .repeat(60));

  // Get athlete profile
  const profiles = await db
    .select()
    .from(athletePerformanceProfilesTable)
    .where(eq(athletePerformanceProfilesTable.athleteId, athleteId))
    .limit(1);

  if (profiles.length === 0) {
    console.error(`❌ No performance profile found for athlete ${athleteId}`);
    console.error("   Run buildAthleteProfile script first");
    return;
  }

  const profile = profiles[0];
  console.log(`✅ Found profile for athlete ${athleteId}`);
  console.log(`   Activities: ${profile.totalActivities}, Distance: ${profile.totalDistanceKm?.toFixed(1)}km`);
  console.log(`   Performance data: 5K pace=${profile.avgPace5k?.toFixed(2)}, 10K pace=${profile.avgPace10k?.toFixed(2)}`);

  // Test different round trip scenarios
  const testRequests: Array<{
    name: string;
    request: RoundTripRequest;
  }> = [
    {
      name: "5km Round Trip from Freiburg Center",
      request: {
        startLat: 47.9959,
        startLng: 7.8522,
        distanceMeters: 5000,
        seed: 42, // For reproducible results
      },
    },
    {
      name: "10km Round Trip with North Heading",
      request: {
        startLat: 47.9959,
        startLng: 7.8522,
        distanceMeters: 10000,
        heading: 0, // North
        seed: 123,
      },
    },
    {
      name: "15km Round Trip with East Heading",
      request: {
        startLat: 47.9959,
        startLng: 7.8522,
        distanceMeters: 15000,
        heading: 90, // East
        seed: 456,
      },
    },
  ];

  for (const { name, request } of testRequests) {
    console.log(`\n📍 ${name}`);
    console.log("-".repeat(50));

    try {
      const result = await generateRoundTripWithEstimation(request, profile);
      const { route, estimation } = result;
      
      // Route information
      console.log(`📏 Actual Distance: ${(route.distance / 1000).toFixed(2)} km`);
      console.log(`⛰️  Elevation Gain: ${route.elevationGain.toFixed(0)}m`);
      console.log(`🗺️  Polyline Points: ${route.polyline.length} chars`);
      console.log(`📋 Instructions: ${route.instructions.length} steps`);
      
      // GraphHopper's time estimation (baseline)
      const graphhopperTimeMin = route.time / 60000;
      console.log(`⏱️  GraphHopper Time: ${formatTime(graphhopperTimeMin)}`);
      
      // Athlete-specific estimation
      console.log(`\n🏃 Athlete Performance Estimation:`);
      console.log(`   Estimated Time: ${formatTime(estimation.estimatedTimeMinutes)}`);
      console.log(`   Average Pace: ${estimation.averagePaceMinPerKm.toFixed(2)} min/km`);
      console.log(`   Confidence: ${(estimation.confidence * 100).toFixed(0)}%`);
      
      // Grade analysis
      console.log(`   Grade Analysis:`);
      console.log(`     Flat: ${estimation.gradeAnalysis.flatKm.toFixed(1)}km`);
      console.log(`     Hills: ${estimation.gradeAnalysis.hillKm.toFixed(1)}km`);
      console.log(`     Steep: ${estimation.gradeAnalysis.steepKm.toFixed(1)}km`);
      
      // Comparison
      const timeDiff = estimation.estimatedTimeMinutes - graphhopperTimeMin;
      const timeDiffPercent = (timeDiff / graphhopperTimeMin) * 100;
      console.log(`\n📊 Comparison:`);
      console.log(`   Time Difference: ${timeDiff > 0 ? '+' : ''}${timeDiff.toFixed(1)} min (${timeDiffPercent > 0 ? '+' : ''}${timeDiffPercent.toFixed(1)}%)`);
      
      // Sample instructions
      if (route.instructions.length > 0) {
        console.log(`\n🧭 Sample Instructions (first 3):`);
        route.instructions.slice(0, 3).forEach((instruction, i) => {
          const distanceKm = instruction.distance / 1000;
          console.log(`   ${i + 1}. ${instruction.text} (${distanceKm.toFixed(2)}km)`);
        });
      }
      
      // Elevation profile sample
      if (route.elevationProfile.length > 0) {
        console.log(`\n📈 Elevation Profile (sample points):`);
        const sampleCount = Math.min(5, route.elevationProfile.length);
        const step = Math.floor(route.elevationProfile.length / sampleCount);
        for (let i = 0; i < sampleCount; i++) {
          const point = route.elevationProfile[i * step];
          if (point) {
            const [distance, elevation] = point;
            console.log(`   ${(distance * route.distance / 1000).toFixed(1)}km: ${elevation.toFixed(0)}m`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error generating ${name}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('GraphHopper API error')) {
          console.error(`   Check GraphHopper configuration:`);
          console.error(`   - GRAPHHOPPER_BASE_URL: ${process.env.GRAPHHOPPER_BASE_URL || 'not set'}`);
          console.error(`   - GRAPHHOPPER_API_KEY: ${process.env.GRAPHHOPPER_API_KEY ? 'set' : 'not set'}`);
        }
      }
    }
  }

  console.log("\n" + "=" .repeat(60));
  console.log("🎯 Round Trip Testing Complete!");
}

// Run if called directly
if (process.argv[1]?.endsWith('test_round_trip.ts')) {
  testRoundTrip()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { testRoundTrip };