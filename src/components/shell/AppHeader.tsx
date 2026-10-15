"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Clock,
  Radio,
  User,
  LogOut,
  ChevronDown,
  RotateCcw,
  Settings,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import styles from "./AppHeader.module.scss";

export interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const [timeString, setTimeString] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/app/inventory?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Restore canonical competition demo dataset? This will re-seed all 5 canonical operational edge cases.")) {
      return;
    }
    setIsResettingDemo(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        window.location.href = "/app/planning";
      } else {
        alert("Failed to reset demo dataset.");
      }
    } catch (err) {
      console.error("Demo reset error:", err);
    } finally {
      setIsResettingDemo(false);
      setIsProfileOpen(false);
    }
  };

  return (
    <header className={styles.header}>
      {/* Left: Mobile Toggle & Quick Search */}
      <div className={styles.leftGroup}>
        <button
          type="button"
          onClick={onMenuToggle}
          className={styles.menuButton}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search batches, produce, routes, retail SLAs..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className={styles.searchShortcut}>↵</kbd>
        </form>
      </div>

      {/* Right: Live Ticker, Notifications & User Menu */}
      <div className={styles.rightGroup}>
        {/* Live Dispatch Clock */}
        <div className={styles.clockWidget}>
          <Clock size={13} className={styles.clockIcon} />
          <span className={styles.clockText}>{timeString || "00:00:00 UTC"}</span>
        </div>

        {/* Network Live Telemetry Pill */}
        <div className={styles.telemetryPill}>
          <Radio size={12} className={styles.radioIcon} />
          <span className={styles.telemetryText}>SOLVER ONLINE</span>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Notifications"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
          >
            <Bell size={16} />
            <span className={styles.notificationDot} />
          </button>

          {isNotificationsOpen && (
            <div className={styles.notificationsDropdown}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", paddingBottom: "4px", borderBottom: "1px solid #334155" }}>
                Operational Alerts (3 Active)
              </div>

              <div
                className={styles.notificationItem}
                onClick={() => {
                  setIsNotificationsOpen(false);
                  window.location.href = "/app/inventory";
                }}
              >
                <span className={styles.notificationTitle}>
                  <AlertTriangle size={12} color="#fbbf24" /> FEFO Urgency Alert
                </span>
                <span className={styles.notificationDesc}>
                  BATCH-STR-URGENT-01 approaching 48h shelf-life limit in Salinas DC.
                </span>
              </div>

              <div
                className={styles.notificationItem}
                onClick={() => {
                  setIsNotificationsOpen(false);
                  window.location.href = "/app/destinations";
                }}
              >
                <span className={styles.notificationTitle}>
                  <AlertTriangle size={12} color="#f87171" /> Dock SLA Breach
                </span>
                <span className={styles.notificationDesc}>
                  DEST-PACIFIC-02 requires 7.0d minimum dock RSL; spinach lot rejected.
                </span>
              </div>

              <div
                className={styles.notificationItem}
                onClick={() => {
                  setIsNotificationsOpen(false);
                  window.location.href = "/app/discounts";
                }}
              >
                <span className={styles.notificationTitle}>
                  <ExternalLink size={12} color="#34d399" /> Dynamic Markdown
                </span>
                <span className={styles.notificationDesc}>
                  3,500 kg excess strawberries eligible for 25% salvage markdown.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className={styles.userMenuWrapper}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            aria-expanded={isProfileOpen}
          >
            <div className={styles.avatar}>
              <User size={15} />
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>Alex Rivera</span>
              <span className={styles.userRole}>Dispatch Director</span>
            </div>
            <ChevronDown size={14} className={styles.dropdownChevron} />
          </button>

          {isProfileOpen && (
            <div className={styles.profileDropdown}>
              <div className={styles.profileHeader}>
                <span className={styles.profileEmail}>a.rivera@freshroute.io</span>
                <span className={styles.profileOrg}>Salinas Valley DC #1</span>
              </div>
              <div className={styles.dropdownDivider} />
              
              <button
                type="button"
                className={styles.dropdownAction}
                onClick={handleResetDemo}
                disabled={isResettingDemo}
              >
                <RotateCcw size={13} color="#d4f933" />
                {isResettingDemo ? "Resetting Demo..." : "Restore Demo Dataset"}
              </button>

              <button
                type="button"
                className={styles.dropdownAction}
                onClick={() => {
                  setIsProfileOpen(false);
                  window.location.href = "/app/settings";
                }}
              >
                <Settings size={13} />
                Distributor Settings
              </button>

              <div className={styles.dropdownDivider} />

              <button
                type="button"
                className={clsx(styles.dropdownAction, styles.destructiveAction)}
                onClick={() => {
                  setIsProfileOpen(false);
                  window.location.href = "/";
                }}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
