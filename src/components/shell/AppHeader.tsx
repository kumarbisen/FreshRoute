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
} from "lucide-react";
import clsx from "clsx";
import styles from "./AppHeader.module.scss";

export interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const [timeString, setTimeString] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

        <div className={styles.searchBar}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search batches, produce, routes, retail SLAs..."
            className={styles.searchInput}
            readOnly
            onClick={() => alert("Global Search (⌘K) will be connected in Phase 3 API phase.")}
          />
          <kbd className={styles.searchShortcut}>⌘K</kbd>
        </div>
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

        {/* Notifications Button */}
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notifications"
          onClick={() => alert("Shelf-life alert: 2 batches approaching 48h limit in Salinas DC.")}
        >
          <Bell size={16} />
          <span className={styles.notificationDot} />
        </button>

        {/* User Account Menu */}
        <div className={styles.userMenuWrapper}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
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
                onClick={() => {
                  setIsProfileOpen(false);
                  window.location.href = "/app/settings";
                }}
              >
                Facility Preferences
              </button>
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
