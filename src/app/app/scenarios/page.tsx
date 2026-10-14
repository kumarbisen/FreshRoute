import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { Sliders } from "lucide-react";

export const metadata = {
  title: "What-If Scenarios | FreshRoute",
  description: "Simulate carrier delays, warehouse temperature excursions, and demand spikes.",
};

export default function ScenariosPage() {
  return (
    <PlaceholderPage
      title="What-If Simulation Sandbox"
      subtitle="Model Fleet Transit Delays, Temperature Excursions & Retail Demand Surges"
      badgeText="PHASE 05 SIMULATION"
      breadcrumbs={[{ label: "Decision Engines" }, { label: "What-If Scenarios" }]}
      icon={Sliders}
      targetPhase="Phase 5: Operational Sensitivity & Stress Testing Sandbox"
      mockStats={[
        { label: "Transit Delay Test", value: "+4.5 hrs", sub: "Forecast SLA impact on berries" },
        { label: "Temp Excursion Test", value: "+3.0°C", sub: "Biological decay acceleration test" },
        { label: "Demand Surge", value: "+30%", sub: "Reefer capacity knapsack stress" },
        { label: "Simulated Salvage", value: "$8,420", sub: "Projected markdown recovery" },
      ]}
      phaseDeliverables={[
        "Interactive scenario parameter sliders (temperature delta, transit delay hours, demand multipliers)",
        "Instant re-solve via pure domain module without database side-effects",
        "Visual sensitivity charts comparing default plan to stressed contingency plan",
        "Automated contingency dispatch protocols for logistics supervisors",
      ]}
    />
  );
}
