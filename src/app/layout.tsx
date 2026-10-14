import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "FreshRoute | Intelligent Perishable Produce Distribution",
  description:
    "Enterprise decision support for fresh produce distributors: FEFO dispatching, shelf-life constraint optimization, dynamic markdowns, and baseline benchmarking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
