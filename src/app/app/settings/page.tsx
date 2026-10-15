import { Metadata } from "next";
import { SettingsCockpit } from "./SettingsCockpit";

export const metadata: Metadata = {
  title: "Distributor Settings & Demo Controls | FreshRoute",
  description:
    "System configuration, multi-tenant boundaries, and 1-click canonical competition demo environment restoration.",
};

export default function SettingsPage() {
  return <SettingsCockpit />;
}
