import React from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  EmptyState,
} from "@/components/ui";
import { LucideIcon, ArrowRight, ShieldCheck, Terminal, Layers } from "lucide-react";
import styles from "./PlaceholderPage.module.scss";

export interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  badgeText: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  icon: LucideIcon;
  targetPhase: string;
  phaseDeliverables: string[];
  mockStats?: Array<{ label: string; value: string; sub?: string }>;
}

export function PlaceholderPage({
  title,
  subtitle,
  badgeText,
  breadcrumbs,
  icon: Icon,
  targetPhase,
  phaseDeliverables,
  mockStats,
}: PlaceholderPageProps) {
  return (
    <div className={styles.container}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        badge={
          <Badge variant="lime" size="sm">
            {badgeText}
          </Badge>
        }
        breadcrumbs={breadcrumbs}
      />

      {/* Mock KPI Row if provided */}
      {mockStats && mockStats.length > 0 && (
        <div className={styles.statsRow}>
          {mockStats.map((stat, idx) => (
            <Card key={idx} variant="elevated">
              <CardHeader>
                <span className={styles.statLabel}>{stat.label}</span>
                <div className={styles.statValue}>{stat.value}</div>
                {stat.sub && <CardDescription>{stat.sub}</CardDescription>}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Structured Roadmap Card */}
      <Card variant="glow">
        <CardHeader>
          <div className={styles.cardHeaderTop}>
            <div className={styles.iconCircle}>
              <Icon size={20} className={styles.cardIcon} />
            </div>
            <div className={styles.headerInfo}>
              <span className={styles.phaseTag}>ROADMAP MILESTONE</span>
              <CardTitle>{targetPhase}</CardTitle>
            </div>
          </div>
          <CardDescription>
            The UI shell, navigation routing, and design tokens for this view are fully scaffolded in Phase 01.
            Backend database synchronization and live API endpoints will activate in the designated engineering phase.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className={styles.deliverablesBlock}>
            <h4 className={styles.deliverablesTitle}>Upcoming Implementation Deliverables:</h4>
            <ul className={styles.deliverablesList}>
              {phaseDeliverables.map((d, idx) => (
                <li key={idx} className={styles.deliverableItem}>
                  <span className={styles.bullet}>✓</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
