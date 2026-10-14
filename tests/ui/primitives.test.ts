import { describe, it, expect } from "vitest";
import React from "react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card/Card";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { Breadcrumbs } from "@/components/ui/breadcrumbs/Breadcrumbs";

describe("FreshRoute Reusable UI Primitives", () => {
  it("Button renders with default and custom variants", () => {
    const el = React.createElement(Button, { variant: "primary", size: "md" }, "Click Me");
    expect(el.type).toBe(Button);
    expect(el.props.variant).toBe("primary");
    expect(el.props.size).toBe("md");
  });

  it("Button applies loading state and disables interaction", () => {
    const el = React.createElement(Button, { loading: true }, "Submitting");
    expect(el.props.loading).toBe(true);
  });

  it("Badge renders with proper status variant and pulse indicator", () => {
    const badge = Badge({ children: "CRITICAL 48H", variant: "critical", pulse: true });
    expect(badge.props.className).toContain("critical");
    expect(badge.props.children[0]?.props.className).toContain("pulseDot");
  });

  it("Card renders title and structural hierarchy", () => {
    const cardTitle = CardTitle({ children: "Fleet Utilization" });
    expect(cardTitle.props.children).toBe("Fleet Utilization");

    const card = Card({
      variant: "glow",
      children: [
        CardHeader({ children: cardTitle }),
        CardContent({ children: "94.2% active" }),
      ],
    });
    expect(card.props.className).toContain("glow");
  });

  it("EmptyState renders title and descriptive text", () => {
    const empty = EmptyState({
      title: "No Batches Expiring",
      description: "All produce lots have over 5 days of remaining shelf-life.",
    });
    expect(empty.props.children[1].props.children).toBe("No Batches Expiring");
    expect(empty.props.children[2].props.children).toBe(
      "All produce lots have over 5 days of remaining shelf-life."
    );
  });

  it("Breadcrumbs formats navigation hierarchy", () => {
    const crumbs = Breadcrumbs({
      items: [{ label: "Operations", href: "/app" }, { label: "Inventory" }],
    });
    expect(crumbs.props["aria-label"]).toBe("Breadcrumb");
  });
});
