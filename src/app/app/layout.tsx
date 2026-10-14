import React from "react";
import { AppShellLayout } from "@/components/shell/AppShellLayout";

export const metadata = {
  title: "Operations Cockpit | FreshRoute",
  description: "Live perishable dispatch control, batch shelf-life tracking, and multi-constraint routing.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
