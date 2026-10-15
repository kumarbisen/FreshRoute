import { Metadata } from "next";
import { AnalyticsCockpit } from "./AnalyticsCockpit";

export const metadata: Metadata = {
  title: "Baseline ROI & Comparative Analytics | FreshRoute",
  description:
    "Interactive Recharts comparative analytics measuring FreshRoute FEFO optimization against the documented FIFO baseline benchmark.",
};

export default function AnalyticsPage() {
  return <AnalyticsCockpit />;
}
