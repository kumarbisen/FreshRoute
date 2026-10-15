import { Metadata } from "next";
import { PlanningCockpit } from "./PlanningCockpit";

export const metadata: Metadata = {
  title: "Distribution Planner & Dispatch Optimizer | FreshRoute",
  description:
    "Generate deterministic, reproducible FEFO perishable produce distribution plans, inspect allocations, evaluate against FIFO baseline, and export dispatch manifests.",
};

export default function PlanningPage() {
  return <PlanningCockpit />;
}
