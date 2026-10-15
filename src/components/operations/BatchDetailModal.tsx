"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Clock, History, AlertTriangle, ShieldCheck, Box, Tag, Thermometer, IndianRupee, Calendar, Layers } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import styles from "./Operations.module.scss";

interface BatchDetailModalProps {
  batchId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BatchDetailModal({ batchId, isOpen, onClose }: BatchDetailModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !batchId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/inventory/${batchId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load batch details");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, batchId]);

  if (!isOpen) return null;

  const batch = data?.batch;
  const audits = data?.audits || [];
  const allocations = data?.allocations || [];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.modalOverlay} />
        <DialogPrimitive.Content className={styles.modalContent} style={{ maxWidth: "760px" }}>
          <div className={styles.modalHeader}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <DialogPrimitive.Title className={styles.modalTitle}>
                  {batch ? batch.batchCode : "Loading Batch..."}
                </DialogPrimitive.Title>
                {batch && (
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
                    {batch.risk.riskLabel} ({batch.risk.remainingDays}d / {batch.risk.remainingHours}h)
                  </span>
                )}
              </div>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                {batch ? `${batch.commodityName} (${batch.commodityCategory}) // Warehouse: ${batch.warehouseName}` : "Fetching telemetry..."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button className={styles.closeBtn} aria-label="Close">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading batch telemetry, quantity history, and allocations...
            </div>
          ) : error ? (
            <div style={{ padding: "2rem", color: "var(--danger, #ef4444)" }}>{error}</div>
          ) : batch ? (
            <div>
              {/* Distinct Quantity Balances */}
              <div className={styles.quantityBreakdown}>
                <div className={styles.qtyBox}>
                  <span className={styles.qtyBoxLabel}>Available Stock</span>
                  <span className={styles.qtyBoxVal} style={{ color: "var(--produce-emerald, #10b981)" }}>
                    {batch.availableQuantity.toLocaleString()} kg
                  </span>
                </div>
                <div className={styles.qtyBox}>
                  <span className={styles.qtyBoxLabel}>Reserved / Plan</span>
                  <span className={styles.qtyBoxVal} style={{ color: "var(--accent-lime, #d4f933)" }}>
                    {batch.reservedQuantity.toLocaleString()} kg
                  </span>
                </div>
                <div className={styles.qtyBox}>
                  <span className={styles.qtyBoxLabel}>Dispatched</span>
                  <span className={styles.qtyBoxVal} style={{ color: "var(--text-secondary)" }}>
                    {batch.dispatchedQuantity.toLocaleString()} kg
                  </span>
                </div>
                <div className={styles.qtyBox}>
                  <span className={styles.qtyBoxLabel}>Spoilage / Loss</span>
                  <span className={styles.qtyBoxVal} style={{ color: "var(--danger, #ef4444)" }}>
                    {batch.spoiledQuantity.toLocaleString()} kg
                  </span>
                </div>
              </div>

              {/* Physical Specifications & Economics */}
              <div className={styles.detailGrid}>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Quality Grade</span>
                  <span className={styles.detailValue}>{batch.qualityGrade}</span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Storage Temp</span>
                  <span className={styles.detailValue}>{batch.storageTempCelsius}°C</span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Unit Cost / Price</span>
                  <span className={styles.detailValue}>
                    ₹{batch.unitCost.toFixed(2)} / ₹{batch.basePrice.toFixed(2)}
                  </span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Harvest Date</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    {new Date(batch.harvestDate).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Dock Intake Date</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    {new Date(batch.receivedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Absolute Expiration</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--danger, #ef4444)", fontWeight: 600 }}>
                    {new Date(batch.expiryDate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quantity Audit History */}
              <div style={{ marginTop: "1.5rem" }}>
                <div className={styles.historyTitle}>
                  <History size={16} color="var(--accent-lime, #d4f933)" />
                  <span>Quantity Adjustment & Allocation Audit Log ({audits.length})</span>
                </div>
                {audits.length === 0 ? (
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>No adjustments recorded yet.</p>
                ) : (
                  <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", overflow: "hidden" }}>
                    <table className={styles.auditTable}>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Event Type</th>
                          <th>Delta (kg)</th>
                          <th>Resulting Avail</th>
                          <th>Reason / Trigger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audits.map((a: any) => (
                          <tr key={a.id}>
                            <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                              {new Date(a.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <Badge variant={a.changeType === "INTAKE" ? "fresh" : "neutral"}>
                                {a.changeType}
                              </Badge>
                            </td>
                            <td style={{ fontWeight: 700, color: a.deltaQuantity >= 0 ? "var(--produce-emerald)" : "var(--danger)" }}>
                              {a.deltaQuantity >= 0 ? `+${a.deltaQuantity}` : a.deltaQuantity} kg
                            </td>
                            <td>{a.resultingAvailable} kg</td>
                            <td style={{ color: "var(--text-secondary)" }}>{a.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Linked Plan Allocations */}
              {allocations.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div className={styles.historyTitle}>
                    <Layers size={16} color="var(--produce-emerald, #10b981)" />
                    <span>Distribution Plan Allocations ({allocations.length})</span>
                  </div>
                  <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", overflow: "hidden" }}>
                    <table className={styles.auditTable}>
                      <thead>
                        <tr>
                          <th>Plan #</th>
                          <th>Destination</th>
                          <th>Allocated kg</th>
                          <th>Effective Price</th>
                          <th>Reason Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((al: any) => (
                          <tr key={al.id}>
                            <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                              {al.planNumber}
                            </td>
                            <td>{al.destinationName}</td>
                            <td style={{ fontWeight: 700 }}>{Number(al.allocatedQuantity).toLocaleString()} kg</td>
                            <td>₹{Number(al.effectivePricePerUnit).toFixed(2)} / kg</td>
                            <td>
                              <Badge variant="neutral">{al.reasonCode}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
