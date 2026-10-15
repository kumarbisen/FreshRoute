import { Metadata } from "next";
import { DiscountCenterCockpit } from "./DiscountCenterCockpit";

export const metadata: Metadata = {
  title: "Dynamic Markdown Salvage Console | FreshRoute",
  description:
    "Deterministic dynamic markdown recommendations and economic salvage optimization for near-expiry perishable produce.",
};

export default function DiscountsPage() {
  return <DiscountCenterCockpit />;
}
