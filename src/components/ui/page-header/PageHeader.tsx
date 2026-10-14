import React from "react";
import clsx from "clsx";
import { Breadcrumbs, BreadcrumbItem } from "../breadcrumbs/Breadcrumbs";
import styles from "./PageHeader.module.scss";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={clsx(styles.pageHeader, className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      <div className={styles.contentRow}>
        <div className={styles.titleGroup}>
          <div className={styles.headingWithBadge}>
            <h1 className={styles.title}>{title}</h1>
            {badge && <div className={styles.badgeWrapper}>{badge}</div>}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
