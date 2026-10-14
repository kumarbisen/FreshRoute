import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Dispatch Optimizer | FreshRoute",
  description: "Configure and execute reproducible FEFO planning runs with SHA-256 snapshot hashing.",
};

export default function PlanningPage() {
  return (
    <PlaceholderPage
      title="Dispatch Optimization Solver"
      subtitle="Pure TypeScript FEFO Engine // Constraint Satisfaction & Run Orchestration"
      badgeText="PHASE 03 API ENGINE"
      breadcrumbs={[{ label: "Decision Engines" }, { label: "Dispatch Optimizer" }]}
      icon={Sparkles}
      targetPhase="Phase 3: Planning Run Orchestration & Snapshot Service"
      mockStats={[
        { label: "Solver Version", value: "v1.0.0", sub: "Greedy FEFO heuristic" },
        { label: "Solve Latency", value: "32ms", sub: "Synchronous pure domain math" },
        { label: "Snapshot Hashes", value: "100%", sub: "Cryptographic SHA-256 reproducibility" },
        { label: "Allocations Generated", value: "148 Lots", sub: "Across 22 distinct carrier routes" },
      ]}
      phaseDeliverables={[
        "POST /api/planning-runs endpoint validating payload with Zod",
        "Deterministic input snapshot capture (JSON) and SHA-256 cryptographic hashing",
        "AllocationReasonCode generation with human-readable audit explanations",
        "Plan comparison execution benchmarking against baseline FIFO model",
      ]}
    />
  );
}
