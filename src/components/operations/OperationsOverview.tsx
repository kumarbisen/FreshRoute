"use client";

import React, { useState } from "react";
import {
  Boxes,
  Truck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Clock,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";
import clsx from "clsx";
import styles from "./OperationsOverview.module.scss";

interface DispatchRow {
  batchCode: string;
  produce: string;
  category: string;
  quantityKg: number;
  temp: string;
  shelfLifeRemaining: string;
  urgency: "critical" | "warning" | "fresh";
  destination: string;
  routeCode: string;
  reasonCode: string;
  discount: number;
}

const ACTIVE_DISPATCH_ROWS: DispatchRow[] = [
  {
    batchCode: "B-BERRY-802",
    produce: "Sweet Albion Strawberries",
    category: "BERRIES",
    quantityKg: 350,
    temp: "1.2°C",
    shelfLifeRemaining: "02d : 14h",
    urgency: "critical",
    destination: "Valley Pre-Cut & Foodservice",
    routeCode: "R-04 (Dual-Temp)",
    reasonCode: "DYNAMIC_MARKDOWN_SALVAGE",
    discount: 15,
  },
  {
    batchCode: "B-SPIN-410",
    produce: "Organic Baby Spinach",
    category: "LEAFY GREENS",
    quantityKg: 500,
    temp: "2.0°C",
    shelfLifeRemaining: "05d : 08h",
    urgency: "fresh",
    destination: "Metro Fresh Premium Grocers",
    routeCode: "R-04 (Dual-Temp)",
    reasonCode: "FEFO_URGENCY_PRIORITY",
    discount: 0,
  },
  {
    batchCode: "B-AVOC-105",
    produce: "Hass Avocados (Stage 3)",
    category: "AVOCADOS",
    quantityKg: 850,
    temp: "6.5°C",
    shelfLifeRemaining: "07d : 19h",
    urgency: "fresh",
    destination: "Pacific Regional Supermarkets",
    routeCode: "R-02 (Reefer Ambient)",
    reasonCode: "TRANSPORT_CAPACITY_OPTIMIZED",
    discount: 0,
  },
  {
    batchCode: "B-ROMA-219",
    produce: "Crisp Romaine Hearts",
    category: "LEAFY GREENS",
    quantityKg: 420,
    temp: "1.8°C",
    shelfLifeRemaining: "03d : 06h",
    urgency: "warning",
    destination: "Golden State Wholesalers",
    routeCode: "R-01 (Express Reefer)",
    reasonCode: "SHELF_LIFE_SLA_SATISFIED",
    discount: 0,
  },
  {
    batchCode: "B-CITR-701",
    produce: "Valencia Oranges",
    category: "CITRUS",
    quantityKg: 1200,
    temp: "7.0°C",
    shelfLifeRemaining: "12d : 04h",
    urgency: "fresh",
    destination: "Pacific Regional Supermarkets",
    routeCode: "R-02 (Reefer Ambient)",
    reasonCode: "DISPATCH_WINDOW_ALIGNED",
    discount: 0,
  },
];

// Circular SVG Ring Progress Gauge Component (from Behance SaaS Dashboard reference)
function RingProgressGauge({
  percent,
  size = 54,
  strokeWidth = 5,
  color = "#059669",
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={styles.ringWrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ringSvg}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className={styles.ringText}>{percent}%</span>
    </div>
  );
}

export function OperationsOverview() {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [isSolverDialogOpen, setIsSolverDialogOpen] = useState(false);

  const filteredRows =
    filterCategory === "ALL"
      ? ACTIVE_DISPATCH_ROWS
      : ACTIVE_DISPATCH_ROWS.filter((r) => r.category === filterCategory);

  return (
    <div className={styles.container}>
      {/* Page Header with Action Button */}
      <PageHeader
        title="Operations Cockpit"
        subtitle="Salinas Cold Hub (DC-01) // Real-Time Dispatch Allocation & Urgency Monitor"
        badge={
          <Badge variant="fresh" size="sm" pulse>
            SOLVER READY: v1.0.0
          </Badge>
        }
        breadcrumbs={[{ label: "Overview" }]}
        actions={
          <div className={styles.headerActions}>
            <Dialog open={isSolverDialogOpen} onOpenChange={setIsSolverDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="primary" size="md" leftIcon={<Sparkles size={16} />}>
                  Run FEFO Solver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Dispatch Optimization Run</DialogTitle>
                  <DialogDescription>
                    The pure TypeScript solver will ingest active inventory lots, calculate decay rates,
                    match vehicle capacities, and generate structured reason codes.
                  </DialogDescription>
                </DialogHeader>

                <div className={styles.dialogForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Target Facility</label>
                    <div className={styles.formReadonly}>Salinas Valley Cold Hub (DC-01)</div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Optimization Algorithm</label>
                    <div className={styles.formReadonly}>v1.0.0-fefo-elastic (Greedy Multi-Constraint)</div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Dynamic Markdown Elasticity</label>
                    <div className={styles.checkboxRow}>
                      <input type="checkbox" id="markdowns" defaultChecked className={styles.checkbox} />
                      <label htmlFor="markdowns" className={styles.checkboxLabel}>
                        Enable automatic markdown discount recommendations for &lt; 72h stock
                      </label>
                    </div>
                  </div>

                  <div className={styles.dialogInfoCallout}>
                    <CheckCircle2 size={16} className={styles.calloutIcon} />
                    <span>
                      Planning run execution with database persistence operates deterministically with SHA-256 snapshot hashes.
                    </span>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary" size="md">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setIsSolverDialogOpen(false);
                      window.location.href = "/app/planning";
                    }}
                  >
                    Execute Optimization Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* KPI Cards Row with SVG Circular Progress Rings (Behance reference) */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardTop}>
            <div className={styles.kpiIconBadge}>
              <Boxes size={18} />
            </div>
            <span className={styles.kpiDeltaPill}>
              <ArrowUpRight size={12} /> +12.5%
            </span>
          </div>
          <div className={styles.kpiBodyRow}>
            <div className={styles.kpiTextGroup}>
              <span className={styles.kpiTitle}>Active Inventory</span>
              <div className={styles.kpiNumber}>32,450 kg</div>
              <span className={styles.kpiDesc}>32 cold-room lots tracked</span>
            </div>
            <RingProgressGauge percent={86} color="#0f172a" />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardTop}>
            <div className={clsx(styles.kpiIconBadge, styles.warningBadge)}>
              <AlertTriangle size={18} />
            </div>
            <span className={clsx(styles.kpiDeltaPill, styles.warningDelta)}>5 lots at risk</span>
          </div>
          <div className={styles.kpiBodyRow}>
            <div className={styles.kpiTextGroup}>
              <span className={styles.kpiTitle}>At-Risk Stock (&lt; 72h)</span>
              <div className={styles.kpiNumberWarning}>4,850 kg</div>
              <span className={styles.kpiDesc}>Flagged for dynamic salvage</span>
            </div>
            <RingProgressGauge percent={15} color="#d97706" />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardTop}>
            <div className={styles.kpiIconBadge}>
              <Truck size={18} />
            </div>
            <span className={styles.kpiDeltaPill}>Nominal Fleet</span>
          </div>
          <div className={styles.kpiBodyRow}>
            <div className={styles.kpiTextGroup}>
              <span className={styles.kpiTitle}>Reefer Utilization</span>
              <div className={styles.kpiNumber}>94.2%</div>
              <span className={styles.kpiDesc}>18 active carrier reefers</span>
            </div>
            <RingProgressGauge percent={94} color="#059669" />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardTop}>
            <div className={clsx(styles.kpiIconBadge, styles.emeraldBadge)}>
              <TrendingUp size={18} />
            </div>
            <span className={clsx(styles.kpiDeltaPill, styles.emeraldDelta)}>+21.4% MoM</span>
          </div>
          <div className={styles.kpiBodyRow}>
            <div className={styles.kpiTextGroup}>
              <span className={styles.kpiTitle}>Salvaged Margin</span>
              <div className={styles.kpiNumberEmerald}>+₹18,450</div>
              <span className={styles.kpiDesc}>Recouped via markdowns</span>
            </div>
            <RingProgressGauge percent={78} color="#059669" />
          </div>
        </div>
      </div>

      {/* Urgent Shelf-Life Attention Banner */}
      <div className={styles.alertBanner}>
        <div className={styles.alertContent}>
          <div className={styles.alertIconCircle}>
            <Clock size={16} />
          </div>
          <div className={styles.alertTextGroup}>
            <span className={styles.alertTitle}>Shelf-Life Urgency Attention Required</span>
            <span className={styles.alertDescription}>
              Batch <b>B-BERRY-802</b> (Sweet Strawberries) has 2.6 days remaining. Diverting to Valley Pre-Cut
              preserves ₹1,338.75 in revenue versus ₹1,050.00 disposal loss under baseline FIFO.
            </span>
          </div>
        </div>
        <Badge variant="salvage" size="md">
          15% DISCOUNT SALVAGE
        </Badge>
      </div>

      {/* Active Dispatches Table Card */}
      <Card variant="default">
        <div className={styles.tableCardHeader}>
          <div className={styles.tableTitleGroup}>
            <CardTitle>Active Dispatches & Urgency Router</CardTitle>
            <CardDescription>
              Real-time multi-constraint dispatch status with remaining shelf-life SLA checks
            </CardDescription>
          </div>

          {/* Commodity Filters */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Commodity:</span>
            {["ALL", "BERRIES", "LEAFY GREENS", "AVOCADOS", "CITRUS"].map((cat) => (
              <button
                key={cat}
                type="button"
                className={clsx(
                  styles.filterPill,
                  filterCategory === cat && styles.activeFilterPill
                )}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Lot</TableHead>
              <TableHead>Produce & Category</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>Remaining Clock</TableHead>
              <TableHead>Assigned Destination</TableHead>
              <TableHead>Reefer Carrier</TableHead>
              <TableHead>Dispatch Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.batchCode}>
                <TableCell>
                  <span className={styles.batchMono}>{row.batchCode}</span>
                </TableCell>
                <TableCell>
                  <div className={styles.produceCell}>
                    <span className={styles.produceName}>{row.produce}</span>
                    <span className={styles.categoryTag}>{row.category}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={styles.quantityVal}>{row.quantityKg.toLocaleString()} kg</span>
                </TableCell>
                <TableCell>
                  <div className={styles.tempCard}>
                    <Thermometer size={12} />
                    <span>{row.temp}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.urgency === "critical"
                        ? "critical"
                        : row.urgency === "warning"
                        ? "warning"
                        : "fresh"
                    }
                    size="sm"
                    pulse={row.urgency === "critical"}
                  >
                    {row.shelfLifeRemaining}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={styles.destinationName}>{row.destination}</span>
                </TableCell>
                <TableCell>
                  <span className={styles.routeCode}>{row.routeCode}</span>
                </TableCell>
                <TableCell>
                  <div className={styles.reasonBadgeCell}>
                    <Badge variant="neutral" size="sm">
                      {row.reasonCode}
                    </Badge>
                    {row.discount > 0 && (
                      <span className={styles.discountTag}>-{row.discount}%</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
