"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Plus,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";
import { CsvImportDialog } from "@/components/operations/CsvImportDialog";
import { BatchDetailModal } from "@/components/operations/BatchDetailModal";
import { BatchFormDialog } from "@/components/operations/BatchFormDialog";
import styles from "@/components/operations/Operations.module.scss";

export default function InventoryPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [sortBy, setSortBy] = useState("expiryDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Lookups
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);

  // Dialog states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load lookups once
  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((d) => setWarehouses(d.warehouses || []))
      .catch(console.error);

    fetch("/api/commodities")
      .then((r) => r.json())
      .then((d) => setCommodities(d.commodities || []))
      .catch(console.error);
  }, []);

  const fetchBatches = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (commodityId) params.set("commodityId", commodityId);
    if (warehouseId) params.set("warehouseId", warehouseId);
    if (status) params.set("status", status);
    if (riskLevel) params.set("riskLevel", riskLevel);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    fetch(`/api/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setBatches(data.batches || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, commodityId, warehouseId, status, riskLevel, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const totalAvailableKg = batches.reduce((acc, b) => acc + (b.availableQuantity || 0), 0);
  const criticalCount = batches.filter((b) => b.risk?.riskLevel === "CRITICAL").length;

  const handleOpenCreate = () => {
    setEditingBatch(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (batch: any) => {
    setEditingBatch(batch);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (batchId: string) => {
    setSelectedBatchId(batchId);
    setIsDetailModalOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setCommodityId("");
    setWarehouseId("");
    setStatus("");
    setRiskLevel("");
    setPage(1);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <div className={styles.pageTitle}>
            <Boxes size={28} color="var(--accent-lime, #d4f933)" />
            <span>Perishable Inventory & Lot Expiry Clocks</span>
          </div>
          <div className={styles.pageSubtitle}>
            Persistent Cold Storage Tracking // Absolute Milestones // FEFO Dispatch Feasibility
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
            onClick={handleOpenCreate}
          >
            New Batch
          </Button>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Inventory Lots</span>
          <div className={styles.statValue}>
            {total}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>lots</span>
          </div>
          <span className={styles.statSub}>Across active cold rooms</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Available Payload Stock</span>
          <div className={styles.statValue}>
            {totalAvailableKg.toLocaleString()}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>kg</span>
          </div>
          <span className={styles.statSub}>Ready for FEFO allocation</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Critical Urgency (&lt; 48h)</span>
          <div className={styles.statValue} style={{ color: criticalCount > 0 ? "var(--danger, #ef4444)" : "inherit" }}>
            {criticalCount}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>lots</span>
          </div>
          <span className={styles.statSub}>Immediate dispatch / markdown salvage</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Standard Storage Spec</span>
          <div className={styles.statValue} style={{ color: "var(--produce-emerald, #10b981)" }}>
            0.5° – 4.0°
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>C</span>
          </div>
          <span className={styles.statSub}>Strict cold chain compliance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by lot code, commodity, warehouse, or city..."
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
            value={commodityId}
            onChange={(e) => {
              setCommodityId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Commodities</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <select
            className={styles.selectInput}
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Facilities</option>
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
            <option value="AVAILABLE">Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="PARTIALLY_ALLOCATED">Partially Allocated</option>
            <option value="EXPIRED">Expired</option>
            <option value="SALVAGED">Salvaged</option>
          </select>

          <select
            className={styles.selectInput}
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Risk Tiers</option>
            <option value="CRITICAL">Critical (&lt; 48h)</option>
            <option value="HIGH">High Urgency (2-4d)</option>
            <option value="MEDIUM">Medium (4-7d)</option>
            <option value="LOW">Stable (&gt; 7d)</option>
          </select>

          <select
            className={styles.selectInput}
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [col, ord] = e.target.value.split("_");
              setSortBy(col);
              setSortOrder(ord as "asc" | "desc");
            }}
          >
            <option value="expiryDate_asc">Expiry (Earliest First)</option>
            <option value="expiryDate_desc">Expiry (Latest First)</option>
            <option value="availableQuantity_desc">Available Stock (Highest)</option>
            <option value="availableQuantity_asc">Available Stock (Lowest)</option>
            <option value="unitCost_desc">Unit Cost (Highest)</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchBatches}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading inventory lots and shelf-life decay models...
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: "3rem" }}>
            <EmptyState
              icon={<Boxes size={40} />}
              title="No Inventory Batches Found"
              description="No produce lots matched your active filters or search terms."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Batch Lot Code</th>
                    <th>Commodity & Variety</th>
                    <th>Warehouse Hub</th>
                    <th>Available / Initial</th>
                    <th>Storage Temp</th>
                    <th>Cost / Target Price</th>
                    <th>Absolute Expiry & RSL</th>
                    <th>Risk Urgency</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <span className={styles.batchCodeCell}>{batch.batchCode}</span>
                        <span className={styles.subText}>Grade: {batch.qualityGrade}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {batch.commodityName}
                        </span>
                        <span className={styles.subText}>{batch.commodityCategory}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {batch.warehouseName}
                        </span>
                        <span className={styles.subText}>{batch.warehouseCity}</span>
                      </td>
                      <td>
                        <span className={styles.quantityCell}>
                          {batch.availableQuantity.toLocaleString()} kg
                        </span>
                        <span className={styles.subText}>
                          Total: {batch.initialQuantity.toLocaleString()} kg
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)" }}>
                          {batch.storageTempCelsius}°C
                        </span>
                      </td>
                      <td>
                        <span className={styles.priceCell}>${batch.unitCost.toFixed(2)}</span>
                        <span className={styles.subText}>Target: ${batch.basePrice.toFixed(2)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 600 }}>
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                        <span className={styles.subText}>
                          {batch.risk.remainingDays} days ({batch.risk.remainingHours}h)
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.riskBadge} ${
                            batch.risk.riskLevel === "CRITICAL"
                              ? styles.riskCritical
                              : batch.risk.riskLevel === "HIGH"
                              ? styles.riskHigh
                              : batch.risk.riskLevel === "MEDIUM"
                              ? styles.riskMedium
                              : batch.risk.riskLevel === "LOW"
                              ? styles.riskLow
                              : styles.riskExpired
                          }`}
                        >
                          {batch.risk.riskLabel}
                        </span>
                      </td>
                      <td>
                        <Badge
                          variant={
                            batch.status === "AVAILABLE"
                              ? "fresh"
                              : batch.status === "ALLOCATED"
                              ? "lime"
                              : batch.status === "PARTIALLY_ALLOCATED"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {batch.status}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(batch.id)}
                          >
                            <Eye size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(batch)}
                          >
                            <Edit size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.paginationBar}>
              <span>
                Showing {batches.length} of {total} batches (Page {page} of {totalPages})
              </span>
              <div className={styles.paginationControls}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  leftIcon={<ChevronLeft size={14} />}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  rightIcon={<ChevronRight size={14} />}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CSV Import Modal */}
      <CsvImportDialog
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        templateType="inventory"
        title="Batch Inventory CSV Import"
        onImportSuccess={() => {
          fetchBatches();
        }}
      />

      {/* Create / Edit Batch Dialog */}
      <BatchFormDialog
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingBatch(null);
        }}
        batchToEdit={editingBatch}
        onSuccess={() => {
          fetchBatches();
        }}
      />

      {/* Batch Detail & Audit Modal */}
      <BatchDetailModal
        batchId={selectedBatchId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBatchId(null);
        }}
      />
    </div>
  );
}
