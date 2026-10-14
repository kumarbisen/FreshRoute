import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { Tag } from "lucide-react";

export const metadata = {
  title: "Markdown Salvage | FreshRoute",
  description: "Dynamic markdown discount recommendations and floor margin preservation.",
};

export default function DiscountsPage() {
  return (
    <PlaceholderPage
      title="Dynamic Markdown Salvage Console"
      subtitle="Calibrated Price Elasticity // Preserving Margins Before Product Expiry"
      badgeText="PHASE 01 DOMAIN MATH"
      breadcrumbs={[{ label: "Decision Engines" }, { label: "Markdown Salvage" }]}
      icon={Tag}
      targetPhase="Phase 1 Pure Domain: Calibrated Price Elasticity Model"
      mockStats={[
        { label: "Salvage Recouped", value: "$18,450", sub: "Recouped over last 7 days" },
        { label: "Average Discount", value: "14.2%", sub: "Preserving floor margin > disposal cost" },
        { label: "Batches Salvaged", value: "8 Lots", sub: "Liquidated through secondary grocers" },
        { label: "Spoilage Prevented", value: "2,420 kg", sub: "Kept out of commercial landfill" },
      ]}
      phaseDeliverables={[
        "Pure domain markdown elasticity calculator using Decimal.js",
        "Floor margin preservation rule: unit price * (1 - discount) - costs > -disposal penalty",
        "Secondary customer matching matrix for discount-receptive buyers",
        "Detailed markdown reason narratives for commercial merchandisers",
      ]}
    />
  );
}
