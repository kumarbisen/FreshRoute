import { seedDemoDataset } from "../src/server/services/data-foundation.service";

async function main() {
  console.log("🌱 Starting FreshRoute Phase 02 Deterministic Seed...");
  const startTime = Date.now();

  try {
    const summary = await seedDemoDataset();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Seed completed successfully in ${duration}s!`);
    console.table({
      Organizations: summary.organizationsCount,
      Warehouses: summary.warehousesCount,
      Commodities: summary.commoditiesCount,
      Batches: summary.batchesCount,
      Destinations: summary.destinationsCount,
      Demands: summary.demandsCount,
      Routes: summary.routesCount,
      DistributionPlans: summary.plansCount,
      Allocations: summary.allocationsCount,
      DiscountRecommendations: summary.discountsCount,
    });

    console.log("\nDeterministic Edge Cases Populated:");
    console.log("  1. Urgent Dispatch (FEFO Urgency): BATCH-STR-URGENT-01 -> DEST-METRO-01");
    console.log("  2. Infeasible Delivery (SLA Breach Rejection): BATCH-SPN-LOW-RSL-02 -> DEST-PACIFIC-02");
    console.log("  3. Excess Supply (Surplus Inventory): BATCH-ORG-SURPLUS-03 (20,000 kg vs 5,000 kg demand)");
    console.log("  4. Unmet Demand (Supply Shortage): ORD-PAC-AVO-004 (6,000 kg demand vs 2,000 kg available)");
    console.log("  5. Potential Discount Salvage: BATCH-STR-SALVAGE-05 -> DEST-BAY-04 (20% markdown recovery)");
  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

main();
