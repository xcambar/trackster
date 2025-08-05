#!/usr/bin/env tsx

import "dotenv/config";
import { racePredictionEngine } from "../app/lib/race-predictor/prediction-engine";

async function testPredictions() {
  console.log("🏃 Testing Fixed Race Predictions for Athlete 147083611\n");

  try {
    // Test flat 10K prediction
    console.log("📊 Flat 10K Prediction:");
    const flat10K = await racePredictionEngine.predictRaceTime({
      athleteId: 147083611,
      totalDistanceKm: 10,
      totalElevationGainM: 0,
      gradeDistribution: {
        grade0To5Km: 10,
        grade5To10Km: 0,
        grade10To15Km: 0,
        grade15To25Km: 0,
        gradeOver25Km: 0,
      },
    });

    console.log(`⏱️  Predicted Time: ${formatRaceTime(flat10K.predictedTimeMinutes)}`);
    console.log(`🎯 Confidence: ${Math.round(flat10K.confidenceScore * 100)}%`);
    console.log(`📈 Data Quality: ${flat10K.athleteProfile.dataConfidence}`);
    console.log("");

    // Test flat half marathon prediction (like Freiburg)  
    console.log("📊 Flat Half Marathon Prediction (like Freiburg):");
    const flatHalf = await racePredictionEngine.predictRaceTime({
      athleteId: 147083611,
      totalDistanceKm: 21.1,
      totalElevationGainM: 100, // Similar to Freiburg's 104m
      gradeDistribution: {
        grade0To5Km: 21.1,
        grade5To10Km: 0,
        grade10To15Km: 0,
        grade15To25Km: 0,
        gradeOver25Km: 0,
      },
    });

    console.log(`⏱️  Predicted Time: ${formatRaceTime(flatHalf.predictedTimeMinutes)}`);
    console.log(`🎯 Confidence: ${Math.round(flatHalf.confidenceScore * 100)}%`);
    console.log(`📈 Data Quality: ${flatHalf.athleteProfile.dataConfidence}`);
    console.log("");

    // Compare to actual Freiburg result
    console.log("🏁 Actual Freiburg Half-Marathon Result:");
    console.log("⏱️  Actual Time: 1:45:49 (105.82 minutes)");
    console.log("📏 Distance: 21.31 km");
    console.log("⛰️  Elevation: 104.1m");
    console.log("");

    const actualMinutes = 105.82;
    const predictedMinutes = flatHalf.predictedTimeMinutes;
    const error = Math.abs(predictedMinutes - actualMinutes);
    const errorPercent = (error / actualMinutes) * 100;

    console.log("📊 Prediction Accuracy:");
    console.log(`❌ Previous Error: ~41 minutes (39% off)`);
    console.log(`✅ New Error: ${error.toFixed(1)} minutes (${errorPercent.toFixed(1)}% off)`);
    
    if (errorPercent < 10) {
      console.log("🎉 MUCH IMPROVED! Prediction is now within 10% of actual time.");
    } else if (errorPercent < 20) {
      console.log("📈 IMPROVED! Prediction is now within 20% of actual time.");
    } else {
      console.log("⚠️  Still needs calibration work.");
    }

  } catch (error) {
    console.error("❌ Error testing predictions:", error);
  }
}

function formatRaceTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Run if called directly
if (process.argv[1]?.endsWith('testFixedPredictions.ts')) {
  testPredictions()
    .catch(console.error)
    .finally(() => process.exit(0));
}