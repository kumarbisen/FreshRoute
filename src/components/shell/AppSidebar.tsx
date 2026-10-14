"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Store,
  Truck,
  Sparkles,
  Tag,
  BarChart3,
  Sliders,
  Settings,
  ChevronDown,
  Warehouse,
  ShieldCheck,
  ExternalLink,
  X,
} from "lucide-react";
import clsx from "clsx";
import styles from "./AppSidebar.module.scss";

const WORKSPACES = [
  { id: "dc-01", name: "Salinas Valley Cold Hub", code: "DC-01", region: "CA Coast" },
  { id: "dc-02", name: "Central Valley Logistics Hub", code: "DC-02", region: "CA Central" },
  { id: "dc-03", name: "Pacific Northwest Produce Hub", code: "DC-03", region: "WA / OR" },
];

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OPERATIONS",
    items: [
      { label: "Overview", href: "/app", icon: LayoutDashboard },
      { label: "Inventory Batches", href: "/app/inventory", icon: Boxes, badge: "32 Lots" },
      { label: "Destinations & SLAs", href: "/app/destinations", icon: Store },
      { label: "Transport & Routes", href: "/app/transport", icon: Truck },
    ],
  },
  {
    title: "DECISION ENGINES",
    items: [
      { label: "Dispatch Optimizer", href: "/app/planning", icon: Sparkles, highlight: true },
      { label: "Markdown Salvage", href: "/app/discounts", icon: Tag },
      { label: "Baseline Analytics", href: "/app/analytics", icon: BarChart3 },
      { label: "What-If Scenarios", href: "/app/scenarios", icon: Sliders },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { label: "Distributor Settings", href: "/app/settings", icon: Settings },
    ],
  },
];

export interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [selectedWorkspace, setSelectedWorkspace] = useState(WORKSPACES[0]);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />}

      <aside className={clsx(styles.sidebar, isOpen && styles.mobileOpen)}>
        {/* Brand & Mobile Close */}
        <div className={styles.brandRow}>
          <Link href="/" className={styles.brandLink}>
            <div className={styles.logoBadge}>FR</div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>FreshRoute</span>
              <span className={styles.brandSubtitle}>Cold-Chain Logistics</span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className={styles.closeMobileBtn}
              aria-label="Close Navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Workspace Switcher */}
        <div className={styles.workspaceWrapper}>
          <button
            type="button"
            className={styles.workspaceTrigger}
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            aria-expanded={isWorkspaceDropdownOpen}
          >
            <div className={styles.workspaceIcon}>
              <Warehouse size={16} />
            </div>
            <div className={styles.workspaceDetails}>
              <span className={styles.workspaceName}>{selectedWorkspace.name}</span>
              <span className={styles.workspaceMeta}>
                {selectedWorkspace.code} • {selectedWorkspace.region}
              </span>
            </div>
            <ChevronDown size={14} className={clsx(styles.chevron, isWorkspaceDropdownOpen && styles.chevronRotated)} />
          </button>

          {isWorkspaceDropdownOpen && (
            <div className={styles.workspaceDropdown}>
              <div className={styles.dropdownHeader}>Switch Facility</div>
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={clsx(
                    styles.dropdownItem,
                    ws.id === selectedWorkspace.id && styles.activeItem
                  )}
                  onClick={() => {
                    setSelectedWorkspace(ws);
                    setIsWorkspaceDropdownOpen(false);
                  }}
                >
                  <span className={styles.dropdownItemName}>{ws.name}</span>
                  <span className={styles.dropdownItemCode}>{ws.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className={styles.navContainer} aria-label="Sidebar Navigation">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} className={styles.sectionGroup}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <ul className={styles.navList}>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={clsx(
                          styles.navLink,
                          isActive && styles.activeLink,
                          item.highlight && styles.highlightLink
                        )}
                      >
                        <span className={styles.linkIcon}>
                          <Icon size={16} />
                        </span>
                        <span className={styles.linkLabel}>{item.label}</span>
                        {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Cold-Chain Health Pill */}
        <div className={styles.footerTelemetry}>
          <div className={styles.telemetryCard}>
            <div className={styles.telemetryHeader}>
              <ShieldCheck size={14} className={styles.shieldIcon} />
              <span className={styles.telemetryTitle}>Cold-Chain Fleet</span>
            </div>
            <div className={styles.telemetryStats}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Reefer Status</span>
                <span className={styles.statValSuccess}>99.4% Nominal</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Active Dispatches</span>
                <span className={styles.statVal}>18 Reefers</span>
              </div>
            </div>
          </div>
          <Link href="/" className={styles.marketingLink}>
            <span>View Marketing Site</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </aside>
    </>
  );
}
