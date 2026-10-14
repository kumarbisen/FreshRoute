"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Save, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "./Operations.module.scss";

interface RouteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  routeToEdit?: any | null;
}

export function RouteFormDialog({
  isOpen,
  onClose,
  onSuccess,
  routeToEdit,
}: RouteFormDialogProps) {
  const isEditing = Boolean(routeToEdit);

  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [routeCode, setRouteCode] = useState("");
  const [originWarehouseId, setOriginWarehouseId] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("San Francisco Bay");
  const [carrierName, setCarrierName] = useState("ColdChain Express Reefer Line");
  const [vehicleType, setVehicleType] = useState("REEFER_HEAVY_TRUCK");
  const [maxWeightCapacity, setMaxWeightCapacity] = useState("14000");
  const [currentAvailableWeight, setCurrentAvailableWeight] = useState("14000");
  const [transitDurationHours, setTransitDurationHours] = useState("2.50");
  const [handlingDurationHours, setHandlingDurationHours] = useState("0.50");
  const [fixedTripCost, setFixedTripCost] = useState("350.00");
  const [variableCostPerKg, setVariableCostPerKg] = useState("0.085");
  const [tempMin, setTempMin] = useState("1.0");
  const [tempMax, setTempMax] = useState("4.0");
  const [departureTime, setDepartureTime] = useState(
    new Date(Date.now() + 12 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState(
    new Date(Date.now() + 15 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [status, setStatus] = useState("SCHEDULED");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((d) => {
        setWarehouses(d.warehouses || []);
        if (!isEditing && d.warehouses?.length > 0) {
          setOriginWarehouseId(d.warehouses[0].id);
        }
      })
      .catch(console.error);

    if (routeToEdit) {
      setRouteCode(routeToEdit.routeCode);
      setOriginWarehouseId(routeToEdit.originWarehouseId);
      setDestinationRegion(routeToEdit.destinationRegion);
      setVehicleType(routeToEdit.vehicleType);
      setMaxWeightCapacity(String(routeToEdit.maxWeightCapacityKg));
      setCurrentAvailableWeight(String(routeToEdit.currentAvailableWeightKg));
      setTransitDurationHours(String(routeToEdit.transitDurationHours));
      setHandlingDurationHours(String(routeToEdit.handlingDurationHours));
      setFixedTripCost(String(routeToEdit.fixedTripCostUsd));
      setVariableCostPerKg(String(routeToEdit.variableCostPerKgUsd));
      setTempMin(String(routeToEdit.tempZoneMinCelsius));
      setTempMax(String(routeToEdit.tempZoneMaxCelsius));
      setDepartureTime(new Date(routeToEdit.departureTime).toISOString().slice(0, 16));
      setEstimatedArrivalTime(new Date(routeToEdit.estimatedArrivalTime).toISOString().slice(0, 16));
      setStatus(routeToEdit.status);
    } else {
      setRouteCode(`RT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
      setDestinationRegion("San Francisco Bay");
      setCarrierName("ColdChain Express Reefer Line");
      setVehicleType("REEFER_HEAVY_TRUCK");
      setMaxWeightCapacity("14000");
      setCurrentAvailableWeight("14000");
      setTransitDurationHours("2.50");
      setHandlingDurationHours("0.50");
      setFixedTripCost("350.00");
      setVariableCostPerKg("0.085");
      setTempMin("1.0");
      setTempMax("4.0");
      setDepartureTime(new Date(Date.now() + 12 * 3600 * 1000).toISOString().slice(0, 16));
      setEstimatedArrivalTime(new Date(Date.now() + 15 * 3600 * 1000).toISOString().slice(0, 16));
      setStatus("SCHEDULED");
    }
    setError(null);
  }, [isOpen, routeToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const res = await fetch(`/api/routes/${routeToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationRegion,
            vehicleType,
            maxWeightCapacityKg: maxWeightCapacity,
            currentAvailableWeightKg: currentAvailableWeight,
            transitDurationHours,
            handlingDurationHours,
            fixedTripCostUsd: fixedTripCost,
            variableCostPerKgUsd: variableCostPerKg,
            tempZoneMinCelsius: tempMin,
            tempZoneMaxCelsius: tempMax,
            departureTime: new Date(departureTime),
            estimatedArrivalTime: new Date(estimatedArrivalTime),
            status,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update route");
      } else {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routeCode,
            originWarehouseId,
            destinationRegion,
            vehicleType,
            maxWeightCapacityKg: maxWeightCapacity,
            transitDurationHours,
            handlingDurationHours,
            fixedTripCost: fixedTripCost,
            variableCostPerKg: variableCostPerKg,
            tempZoneMinCelsius: tempMin,
            tempZoneMaxCelsius: tempMax,
            departureTime: new Date(departureTime),
            estimatedArrivalTime: new Date(estimatedArrivalTime),
            status,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create route");
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
                {isEditing ? `Edit Route Constraints: ${routeToEdit.routeCode}` : "Register Transport Fleet Route"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                Two-part transport economics (flat dispatch fee + variable $/kg), payload capacity, and line-haul schedules.
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
                <label className={styles.fieldLabel}>Route Identifier Code</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Origin Cold Storage Facility</label>
                <select
                  disabled={isEditing}
                  value={originWarehouseId}
                  onChange={(e) => setOriginWarehouseId(e.target.value)}
                  className={styles.fieldInput}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code}) - {w.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Destination Target Region</label>
                <input
                  type="text"
                  required
                  value={destinationRegion}
                  onChange={(e) => setDestinationRegion(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="e.g. San Francisco Bay Area"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Vehicle Fleet Spec</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className={styles.fieldInput}
                >
                  <option value="REEFER_HEAVY_TRUCK">Refrigerated Heavy Truck (Standard Reefer)</option>
                  <option value="REEFER_53FT_MULTI_ZONE">53ft Multi-Zone Tri-Temp Reefer</option>
                  <option value="REEFER_MEDIUM_DUTY">Medium-Duty Straight Reefer</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Max Gross Payload Capacity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={maxWeightCapacity}
                  onChange={(e) => setMaxWeightCapacity(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              {isEditing && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Available Payload Remaining (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={currentAvailableWeight}
                    onChange={(e) => setCurrentAvailableWeight(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Fixed Truck Dispatch Fee ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={fixedTripCost}
                  onChange={(e) => setFixedTripCost(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="e.g. 350.00"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Variable Fuel & Weight Rate ($ / kg)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={variableCostPerKg}
                  onChange={(e) => setVariableCostPerKg(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="e.g. 0.085"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Line-Haul Transit Duration (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={transitDurationHours}
                  onChange={(e) => setTransitDurationHours(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Bay Handling & Loading Buffer (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={handlingDurationHours}
                  onChange={(e) => setHandlingDurationHours(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Departure Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Estimated Dock Arrival Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={estimatedArrivalTime}
                  onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              {isEditing && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Vehicle Fleet Availability Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={styles.fieldInput}
                  >
                    <option value="SCHEDULED">SCHEDULED (Available for Allocator)</option>
                    <option value="LOADING">LOADING (Bay Docked)</option>
                    <option value="IN_TRANSIT">IN TRANSIT (En Route)</option>
                    <option value="COMPLETED">COMPLETED (Delivered)</option>
                    <option value="CANCELLED">CANCELLED (Out of Service)</option>
                  </select>
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
                {isSubmitting ? "Saving..." : isEditing ? "Save Route Specs" : "Register Route"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
