import { Metadata } from "next";
import { ScenarioLabCockpit } from "./ScenarioLabCockpit";

export const metadata: Metadata = {
  title: "Scenario Lab & Sensitivity Sandbox | FreshRoute",
  description:
    "Deterministic What-If operational simulation, carrier delay testing, fleet capacity shocks, and demand stress-testing against immutable distribution plans.",
};

export default function ScenariosPage() {
  return <ScenarioLabCockpit />;
}
