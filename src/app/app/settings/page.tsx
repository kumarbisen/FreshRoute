import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Distributor Settings | FreshRoute",
  description: "Configure cold-storage facility profiles, solver parameters, and Clerk authentication.",
};

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Distributor Settings & Configuration"
      subtitle="Cold Storage Facilities, Algorithmic Tolerances & Security Access Controls"
      badgeText="PHASE 06 HARDENING"
      breadcrumbs={[{ label: "Configuration" }, { label: "Distributor Settings" }]}
      icon={Settings}
      targetPhase="Phase 6: Multi-Tenant Configuration & Security Hardening"
      mockStats={[
        { label: "Active Facilities", value: "3 Hubs", sub: "Salinas, Central Valley, PNW" },
        { label: "Default Algorithm", value: "v1.0.0-fefo", sub: "Elastic markdown enabled" },
        { label: "Max Discount Cap", value: "35.0%", sub: "Hard margin floor limit" },
        { label: "Auth Provider", value: "Clerk RBAC", sub: "JWT session middleware" },
      ]}
      phaseDeliverables={[
        "Cold storage warehouse profile configuration (dual-zone vs. multi-temp ratings)",
        "Distributor-wide dynamic markdown caps and minimum gross margin thresholds",
        "Clerk multi-tenant organization switching and role-based permissions (Director, Analyst, Viewer)",
        "Audit trail logs for all committed planning runs and credential rotations",
      ]}
    />
  );
}
