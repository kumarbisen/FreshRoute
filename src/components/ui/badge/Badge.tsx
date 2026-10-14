import React from "react";
import clsx from "clsx";
import styles from "./Badge.module.scss";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "fresh" | "warning" | "critical" | "cold" | "salvage" | "lime" | "neutral";
  size?: "sm" | "md";
  pulse?: boolean;
  mono?: boolean;
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  pulse = false,
  mono = true,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        styles.badge,
        styles[variant],
        styles[size],
        mono && styles.mono,
        className
      )}
      {...props}
    >
      {pulse && <span className={styles.pulseDot} aria-hidden="true" />}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.content}>{children}</span>
    </span>
  );
}
