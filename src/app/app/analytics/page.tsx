import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Baseline Analytics | FreshRoute",
  description: "Comparative analytics measuring proposed plan vs. legacy FIFO baseline.",
};

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Baseline Performance Analytics"
      subtitle="Proposed FEFO Plan vs. Documented FIFO Baseline Benchmark"
      badgeText="PHASE 05 VISUALIZATION"
      breadcrumbs={[{ label: "Decision Engines" }, { label: "Baseline Analytics" }]}
      icon={BarChart3}
      targetPhase="Phase 5: Recharts Comparative Analytics & Spoilage Heatmaps"
      mockStats={[
        { label: "Net Profit Uplift", value: "+17.3%", sub: "+$24,650 weekly over FIFO" },
        { label: "Spoilage Avoided", value: "3,180 kg", sub: "-34% produce waste reduction" },
        { label: "SLA Match Delta", value: "+14.8%", sub: "99.2% compliant vs 84.4% FIFO" },
        { label: "Disposal Savings", value: "$4,280", sub: "Saved in avoided tipping & penalty fees" },
      ]}
      phaseDeliverables={[
        "Interactive Recharts comparative bar and area charts for revenue, waste, and SLA rates",
        "Per-commodity shelf-life degradation curves and temperature excursion heatmaps",
        "Weekly financial audit reports exportable to PDF and CSV manifests",
        "Retrospective post-mortem analysis comparing planned allocations to realized dock arrivals",
      ]}
    />
  );
}
