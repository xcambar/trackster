import { racePredictionEngine, RacePredictionInput } from "../app/lib/race-predictor/prediction-engine";

/**
 * Test the race predictor with different race scenarios
 */

async function testRacePredictor() {
  const athleteId = 147083611; // Our test athlete
  
  console.log("🏃‍♂️ Testing Race Predictor for Athlete", athleteId);
  console.log("=" .repeat(60));

  // Test Case 1: 10K road race (mostly flat)
  console.log("\n📍 TEST CASE 1: 10K Road Race (Mostly Flat)");
  const race10K: RacePredictionInput = {
    athleteId,
    totalDistanceKm: 10,
    totalElevationGainM: 50,
    gradeDistribution: {
      grade0To5Km: 9.5,    // 95% flat/gentle
      grade5To10Km: 0.5,   // 5% moderate hills
      grade10To15Km: 0,
      grade15To25Km: 0,
      gradeOver25Km: 0,
    },
  };

  try {
    const prediction1 = await racePredictionEngine.predictRaceTime(race10K);
    console.log(`⏱️  Predicted Time: ${Math.floor(prediction1.predictedTimeMinutes)}:${String(Math.round((prediction1.predictedTimeMinutes % 1) * 60)).padStart(2, '0')}`);
    console.log(`📊 Confidence: ${(prediction1.confidenceScore * 100).toFixed(1)}%`);
    console.log(`📈 Data Quality: ${prediction1.athleteProfile.dataConfidence}`);
    
    if (prediction1.limitingFactors.length > 0) {
      console.log(`⚠️  Limiting Factors:`);
      prediction1.limitingFactors.forEach(factor => console.log(`   - ${factor}`));
    }
    
    console.log(`📋 Grade Breakdown:`);
    prediction1.gradeBreakdown.forEach(segment => {
      console.log(`   ${segment.gradeRange.padEnd(6)}: ${segment.distanceKm}km @ ${segment.paceMinPerKm.toFixed(2)} min/km = ${segment.segmentTimeMinutes.toFixed(1)} min`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 2: Half Marathon with Hills
  console.log("\n📍 TEST CASE 2: Half Marathon with Hills");
  const raceHalf: RacePredictionInput = {
    athleteId,
    totalDistanceKm: 21.1,
    totalElevationGainM: 400,
    gradeDistribution: {
      grade0To5Km: 15,     // 71% flat/gentle
      grade5To10Km: 4,     // 19% moderate hills  
      grade10To15Km: 1.5,  // 7% steep hills
      grade15To25Km: 0.6,  // 3% very steep
      gradeOver25Km: 0,
    },
  };

  try {
    const prediction2 = await racePredictionEngine.predictRaceTime(raceHalf);
    console.log(`⏱️  Predicted Time: ${Math.floor(prediction2.predictedTimeMinutes / 60)}:${String(Math.floor(prediction2.predictedTimeMinutes % 60)).padStart(2, '0')}:${String(Math.round(((prediction2.predictedTimeMinutes % 1) * 60))).padStart(2, '0')}`);
    console.log(`📊 Confidence: ${(prediction2.confidenceScore * 100).toFixed(1)}%`);
    console.log(`📈 Data Quality: ${prediction2.athleteProfile.dataConfidence}`);
    
    if (prediction2.limitingFactors.length > 0) {
      console.log(`⚠️  Limiting Factors:`);
      prediction2.limitingFactors.forEach(factor => console.log(`   - ${factor}`));
    }
    
    console.log(`📋 Grade Breakdown:`);
    prediction2.gradeBreakdown.forEach(segment => {
      console.log(`   ${segment.gradeRange.padEnd(6)}: ${segment.distanceKm}km @ ${segment.paceMinPerKm.toFixed(2)} min/km = ${segment.segmentTimeMinutes.toFixed(1)} min`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 3: Mountain Ultra (50K)
  console.log("\n📍 TEST CASE 3: Mountain Ultra (50K)");
  const raceUltra: RacePredictionInput = {
    athleteId,
    totalDistanceKm: 50,
    totalElevationGainM: 2500,
    gradeDistribution: {
      grade0To5Km: 25,     // 50% flat/gentle
      grade5To10Km: 15,    // 30% moderate hills
      grade10To15Km: 7,    // 14% steep hills
      grade15To25Km: 2.5,  // 5% very steep  
      grade25PlusKm: 0.5,  // 1% extreme
    },
  };

  try {
    const prediction3 = await racePredictionEngine.predictRaceTime(raceUltra);
    const hours = Math.floor(prediction3.predictedTimeMinutes / 60);
    const minutes = Math.floor(prediction3.predictedTimeMinutes % 60);
    console.log(`⏱️  Predicted Time: ${hours}:${String(minutes).padStart(2, '0')}:00`);
    console.log(`📊 Confidence: ${(prediction3.confidenceScore * 100).toFixed(1)}%`);
    console.log(`📈 Data Quality: ${prediction3.athleteProfile.dataConfidence}`);
    
    if (prediction3.limitingFactors.length > 0) {
      console.log(`⚠️  Limiting Factors:`);
      prediction3.limitingFactors.forEach(factor => console.log(`   - ${factor}`));
    }
    
    console.log(`📋 Grade Breakdown:`);
    prediction3.gradeBreakdown.forEach(segment => {
      console.log(`   ${segment.gradeRange.padEnd(6)}: ${segment.distanceKm}km @ ${segment.paceMinPerKm.toFixed(2)} min/km = ${(segment.segmentTimeMinutes / 60).toFixed(1)} hours`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n" + "=" .repeat(60));
  console.log("🎯 Race Predictor Testing Complete!");
}

// Run if called directly
if (require.main === module) {
  testRacePredictor()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { testRacePredictor };