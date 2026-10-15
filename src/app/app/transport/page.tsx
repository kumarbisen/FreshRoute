"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Upload,
  Search,
  RefreshCw,
  Edit,
  Clock,
  IndianRupee,
  Gauge,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";
import { CsvImportDialog } from "@/components/operations/CsvImportDialog";
import { RouteFormDialog } from "@/components/operations/RouteFormDialog";
import styles from "@/components/operations/Operations.module.scss";

export default function TransportPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [originWarehouseId, setOriginWarehouseId] = useState("");
  const [status, setStatus] = useState("");

  // Lookups
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Dialogs
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((d) => setWarehouses(d.warehouses || []))
      .catch(console.error);
  }, []);

  const fetchRoutes = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (originWarehouseId) params.set("originWarehouseId", originWarehouseId);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "10");

    fetch(`/api/routes?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data.routes || []);
        setTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, originWarehouseId, status, page]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const totalCapacityKg = routes.reduce((acc, r) => acc + (r.maxWeightCapacityKg || 0), 0);
  const totalAllocatedKg = routes.reduce((acc, r) => acc + (r.allocatedWeightKg || 0), 0);
  const avgTransitHours =
    routes.length > 0
      ? (routes.reduce((acc, r) => acc + (r.transitDurationHours || 0), 0) / routes.length).toFixed(1)
      : "0.0";

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <div className={styles.pageTitle}>
            <Truck size={28} color="var(--accent-lime, #d4f933)" />
            <span>Transport Logistics & Fleet Route Scheduling</span>
          </div>
          <div className={styles.pageSubtitle}>
            Two-Part Logistics Economics (Fixed Dispatch + Variable ₹/kg) // Reefer Payload Capacity & Constraints
          </div>
        </div>

        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload size={14} />}
            onClick={() => setIsCsvModalOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => {
              setEditingRoute(null);
              setIsFormModalOpen(true);
            }}
          >
            New Route
          </Button>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Fleet Routes</span>
          <div className={styles.statValue}>{total}</div>
          <span className={styles.statSub}>Reefer line-haul transit legs</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Gross Capacity Dispatched</span>
          <div className={styles.statValue}>
            {totalCapacityKg.toLocaleString()}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>kg</span>
          </div>
          <span className={styles.statSub}>
            Allocated: {totalAllocatedKg.toLocaleString()} kg (
            {totalCapacityKg > 0 ? ((totalAllocatedKg / totalCapacityKg) * 100).toFixed(1) : 0}% fleet load)
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Average Transit Duration</span>
          <div className={styles.statValue}>
            {avgTransitHours}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>hours</span>
          </div>
          <span className={styles.statSub}>Origin hub to buyer receiving dock</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Economic Cost Model</span>
          <div className={styles.statValue} style={{ fontSize: "1.25rem", color: "var(--accent-lime, #d4f933)" }}>
            Fixed + ₹/kg
          </div>
          <span className={styles.statSub}>Two-part logistics tariff formulation</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by route code, destination corridor, origin facility..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.selectInput}
            value={originWarehouseId}
            onChange={(e) => {
              setOriginWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Origin Hubs</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          <select
            className={styles.selectInput}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED (Available)</option>
            <option value="LOADING">LOADING</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchRoutes}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Route Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading transport routes and capacity constraints...
          </div>
        ) : routes.length === 0 ? (
          <div style={{ padding: "3rem" }}>
            <EmptyState
              icon={<Truck size={40} />}
              title="No Transport Routes Found"
              description="No fleet legs matched your active filters."
            />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Route Code</th>
                  <th>Origin Hub</th>
                  <th>Target Destination Region</th>
                  <th>Travel Time (Lead)</th>
                  <th>Fixed Dispatch Cost</th>
                  <th>Variable Rate</th>
                  <th>Sample 1,000kg Cost</th>
                  <th>Payload Capacity & Available</th>
                  <th>Fleet Utilization</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((rt) => (
                  <tr key={rt.id}>
                    <td>
                      <span className={styles.batchCodeCell}>{rt.routeCode}</span>
                      <span className={styles.subText}>{rt.vehicleType.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {rt.originWarehouseName}
                      </span>
                      <span className={styles.subText}>{rt.originWarehouseCity}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {rt.destinationRegion}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        {rt.transitDurationHours}h transit
                      </span>
                      <span className={styles.subText}>
                        + {rt.handlingDurationHours}h dock buffer = {rt.totalLeadTimeHours}h total
                      </span>
                    </td>
                    <td>
                      <span className={styles.priceCell}>₹{rt.fixedTripCostUsd.toFixed(2)}</span>
                      <span className={styles.subText}>flat truck roll</span>
                    </td>
                    <td>
                      <span className={styles.priceCell}>₹{rt.variableCostPerKgUsd.toFixed(3)}</span>
                      <span className={styles.subText}>per kg</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--produce-emerald)" }}>
                        ₹{rt.sampleCostFor1000KgUsd.toFixed(2)}
                      </span>
                      <span className={styles.subText}>for 1,000 kg load</span>
                    </td>
                    <td>
                      <span className={styles.quantityCell}>
                        {rt.maxWeightCapacityKg.toLocaleString()} kg max
                      </span>
                      <span className={styles.subText}>
                        Avail: {rt.currentAvailableWeightKg.toLocaleString()} kg
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          {rt.capacityUtilizationPercent}%
                        </span>
                        <div style={{ width: "100%", height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, rt.capacityUtilizationPercent)}%`,
                              height: "100%",
                              background: rt.capacityUtilizationPercent > 90 ? "var(--warning)" : "var(--accent-lime)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={
                          rt.status === "SCHEDULED"
                            ? "fresh"
                            : rt.status === "IN_TRANSIT"
                            ? "lime"
                            : rt.status === "LOADING"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {rt.status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRoute(rt);
                          setIsFormModalOpen(true);
                        }}
                      >
                        <Edit size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        templateType="transport"
        title="Transport Fleet Routes Batch CSV Import"
        onImportSuccess={() => {
          fetchRoutes();
        }}
      />

      {/* Create / Edit Route Dialog */}
      <RouteFormDialog
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRoute(null);
        }}
        routeToEdit={editingRoute}
        onSuccess={() => {
          fetchRoutes();
        }}
      />
    </div>
  );
}
