import db from "../app/services/db.server";
import { gapLookupTable } from "../db/schema";

/**
 * Grade Adjusted Pace (GAP) calculation based on D.B. Dill research
 * Reference: The cost of running uphill is 1.31 ml O2/m climb/kg body weight
 * 
 * This implementation converts grade percentages to pace adjustment factors
 * following established trail running performance models.
 */

function calculateGAPAdjustmentFactor(gradePercent: number): number {
  // Convert grade percentage to decimal (e.g., 10% = 0.10)
  const grade = gradePercent / 100;
  
  if (grade >= 0) {
    // Uphill: Exponential increase in effort
    // Based on research: ~9% pace slowdown per 1% grade for moderate grades
    // Formula: factor = 1 + (grade * 0.09) + (grade^2 * 0.05) for steeper grades
    const linearFactor = grade * 0.09;
    const exponentialFactor = Math.pow(grade, 2) * 0.05;
    return 1 + linearFactor + exponentialFactor;
  } else {
    // Downhill: Speed increase but diminishing returns
    // Downhill benefit is roughly 55% of uphill penalty
    // Factor approaches minimum of ~0.7 for very steep downhills
    const absGrade = Math.abs(grade);
    const baseImprovement = absGrade * 0.05; // 5% improvement per 1% downhill
    const diminishingReturn = Math.pow(absGrade, 1.5) * 0.02;
    const improvement = baseImprovement - diminishingReturn;
    
    // Cap minimum factor at 0.7 (30% speed increase max)
    return Math.max(0.7, 1 - improvement);
  }
}

async function populateGAPLookup(): Promise<void> {
  console.log("Populating GAP lookup table...");
  
  // Clear existing data
  await db.delete(gapLookupTable);
  console.log("Cleared existing GAP lookup data");
  
  const gapData: Array<{ gradePercent: number; paceAdjustmentFactor: number }> = [];
  
  // Generate data points from -50% to +50% in 0.1% increments
  for (let grade = -50.0; grade <= 50.0; grade += 0.1) {
    // Round to avoid floating point precision issues
    const gradeRounded = Math.round(grade * 10) / 10;
    const adjustmentFactor = calculateGAPAdjustmentFactor(gradeRounded);
    
    gapData.push({
      gradePercent: gradeRounded,
      paceAdjustmentFactor: Math.round(adjustmentFactor * 10000) / 10000, // 4 decimal places
    });
  }
  
  console.log(`Generated ${gapData.length} GAP data points`);
  
  // Insert data in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < gapData.length; i += batchSize) {
    const batch = gapData.slice(i, i + batchSize);
    await db.insert(gapLookupTable).values(batch);
    
    if ((i / batchSize + 1) % 50 === 0) {
      console.log(`Inserted ${i + batch.length}/${gapData.length} records`);
    }
  }
  
  console.log("✅ GAP lookup table populated successfully!");
  
  // Display some sample values for verification
  console.log("\nSample GAP adjustment factors:");
  console.log("Grade  | Factor | Pace Impact");
  console.log("-------|--------|------------");
  
  const sampleGrades = [-20, -10, -5, 0, 5, 10, 15, 20, 25];
  for (const grade of sampleGrades) {
    const factor = calculateGAPAdjustmentFactor(grade);
    const impact = ((factor - 1) * 100).toFixed(1);
    const sign = factor >= 1 ? "+" : "";
    console.log(`${grade.toString().padStart(5)}% | ${factor.toFixed(4)} | ${sign}${impact}%`);
  }
}

// Export for use as module
export { populateGAPLookup, calculateGAPAdjustmentFactor };

// Run if called directly
if (require.main === module) {
  populateGAPLookup()
    .then(() => {
      console.log("\n🎉 GAP lookup population complete!");
    })
    .catch((error) => {
      console.error("❌ Error populating GAP lookup:", error);
    })
    .finally(() => {
      process.exit(0);
    });
}