import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import clsx from "clsx";
import styles from "./Breadcrumbs.module.scss";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={clsx(styles.nav, className)} {...props}>
      <ol className={styles.list}>
        <li className={styles.item}>
          <Link href="/app" className={styles.link} aria-label="Dashboard Home">
            <Home size={14} />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className={styles.item}>
              <ChevronRight size={12} className={styles.separator} aria-hidden="true" />
              {isLast || !item.href ? (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
