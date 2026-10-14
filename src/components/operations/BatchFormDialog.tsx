"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Plus, Edit2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "./Operations.module.scss";

interface BatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchToEdit?: any | null;
}

export function BatchFormDialog({
  isOpen,
  onClose,
  onSuccess,
  batchToEdit,
}: BatchFormDialogProps) {
  const isEditing = Boolean(batchToEdit);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [batchCode, setBatchCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("3000");
  const [availableQuantity, setAvailableQuantity] = useState("3000");
  const [qualityGrade, setQualityGrade] = useState("GRADE_A");
  const [unitCost, setUnitCost] = useState("2.50");
  const [basePrice, setBasePrice] = useState("4.80");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [storageTemp, setStorageTemp] = useState("2.5");
  const [status, setStatus] = useState("AVAILABLE");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Load reference lookups
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => {
        setWarehouses(data.warehouses || []);
        if (!isEditing && data.warehouses?.length > 0) {
          setWarehouseId(data.warehouses[0].id);
        }
      })
      .catch(console.error);

    fetch("/api/commodities")
      .then((res) => res.json())
      .then((data) => {
        setCommodities(data.commodities || []);
        if (!isEditing && data.commodities?.length > 0) {
          setCommodityId(data.commodities[0].id);
        }
      })
      .catch(console.error);

    if (batchToEdit) {
      setBatchCode(batchToEdit.batchCode);
      setWarehouseId(batchToEdit.warehouseId);
      setCommodityId(batchToEdit.commodityId);
      setInitialQuantity(String(batchToEdit.initialQuantity));
      setAvailableQuantity(String(batchToEdit.availableQuantity));
      setQualityGrade(batchToEdit.qualityGrade);
      setUnitCost(String(batchToEdit.unitCost));
      setBasePrice(String(batchToEdit.basePrice));
      setHarvestDate(new Date(batchToEdit.harvestDate).toISOString().slice(0, 10));
      setExpiryDate(new Date(batchToEdit.expiryDate).toISOString().slice(0, 10));
      setStorageTemp(String(batchToEdit.storageTempCelsius));
      setStatus(batchToEdit.status);
      setAdjustmentReason("");
    } else {
      setBatchCode(`BATCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setInitialQuantity("3000");
      setAvailableQuantity("3000");
      setQualityGrade("GRADE_A");
      setUnitCost("2.50");
      setBasePrice("4.80");
      setHarvestDate(new Date().toISOString().slice(0, 10));
      setExpiryDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
      setStorageTemp("2.5");
      setStatus("AVAILABLE");
      setAdjustmentReason("");
    }
    setError(null);
  }, [isOpen, batchToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const payload: any = {
          qualityGrade,
          storageTempCelsius: storageTemp,
          unitCost,
          basePrice,
          expiryDate: new Date(expiryDate),
          status,
          availableQuantity,
          reason: adjustmentReason || "Operational batch update",
        };

        const res = await fetch(`/api/inventory/${batchToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update batch");
        }
      } else {
        const payload = {
          batchCode,
          warehouseId,
          commodityId,
          initialQuantity,
          availableQuantity: initialQuantity,
          qualityGrade,
          unitCost,
          basePrice,
          harvestDate: new Date(harvestDate),
          expiryDate: new Date(expiryDate),
          storageTempCelsius: storageTemp,
        };

        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create batch");
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.modalOverlay} />
        <DialogPrimitive.Content className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <DialogPrimitive.Title className={styles.modalTitle}>
                {isEditing ? `Edit Batch: ${batchToEdit.batchCode}` : "Register Perishable Inventory Batch"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                {isEditing
                  ? "Update quality grades, storage setpoints, lifecycle status, or available balance."
                  : "Intake a new warehouse produce lot with cold storage parameters and absolute expiration."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button className={styles.closeBtn} aria-label="Close">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          {error && (
            <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "var(--danger, #ef4444)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Batch Code / Lot Identifier</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="e.g. BATCH-STR-001"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Commodity</label>
                <select
                  disabled={isEditing}
                  value={commodityId}
                  onChange={(e) => setCommodityId(e.target.value)}
                  className={styles.fieldInput}
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cold Storage Warehouse Hub</label>
                <select
                  disabled={isEditing}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className={styles.fieldInput}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code}) - {w.city}, {w.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Quality Grade</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className={styles.fieldInput}
                >
                  <option value="GRADE_A">Grade A (Premium Retail Export)</option>
                  <option value="GRADE_B">Grade B (Standard Supermarket)</option>
                  <option value="GRADE_C">Grade C (Commercial / Juicing)</option>
                </select>
              </div>

              {!isEditing ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Initial Intake Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              ) : (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Available Stock (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={availableQuantity}
                    onChange={(e) => setAvailableQuantity(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Storage Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={storageTemp}
                  onChange={(e) => setStorageTemp(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Procurement Cost ($/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Target Base Selling Price ($/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Harvest Date</label>
                <input
                  type="date"
                  required
                  disabled={isEditing}
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Absolute Expiration Date</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              {isEditing && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={styles.fieldInput}
                  >
                    <option value="AVAILABLE">AVAILABLE (Eligible for FEFO)</option>
                    <option value="PARTIALLY_ALLOCATED">PARTIALLY ALLOCATED</option>
                    <option value="ALLOCATED">ALLOCATED (Committed)</option>
                    <option value="EXPIRED">EXPIRED (Disposal Write-Off)</option>
                    <option value="SALVAGED">SALVAGED (Discount Clearance)</option>
                  </select>
                </div>
              )}

              {isEditing && (
                <div className={`${styles.fieldGroup} ${styles.formFieldFull}`}>
                  <label className={styles.fieldLabel}>Adjustment Reason / Audit Trail Note</label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className={styles.fieldInput}
                    placeholder="e.g. Quality inspection re-grade, cold room sensor calibration..."
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                leftIcon={<Save size={16} />}
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save Adjustments" : "Create Batch"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
